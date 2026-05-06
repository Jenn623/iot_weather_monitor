// ── Sensor ────────────────────────────────────────────────────

/*
 * IoT Monitor — ESP32-CAM + DHT22
 * Materia: Sistemas Distribuidos
 *
 * Conexiones (según guía técnica):
 *   DHT22 VCC  → 3.3V
 *   DHT22 GND  → GND
 *   DHT22 DATA → IO13
 *
 * Placa  : AI Thinker ESP32-CAM  (board = esp32cam en platformio.ini)
 * Monitor: 115200 baudios
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ── Sensor ────────────────────────────────────────────────────
#define DHTPIN   18       // GPIO18 (D18) por tamaño de la tarjeta
#define DHTTYPE  DHT22
DHT dht(DHTPIN, DHTTYPE);

// ── WiFi ──────────────────────────────────────────────────────
const char* ssid     = "Xiaomi 15";    // <-- cambia esto
const char* password = "0327jenni";     // <-- cambia esto

// ── Backend ───────────────────────────────────────────────────
// Pega aquí la URL que te genere ngrok en el paso 2.
// Ejemplo: "https://abc123.ngrok-free.app/api/sensor/data"
const char* serverURL = "http://192.168.191.21:8000/api/sensor/data";

// ── Intervalo de envío ────────────────────────────────────────
const unsigned long INTERVAL = 5000;  // 5 segundos
unsigned long lastSend       = 0;

// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=== IoT Monitor — ESP32-CAM + DHT11 ===");

  // Inicializar sensor DHT22
  dht.begin();
  Serial.println("Sensor DHT22 inicializado en IO13");

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
  Serial.println("========================================");
}

// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();
  if (now - lastSend < INTERVAL) return;
  lastSend = now;

  // ── Leer sensor ──────────────────────────────────────────────
  float temperatura = dht.readTemperature();
  float humedad     = dht.readHumidity();

  if (isnan(temperatura) || isnan(humedad)) {
    Serial.println("[ERROR] No se pudo leer el sensor DHT22. Verifica las conexiones.");
    return;
  }

  Serial.printf("[Lectura] Temp: %.1f°C | Hum: %.1f%%\n", temperatura, humedad);

  // ── Verificar WiFi ────────────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARN] WiFi desconectado, reconectando...");
    WiFi.reconnect();
    return;
  }

  // ── Enviar al backend vía HTTP POST ───────────────────────────
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  // Header requerido por ngrok para evitar la pantalla de advertencia
  http.addHeader("ngrok-skip-browser-warning", "true");

  // JSON que espera FastAPI: { "temperatura": 24.5, "humedad": 60.0 }
  String payload = "{\"temperatura\":" + String(temperatura, 1) +
                   ",\"humedad\":"     + String(humedad,     1) + "}";

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.printf("[OK] Enviado — HTTP %d | %s\n", httpCode, payload.c_str());
  } else {
    Serial.printf("[ERROR] HTTP %d — %s\n", httpCode, http.errorToString(httpCode).c_str());
  }

  http.end();
}