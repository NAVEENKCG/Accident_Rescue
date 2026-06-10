/**
 * ============================================================
 *  ACCIDENT RESCUE SYSTEM — Arduino Firmware v3.0 (Non-blocking)
 * ============================================================
 *  Author  : Accident Rescue System
 *  Board   : Arduino Uno / Nano (ATmega328P)
 *  Sensors : MPU6050 (I2C), NEO-6M GPS (SoftwareSerial)
 *  Comms   : SIM800L GSM (SoftwareSerial)
 *  Extras  : Piezo Buzzer (PWM), Cancel Button (INT0),
 *            Voltage Divider on A0 (12V battery monitor)
 *
 *  Serial output: 115200 baud, JSON lines
 * ============================================================
 */

#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <Wire.h>
#include <MPU6050.h>
#include <avr/wdt.h>          // Hardware watchdog
#include <EEPROM.h>

// ── Pin Definitions ──────────────────────────────────────────
#define GSM_TX          7
#define GSM_RX          8
#define GPS_TX          3
#define GPS_RX          4
#define BUZZER_PIN      9
#define CANCEL_BUTTON   2
#define VOLT_PIN        A0    

// ── Thresholds & Timing ──────────────────────────────────────
float IMPACT_THRESHOLD       = 2.5f;   // Mutable via EEPROM
#define ROLL_THRESHOLD       150.0f 
#define JERK_THRESHOLD       8.0f   
#define WARNING_DURATION     15000  
#define HEARTBEAT_INTERVAL   5000   
#define TELEMETRY_INTERVAL   200    
#define DEBOUNCE_MS          50     
#define FILTER_SIZE          5      
#define COMP_ALPHA           0.98f  

#define VOLT_SCALE           (5.0f / 1023.0f * 2.0f)

// ── Emergency Contacts ───────────────────────────────────────
const char* EMERGENCY_CONTACTS[] = {
  "+91XXXXXXXXXX",   
  "+91YYYYYYYYYY",   
};
const uint8_t CONTACT_COUNT = sizeof(EMERGENCY_CONTACTS) / sizeof(EMERGENCY_CONTACTS[0]);

// ── Serial Objects ───────────────────────────────────────────
SoftwareSerial gsmSerial(GSM_TX, GSM_RX);
SoftwareSerial gpsSerial(GPS_TX, GPS_RX);
TinyGPSPlus    gps;
MPU6050        mpu;

// ── State ────────────────────────────────────────────────────
bool    impactDetected   = false;
bool    warningActive    = false;
volatile bool alertCancelledISR = false;
volatile unsigned long lastCancelTime = 0;

float   magnitudeBuffer[FILTER_SIZE];
uint8_t bufferIndex = 0;
float   prevMagnitude = 1.0f;   

float   pitchAngle = 0.0f;
float   rollAngle  = 0.0f;
unsigned long lastFilterTime = 0;

unsigned long lastTelemetryMs  = 0;
unsigned long lastHeartbeatMs  = 0;
unsigned long lastSmsCheckMs   = 0;
unsigned long warningStartMs   = 0;
unsigned long systemUptime     = 0;   

// ── GSM Non-blocking State Machine ───────────────────────────
enum AlertState {
  ALERT_IDLE,
  ALERT_INIT_AT,
  ALERT_INIT_CMGF,
  ALERT_INIT_CSCS,
  ALERT_SMS_START,
  ALERT_SMS_PROMPT,
  ALERT_SMS_SEND,
  ALERT_CALL_START,
  ALERT_CALL_WAIT,
  ALERT_DONE
};

AlertState alertState = ALERT_IDLE;
unsigned long alertTimer = 0;
uint8_t currentContactIdx = 0;
String alertSmsBody = "";
float alertMagnitude = 0.0f;

