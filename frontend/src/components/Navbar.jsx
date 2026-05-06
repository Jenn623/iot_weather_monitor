// componente navbar de la tabla del historial

import { useTheme } from "../context/ThemeContext";

// ── Iconos ────────────────────────────────────────────────────
function ThermometerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12"   y1="1"     x2="12"    y2="3"     />
      <line x1="12"   y1="21"    x2="12"    y2="23"    />
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"    y1="12"    x2="3"     y2="12"    />
      <line x1="21"   y1="12"    x2="23"    y2="12"    />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * Navbar
 *
 * Props:
 *  - lastUpdate  {string}   Texto de última actualización (ej. "Actualizado: 14:32:08")
 *  - online      {boolean}  Estado de conexión del dispositivo
 */
export default function Navbar({ lastUpdate = "—", online = true }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav
      style={{
        background:   "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
      className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between"
    >
      {/* ── Izquierda: logo + título ── */}
      <div className="flex items-center gap-3">
        <div
          style={{
            background:   "var(--blue-bg)",
            borderRadius: "var(--radius-md)",
          }}
          className="w-8 h-8 flex items-center justify-center shrink-0"
        >
          <ThermometerIcon />
        </div>
        <div>
          <p
            style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
            className="text-[15px] font-semibold leading-tight"
          >
            Monitor IoT
          </p>
          <p
            style={{ color: "var(--text2)", fontFamily: "var(--font-sans)" }}
            className="text-[11px] leading-tight"
          >
            ESP32 + DHT22 — Almacén
          </p>
        </div>
      </div>

      {/* ── Derecha: última actualización + pill + toggle ── */}
      <div className="flex items-center gap-3">

        {/* Timestamp de última lectura — oculto en móvil */}
        <span
          style={{ color: "var(--text3)", fontFamily: "var(--font-mono)" }}
          className="text-[11px] hidden sm:block"
        >
          {lastUpdate}
        </span>

        {/* Pill de estado del dispositivo */}
        <div
          style={{
            background:   online ? "var(--green-bg)"  : "var(--red-bg)",
            border:       online
              ? "1px solid color-mix(in srgb, var(--green-txt) 30%, transparent)"
              : "1px solid color-mix(in srgb, var(--red-txt) 30%, transparent)",
            borderRadius: "var(--radius-xl)",
          }}
          className="flex items-center gap-2 px-3 py-1"
        >
          {/* Punto animado */}
          <span className="relative flex h-2 w-2">
            <span
              style={{ background: online ? "#10b981" : "#ef4444" }}
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            />
            <span
              style={{ background: online ? "#10b981" : "#ef4444" }}
              className="relative inline-flex rounded-full h-2 w-2"
            />
          </span>
          <span
            style={{
              color:      online ? "var(--green-txt)" : "var(--red-txt)",
              fontFamily: "var(--font-sans)",
            }}
            className="text-[12px] font-medium"
          >
            {online ? "Dispositivo en línea" : "Sin conexión"}
          </span>
        </div>

        {/* Toggle tema claro / oscuro */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          style={{
            background:   "var(--surface2)",
            border:       "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color:        "var(--text2)",
          }}
          className="w-8 h-8 flex items-center justify-center cursor-pointer
                     transition-colors duration-200"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </nav>
  );
}