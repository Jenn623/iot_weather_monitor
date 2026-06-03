# 🌡️ Monitor IoT — ESP32 + DHT22

Sistema de monitoreo ambiental en tiempo real con alertas por Telegram y control remoto de actuadores.

**Stack:** ESP32 · DHT22 · FastAPI · React · Docker · Railway · Telegram Bot

---

## 📋 Requisitos previos

Antes de empezar, asegúrate de tener instalado:

| Herramienta | Descarga |
|---|---|
| Git | https://git-scm.com |
| Node.js 20+ | https://nodejs.org |
| Python 3.11+ | https://python.org |
| PlatformIO (VSCode) | Extensión en el marketplace de VSCode |
| Driver CP210x (ESP32) | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |

---

## 🔌 Conexiones del hardware

### Sensor DHT22

| Pin DHT22 | Pin ESP32 |
|---|---|
| VCC (+) | 3.3V |
| GND (-) | GND |
| DATA | D18 (GPIO18) |

> Conecta una resistencia de **10kΩ** entre el pin VCC y el pin DATA del DHT22.

### LED (ventilador simulado)

| Pin LED | Conexión |
|---|---|
| Ánodo (+) pata larga | D4 (GPIO4) → Resistencia 220Ω |
| Cátodo (-) pata corta | GND |

> ⚠️ No uses el GPIO2 para el LED externo — en el ESP32 DevKit V1 ese pin controla el LED azul integrado de la placa.

---

## 📂 Estructura del proyecto

```
iot_weather_monitor/
├── arduino/
│   └── iot_monitor/
│       ├── src/
│       │   └── main.cpp        ← código del ESP32
│       └── platformio.ini
├── backend/
│   ├── main.py                 ← API FastAPI
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/
│   │   │   └── useSensorData.js
│   │   └── components/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── README.md
```

---

## 🚀 Instalación paso a paso

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/Jenn623/iot_weather_monitor.git
cd iot_weather_monitor
```

---

### Paso 2 — Configurar el Bot de Telegram

Necesitas crear un bot de Telegram para recibir alertas automáticas cuando la temperatura supere los 36°C.

**2.1 — Crear el bot:**

1. Abre Telegram y busca `@BotFather`
2. Envía el comando `/newbot`
3. Ponle un nombre (ej. `Monitor IoT`) y un username que termine en `bot` (ej. `monitor_iot_tubot`)
4. BotFather te dará un **token** — guárdalo, lo necesitarás más adelante

**2.2 — Obtener tu Chat ID:**

1. Busca tu bot en Telegram por su username y envíale cualquier mensaje (ej. `hola`)
2. Abre esta URL en el navegador, reemplazando `TU_TOKEN` con el token que te dio BotFather:
   ```
   https://api.telegram.org/botTU_TOKEN/getUpdates
   ```
3. En la respuesta busca el campo `"id"` dentro de `"chat"` — ese número es tu **Chat ID**

---

### Paso 3 — Desplegar el backend en Railway

El backend debe estar en la nube para que el ESP32 pueda enviarle datos desde cualquier red.

**3.1 — Crear cuenta en Railway:**

1. Ve a https://railway.app y regístrate con tu cuenta de GitHub
2. Haz clic en **New Project → Deploy from GitHub repo**
3. Selecciona el repositorio `iot_weather_monitor`

**3.2 — Configurar el servicio del backend:**

1. En Railway, ve a tu servicio → **Settings**
2. En **Root Directory** escribe: `backend`
3. En **Build** verifica que detecte el `Dockerfile` automáticamente
4. Guarda los cambios — Railway desplegará automáticamente

**3.3 — Agregar las variables de entorno de Telegram:**

1. En Railway, ve a tu servicio → **Variables**
2. Agrega estas dos variables:

   | Variable | Valor |
   |---|---|
   | `TELEGRAM_TOKEN` | El token que te dio BotFather |
   | `TELEGRAM_CHAT_ID` | Tu Chat ID obtenido en el paso 2.2 |

3. Railway redesplegará automáticamente con las nuevas variables

**3.4 — Obtener la URL del backend:**

1. En Railway, ve a tu servicio → **Settings → Networking → Public Networking**
2. Haz clic en **Generate Domain** y selecciona el puerto **8080**
3. Anota la URL — se verá así: `https://tu-proyecto.up.railway.app`

**3.5 — Verificar que funciona:**

Abre en el navegador:
```
https://tu-proyecto.up.railway.app/health
```
Debe responder:
```json
{"status": "healthy", "readings_stored": 0}
```

---

### Paso 4 — Desplegar el frontend en Railway

**4.1 — Crear un segundo servicio:**

1. En tu mismo proyecto de Railway, haz clic en **New Service → GitHub Repo**
2. Selecciona el mismo repositorio `iot_weather_monitor`

**4.2 — Configurar el servicio del frontend:**

1. Ve a **Settings**
2. En **Root Directory** escribe: `frontend`
3. En **Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | La URL del backend del paso 3.4 |

4. Guarda — Railway construirá y desplegará el frontend automáticamente

**4.3 — Obtener la URL del frontend:**

1. Ve a **Settings → Networking → Public Networking**
2. Haz clic en **Generate Domain** y selecciona el puerto **8080**
3. Anota la URL — esa es la dirección del panel web

---

### Paso 5 — Configurar y subir el código al ESP32

**5.1 — Abrir el proyecto en PlatformIO:**