// ── ISR: Cancel Button ───────────────────────────────────────
void cancelAlert() {
  unsigned long now = millis();
  if (now - lastCancelTime > DEBOUNCE_MS) {
    alertCancelledISR = true;
    lastCancelTime = now;
  }
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  wdt_disable();

  Serial.begin(115200);
  gsmSerial.begin(9600);
  gpsSerial.begin(9600);
  Wire.begin();
  mpu.initialize();

  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);
  pinMode(CANCEL_BUTTON, INPUT_PULLUP);
  pinMode(VOLT_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(CANCEL_BUTTON), cancelAlert, FALLING);

  // Load threshold from EEPROM
  float savedThreshold;
  EEPROM.get(0, savedThreshold);
  if (savedThreshold >= 0.5f && savedThreshold <= 10.0f) {
    IMPACT_THRESHOLD = savedThreshold;
  } else {
    IMPACT_THRESHOLD = 2.5f; // default
  }

  for (uint8_t i = 0; i < FILTER_SIZE; i++) magnitudeBuffer[i] = 1.0f;
  lastFilterTime = millis();

  wdt_enable(WDTO_8S);

  sendEventJSON("boot", 0.0f);
  Serial.println(F("{\"t\":\"hb\",\"uptime\":0,\"status\":\"ready\"}"));
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  wdt_reset(); 
  unsigned long now = millis();

  // ── Feed GPS (only if not using GSM) ─────────────────────
  if (alertState == ALERT_IDLE) {
    gpsSerial.listen();
    while (gpsSerial.available()) gps.encode(gpsSerial.read());
  }

  // ── Read MPU6050 ─────────────────────────────────────────
  int16_t ax_raw, ay_raw, az_raw, gx_raw, gy_raw, gz_raw;
  mpu.getMotion6(&ax_raw, &ay_raw, &az_raw, &gx_raw, &gy_raw, &gz_raw);

  float ax = ax_raw / 16384.0f;
  float ay = ay_raw / 16384.0f;
  float az = az_raw / 16384.0f;
  float gx = gx_raw / 131.0f;   
  float gy = gy_raw / 131.0f;

  float dt = (now - lastFilterTime) / 1000.0f;
  if (dt <= 0.0f || dt > 1.0f) dt = 0.01f;  
  lastFilterTime = now;

  float pitchAccel = atan2(ay, sqrt(ax*ax + az*az)) * 57.2958f;
  float rollAccel  = atan2(ax, sqrt(ay*ay + az*az)) * 57.2958f;

  pitchAngle = COMP_ALPHA * (pitchAngle + gx * dt) + (1.0f - COMP_ALPHA) * pitchAccel;
  rollAngle  = COMP_ALPHA * (rollAngle  + gy * dt) + (1.0f - COMP_ALPHA) * rollAccel;

  float magnitude = sqrt(ax*ax + ay*ay + az*az);
  magnitudeBuffer[bufferIndex] = magnitude;
  bufferIndex = (bufferIndex + 1) % FILTER_SIZE;

  float avgMagnitude = 0.0f;
  for (uint8_t i = 0; i < FILTER_SIZE; i++) avgMagnitude += magnitudeBuffer[i];
  avgMagnitude /= FILTER_SIZE;

  float jerk = (magnitude - prevMagnitude) / dt;
  prevMagnitude = magnitude;

  int   adcRaw = analogRead(VOLT_PIN);
  float voltage = adcRaw * VOLT_SCALE;

  // ── Impact Detection ─────────────────────────────────────
  bool linearImpact = avgMagnitude > IMPACT_THRESHOLD;
  bool rollover     = abs(gx) > ROLL_THRESHOLD || abs(gy) > ROLL_THRESHOLD;
  bool jerkSpike    = abs(jerk) > JERK_THRESHOLD;

  bool confirmedImpact = (rollover) ||
                         (linearImpact && jerkSpike) ||
                         (avgMagnitude > IMPACT_THRESHOLD * 1.5f);

  if (confirmedImpact && !impactDetected && !warningActive && alertState == ALERT_IDLE) {
    impactDetected  = true;
    warningActive   = true;
    warningStartMs  = now;
    alertCancelledISR = false;

    sendEventJSON("impact_detected", avgMagnitude);
    tone(BUZZER_PIN, 1000); 
  }

  // ── Warning Window ───────────────────────────────────────
  if (warningActive) {
    if (alertCancelledISR) {
      noTone(BUZZER_PIN);
      warningActive  = false;
      impactDetected = false;
      alertCancelledISR = false;
      sendEventJSON("user_cancel", avgMagnitude);

    } else if (now - warningStartMs >= WARNING_DURATION) {
      noTone(BUZZER_PIN);
      warningActive  = false;
      impactDetected = false;

      tone(BUZZER_PIN, 2000); 
      startEmergencyAlert(avgMagnitude);
    } else {
      unsigned long elapsed = now - warningStartMs;
      if ((elapsed / 300) % 2 == 0) tone(BUZZER_PIN, 1000);
      else                           tone(BUZZER_PIN, 1500);
    }
  }

  // ── GSM Alert State Machine ──────────────────────────────
  handleAlertStateMachine(now);

  // ── Telemetry Frame ──────────────────────────────────────
  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL) {
    lastTelemetryMs = now;
    sendTelemetryJSON(
      ax, ay, az, magnitude, avgMagnitude, jerk,
      gx, gy,
      pitchAngle, rollAngle,
      voltage,
      linearImpact, rollover, warningActive,
      (warningActive ? (long)(WARNING_DURATION - (now - warningStartMs)) / 1000L : 0L)
    );
  }

  // ── Heartbeat Frame ──────────────────────────────────────
  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL) {
    lastHeartbeatMs = now;
    sendHeartbeat(now);
  }

  // ── Check Incoming SMS (every 10s) ───────────────────────
  if (now - lastSmsCheckMs >= 10000 && alertState == ALERT_IDLE) {
    lastSmsCheckMs = now;
    checkIncomingSMS();
  }
}

