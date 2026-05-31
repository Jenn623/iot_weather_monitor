# backend para la interfaz, se encarga de hacer todas las solicitudes al esp32

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from collections import deque
from datetime import datetime, timezone
import asyncio
import json
import os
import random
import httpx
from dotenv import load_dotenv

# Carga variables del archivo .env (solo en local — en Railway se ignora)
load_dotenv()

# ── Configuración ─────────────────────────────────────────────
MAX_READINGS     = 200
TEMP_ALERT_THRESHOLD = 30.0   # °C — umbral para alerta Telegram

# Telegram — se leen desde variables de entorno (.env en Railway)
TELEGRAM_TOKEN   = os.getenv("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

print(f"[Telegram] Token cargado: {'✓' if TELEGRAM_TOKEN else '✗ NO ENCONTRADO'}")
print(f"[Telegram] Chat ID cargado: {'✓' if TELEGRAM_CHAT_ID else '✗ NO ENCONTRADO'}")

app = FastAPI(
    title="IoT Monitor API",
    description="Backend para monitoreo de temperatura y humedad con ESP32 + DHT22",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request

@app.middleware("http")
async def ngrok_header_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["ngrok-skip-browser-warning"] = "true"
    return response

# ── Almacenamiento en memoria ─────────────────────────────────
readings: deque = deque(maxlen=MAX_READINGS)
latest_reading: Optional[dict] = None

# Control del ventilador / LED
fan_state: bool = False

# Anti-spam para alertas Telegram (mínimo 60s entre alertas)
last_alert_time: Optional[datetime] = None

# Nodos simulados (base) — Nodo 1 es el ESP32 real
SIMULATED_NODES = [
    {"id": 2, "name": "Zona Norte",    "temp_base": 28.5, "hum_base": 55.0},
    {"id": 3, "name": "Recepción",     "temp_base": 29.2, "hum_base": 58.0},
    {"id": 4, "name": "Pasillo A",     "temp_base": 31.0, "hum_base": 52.0},
    {"id": 5, "name": "Servidores",    "temp_base": 26.0, "hum_base": 45.0},
    {"id": 6, "name": "Área de Carga", "temp_base": 34.5, "hum_base": 60.0},
]

# ── Gestor WebSocket ──────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        if not self.active:
            return
        message = json.dumps(data)
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(ws)

manager = ConnectionManager()

# ── Modelos Pydantic ──────────────────────────────────────────
class SensorPayload(BaseModel):
    temperatura: float = Field(..., ge=-40, le=80)
    humedad:     float = Field(..., ge=0,   le=100)

class FanCommand(BaseModel):
    state: bool   # True = encender, False = apagar

# ── Helpers ───────────────────────────────────────────────────
def build_reading(temperatura: float, humedad: float) -> dict:
    return {
        "temperature": round(temperatura, 2),
        "humidity":    round(humedad,    2),
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "device_id":   "esp32-001",
    }

async def send_telegram_alert(temperatura: float):
    """Envía alerta a Telegram si se supera el umbral y ha pasado suficiente tiempo."""
    global last_alert_time

    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return

    now = datetime.now(timezone.utc)
    if last_alert_time:
        elapsed = (now - last_alert_time).total_seconds()
        if elapsed < 60:
            return  # Anti-spam: mínimo 60 segundos entre alertas

    last_alert_time = now

    mensaje = (
        f"🚨 *ALERTA CRÍTICA — Monitor IoT*\n\n"
        f"🌡️ Temperatura: *{temperatura:.1f}°C*\n"
        f"⚠️ Supera el umbral de seguridad ({TEMP_ALERT_THRESHOLD}°C)\n\n"
        f"📍 Dispositivo: ESP32-001\n"
        f"🕐 Hora: {now.strftime('%H:%M:%S UTC')}\n\n"
        f"Verifica el estado del sistema."
    )

    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id":    TELEGRAM_CHAT_ID,
        "text":       mensaje,
        "parse_mode": "Markdown",
    }

    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, timeout=10)
    except Exception as e:
        print(f"[Telegram] Error al enviar alerta: {e}")

