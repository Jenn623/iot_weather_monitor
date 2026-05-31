/*
 * IoT Monitor — ESP32 + DHT22 + LED (Ventilador Simulado)
 * Materia: Sistemas Distribuidos
 *
 * Conexiones:
 *   DHT22 VCC  → 3.3V
 *   DHT22 GND  → GND
 *   DHT22 DATA → D18 (GPIO18)
 *   LED (+)    → D2  (GPIO2) → Resistencia → GND
 *
 * Placa  : ESP32 DevKit V1
 * Monitor: 115200 baudios
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ── Pines ─────────────────────────────────────────────────────
#define DHTPIN        18    // GPIO18 — datos del sensor DHT22
#define DHTTYPE       DHT22
#define LED_PIN       4     // GPIO4 (D4) — LED / ventilador simulado

DHT dht(DHTPIN, DHTTYPE);

// ── WiFi ──────────────────────────────────────────────────────
const char* ssid     = "Xiaomi 15";
const char* password = "0327jenni";

// ── Backend (Railway) ─────────────────────────────────────────
const char* SERVER_BASE   = "https://iotweathermonitor-production-ece1.up.railway.app";
const char* URL_SENSOR    = "https://iotweathermonitor-production-ece1.up.railway.app/api/sensor/data";
const char* URL_FAN_STATE = "https://iotweathermonitor-production-ece1.up.railway.app/api/fan/state";

// ── Intervalos ────────────────────────────────────────────────
const unsigned long INTERVAL_SENSOR = 5000;   // Enviar datos cada 5s
const unsigned long INTERVAL_FAN    = 3000;   // Consultar estado LED cada 3s

unsigned long lastSensor = 0;
unsigned long lastFan    = 0;

// ── Estado actual del LED ─────────────────────────────────────
bool fanActive = false;

// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=== IoT Monitor v2 — ESP32 + DHT22 + LED ===");

  // Inicializar pines
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED en GPIO2 inicializado (OFF)");

  // Pull-up interno en el pin DATA del sensor
  pinMode(DHTPIN, INPUT_PULLUP);
  dht.begin();
  Serial.println("Sensor DHT22 inicializado en D18 (GPIO18)");

  // Conectar WiFi
  Serial.print("Conectando a: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n¡WiFi Conectado!");
  Serial.print("IP local: ");
  Serial.println(WiFi.localIP());
  Serial.println("============================================");
}

// ── Enviar datos del sensor al backend ───────────────────────
void sendSensorData() {
  float temperatura = dht.readTemperature();
  float humedad     = dht.readHumidity();

  if (isnan(temperatura) || isnan(humedad)) {
    Serial.println("[ERROR] No se pudo leer el sensor DHT22.");
    return;
  }

  Serial.printf("[Lectura] Temp: %.1f°C | Hum: %.1f%%\n", temperatura, humedad);

  // Control local: si supera 36°C enciende el LED inmediatamente
  if (temperatura > 36.0) {
    digitalWrite(LED_PIN, HIGH);
    fanActive = true;
    Serial.println("[ALERTA LOCAL] Temp > 36°C — LED ON (control local)");
  }

  HTTPClient http;
  http.begin(URL_SENSOR);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"temperatura\":" + String(temperatura, 1) +
                   ",\"humedad\":"     + String(humedad,     1) + "}";

  int code = http.POST(payload);

  if (code == 200) {
    Serial.printf("[OK] Enviado — HTTP %d\n", code);
  } else {
    Serial.printf("[ERROR] HTTP %d\n", code);
  }

  http.end();
}

// ── Consultar estado del ventilador al backend ───────────────
void checkFanState() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(URL_FAN_STATE);

  int code = http.GET();

  if (code == 200) {
    String body = http.getString();

    // Parsear JSON: {"fan": true} o {"fan": false}
    StaticJsonDocument<64> doc;
    DeserializationError err = deserializeJson(doc, body);

    if (!err) {
      bool newState = doc["fan"].as<bool>();

      if (newState != fanActive) {
        fanActive = newState;
        digitalWrite(LED_PIN, fanActive ? HIGH : LOW);
        Serial.printf("[Actuador] LED %s por comando remoto\n",
                      fanActive ? "ENCENDIDO" : "APAGADO");
      }
    }
  }

  http.end();
}

// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARN] WiFi desconectado, reconectando...");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  // Enviar datos del sensor cada 5s
  if (now - lastSensor >= INTERVAL_SENSOR) {
    lastSensor = now;
    sendSensorData();
  }

  // Consultar estado del LED cada 3s
  if (now - lastFan >= INTERVAL_FAN) {
    lastFan = now;
    checkFanState();
  }
}