1. Abre VSCode
2. Ve a **File → Open Folder** y selecciona la carpeta `arduino/iot_monitor/`
3. PlatformIO detectará el proyecto y descargará las librerías necesarias automáticamente

**5.2 — Editar las credenciales en `src/main.cpp`:**

Abre el archivo `arduino/iot_monitor/src/main.cpp` y cambia estas líneas:

```cpp
// ── WiFi ──────────────────────────────────────────────────────
const char* ssid     = "NOMBRE_DE_TU_RED_WIFI";    // ← cambia esto
const char* password = "CONTRASEÑA_DE_TU_WIFI";    // ← cambia esto

// ── Backend (Railway) ─────────────────────────────────────────
const char* URL_SENSOR    = "https://tu-proyecto.up.railway.app/api/sensor/data";   // ← URL del paso 3.4
const char* URL_FAN_STATE = "https://tu-proyecto.up.railway.app/api/fan/state";     // ← URL del paso 3.4
```

> ⚠️ El ESP32 solo se conecta a redes **2.4 GHz**. Si tienes una red de 5 GHz, usa el hotspot de tu celular configurado en 2.4 GHz.

**5.3 — Subir el código al ESP32:**

1. Conecta el ESP32 a tu computadora con un cable USB que soporte datos (no solo carga)
2. En la terminal de VSCode ejecuta:
   ```bash
   pio run --target upload --upload-port COM8
   ```
   > Reemplaza `COM8` con el puerto que aparezca en tu equipo. Para verlo ejecuta `pio device list`.
3. Cuando aparezca `Connecting......` en la terminal, presiona y mantén el botón **BOOT** del ESP32, luego presiona **RST** una vez y suelta ambos botones

**5.4 — Verificar en el Monitor Serie:**

```bash
pio device monitor --baud 115200 --port COM8
```

Presiona **RST** en el ESP32. Debes ver:

```
=== IoT Monitor v2 — ESP32 + DHT22 + LED ===
LED en GPIO4 inicializado (OFF)
Sensor DHT22 inicializado en D18 (GPIO18)
Conectando a: NombreDeTuRed
...
¡WiFi Conectado!
IP local: 192.168.x.x
[Lectura] Temp: 29.2°C | Hum: 57.5%
[OK] Enviado — HTTP 200
```

---

## ✅ Verificación final

Una vez completados todos los pasos, abre el panel web con la URL del frontend y verifica:

| Elemento | Estado esperado |
|---|---|
| Indicador de conexión | "Red IoT en línea" (punto verde parpadeante) |
| Gauges de temperatura y humedad | Muestran valores reales del sensor |
| Nodo Principal en el mapa de calor | Muestra la temperatura real del ESP32 |
| Badge de Telegram | "Telegram Bot: Activo" |
| Botón del ventilador | Al hacer clic, el LED en D4 enciende en ~3 segundos |
| Alertas de Telegram | Acerca calor al sensor hasta superar 36°C — debe llegar un mensaje |

---

## 🔧 Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| POST | `/api/sensor/data` | El ESP32 envía lecturas |
| GET | `/api/sensor/latest` | Última lectura disponible |
| GET | `/api/sensor/history?limit=50` | Historial de lecturas |
| GET | `/api/sensor/stats` | Estadísticas de la sesión |
| POST | `/api/fan` | Encender/apagar el LED remotamente |
| GET | `/api/fan/state` | Estado actual del LED (lo consulta el ESP32) |
| GET | `/api/nodes` | Estado de los 6 nodos del mapa de calor |
| WS | `/ws` | WebSocket para tiempo real |

La documentación interactiva de la API está disponible en:
```
https://tu-proyecto.up.railway.app/docs
```

---

## ❓ Solución de problemas comunes

**El ESP32 no entra en modo de programación:**
- Mantén presionado **BOOT**, luego presiona y suelta **RST**, después suelta **BOOT**

**El Monitor Serie muestra solo puntos `......`:**
- El ESP32 no conectó al WiFi. Verifica que el SSID y contraseña sean correctos y que la red sea de 2.4 GHz

**El LED no responde al botón del panel:**
- El ESP32 consulta el estado cada 3 segundos — espera unos segundos
- Verifica que el LED esté conectado al GPIO4 (D4) y no al GPIO2

**No llegan alertas de Telegram:**
- Verifica que hayas enviado al menos un mensaje al bot antes de obtener el Chat ID
- Confirma que `TELEGRAM_TOKEN` y `TELEGRAM_CHAT_ID` estén correctamente configurados en Railway

**El backend responde 404 en `/api/sensor/latest`:**
- Es normal cuando el ESP32 aún no ha enviado ninguna lectura. Espera unos segundos

---

## 📡 Funcionamiento del sistema

```
DHT22 → ESP32 ──── HTTP POST /api/sensor/data ────► FastAPI (Railway)
                                                           │
                ◄── HTTP GET /api/fan/state ───────────────┤
                                                           │
                                              React (Railway) ◄── Usuario
                                                           │
                                              Telegram Bot ──► Usuario
```

- El ESP32 **envía** lecturas cada **5 segundos**
- El ESP32 **consulta** el estado del LED cada **3 segundos**
- El frontend **actualiza** los datos cada **5 segundos**
- El backend **envía alerta** a Telegram cuando la temperatura supera **36°C** (máximo 1 alerta por minuto)

---

## 📄 Licencia

Proyecto desarrollado para la materia de Sistemas Distribuidos — 2025.