// ============================================================
//  OTA SMS HANDLING
// ============================================================
void checkIncomingSMS() {
  gsmSerial.listen();
  gsmSerial.println(F("AT+CMGL=\"REC UNREAD\""));
  unsigned long start = millis();
  String response = "";
  while (millis() - start < 1000) {
    while (gsmSerial.available()) {
      response += (char)gsmSerial.read();
    }
  }

  // Very basic parsing for "SET THRESH X.X"
  int idx = response.indexOf("SET THRESH");
  if (idx != -1) {
    int startIdx = idx + 11;
    float newThresh = response.substring(startIdx, startIdx + 3).toFloat();
    if (newThresh >= 0.5f && newThresh <= 10.0f) {
      IMPACT_THRESHOLD = newThresh;
      EEPROM.put(0, IMPACT_THRESHOLD);
      sendEventJSON("thresh_updated", IMPACT_THRESHOLD);
    }
    // Delete all SMS to free space
    gsmSerial.println(F("AT+CMGD=1,4"));
    delay(200);
  }

  gpsSerial.listen();
}

// ============================================================
//  GSM NON-BLOCKING STATE MACHINE
// ============================================================

void startEmergencyAlert(float mag) {
  alertMagnitude = mag;
  float lat = gps.location.isValid() ? gps.location.lat() : 0.0f;
  float lng = gps.location.isValid() ? gps.location.lng() : 0.0f;

  String mapsLink = "https://maps.google.com/?q=" + String(lat, 6) + "," + String(lng, 6);
  alertSmsBody  = "🚨 ACCIDENT ALERT!\n"
                  "G-Force: " + String(mag, 2) + "g\n"
                  "Location: " + mapsLink + "\n"
                  "Sent by Accident Rescue System";

  gsmSerial.listen();
  alertState = ALERT_INIT_AT;
  alertTimer = millis();
}

void handleAlertStateMachine(unsigned long now) {
  if (alertState == ALERT_IDLE) return;

  switch (alertState) {
    case ALERT_INIT_AT:
      gsmSerial.println(F("AT"));
      alertState = ALERT_INIT_CMGF;
      alertTimer = now;
      break;

    case ALERT_INIT_CMGF:
      if (now - alertTimer >= 300) {
        gsmSerial.println(F("AT+CMGF=1"));
        alertState = ALERT_INIT_CSCS;
        alertTimer = now;
      }
      break;

    case ALERT_INIT_CSCS:
      if (now - alertTimer >= 300) {
        gsmSerial.println(F("AT+CSCS=\"GSM\""));
        currentContactIdx = 0;
        alertState = ALERT_SMS_START;
        alertTimer = now;
      }
      break;

    case ALERT_SMS_START:
      if (now - alertTimer >= 300) {
        if (currentContactIdx < CONTACT_COUNT) {
          gsmSerial.print(F("AT+CMGS=\""));
          gsmSerial.print(EMERGENCY_CONTACTS[currentContactIdx]);
          gsmSerial.println(F("\""));
          alertState = ALERT_SMS_PROMPT;
          alertTimer = now;
        } else {
          alertState = ALERT_CALL_START;
          alertTimer = now;
        }
      }
      break;

    case ALERT_SMS_PROMPT:
      if (now - alertTimer >= 500) {
        gsmSerial.print(alertSmsBody);
        delay(10); // Small delay to flush buffer
        gsmSerial.write(26); // Ctrl+Z
        alertState = ALERT_SMS_SEND;
        alertTimer = now;
      }
      break;

    case ALERT_SMS_SEND:
      if (now - alertTimer >= 4000) {
        currentContactIdx++;
        alertState = ALERT_SMS_START;
        alertTimer = now;
      }
      break;

    case ALERT_CALL_START:
      if (now - alertTimer >= 1000) {
        gsmSerial.print(F("ATD"));
        gsmSerial.print(EMERGENCY_CONTACTS[0]);
        gsmSerial.println(F(";"));
        alertState = ALERT_CALL_WAIT;
        alertTimer = now;
      }
      break;

    case ALERT_CALL_WAIT:
      if (now - alertTimer >= 20000) {
        gsmSerial.println(F("ATH"));
        alertState = ALERT_DONE;
        alertTimer = now;
      }
      break;

    case ALERT_DONE:
      if (now - alertTimer >= 500) {
        noTone(BUZZER_PIN);
        sendEventJSON("alert_dispatched", alertMagnitude);
        gpsSerial.listen();
        alertState = ALERT_IDLE;
      }
      break;
  }
}

