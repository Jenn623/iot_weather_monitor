# IoT Monitor — Guía de despliegue

## Estructura del proyecto

```
iot-monitor/
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
└── k8s/
    └── manifests.yaml
```

---

## 1. Desarrollo local (sin Docker)

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Documentación en: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm install
npm run dev
# Dashboard en: http://localhost:5173
```

---

## 2. Despliegue con Kubernetes (minikube)

### Paso 1 — Apuntar Docker a minikube
```bash
minikube start
eval $(minikube docker-env)
```

### Paso 2 — Construir las imágenes
```bash
# Backend
docker build -t iot-backend:latest ./backend

# Frontend (apunta al servicio interno de K8s)
docker build \
  --build-arg VITE_API_URL=http://iot-backend-service:8000 \
  -t iot-frontend:latest \
  ./frontend
```

### Paso 3 — Aplicar los manifiestos
```bash
kubectl apply -f k8s/manifests.yaml
```

### Paso 4 — Verificar que los pods estén corriendo
```bash
kubectl get pods
# NAME                            READY   STATUS    RESTARTS
# iot-backend-xxx                 1/1     Running   0
# iot-frontend-xxx                1/1     Running   0

kubectl get services
# NAME                   TYPE        PORT(S)
# iot-backend-service    ClusterIP   8000/TCP
# iot-frontend-service   NodePort    80:30080/TCP
```

### Paso 5 — Abrir el dashboard
```bash
minikube ip
# Ej: 192.168.49.2
# Abre en el navegador: http://192.168.49.2:30080
```

---

## 3. Conectar el ESP32

Una vez que el clúster esté corriendo, el ESP32 debe enviar datos a:

```
POST http://<IP-del-nodo>:30080/api/sensor/data
Content-Type: application/json

{ "temperatura": 24.5, "humedad": 60.0 }
```

### Código Arduino (fragmento)
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

#define DHTPIN  15
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

const char* ssid     = "TU_RED_WIFI";
const char* password = "TU_PASSWORD";
const char* server   = "http://<IP-del-nodo>:30080/api/sensor/data";

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi conectado");
}

void loop() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (!isnan(temp) && !isnan(hum)) {
    HTTPClient http;
    http.begin(server);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"temperatura\":" + String(temp, 1) +
                     ",\"humedad\":"     + String(hum,  1) + "}";

    int code = http.POST(payload);
    Serial.println("HTTP " + String(code) + " — " + payload);
    http.end();
  }
  delay(5000);
}
```

---

## 4. Endpoints del backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio (K8s probe) |
| POST | `/api/sensor/data` | ESP32 envía lectura |
| GET | `/api/sensor/latest` | Última lectura |
| GET | `/api/sensor/history?limit=50` | Historial |
| GET | `/api/sensor/stats` | Estadísticas de sesión |
| WS | `/ws` | WebSocket tiempo real |

---

## 5. Activar modo WebSocket en el frontend

Cuando quieras cambiar de polling a WebSocket en tiempo real,
edita `src/hooks/useSensorData.js`:

```js
const SIMULATION_MODE = false;  // ya estaba en false
```

Y en el hook, cambia el intervalo de polling por una conexión WS:

```js
const socket = new WebSocket(`ws://<IP-del-nodo>:30080/ws`);
socket.onmessage = (e) => {
  const data = JSON.parse(e.data);
  processReading(data.temperature, data.humidity);
};
```