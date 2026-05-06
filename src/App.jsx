// clase principal que actúa como un layout

import Navbar        from "./components/Navbar";
import GaugeCanvas   from "./components/GaugeCanvas";
import SparkLine     from "./components/SparkLine";
import StatCard      from "./components/StatCard";
import AlertBanner   from "./components/AlertBanner";
import HistoryTable  from "./components/HistoryTable";
import useSensorData from "./hooks/useSensorData";

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

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const {
    temperature,
    humidity,
    tempHistory,
    humHistory,
    readings,
    lastUpdate,
    online,
    stats,
  } = useSensorData();

  return (
    <div
      style={{ background: "var(--bg)", minHeight: "100vh" }}
      className="w-full"
    >
      <Navbar lastUpdate={lastUpdate} online={online} />

      <main style={{ padding: "24px 20px" }} className="flex flex-col gap-5">

        {/* ── Alerta activa (solo visible si supera umbrales) ── */}
        <AlertBanner temperature={temperature} humidity={humidity} />

        {/* ── Fila 1: Gauge temp + Gauge hum + StatCard ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <GaugeCanvas
            value={temperature ?? 0}
            min={-10}
            max={60}
            unit="°C"
            color="var(--red)"
            label="Temperatura"
            status={getTempStatus(temperature)}
          />
          <GaugeCanvas
            value={humidity ?? 0}
            min={0}
            max={100}
            unit="%HR"
            color="var(--blue)"
            label="Humedad relativa"
            status={getHumStatus(humidity)}
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <StatCard
              tempMax={stats.tempMax}
              tempMin={stats.tempMin}
              humAvg={stats.humAvg}
              count={stats.count}
              interval={5}
              online={online}
            />
          </div>
        </div>

        {/* ── Fila 2: SparkLines de historial ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <SparkLine
            data={tempHistory}
            color="var(--red)"
            title="Temperatura — historial"
            unit="°C"
          />
          <SparkLine
            data={humHistory}
            color="var(--blue)"
            title="Humedad — historial"
            unit="%"
          />
        </div>

        {/* ── Fila 3: Tabla de historial ── */}
        <HistoryTable readings={readings} maxRows={10} />

      </main>
    </div>
  );
}