import React, { useState, useEffect } from "react";
import {
  Thermometer, Droplets, Activity, Clock, Wifi,
  Sun, Moon, ThermometerSun, ThermometerSnowflake,
  BarChart3, List, Fan, MessageCircle, Map, Power
} from "lucide-react";

import { useTheme }   from "./context/ThemeContext";
import useSensorData  from "./hooks/useSensorData";
import SparkLine      from "./components/SparkLine";
import AlertBanner    from "./components/AlertBanner";

// ── Helpers de estado ─────────────────────────────────────────
function getTempStatus(t) {
  if (t === null) return "ok";
  if (t > 35 || t < 5)  return "critical";
  if (t > 30 || t < 10) return "warning";
  return "ok";
}
function getHumStatus(h) {
  if (h === null) return "ok";
  if (h > 80 || h < 20) return "critical";
  if (h > 70 || h < 30) return "warning";
  return "ok";
}
function getWorstStatus(t, h) {
  const ts = getTempStatus(t), hs = getHumStatus(h);
  return ts === "critical" || hs === "critical" ? "critical"
       : ts === "warning"  || hs === "warning"  ? "warning" : "ok";
}

const STATUS_LABEL = { ok: "Normal", warning: "Advertencia", critical: "Crítico" };
const STATUS_BADGE = {
  ok:       "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  warning:  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  critical: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30",
};
const STATUS_PILL = {
  ok:       "px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide border border-emerald-200 dark:border-emerald-500/30",
  warning:  "px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide border border-amber-200 dark:border-amber-500/30",
  critical: "px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide border border-rose-200 dark:border-rose-500/30",
};

// ── GaugeDisplay ──────────────────────────────────────────────
function GaugeDisplay({ value, min, max, unit, color }) {
  const isDark = document.documentElement.classList.contains("dark");
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const dashOffset = 125 - pct * 125;
  return (
    <div className="relative w-40 sm:w-48 h-24 sm:h-28 flex items-end justify-center">
      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 50">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none"
          stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray="125" strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="text-center mb-1 sm:mb-2">
        <span className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight mono">
          {value !== null ? value.toFixed(1) : "0.0"}
        </span>
        <span className="text-base sm:text-lg text-slate-500 ml-1">{unit}</span>
      </div>
    </div>
  );
}

// ── Heatmap helpers ───────────────────────────────────────────
function getHeatColor(temp) {
  if (temp >= 34) return "bg-rose-500 dark:bg-rose-600 text-white border-rose-600";
  if (temp >= 31) return "bg-orange-500 dark:bg-orange-600 text-white border-orange-600";
  if (temp >= 29) return "bg-amber-300 dark:bg-amber-500 text-slate-800 border-amber-400";
  return "bg-emerald-400 dark:bg-emerald-500 text-slate-900 border-emerald-500";
}

