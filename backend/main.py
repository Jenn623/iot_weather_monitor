# backend para la interfaz, se encarga de hacer todas las solicitudes al esp32

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from collections import deque
from datetime import datetime, timezone
import asyncio
import json

# ── Configuración ─────────────────────────────────────────────
MAX_READINGS = 200   # Máximo de lecturas en memoria

app = FastAPI(
    title="IoT Monitor API",
    description="Backend para monitoreo de temperatura y humedad con ESP32 + DHT22",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────
# Permite que el frontend React y el ESP32 consuman la API.
# allow_origins=["*"] es necesario para ngrok y ESP32.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Header requerido por ngrok ─────────────────────────────────
# ngrok verifica este header en todas las peticiones.
# El ESP32 y el frontend deben incluirlo cuando usen ngrok.
from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def ngrok_header_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["ngrok-skip-browser-warning"] = "true"
    return response

# ── Almacenamiento en memoria ─────────────────────────────────
# Se usa deque para limitar automáticamente el tamaño.
# Cuando llegue el hardware real se puede reemplazar por una base de datos.
readings: deque = deque(maxlen=MAX_READINGS)
latest_reading: Optional[dict] = None

# ── Gestor de conexiones WebSocket ────────────────────────────
class ConnectionManager:
    """
    Mantiene la lista de clientes WebSocket conectados
    y les envía cada nueva lectura en tiempo real.
    """
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        """Envía un mensaje a todos los clientes conectados."""
        if not self.active:
            return
        message = json.dumps(data)
        # Envía a todos; si uno falla, lo desconecta limpiamente
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(ws)

manager = ConnectionManager()

# ── Modelos Pydantic ──────────────────────────────────────────
class SensorPayload(BaseModel):
    """
    Payload que envía el ESP32 vía HTTP POST.
    Los nombres en español coinciden con el código Arduino del prototipo.
    """
    temperatura: float = Field(..., ge=-40, le=80,  description="Temperatura en °C")
    humedad:     float = Field(..., ge=0,   le=100, description="Humedad relativa en %")

class SensorReading(BaseModel):
    """Lectura completa con metadatos, tal como se almacena y devuelve."""
    temperature: float
    humidity:    float
    timestamp:   str
    device_id:   str = "esp32-001"

# ── Helpers ───────────────────────────────────────────────────
def build_reading(temperatura: float, humedad: float) -> dict:
    """Construye el dict de lectura con timestamp UTC."""
    return {
        "temperature": round(temperatura, 2),
        "humidity":    round(humedad,    2),
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "device_id":   "esp32-001",
    }

# ── Endpoints ─────────────────────────────────────────────────

@app.get("/", tags=["General"])
def root():
    return {
        "service": "IoT Monitor API",
        "status":  "ok",
        "version": "1.0.0",
    }


@app.get("/health", tags=["General"])
def health():
    """Endpoint de salud para Kubernetes readiness probe."""
    return {"status": "healthy", "readings_stored": len(readings)}


@app.post("/api/sensor/data", tags=["Sensor"])
async def receive_data(payload: SensorPayload):
    """
    El ESP32 llama a este endpoint cada N segundos con:
    { "temperatura": 24.5, "humedad": 60.0 }

    Almacena la lectura y la difunde a todos los clientes
    WebSocket conectados en tiempo real.
    """
    global latest_reading

    reading = build_reading(payload.temperatura, payload.humedad)
    readings.append(reading)
    latest_reading = reading

    # Notifica a todos los clientes WebSocket conectados
    await manager.broadcast(reading)

    return {"status": "ok", "received": reading}


@app.get("/api/sensor/latest", tags=["Sensor"])
def get_latest():
    """Devuelve la lectura más reciente. El frontend hace polling a este endpoint."""
    if not latest_reading:
        raise HTTPException(
            status_code=404,
            detail="No hay lecturas disponibles aún. Espera a que el ESP32 envíe datos.",
        )
    return latest_reading


@app.get("/api/sensor/history", tags=["Sensor"])
def get_history(limit: int = 50):
    """
    Devuelve el historial de lecturas.
    Parámetro opcional: limit (máx. 200, default 50)
    """
    limit = min(limit, MAX_READINGS)
    data  = list(readings)
    return {
        "readings": data[-limit:],
        "total":    len(data),
        "limit":    limit,
    }


@app.get("/api/sensor/stats", tags=["Sensor"])
def get_stats():
    """Estadísticas calculadas sobre todas las lecturas en memoria."""
    if not readings:
        raise HTTPException(
            status_code=404,
            detail="Sin lecturas disponibles para calcular estadísticas.",
        )
    temps = [r["temperature"] for r in readings]
    hums  = [r["humidity"]    for r in readings]
    return {
        "temperature": {
            "min": round(min(temps), 2),
            "max": round(max(temps), 2),
            "avg": round(sum(temps) / len(temps), 2),
        },
        "humidity": {
            "min": round(min(hums), 2),
            "max": round(max(hums), 2),
            "avg": round(sum(hums) / len(hums), 2),
        },
        "total_readings": len(readings),
    }


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Conexión WebSocket para actualizaciones en tiempo real.
    El frontend se conecta aquí y recibe cada nueva lectura
    del ESP32 sin necesidad de hacer polling.

    Uso desde el frontend (cuando se active):
        const socket = new WebSocket("ws://localhost:8000/ws");
        socket.onmessage = (e) => console.log(JSON.parse(e.data));
    """
    await manager.connect(ws)
    try:
        # Si ya hay una lectura previa, la enviamos al cliente al conectarse
        if latest_reading:
            await ws.send_text(json.dumps(latest_reading))

        # Mantiene la conexión viva esperando mensajes del cliente
        # (el cliente puede enviar "ping" para verificar la conexión)
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text(json.dumps({"pong": True}))
    except WebSocketDisconnect:
        manager.disconnect(ws)