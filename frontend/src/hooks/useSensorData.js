import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useSensorData
 *
 * Hook central de datos del sensor. Actualmente opera en modo simulado.
 * Cuando el hardware esté listo, solo hay que cambiar SIMULATION_MODE
 * a false y apuntar API_URL al backend real.
 *
 * Retorna:
 *  - temperature   {number|null}   Último valor de temperatura
 *  - humidity      {number|null}   Último valor de humedad
 *  - tempHistory   {number[]}      Historial de temperaturas (máx. MAX_HISTORY)
 *  - humHistory    {number[]}      Historial de humedades   (máx. MAX_HISTORY)
 *  - readings      {object[]}      Lecturas completas para la tabla
 *  - lastUpdate    {string}        Texto de última actualización
 *  - online        {boolean}       Estado de conexión del dispositivo
 *  - stats         {object}        Estadísticas de sesión
 */

// ── Configuración ─────────────────────────────────────────────
// ── MODO DE OPERACIÓN ─────────────────────────────────────────
// true  = datos simulados (sin hardware)
// false = conecta al backend real (con ESP32)
const SIMULATION_MODE = false;

// ── URL del backend ────────────────────────────────────────────
// Reemplaza con la URL que te genere ngrok en el paso 2.
// Ejemplo: "https://abc123.ngrok-free.app"
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const POLL_INTERVAL   = 5000;                        // ms entre lecturas (simuladas o reales)
const MAX_HISTORY     = 60;                          // máximo de puntos en las gráficas
const MAX_READINGS    = 50;                          // máximo de filas en la tabla

// ── Helpers ───────────────────────────────────────────────────
function nowTime() {
  return new Date().toLocaleTimeString("es-MX", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// ── Simulador de lecturas DHT22 ───────────────────────────────
// Genera variaciones realistas con picos ocasionales
// para poder probar los estados de alerta sin hardware.
function createSimulator() {
  let simT = 24;
  let simH = 55;

  return function nextReading() {
    // Drift lento con pequeño ruido
    simT += (Math.random() - 0.47) * 0.7;
    simH += (Math.random() - 0.47) * 1.2;

    // Picos ocasionales (4% de probabilidad) para probar alertas
    if (Math.random() < 0.04) simT += 9;
    if (Math.random() < 0.04) simH += 16;

    simT = clamp(simT, 0, 42);
    simH = clamp(simH, 18, 90);

    return {
      temperature: parseFloat(simT.toFixed(1)),
      humidity:    parseFloat(simH.toFixed(1)),
    };
  };
}

// ── Hook principal ────────────────────────────────────────────
export default function useSensorData() {
  const [temperature, setTemperature] = useState(null);
  const [humidity,    setHumidity]    = useState(null);
  const [tempHistory, setTempHistory] = useState([]);
  const [humHistory,  setHumHistory]  = useState([]);
  const [readings,    setReadings]    = useState([]);
  const [lastUpdate,  setLastUpdate]  = useState("—");
  const [online,      setOnline]      = useState(false);
  const [stats,       setStats]       = useState({
    tempMax: null,
    tempMin: null,
    humAvg:  null,
    count:   0,
  });

  // Ref del simulador para que no se reinicie en cada render
  const simulatorRef = useRef(createSimulator());

  // ── Actualiza las estadísticas de sesión ───────────────────
  const updateStats = useCallback((allReadings) => {
    if (!allReadings.length) return;
    const temps = allReadings.map((r) => r.temperature);
    const hums  = allReadings.map((r) => r.humidity);
    setStats({
      tempMax: Math.max(...temps),
      tempMin: Math.min(...temps),
      humAvg:  hums.reduce((a, b) => a + b, 0) / hums.length,
      count:   allReadings.length,
    });
  }, []);

  // ── Procesa una lectura nueva (simulada o real) ────────────
  const processReading = useCallback((temp, hum) => {
    const time = nowTime();
    const newReading = { time, temperature: temp, humidity: hum };

    setTemperature(temp);
    setHumidity(hum);
    setLastUpdate(`Actualizado: ${time}`);
    setOnline(true);

    setTempHistory((prev) => [...prev, temp].slice(-MAX_HISTORY));
    setHumHistory( (prev) => [...prev, hum ].slice(-MAX_HISTORY));

    setReadings((prev) => {
      const updated = [...prev, newReading].slice(-MAX_READINGS);
      updateStats(updated);
      return updated;
    });
  }, [updateStats]);

  // ── Fetch al backend real ──────────────────────────────────
  const fetchReal = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/sensor/latest`, {
        headers: {
          // Header requerido para saltar la pantalla de advertencia de ngrok
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      processReading(
        parseFloat(data.temperature.toFixed(1)),
        parseFloat(data.humidity.toFixed(1))
      );
    } catch (err) {
      console.warn("[useSensorData] Error al conectar con el backend:", err.message);
      setOnline(false);
    }
  }, [processReading]);

  // ── Tick simulado ──────────────────────────────────────────
  const tickSimulated = useCallback(() => {
    const { temperature: t, humidity: h } = simulatorRef.current();
    processReading(t, h);
  }, [processReading]);

  // ── Efecto principal: arranca el intervalo ─────────────────
  useEffect(() => {
    // Primera lectura inmediata al montar
    if (SIMULATION_MODE) {
      tickSimulated();
    } else {
      fetchReal();
    }

    // Intervalo de actualización
    const interval = setInterval(
      SIMULATION_MODE ? tickSimulated : fetchReal,
      POLL_INTERVAL
    );

    return () => clearInterval(interval);
  }, [tickSimulated, fetchReal]);

  return {
    temperature,
    humidity,
    tempHistory,
    humHistory,
    readings,
    lastUpdate,
    online,
    stats,
  };
}