// ── StatCard ──────────────────────────────────────────────────
function StatCard({ title, value, icon, color, isOnline }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-center transition-colors relative overflow-hidden group h-full">
      <div className={`absolute -right-3 -bottom-3 sm:-right-4 sm:-bottom-4 opacity-5 ${color} transform group-hover:scale-110 transition-transform duration-300 pointer-events-none`}>
        {React.cloneElement(icon, { size: 70 })}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 relative z-10">
        <span className={color}>{icon}</span>
        <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{title}</h4>
      </div>
      <div className="relative z-10 mt-auto">
        {isOnline !== undefined ? (
          <span className={`text-base sm:text-lg md:text-xl font-bold ${isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {value}
          </span>
        ) : (
          <span className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight mono">{value}</span>
        )}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const {
    temperature, humidity,
    tempHistory, humHistory,
    readings, lastUpdate, online, stats,
  } = useSensorData();

  const [fanActive,  setFanActive]  = useState(false);
  const [fanLoading, setFanLoading] = useState(false);
  const [heatmapZones, setHeatmapZones] = useState([
    { id: 1, name: "Nodo Principal", temp: 0 },
    { id: 2, name: "Zona Norte",     temp: 28.5 },
    { id: 3, name: "Recepción",      temp: 29.2 },
    { id: 4, name: "Pasillo A",      temp: 31.0 },
    { id: 5, name: "Servidores",     temp: 26.0 },
    { id: 6, name: "Área de Carga",  temp: 34.5 },
  ]);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const tempStatus = getTempStatus(temperature);
  const humStatus  = getHumStatus(humidity);

  // Controla el ventilador/LED via backend
  const toggleFan = async () => {
    setFanLoading(true);
    try {
      const res = await fetch(API_URL + "/api/fan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ state: !fanActive }),
      });
      if (res.ok) {
        setFanActive(!fanActive);
      }
    } catch (err) {
      console.error("[Fan] Error de red:", err);
    } finally {
      setFanLoading(false);
    }
  };

  // Actualiza heatmap desde backend cada 5s
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch(API_URL + "/api/nodes");
        if (res.ok) {
          const data = await res.json();
          setHeatmapZones(data.nodes.map(n => ({
            id:   n.id,
            name: n.name,
            temp: n.temp,
          })));
        }
      } catch (err) {
        // Mantiene valores anteriores si falla
      }
    };
    fetchNodes();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, [API_URL]);

  return (
    <div className={`min-h-screen w-full ${isDark ? "dark" : ""}`}>
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="w-full max-w-[1600px] mx-auto space-y-5 sm:space-y-6">

          {/* ── HEADER ── */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 lg:px-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
              <div className="p-2 sm:p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                <Activity className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Monitor IoT</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">ESP32 + DHT22 — Planta Principal</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto text-xs sm:text-sm font-medium">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 rounded-full border border-sky-200 dark:border-sky-500/30 shadow-sm">
                <MessageCircle size={16} />
                <span className="hidden sm:inline font-bold">Telegram Bot: Activo</span>
                <span className="sm:hidden font-bold">Bot Activo</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock size={15} />
                <span className="hidden sm:inline">Actualizado:</span> {lastUpdate}
              </span>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border ${
                  online
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                }`}>
                  <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${online ? "bg-emerald-400" : "bg-rose-400"}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 ${online ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                  </span>
                  <span className="hidden sm:inline">{online ? "Red IoT en línea" : "Sin conexión"}</span>
                  <span className="sm:hidden">{online ? "En línea" : "Offline"}</span>
                </div>
                <button onClick={toggleTheme}
                  className="p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>
          </header>

          {/* ── ALERT BANNER ── */}
          <AlertBanner temperature={temperature} humidity={humidity} />

          {/* ── FILA 1: GAUGES + STATS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden transition-colors h-full">
                <div className="absolute top-4 left-4 p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-orange-500">
                  <Thermometer size={20} />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 mt-2">
                  Temperatura (Principal)
                </h3>
                <GaugeDisplay value={temperature ?? 0} min={-10} max={60} unit="°C" color="#f97316" />
                <div className="mt-4">
                  <span className={STATUS_PILL[tempStatus]}>{STATUS_LABEL[tempStatus]}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden transition-colors h-full">
                <div className="absolute top-4 left-4 p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-500">
                  <Droplets size={20} />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 mt-2">
                  Humedad Relativa
                </h3>
                <GaugeDisplay value={humidity ?? 0} min={0} max={100} unit="%" color="#3b82f6" />
                <div className="mt-4">
                  <span className={STATUS_PILL[humStatus]}>{STATUS_LABEL[humStatus]}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4 sm:gap-5">
              <StatCard title="Temp. Máxima"     value={stats.tempMax !== null ? `${stats.tempMax.toFixed(1)}°C` : "—"} icon={<ThermometerSun size={16} />}      color="text-rose-500"   />
              <StatCard title="Temp. Mínima"     value={stats.tempMin !== null ? `${stats.tempMin.toFixed(1)}°C` : "—"} icon={<ThermometerSnowflake size={16} />} color="text-sky-500"    />
              <StatCard title="Humedad Prom."    value={stats.humAvg  !== null ? `${stats.humAvg.toFixed(1)}%`   : "—"} icon={<Droplets size={16} />}             color="text-blue-500"   />
              <StatCard title="Lecturas Totales" value={stats.count}                                                     icon={<BarChart3 size={16} />}            color="text-indigo-500" />
            </div>
          </div>

          {/* ── FILA 2: ACTUADORES + HEATMAP ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

            {/* Control Remoto */}
            <div className={`lg:col-span-4 rounded-3xl p-5 sm:p-6 shadow-sm border transition-all duration-500 flex flex-col justify-between relative overflow-hidden ${
              fanActive
                ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            }`}>
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Fan size={120} className={fanActive ? "animate-spin text-blue-500" : "text-slate-500"} />
              </div>
              <div className="relative z-10 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Power size={18} className={fanActive ? "text-blue-500" : "text-slate-400"} />
                    Actuadores (Remoto)
                  </h3>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    fanActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {fanActive ? "ACTIVO" : "EN ESPERA"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Ventilación Principal (Pin D2)
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                  <MessageCircle size={14} /> Sincronizado con Telegram
                </div>
              </div>
              <button
                onClick={toggleFan}
                disabled={fanLoading}
                className={`relative z-10 w-full py-3 sm:py-4 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 border shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                  fanActive
                    ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:border-rose-500/30 dark:text-rose-400"
                    : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-500 shadow-blue-500/20"
                }`}
              >
                <Fan size={18} className={fanActive && !fanLoading ? "animate-spin" : ""} />
                {fanLoading ? "ENVIANDO..." : fanActive ? "APAGAR VENTILADOR" : "ENCENDER VENTILADOR"}
              </button>
            </div>

            {/* Heatmap */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Map size={18} className="text-orange-500" />
                  Mapa de Calor — Multi-Nodo
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  6 Nodos Activos
                </span>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                {heatmapZones.map((zone) => (
                  <div key={zone.id} className={`flex flex-col justify-between p-3 sm:p-4 rounded-xl border shadow-sm transition-all hover:scale-[1.02] cursor-default ${getHeatColor(zone.temp)}`}>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-90">{zone.name}</span>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-xl sm:text-2xl font-extrabold mono tracking-tight">{zone.temp.toFixed(1)}°</span>
                      <Thermometer size={16} className="opacity-70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── FILA 3: SPARKLINES ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  Temperatura — Historial
                </h3>
                {temperature !== null && (
                  <span className="text-orange-500 font-bold bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1 rounded-md text-xs sm:text-sm mono">
                    {temperature.toFixed(1)}°C
                  </span>
                )}
              </div>
              {tempHistory.length < 2 ? (
                <div className="h-28 sm:h-36 w-full bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-center">
                  <span className="text-xs text-slate-400">Esperando datos del sensor…</span>
                </div>
              ) : (
                <div className="h-28 sm:h-36">
                  <SparkLine data={tempHistory} color="#f97316" title="" unit="°C" />
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Humedad — Historial
                </h3>
                {humidity !== null && (
                  <span className="text-blue-500 font-bold bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-md text-xs sm:text-sm mono">
                    {humidity.toFixed(1)}%
                  </span>
                )}
              </div>
              {humHistory.length < 2 ? (
                <div className="h-28 sm:h-36 w-full bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-center">
                  <span className="text-xs text-slate-400">Esperando datos del sensor…</span>
                </div>
              ) : (
                <div className="h-28 sm:h-36">
                  <SparkLine data={humHistory} color="#3b82f6" title="" unit="%" />
                </div>
              )}
            </div>
          </div>

          {/* ── FILA 4: TABLA ── */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <List size={20} className="text-slate-500" />
                Historial de lecturas
              </h3>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full">
                {stats.count} lecturas
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/50 text-[10px] sm:text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-5 sm:px-6 py-4 font-semibold whitespace-nowrap">Hora</th>
                    <th className="px-5 sm:px-6 py-4 font-semibold whitespace-nowrap">Temp. (°C)</th>
                    <th className="px-5 sm:px-6 py-4 font-semibold whitespace-nowrap">Humedad (%)</th>
                    <th className="px-5 sm:px-6 py-4 font-semibold whitespace-nowrap">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {readings.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
                        Esperando datos del sensor…
                      </td>
                    </tr>
                  ) : (
                    [...readings].reverse().slice(0, 15).map((row, i) => {
                      const st = getWorstStatus(row.temperature, row.humidity);
                      return (
                        <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mono whitespace-nowrap">{row.time}</td>
                          <td className={`px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-bold mono ${st !== "ok" ? "text-orange-500 dark:text-orange-400" : "text-slate-700 dark:text-slate-200"}`}>
                            {row.temperature.toFixed(1)}
                          </td>
                          <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mono">
                            {row.humidity.toFixed(1)}
                          </td>
                          <td className="px-5 sm:px-6 py-3.5 sm:py-4">
                            <span className={`inline-flex px-2.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wide border whitespace-nowrap ${STATUS_BADGE[st]}`}>
                              {STATUS_LABEL[st]}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}