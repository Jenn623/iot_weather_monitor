import React from "react";
import {
  Thermometer, Droplets, Activity, Clock, Wifi,
  Sun, Moon, ThermometerSun, ThermometerSnowflake,
  BarChart3, List
} from "lucide-react";

// ── Imports reales (lógica conectada al backend y ESP32) ──────
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

// ── GaugeDisplay — SVG animado ───────────────────────────────
function GaugeDisplay({ value, unit, color }) {
  const isDark = document.documentElement.classList.contains("dark");

  // El arco total mide 125 unidades (strokeDasharray)
  // Cuando pct=0 → dashOffset=125 (arco invisible)
  // Cuando pct=1 → dashOffset=0   (arco completo)
  const pct = Math.min(1, Math.max(0, value / 100));
  const dashOffset = 125 - pct * 125;

  return (
    <div className="relative w-40 sm:w-48 h-24 sm:h-28 flex items-end justify-center">
      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 50">
        {/* Track — fondo gris */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={isDark ? "#334155" : "#e2e8f0"}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Fill — color del sensor, crece de izquierda a derecha */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="125"
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
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

  const tempStatus = getTempStatus(temperature);
  const humStatus  = getHumStatus(humidity);

  // Normaliza el valor del gauge según su escala
  const tempPct = temperature !== null ? ((temperature + 10) / 70) * 100 : 0;
  const humPct  = humidity    !== null ? humidity : 0;

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="w-full px-4 py-6 sm:px-10 sm:py-8 lg:px-20 lg:py-10">
        <div className="w-full space-y-5 sm:space-y-6">

          {/* ── HEADER ── */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
              <div className="p-2 sm:p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                <Activity className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Monitor IoT</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">ESP32 + DHT22 — Almacén</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto text-xs sm:text-sm font-medium">
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
                  <span className="hidden sm:inline">{online ? "Dispositivo en línea" : "Sin conexión"}</span>
                  <span className="sm:hidden">{online ? "En línea" : "Offline"}</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>
          </header>

          {/* ── ALERT BANNER ── */}
          <AlertBanner temperature={temperature} humidity={humidity} />

          {/* ── GAUGES + STATS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

            {/* Gauges */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">

              {/* Temperatura */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden transition-colors">
                <div className="absolute top-4 left-4 p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-orange-500">
                  <Thermometer size={20} />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 mt-2">
                  Temperatura
                </h3>
                <GaugeDisplay value={tempPct} unit="°C" color="#f97316" status={tempStatus} />
                <div className="mt-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide border ${STATUS_BADGE[tempStatus]}`}>
                    {STATUS_LABEL[tempStatus]}
                  </span>
                </div>
              </div>

              {/* Humedad */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden transition-colors">
                <div className="absolute top-4 left-4 p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-500">
                  <Droplets size={20} />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 mt-2">
                  Humedad Relativa
                </h3>
                <GaugeDisplay value={humPct} unit="%" color="#3b82f6" status={humStatus} />
                <div className="mt-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide border ${STATUS_BADGE[humStatus]}`}>
                    {STATUS_LABEL[humStatus]}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4 sm:gap-5">
              <StatCard title="Temp. Máxima"  value={stats.tempMax !== null ? `${stats.tempMax.toFixed(1)}°C` : "—"} icon={<ThermometerSun size={16} />}      color="text-rose-500"    />
              <StatCard title="Temp. Mínima"  value={stats.tempMin !== null ? `${stats.tempMin.toFixed(1)}°C` : "—"} icon={<ThermometerSnowflake size={16} />} color="text-sky-500"     />
              <StatCard title="Humedad Prom." value={stats.humAvg  !== null ? `${stats.humAvg.toFixed(1)}%`   : "—"} icon={<Droplets size={16} />}             color="text-blue-500"    />
              <StatCard title="Lecturas"      value={stats.count}                                                     icon={<BarChart3 size={16} />}            color="text-indigo-500"  />
              <StatCard title="Dispositivo"   value={online ? "En línea" : "Sin conexión"} isOnline={online}          icon={<Wifi size={16} />}                 color="text-emerald-500" />
              <StatCard title="Intervalo"     value="5 seg"                                                           icon={<Clock size={16} />}                color="text-slate-500"   />
            </div>
          </div>

          {/* ── SPARKLINES ── */}
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

          {/* ── TABLA ── */}
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
                          <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mono whitespace-nowrap">
                            {row.time}
                          </td>
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