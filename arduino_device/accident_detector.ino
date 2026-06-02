/**
 * ============================================================
 *  ACCIDENT RESCUE SYSTEM — Arduino Firmware v2.0
 * ============================================================
 *  Author  : Accident Rescue System
 *  Board   : Arduino Uno / Nano (ATmega328P)
 *  Sensors : MPU6050 (I2C), NEO-6M GPS (SoftwareSerial)
 *  Comms   : SIM800L GSM (SoftwareSerial)
 *  Extras  : Piezo Buzzer (PWM), Cancel Button (INT0),
 *            Voltage Divider on A0 (12V battery monitor)
 *
 *  Serial output: 115200 baud, JSON lines
 *  Frame types:
 *    {"t":"data", ...telemetry...}   — every 200 ms
 *    {"t":"hb",  "uptime":XXXX}     — every 5 s
 *    {"t":"event","ev":"...","mag":X,"lat":X,"lng":X}  — on events
 * ============================================================
 */

// ── Includes ─────────────────────────────────────────────────
#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <Wire.h>
#include <MPU6050.h>
#include <avr/wdt.h>          // Hardware watchdog

// ── Pin Definitions ──────────────────────────────────────────
#define GSM_TX          7
#define GSM_RX          8
#define GPS_TX          3
#define GPS_RX          4
#define BUZZER_PIN      9
#define CANCEL_BUTTON   2
#define VOLT_PIN        A0    // Voltage divider input (R1=10kΩ, R2=10kΩ)

// ── Thresholds & Timing ──────────────────────────────────────
#define IMPACT_THRESHOLD     2.5f   // g-force threshold
#define ROLL_THRESHOLD       150.0f // deg/s rollover threshold
#define JERK_THRESHOLD       8.0f   // g/s jerk threshold (change in magnitude)
#define WARNING_DURATION     15000  // ms — warning window before alert fires
#define HEARTBEAT_INTERVAL   5000   // ms — heartbeat JSON every 5 s
#define TELEMETRY_INTERVAL   200    // ms — data frame every 200 ms
#define DEBOUNCE_MS          50     // ms — cancel button debounce
#define FILTER_SIZE          5      // rolling average filter depth
#define COMP_ALPHA           0.98f  // complementary filter coefficient

// ── Voltage Divider Scaling ──────────────────────────────────
//   12V system: R1=10kΩ, R2=10kΩ → Vout = Vin / 2
//   ADC Vref = 5V, resolution = 1024
//   Vin = ADC_raw * (5.0 / 1023.0) * 2.0
#define VOLT_SCALE           (5.0f / 1023.0f * 2.0f)

