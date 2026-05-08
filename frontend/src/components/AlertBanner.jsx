// componente para las alertad del estado de la temperatura

import { useEffect, useState } from "react";

/**
 * AlertBanner
 *
 * Muestra una barra de alerta animada cuando los valores del sensor
 * superan los umbrales definidos.
 *
 * Props:
 *  - temperature  {number|null}  Valor actual de temperatura
 *  - humidity     {number|null}  Valor actual de humedad
 *
 * Umbrales:
 *  Temperatura:  crítico  < 5°C  o  > 35°C
 *                warning  < 10°C o  > 30°C
 *  Humedad:      crítico  < 20%  o  > 80%
 *                warning  < 30%  o  > 70%
 */

// ── Estilos por tipo de alerta ───────────────────────────────
const STYLES = {
  critical: "bg-rose-50 border border-rose-300 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400",
  warning:  "bg-amber-50 border border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400",
};

// ── Icono de advertencia ─────────────────────────────────────
function WarningIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9"  x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ── Icono de cierre ──────────────────────────────────────────
function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}

// ── Lógica de evaluación de umbrales ────────────────────────
function evaluateAlert(temperature, humidity) {
  // Temperatura crítica
  if (temperature !== null && (temperature > 35 || temperature < 5)) {
    return {
      type:    "critical",
      message: `Temperatura crítica: ${temperature.toFixed(1)}°C — Revisa el almacén de inmediato`,
    };
  }
  // Humedad crítica
  if (humidity !== null && (humidity > 80 || humidity < 20)) {
    return {
      type:    "critical",
      message: `Humedad crítica: ${humidity.toFixed(1)}% — Riesgo de daño en productos`,
    };
  }
  // Temperatura en advertencia
  if (temperature !== null && (temperature > 30 || temperature < 10)) {
    return {
      type:    "warning",
      message: `Temperatura en advertencia: ${temperature.toFixed(1)}°C — Monitorea el ambiente`,
    };
  }
  // Humedad en advertencia
  if (humidity !== null && (humidity > 70 || humidity < 30)) {
    return {
      type:    "warning",
      message: `Humedad en advertencia: ${humidity.toFixed(1)}% — Considera ajustar la ventilación`,
    };
  }
  return null;
}

// ── Componente ───────────────────────────────────────────────
export default function AlertBanner({ temperature = null, humidity = null }) {
  const [dismissed, setDismissed] = useState(false);
  const [visible,   setVisible]   = useState(false);

  const alert = evaluateAlert(temperature, humidity);

  // Cuando llega una nueva alerta, reinicia el estado de descarte
  useEffect(() => {
    if (alert) {
      setDismissed(false);
      // Pequeño delay para que la animación de entrada se vea
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [alert?.type, alert?.message]);

  // No renderiza nada si no hay alerta o fue descartada
  if (!alert || dismissed) return null;

  const cls = STYLES[alert.type] || STYLES.warning;

  return (
    <div
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
      className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-xl ${cls}`}
      role="alert"
    >
      {/* Icono */}
      <WarningIcon />

      {/* Mensaje */}
      <p className="text-[13px] font-medium flex-1">
        {alert.message}
      </p>

      {/* Botón de cierre */}
      <button
        onClick={() => setDismissed(true)}
        title="Cerrar alerta"
        className="flex items-center justify-center p-1 opacity-70 hover:opacity-100 transition-opacity duration-150 cursor-pointer bg-transparent border-none flex-shrink-0"
      >
        <CloseIcon />
      </button>
    </div>
  );
}