# ── Endpoints generales ───────────────────────────────────────
@app.get("/", tags=["General"])
def root():
    return {"service": "IoT Monitor API", "status": "ok", "version": "2.0.0"}

@app.get("/health", tags=["General"])
def health():
    return {"status": "healthy", "readings_stored": len(readings)}

# ── Sensor ────────────────────────────────────────────────────
@app.post("/api/sensor/data", tags=["Sensor"])
async def receive_data(payload: SensorPayload):
    global latest_reading

    reading = build_reading(payload.temperatura, payload.humedad)
    readings.append(reading)
    latest_reading = reading

    await manager.broadcast(reading)

    # Verificar si hay que enviar alerta por Telegram
    if payload.temperatura > TEMP_ALERT_THRESHOLD:
        asyncio.create_task(send_telegram_alert(payload.temperatura))

    return {"status": "ok", "received": reading}

@app.get("/api/sensor/latest", tags=["Sensor"])
def get_latest():
    if not latest_reading:
        raise HTTPException(
            status_code=404,
            detail="No hay lecturas disponibles aún. Espera a que el ESP32 envíe datos.",
        )
    return latest_reading

@app.get("/api/sensor/history", tags=["Sensor"])
def get_history(limit: int = 50):
    limit = min(limit, MAX_READINGS)
    data  = list(readings)
    return {"readings": data[-limit:], "total": len(data), "limit": limit}

@app.get("/api/sensor/stats", tags=["Sensor"])
def get_stats():
    if not readings:
        raise HTTPException(status_code=404, detail="Sin lecturas disponibles.")
    temps = [r["temperature"] for r in readings]
    hums  = [r["humidity"]    for r in readings]
    return {
        "temperature": {"min": round(min(temps), 2), "max": round(max(temps), 2), "avg": round(sum(temps) / len(temps), 2)},
        "humidity":    {"min": round(min(hums),  2), "max": round(max(hums),  2), "avg": round(sum(hums)  / len(hums),  2)},
        "total_readings": len(readings),
    }

# ── Ventilador / LED ──────────────────────────────────────────
@app.post("/api/fan", tags=["Actuadores"])
def control_fan(cmd: FanCommand):
    """
    El frontend envía { "state": true } para encender
    o { "state": false } para apagar el LED/ventilador.
    El ESP32 consulta GET /api/fan/state cada 3 segundos.
    """
    global fan_state
    fan_state = cmd.state
    return {"status": "ok", "fan": fan_state}

@app.get("/api/fan/state", tags=["Actuadores"])
def get_fan_state():
    """El ESP32 consulta este endpoint para saber si debe encender o apagar el LED."""
    return {"fan": fan_state}

# ── Nodos Multi-Nodo (Heatmap) ────────────────────────────────
@app.get("/api/nodes", tags=["Nodos"])
def get_nodes():
    """
    Devuelve el estado de los 6 nodos.
    Nodo 1 = ESP32 real, Nodos 2-6 = simulados con variación aleatoria.
    """
    nodes = []

    # Nodo 1 — datos reales del ESP32
    nodes.append({
        "id":   1,
        "name": "Nodo Principal",
        "temp": latest_reading["temperature"] if latest_reading else 0.0,
        "hum":  latest_reading["humidity"]    if latest_reading else 0.0,
    })

    # Nodos 2-6 — simulados con pequeña variación aleatoria
    for node in SIMULATED_NODES:
        nodes.append({
            "id":   node["id"],
            "name": node["name"],
            "temp": round(node["temp_base"] + random.uniform(-0.5, 0.5), 1),
            "hum":  round(node["hum_base"]  + random.uniform(-1.0, 1.0), 1),
        })

    return {"nodes": nodes, "total": len(nodes)}

# ── WebSocket ─────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        if latest_reading:
            await ws.send_text(json.dumps(latest_reading))
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text(json.dumps({"pong": True}))
    except WebSocketDisconnect:
        manager.disconnect(ws)