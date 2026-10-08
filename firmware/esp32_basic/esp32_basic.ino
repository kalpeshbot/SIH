#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// SIH PHASE 4B: HARDENED ESP32 CONNECTION
// ==========================================

// --- Centralized Device Identity ---
const char* DEVICE_ID = "WR-ESP32";
const char* DEVICE_TYPE = "wearable";
const char* FIRMWARE_VERSION = "0.2.0";
const char* SESSION_ID = "SESS-ESP32"; // Hardcoded test session

// --- Network Configuration ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Use the IPv4 address of your computer running FastAPI (e.g., 192.168.1.10)
const char* BACKEND_URL = "http://192.168.X.X:8000";

// --- Timing Configuration (Non-blocking) ---
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long HEARTBEAT_INTERVAL_MS = 15000;
const unsigned long READING_INTERVAL_MS = 5000;
const int HTTP_TIMEOUT_MS = 5000;

// --- State Variables ---
unsigned long lastWifiRetryTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastReadingTime = 0;

float testValue = 20.0;
bool isBackendReachable = false;

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n================================");
  Serial.println("SIH ESP32 HARDENED DEVICE");
  Serial.println("================================");
  Serial.print("Device: "); Serial.println(DEVICE_ID);
  Serial.print("Type: "); Serial.println(DEVICE_TYPE);
  Serial.print("Firmware: "); Serial.println(FIRMWARE_VERSION);
  Serial.println("================================\n");

  connectWiFi();
}

// ==========================================
// MAIN LOOP (Non-blocking)
// ==========================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Manage Wi-Fi Connection
  if (WiFi.status() != WL_CONNECTED) {
    if (currentMillis - lastWifiRetryTime >= WIFI_RETRY_INTERVAL_MS) {
      lastWifiRetryTime = currentMillis;
      Serial.println("[WIFI] Connection lost. Reconnecting...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
    // Return early if no Wi-Fi, cannot do HTTP
    return; 
  }

  // 2. Periodic Heartbeat
  if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = currentMillis;
    sendHeartbeat();
  }

  // 3. Periodic Sensor Reading
  if (currentMillis - lastReadingTime >= READING_INTERVAL_MS) {
    lastReadingTime = currentMillis;
    sendReading();
  }
}

// ==========================================
// WIFI MANAGEMENT
// ==========================================
void connectWiFi() {
  Serial.print("[WIFI] Connecting to ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // We do a brief blocking wait on initial boot for convenience,
  // but loop() handles recovery non-blockingly.
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WIFI] Connected");
    Serial.print("[WIFI] IP: "); Serial.println(WiFi.localIP());
    Serial.print("[WIFI] RSSI: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  } else {
    Serial.println("[WIFI] Failed to connect initially. Loop will retry.");
  }
}

// ==========================================
// API CALLS
// ==========================================

// Centralized HTTP response handler
void handleApiResponse(int httpCode, String& endpointContext) {
  if (httpCode > 0) {
    if (httpCode >= 200 && httpCode < 300) {
      if (!isBackendReachable) {
        Serial.println("[API] Backend available");
        isBackendReachable = true;
      }
      Serial.print("[HTTP] 2xx Success - "); Serial.println(endpointContext);
    } else if (httpCode >= 400 && httpCode < 500) {
      Serial.print("[HTTP] 4xx Client Error (Code "); Serial.print(httpCode); 
      Serial.print(") - "); Serial.println(endpointContext);
      // Usually a data/schema error, retrying exactly the same payload won't fix it.
      // But we just let the interval loop naturally try the next reading.
    } else if (httpCode >= 500) {
      Serial.print("[HTTP] 5xx Server Error (Code "); Serial.print(httpCode); 
      Serial.print(") - "); Serial.println(endpointContext);
      isBackendReachable = false;
    }
  } else {
    Serial.print("[API] Connection failed or timeout - "); Serial.println(endpointContext);
    if (isBackendReachable) {
      Serial.println("[API] Backend unavailable");
      isBackendReachable = false;
    }
  }
}

void sendHeartbeat() {
  String url = String(BACKEND_URL) + "/api/devices/" + String(DEVICE_ID) + "/heartbeat";
  String context = "Heartbeat";
  
  HTTPClient http;
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  
  // Empty POST body is sufficient for our backend heartbeat endpoint
  int httpCode = http.POST(""); 
  
  handleApiResponse(httpCode, context);
  http.end(); // IMPORTANT: Free resources
}

void sendReading() {
  String url = String(BACKEND_URL) + "/api/readings";
  String context = "Telemetry Reading";
  
  // Generating fake sensor data for Phase 4B
  String payload = "{"
    "\"session_id\": \"" + String(SESSION_ID) + "\","
    "\"device_id\": \"" + String(DEVICE_ID) + "\","
    "\"sensor_type\": \"test_signal\","
    "\"value\": " + String(testValue) + ","
    "\"unit\": \"units\","
    "\"status\": \"NORMAL\""
  "}";
  
  HTTPClient http;
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(payload);
  
  // Only print detailed reading logs if we actually successfully sent it, 
  // to avoid spamming the console when the backend is down.
  if (httpCode >= 200 && httpCode < 300) {
    Serial.println("\n[READING SENT]");
    Serial.print("Value: "); Serial.println(testValue);
    
    // Cycle fake data
    testValue += 0.5;
    if (testValue > 50.0) testValue = 20.0;
  }
  
  handleApiResponse(httpCode, context);
  
  // Log free heap periodically alongside reading
  Serial.print("[MEM] Free heap: ");
  Serial.println(ESP.getFreeHeap());
  
  http.end(); // IMPORTANT: Free resources
}
