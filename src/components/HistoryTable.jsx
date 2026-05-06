// componente para la tabla del historial de temperaturas

/**
 * HistoryTable
 *
 * Muestra las últimas lecturas del sensor en una tabla con scroll.
 *
 * Props:
 *  - readings  {Array}  Lista de lecturas:
 *                       [{ time: string, temperature: number, humidity: number }]
 *  - maxRows   {number} Máximo de filas visibles antes de hacer scroll (default 8)
 */

// ── Umbrales de estado (mismos que AlertBanner) ──────────────
function getStatus(temperature, humidity) {
  if (temperature > 35 || temperature < 5  ||
      humidity    > 80 || humidity    < 20) return "critical";
  if (temperature > 30 || temperature < 10 ||
      humidity    > 70 || humidity    < 30) return "warning";
  return "ok";
}

// ── Config de badges ─────────────────────────────────────────
const BADGE = {
  ok:       { bg: "var(--green-bg)",  color: "var(--green-txt)", label: "Normal"      },
  warning:  { bg: "var(--amber-bg)",  color: "var(--amber-txt)", label: "Advertencia" },
  critical: { bg: "var(--red-bg)",    color: "var(--red-txt)",   label: "Crítico"     },
};

// ── Badge de estado ──────────────────────────────────────────
function StatusBadge({ status }) {
  const b = BADGE[status] || BADGE.ok;
  return (
    <span
      style={{
        background:   b.bg,
        color:        b.color,
        borderRadius: "var(--radius-xl)",
        fontFamily:   "var(--font-sans)",
      }}
      className="text-[11px] font-semibold px-3 py-[3px] whitespace-nowrap"
    >
      {b.label}
    </span>
  );
}

// ── Celda de valor numérico ──────────────────────────────────
function ValueCell({ value, color }) {
  return (
    <td
      style={{
        color:      color,
        fontFamily: "var(--font-mono)",
      }}
      className="px-3 py-[7px] text-[12px] font-semibold"
    >
      {value.toFixed(1)}
    </td>
  );
}

// ── Fila de la tabla ─────────────────────────────────────────
function TableRow({ reading, index }) {
  const status = getStatus(reading.temperature, reading.humidity);
  // Fila levemente resaltada en índices pares para facilitar lectura
  const isEven = index % 2 === 0;

  return (
    <tr
      style={{
        background:  isEven ? "transparent" : "var(--surface2)",
        borderBottom: "0.5px solid var(--border)",
      }}
    >
      {/* Hora */}
      <td
        style={{
          color:      "var(--text2)",
          fontFamily: "var(--font-mono)",
        }}
        className="px-3 py-[7px] text-[12px]"
      >
        {reading.time}
      </td>

      {/* Temperatura */}
      <ValueCell value={reading.temperature} color="var(--red)"  />

      {/* Humedad */}
      <ValueCell value={reading.humidity}    color="var(--blue)" />

      {/* Estado */}
      <td className="px-3 py-[7px]">
        <StatusBadge status={status} />
      </td>
    </tr>
  );
}

// ── Estado vacío ─────────────────────────────────────────────
function EmptyState() {
  return (
    <tr>
      <td
        colSpan={4}
        style={{
          color:      "var(--text3)",
          fontFamily: "var(--font-sans)",
        }}
        className="px-3 py-8 text-[13px] text-center"
      >
        Esperando datos del sensor…
      </td>
    </tr>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function HistoryTable({ readings = [], maxRows = 8 }) {
  // Muestra las lecturas más recientes primero
  const rows = [...readings].reverse().slice(0, 50);

  // Altura máxima del scroll: aproximadamente maxRows × altura de fila (34px) + header (36px)
  const maxHeight = maxRows * 34 + 36;

  return (
    <div
      style={{
        background:   "var(--surface)",
        border:       "0.5px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
      className="p-4"
    >
      {/* Título + contador */}
      <div className="flex items-center justify-between mb-3">
        <p
          style={{
            color:      "var(--text)",
            fontFamily: "var(--font-sans)",
          }}
          className="text-[14px] font-semibold"
        >
          Historial de lecturas
        </p>

        {readings.length > 0 && (
          <span
            style={{
              color:        "var(--text3)",
              fontFamily:   "var(--font-mono)",
              background:   "var(--surface2)",
              borderRadius: "var(--radius-sm)",
            }}
            className="text-[11px] px-2 py-[2px]"
          >
            {readings.length} lecturas
          </span>
        )}
      </div>

      {/* Tabla con scroll vertical */}
      <div
        style={{ maxHeight: `${maxHeight}px` }}
        className="overflow-y-auto overflow-x-auto"
      >
        <table className="w-full border-collapse">
          {/* Cabecera fija */}
          <thead
            style={{
              background:  "var(--surface2)",
              position:    "sticky",
              top:         0,
              zIndex:      1,
            }}
          >
            <tr>
              {["Hora", "Temperatura (°C)", "Humedad (%)", "Estado"].map((h) => (
                <th
                  key={h}
                  style={{
                    color:       "var(--text3)",
                    fontFamily:  "var(--font-sans)",
                    borderBottom: "1px solid var(--border)",
                    textAlign:   "left",
                  }}
                  className="px-3 py-[6px] text-[11px] font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* Cuerpo */}
          <tbody>
            {rows.length === 0
              ? <EmptyState />
              : rows.map((r, i) => (
                  <TableRow key={`${r.time}-${i}`} reading={r} index={i} />
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}