// ── Emergency Contacts ───────────────────────────────────────
//   Add / remove numbers here — up to 5 supported.
//   Primary number (index 0) will also receive a voice call.
const char* EMERGENCY_CONTACTS[] = {
  "+91XXXXXXXXXX",   // Primary — also gets voice call
  "+91YYYYYYYYYY",   // Secondary
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

// ── Rolling Average Buffer ───────────────────────────────────
float   magnitudeBuffer[FILTER_SIZE];
uint8_t bufferIndex = 0;
float   prevMagnitude = 1.0f;   // for jerk calculation

// ── Complementary Filter State ───────────────────────────────
float   pitchAngle = 0.0f;
float   rollAngle  = 0.0f;
unsigned long lastFilterTime = 0;

// ── Timing ───────────────────────────────────────────────────
unsigned long lastTelemetryMs  = 0;
unsigned long lastHeartbeatMs  = 0;
unsigned long warningStartMs   = 0;
unsigned long systemUptime     = 0;   // ms since boot

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
  // Disable watchdog first (in case of dirty reset)
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

  // Initialise rolling average buffer to 1g (gravity at rest)
  for (uint8_t i = 0; i < FILTER_SIZE; i++) magnitudeBuffer[i] = 1.0f;

  lastFilterTime = millis();

  // Enable 8-second hardware watchdog
  wdt_enable(WDTO_8S);

  // Boot event
  sendEventJSON("boot", 0.0f);
  Serial.println(F("{\"t\":\"hb\",\"uptime\":0,\"status\":\"ready\"}"));
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  wdt_reset();  // Pet the watchdog

  unsigned long now = millis();

  // ── Feed GPS ─────────────────────────────────────────────
  gpsSerial.listen();
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  // ── Read MPU6050 ─────────────────────────────────────────
  int16_t ax_raw, ay_raw, az_raw, gx_raw, gy_raw, gz_raw;
  mpu.getMotion6(&ax_raw, &ay_raw, &az_raw, &gx_raw, &gy_raw, &gz_raw);

  // Convert to SI units
  float ax = ax_raw / 16384.0f;
  float ay = ay_raw / 16384.0f;
  float az = az_raw / 16384.0f;
  float gx = gx_raw / 131.0f;   // deg/s
  float gy = gy_raw / 131.0f;

  // ── Complementary Filter — Pitch & Roll ─────────────────
  float dt = (now - lastFilterTime) / 1000.0f;
  if (dt <= 0.0f || dt > 1.0f) dt = 0.01f;  // safety clamp
  lastFilterTime = now;

  float pitchAccel = atan2(ay, sqrt(ax*ax + az*az)) * 57.2958f;
  float rollAccel  = atan2(ax, sqrt(ay*ay + az*az)) * 57.2958f;

  pitchAngle = COMP_ALPHA * (pitchAngle + gx * dt) + (1.0f - COMP_ALPHA) * pitchAccel;
  rollAngle  = COMP_ALPHA * (rollAngle  + gy * dt) + (1.0f - COMP_ALPHA) * rollAccel;

  // ── G-Force Magnitude & Rolling Average ─────────────────
  float magnitude = sqrt(ax*ax + ay*ay + az*az);
  magnitudeBuffer[bufferIndex] = magnitude;
  bufferIndex = (bufferIndex + 1) % FILTER_SIZE;

  float avgMagnitude = 0.0f;
  for (uint8_t i = 0; i < FILTER_SIZE; i++) avgMagnitude += magnitudeBuffer[i];
  avgMagnitude /= FILTER_SIZE;

  // ── Jerk (rate of G-force change) ───────────────────────
  float jerk = (magnitude - prevMagnitude) / dt;
  prevMagnitude = magnitude;

  // ── Voltage ──────────────────────────────────────────────
  int   adcRaw = analogRead(VOLT_PIN);
  float voltage = adcRaw * VOLT_SCALE;

  // ── Impact Detection ─────────────────────────────────────
  bool linearImpact = avgMagnitude > IMPACT_THRESHOLD;
  bool rollover     = abs(gx) > ROLL_THRESHOLD || abs(gy) > ROLL_THRESHOLD;
  bool jerkSpike    = abs(jerk) > JERK_THRESHOLD;

  // Confirmed impact: need at least 2 of 3 conditions OR severe rollover
  bool confirmedImpact = (rollover) ||
                         (linearImpact && jerkSpike) ||
                         (avgMagnitude > IMPACT_THRESHOLD * 1.5f);

  if (confirmedImpact && !impactDetected && !warningActive) {
    impactDetected  = true;
    warningActive   = true;
    warningStartMs  = now;
    alertCancelledISR = false;

    sendEventJSON("impact_detected", avgMagnitude);
    tone(BUZZER_PIN, 1000);  // 1kHz warning tone
  }

  // ── Warning Window ───────────────────────────────────────
  if (warningActive) {
    if (alertCancelledISR) {
      // User pressed cancel button
      noTone(BUZZER_PIN);
      warningActive  = false;
      impactDetected = false;
      alertCancelledISR = false;
      sendEventJSON("user_cancel", avgMagnitude);

    } else if (now - warningStartMs >= WARNING_DURATION) {
      // Warning expired — fire emergency alert
      noTone(BUZZER_PIN);
      warningActive  = false;
      impactDetected = false;

      tone(BUZZER_PIN, 2000);  // 2kHz emergency tone during alert
      sendEmergencyAlert(avgMagnitude);
      noTone(BUZZER_PIN);
    } else {
      // Pulse buzzer pattern during warning: alternating 1kHz / 1.5kHz
      unsigned long elapsed = now - warningStartMs;
      if ((elapsed / 300) % 2 == 0) tone(BUZZER_PIN, 1000);
      else                           tone(BUZZER_PIN, 1500);
    }
  }

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

  // Build compact JSON without ArduinoJSON to save RAM
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

// ============================================================
//  GSM EMERGENCY ALERT
// ============================================================
void sendEmergencyAlert(float mag) {
  // Re-listen GPS for latest fix
  gpsSerial.listen();
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  float lat = gps.location.isValid() ? gps.location.lat() : 0.0f;
  float lng = gps.location.isValid() ? gps.location.lng() : 0.0f;

  String mapsLink = "https://maps.google.com/?q=" + String(lat, 6) + "," + String(lng, 6);
  String smsBody  = "🚨 ACCIDENT ALERT!\n"
                    "G-Force: " + String(mag, 2) + "g\n"
                    "Location: " + mapsLink + "\n"
                    "Sent by Accident Rescue System";

  gsmSerial.listen();
  initGSM();

  // ── Send SMS to all contacts ──────────────────────────────
  for (uint8_t i = 0; i < CONTACT_COUNT; i++) {
    wdt_reset();
    sendSMS(EMERGENCY_CONTACTS[i], smsBody);
    delay(1000);
  }

  // ── Make voice call to primary contact ───────────────────
  wdt_reset();
  makeCall(EMERGENCY_CONTACTS[0]);

  sendEventJSON("alert_dispatched", mag);

  // Switch back to GPS
  gpsSerial.listen();
}

void initGSM() {
  gsmSerial.println(F("AT"));           delay(300);
  gsmSerial.println(F("AT+CMGF=1"));    delay(300);   // Text mode
  gsmSerial.println(F("AT+CSCS=\"GSM\"")); delay(300);
}

void sendSMS(const char* number, const String& body) {
  gsmSerial.print(F("AT+CMGS=\""));
  gsmSerial.print(number);
  gsmSerial.println(F("\""));
  delay(500);
  gsmSerial.print(body);
  delay(200);
  gsmSerial.write(26);   // Ctrl+Z
  delay(4000);           // Wait for send confirmation
}

void makeCall(const char* number) {
  gsmSerial.print(F("ATD"));
  gsmSerial.print(number);
  gsmSerial.println(F(";"));

  unsigned long callStart = millis();
  while (millis() - callStart < 20000UL) {
    wdt_reset();
    // Keep feeding GPS during call
    gpsSerial.listen();
    while (gpsSerial.available()) gps.encode(gpsSerial.read());
    gpsSerial.listen();   // Switch back — gsmSerial already listening
    delay(100);
  }

  gsmSerial.println(F("ATH"));  // Hang up
  delay(500);
}
