// componente que maneja la tarjeta de estadísticas

/**
 * StatCard
 *
 * Muestra una cuadrícula 2×3 con las métricas de sesión:
 * temp máx, temp mín, humedad promedio, lecturas, dispositivo e intervalo.
 *
 * Props:
 *  - tempMax   {number|null}
 *  - tempMin   {number|null}
 *  - humAvg    {number|null}
 *  - count     {number}
 *  - interval  {number}  Intervalo de lectura en segundos (default 5)
 *  - online    {boolean} Estado del dispositivo
 */

// ── Item individual dentro de la cuadrícula ──────────────────
function StatItem({ label, children }) {
  return (
    <div
      style={{
        background:   "var(--surface2)",
        borderRadius: "var(--radius-md)",
      }}
      className="flex flex-col gap-1 px-3 py-[10px]"
    >
      <span
        style={{
          color:      "var(--text2)",
          fontFamily: "var(--font-sans)",
        }}
        className="text-[11px]"
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// ── Valor numérico con fuente mono ───────────────────────────
function MonoValue({ value, unit, color }) {
  return (
    <span
      style={{
        color:      color || "var(--text)",
        fontFamily: "var(--font-mono)",
      }}
      className="text-[17px] font-semibold leading-none"
    >
      {value !== null && value !== undefined
        ? `${Number(value).toFixed(1)}${unit}`
        : "—"}
    </span>
  );
}

// ── Badge de estado del dispositivo ─────────────────────────
function DeviceBadge({ online }) {
  return (
    <span
      style={{
        background:   online ? "var(--green-bg)"  : "var(--red-bg)",
        color:        online ? "var(--green-txt)" : "var(--red-txt)",
        borderRadius: "var(--radius-xl)",
        fontFamily:   "var(--font-sans)",
      }}
      className="text-[10px] font-semibold px-3 py-[3px] w-fit mt-[2px]"
    >
      {online ? "En línea" : "Sin conexión"}
    </span>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function StatCard({
  tempMax  = null,
  tempMin  = null,
  humAvg   = null,
  count    = 0,
  interval = 5,
  online   = false,
}) {
  return (
    <div
      style={{
        background:   "var(--surface)",
        border:       "0.5px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
      className="p-4 h-full"
    >
      <div className="grid grid-cols-2 gap-[9px] h-full">

        {/* Temperatura máxima */}
        <StatItem label="Temp. máxima">
          <MonoValue value={tempMax} unit="°C" color="var(--red)" />
        </StatItem>

        {/* Temperatura mínima */}
        <StatItem label="Temp. mínima">
          <MonoValue value={tempMin} unit="°C" color="var(--amber)" />
        </StatItem>

        {/* Humedad promedio */}
        <StatItem label="Humedad prom.">
          <MonoValue value={humAvg} unit="%" color="var(--blue)" />
        </StatItem>

        {/* Total de lecturas */}
        <StatItem label="Lecturas">
          <span
            style={{
              color:      "var(--text)",
              fontFamily: "var(--font-mono)",
            }}
            className="text-[17px] font-semibold leading-none"
          >
            {count}
          </span>
        </StatItem>

        {/* Estado del dispositivo */}
        <StatItem label="Dispositivo">
          <DeviceBadge online={online} />
        </StatItem>

        {/* Intervalo de lectura */}
        <StatItem label="Intervalo">
          <span
            style={{
              color:      "var(--text2)",
              fontFamily: "var(--font-mono)",
            }}
            className="text-[15px] font-semibold leading-none"
          >
            {interval} seg
          </span>
        </StatItem>

      </div>
    </div>
  );
}