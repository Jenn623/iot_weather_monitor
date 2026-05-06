// componente encargado del renderizado del indicador de la temperatura

import { useEffect, useRef } from "react";

/**
 * GaugeCanvas
 *
 * Props:
 *  - value   {number}  Valor actual del sensor
 *  - min     {number}  Valor mínimo de la escala   (ej. -10)
 *  - max     {number}  Valor máximo de la escala   (ej. 60)
 *  - unit    {string}  Unidad a mostrar             (ej. "°C")
 *  - color   {string}  Color del arco de relleno   (ej. "var(--red)")
 *  - label   {string}  Etiqueta debajo del gauge    (ej. "Temperatura")
 *  - status  {string}  "ok" | "warning" | "critical"
 */

// ── Configuración de badges por estado ──────────────────────
const BADGE = {
  ok:       { bg: "var(--green-bg)",  text: "var(--green-txt)", label: "Normal"      },
  warning:  { bg: "var(--amber-bg)",  text: "var(--amber-txt)", label: "Advertencia" },
  critical: { bg: "var(--red-bg)",    text: "var(--red-txt)",   label: "Crítico"     },
};

// ── Función que dibuja el gauge en el canvas ─────────────────
function drawGauge({ canvas, value, min, max, color, unit }) {
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth  || 200;
  const H   = canvas.offsetHeight || 130;

  // Escalar el canvas por el device pixel ratio (pantallas retina)
  canvas.width  = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // Centro y radio del arco
  const cx = W / 2;
  const cy = H * 0.78;
  const r  = Math.min(W * 0.42, H * 0.70);

  // Ángulos: el arco va de ~210° a ~330° (semicírculo abierto hacia arriba)
  const startAngle = Math.PI * 1.12;
  const endAngle   = Math.PI * 1.88;
  const totalAngle = endAngle - startAngle;

  // Porcentaje del valor en la escala
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));

  // ── Leer variables CSS del documento ──────────────────────
  const style    = getComputedStyle(document.documentElement);
  const surface2 = style.getPropertyValue("--surface2").trim();
  const textCol  = style.getPropertyValue("--text").trim();
  const text2Col = style.getPropertyValue("--text2").trim();
  const text3Col = style.getPropertyValue("--text3").trim();
  const borderCol = style.getPropertyValue("--border").trim();
  const fontMono  = style.getPropertyValue("--font-mono").trim();
  const fontSans  = style.getPropertyValue("--font-sans").trim();

  // ── Arco de fondo (pista) ──────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = surface2;
  ctx.lineWidth   = 11;
  ctx.lineCap     = "round";
  ctx.stroke();

  // ── Arco de relleno (valor actual) ────────────────────────
  if (pct > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, startAngle + pct * totalAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 11;
    ctx.lineCap     = "round";
    ctx.stroke();
  }

  // ── Tick marks (5 marcas en la pista) ─────────────────────
  for (let i = 0; i <= 4; i++) {
    const angle = startAngle + (i / 4) * totalAngle;
    const x1 = cx + (r - 8) * Math.cos(angle);
    const y1 = cy + (r - 8) * Math.sin(angle);
    const x2 = cx + (r + 2) * Math.cos(angle);
    const y2 = cy + (r + 2) * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = borderCol;
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  // ── Aguja ──────────────────────────────────────────────────
  const needleAngle  = startAngle + pct * totalAngle;
  const needleLength = r * 0.68;
  const nx = cx + needleLength * Math.cos(needleAngle);
  const ny = cy + needleLength * Math.sin(needleAngle);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = textCol;
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = "round";
  ctx.stroke();

  // Centro de la aguja (círculo)
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = textCol;
  ctx.fill();

  // ── Valor numérico ─────────────────────────────────────────
  ctx.textAlign    = "center";
  ctx.font         = `600 25px ${fontMono}`;
  ctx.fillStyle    = textCol;
  ctx.fillText(value.toFixed(1), cx, cy + 20);

  // ── Unidad ─────────────────────────────────────────────────
  ctx.font      = `400 11px ${fontSans}`;
  ctx.fillStyle = text2Col;
  ctx.fillText(unit, cx, cy + 34);

  // ── Etiquetas min / max en los extremos del arco ───────────
  const margin = r + 14;
  const lx = cx + margin * Math.cos(startAngle);
  const ly = cy + margin * Math.sin(startAngle);
  const rx = cx + margin * Math.cos(endAngle);
  const ry = cy + margin * Math.sin(endAngle);

  ctx.font      = `400 9px ${fontMono}`;
  ctx.fillStyle = text3Col;
  ctx.textAlign = "right";
  ctx.fillText(min, lx, ly);
  ctx.textAlign = "left";
  ctx.fillText(max, rx, ry);
}

// ── Componente ───────────────────────────────────────────────
export default function GaugeCanvas({ value, min, max, unit, color, label, status = "ok" }) {
  const canvasRef = useRef(null);
  const badge     = BADGE[status] || BADGE.ok;

  // Redibuja cuando cambian value, min, max, color o el tema
  useEffect(() => {
    drawGauge({ canvas: canvasRef.current, value, min, max, color, unit });
  }, [value, min, max, color, unit]);

  // Redibuja al cambiar el tamaño de la ventana (responsive)
  useEffect(() => {
    const handleResize = () => {
      drawGauge({ canvas: canvasRef.current, value, min, max, color, unit });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [value, min, max, color, unit]);

  return (
    <div
      style={{
        background:   "var(--surface)",
        border:       "0.5px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
      className="flex flex-col items-center px-4 pt-5 pb-4"
    >
      {/* Canvas del gauge */}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "150px" }}
      />

      {/* Etiqueta */}
      <p
        style={{
          color:      "var(--text)",
          fontFamily: "var(--font-sans)",
        }}
        className="text-[13px] font-semibold mt-2 mb-[6px]"
      >
        {label}
      </p>

      {/* Badge de estado */}
      <span
        style={{
          background:   badge.bg,
          color:        badge.text,
          borderRadius: "var(--radius-xl)",
          fontFamily:   "var(--font-sans)",
        }}
        className="text-[11px] font-semibold px-3 py-[3px]"
      >
        {badge.label}
      </span>
    </div>
  );
}