// ============================================================
//  JSON OUTPUT HELPERS
// ============================================================

void sendTelemetryJSON(
  float ax, float ay, float az, float mag, float avgMag, float jerk,
  float gx, float gy,
  float pitch, float roll,
  float volt,
  bool impact, bool rollDet, bool warn, long warnLeft)
{
  float lat = gps.location.isValid() ? gps.location.lat() : 0.0f;
  float lng = gps.location.isValid() ? gps.location.lng() : 0.0f;
  uint8_t sats = gps.satellites.isValid() ? (uint8_t)gps.satellites.value() : 0;
  float   hdop = gps.hdop.isValid()       ? gps.hdop.hdop()                 : 99.9f;

  Serial.print(F("{\"t\":\"data\""));
  Serial.print(F(",\"ax\":")); Serial.print(ax,    3);
  Serial.print(F(",\"ay\":")); Serial.print(ay,    3);
  Serial.print(F(",\"az\":")); Serial.print(az,    3);
  Serial.print(F(",\"mag\":")); Serial.print(mag,  3);
  Serial.print(F(",\"avg\":")); Serial.print(avgMag, 3);
  Serial.print(F(",\"jerk\":")); Serial.print(jerk, 2);
  Serial.print(F(",\"gx\":")); Serial.print(gx,   1);
  Serial.print(F(",\"gy\":")); Serial.print(gy,   1);
  Serial.print(F(",\"pitch\":")); Serial.print(pitch, 2);
  Serial.print(F(",\"roll\":")); Serial.print(roll, 2);
  Serial.print(F(",\"lat\":")); Serial.print(lat,  6);
  Serial.print(F(",\"lng\":")); Serial.print(lng,  6);
  Serial.print(F(",\"sat\":")); Serial.print(sats);
  Serial.print(F(",\"hdop\":")); Serial.print(hdop, 1);
  Serial.print(F(",\"volt\":")); Serial.print(volt, 2);
  Serial.print(F(",\"impact\":")); Serial.print(impact  ? F("true") : F("false"));
  Serial.print(F(",\"roll_det\":")); Serial.print(rollDet ? F("true") : F("false"));
  Serial.print(F(",\"warn\":")); Serial.print(warn  ? F("true") : F("false"));
  Serial.print(F(",\"warnLeft\":")); Serial.print(warnLeft);
  Serial.println(F("}"));
}

void sendHeartbeat(unsigned long uptimeMs) {
  Serial.print(F("{\"t\":\"hb\",\"uptime\":"));
  Serial.print(uptimeMs);
  Serial.print(F(",\"sat\":"));
  Serial.print(gps.satellites.isValid() ? (uint8_t)gps.satellites.value() : 0);
  Serial.println(F("}"));
}

void sendEventJSON(const char* eventName, float mag) {
  float lat = gps.location.isValid() ? gps.location.lat() : 0.0f;
  float lng = gps.location.isValid() ? gps.location.lng() : 0.0f;
  Serial.print(F("{\"t\":\"event\",\"ev\":\""));
  Serial.print(eventName);
  Serial.print(F("\",\"mag\":"));  Serial.print(mag, 3);
  Serial.print(F(",\"lat\":"));    Serial.print(lat, 6);
  Serial.print(F(",\"lng\":"));    Serial.print(lng, 6);
  Serial.println(F("}"));
}
