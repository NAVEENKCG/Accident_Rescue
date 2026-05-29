#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <Wire.h>
#include <MPU6050.h>

// Pin definitions
#define GSM_TX 7
#define GSM_RX 8
#define GPS_TX 3
#define GPS_RX 4
#define BUZZER_PIN 9
#define CANCEL_BUTTON 2

// Thresholds
#define IMPACT_THRESHOLD 2.5    // g-force threshold (tune for your vehicle)
#define ROLL_THRESHOLD 150.0    // degrees per second for roll/flip detection
#define WARNING_DURATION 15000  // 15 seconds warning window (ms)

SoftwareSerial gsmSerial(GSM_TX, GSM_RX);
SoftwareSerial gpsSerial(GPS_TX, GPS_RX);
TinyGPSPlus gps;
MPU6050 mpu;

const char* EMERGENCY_NUMBER = "+91XXXXXXXXXX";
bool impactDetected = false;
volatile bool alertCancelled = false;

// Rolling average buffer
#define FILTER_SIZE 5
float magnitudeBuffer[FILTER_SIZE];
int bufferIndex = 0;

void setup() {
  Serial.begin(9600);
  gsmSerial.begin(9600);
  gpsSerial.begin(9600);
  Wire.begin();
  mpu.initialize();

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(CANCEL_BUTTON, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(CANCEL_BUTTON), cancelAlert, FALLING);

  // Initialize buffer
  for(int i=0; i<FILTER_SIZE; i++) {
    magnitudeBuffer[i] = 1.0; // Assume 1g at rest
  }

  Serial.println("System Ready.");
}

void loop() {
  // Feed GPS data continuously
  gpsSerial.listen();
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  // Read MPU6050
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  float ax_g = ax / 16384.0;
  float ay_g = ay / 16384.0;
  float az_g = az / 16384.0;
  
  float gx_deg = gx / 131.0;
  float gy_deg = gy / 131.0;

  // Compute total G-force magnitude
  float magnitude = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);
  
  // Update rolling average buffer
  magnitudeBuffer[bufferIndex] = magnitude;
  bufferIndex = (bufferIndex + 1) % FILTER_SIZE;
  
  float avgMagnitude = 0;
  for(int i=0; i<FILTER_SIZE; i++) {
    avgMagnitude += magnitudeBuffer[i];
  }
  avgMagnitude /= FILTER_SIZE;

  // Check conditions
  bool linearImpact = avgMagnitude > IMPACT_THRESHOLD;
  bool rollover = abs(gx_deg) > ROLL_THRESHOLD || abs(gy_deg) > ROLL_THRESHOLD;

  if ((linearImpact || rollover) && !impactDetected) {
    Serial.print("Impact/Roll Detected! Avg G: "); Serial.print(avgMagnitude);
    Serial.print(" | Gyro X/Y: "); Serial.print(abs(gx_deg)); Serial.print("/"); Serial.println(abs(gy_deg));
    
    impactDetected = true;
    alertCancelled = false;
    triggerWarning();
  }

  delay(50); // Small delay for loop stability
}

void triggerWarning() {
  Serial.println("Warning phase started...");
  unsigned long startTime = millis();
  
  while (millis() - startTime < WARNING_DURATION) {
    // Toggle buzzer
    digitalWrite(BUZZER_PIN, (millis() / 200) % 2 == 0);
    
    if (alertCancelled) {
      Serial.println("Alert cancelled by user.");
      digitalWrite(BUZZER_PIN, LOW);
      impactDetected = false;
      return;
    }
    
    // Keep feeding GPS during warning
    while (gpsSerial.available()) gps.encode(gpsSerial.read());
  }

  digitalWrite(BUZZER_PIN, LOW);
  sendEmergencyAlert();
}

void sendEmergencyAlert() {
  Serial.println("Sending emergency alert...");

  float lat = gps.location.isValid() ? gps.location.lat() : 0.0;
  float lng = gps.location.isValid() ? gps.location.lng() : 0.0;

  String mapsLink = "https://maps.google.com/?q=" + String(lat, 6) + "," + String(lng, 6);
  String smsText = "ACCIDENT ALERT! Location: " + mapsLink;

  // Send SMS
  gsmSerial.listen();
  gsmSerial.println("AT+CMGF=1");
  delay(500);
  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(EMERGENCY_NUMBER);
  gsmSerial.println("\"");
  delay(500);
  gsmSerial.print(smsText);
  delay(200);
  gsmSerial.write(26); // Ctrl+Z to send
  delay(3000);
  Serial.println("SMS sent.");

  // Make call
  gsmSerial.print("ATD");
  gsmSerial.print(EMERGENCY_NUMBER);
  gsmSerial.println(";");
  
  unsigned long callStartTime = millis();
  while(millis() - callStartTime < 20000) {
    // Wait 20 seconds while calling
  }
  
  gsmSerial.println("ATH"); // Hang up
  Serial.println("Alert dispatched. Resetting system.");
  
  impactDetected = false;
  
  // Switch back to GPS
  gpsSerial.listen();
}
