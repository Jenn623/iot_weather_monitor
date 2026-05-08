// componente que maneja los datos de las gráficas

import { useEffect, useRef } from "react";

/**
 * SparkLine
 *
 * Props:
 *  - data    {number[]}  Array de valores numéricos (historial)
 *  - color   {string}    Color de la línea  (ej. "var(--red)")
 *  - title   {string}    Título de la gráfica
 *  - unit    {string}    Unidad para la etiqueta del último valor (ej. "°C")
 */

// ── Función de dibujo ────────────────────────────────────────
function drawSparkLine({ canvas, data, color }) {
  if (!canvas || !data || data.length < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth  || 400;
  const H   = canvas.offsetHeight || 68;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // ── Leer variables CSS ──────────────────────────────────────
  const style     = getComputedStyle(document.documentElement);
  const borderCol = style.getPropertyValue("--border").trim();

  // ── Escala de valores ───────────────────────────────────────
  const mn  = Math.min(...data);
  const mx  = Math.max(...data);
  const rng = mx - mn || 1;
  const pad = 8; // padding vertical en px

  // Mapea un valor a coordenada Y
  const toY = (v) => H - pad - ((v - mn) / rng) * (H - pad * 2);
  // Mapea un índice a coordenada X
  const toX = (i) => (i / (data.length - 1)) * W;

  // ── Líneas de grid horizontales (3) ─────────────────────────
  ctx.strokeStyle = borderCol;
  ctx.lineWidth   = 0.5;
  [0.25, 0.5, 0.75].forEach((p) => {
    const y = H - pad - p * (H - pad * 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  });

  // ── Puntos calculados ────────────────────────────────────────
  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v) }));

  // ── Área de relleno bajo la línea ────────────────────────────
  ctx.beginPath();
  ctx.moveTo(pts[0].x, H);
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, H);
  ctx.closePath();
  // Color del área: mismo que la línea pero con opacidad baja
  ctx.fillStyle = color.startsWith("var(")
    ? hexToRgba(style.getPropertyValue(color.slice(4, -1).trim()).trim(), 0.12)
    : hexToRgba(color, 0.12);
  ctx.fill();

  // ── Línea principal ──────────────────────────────────────────
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = color.startsWith("var(")
    ? style.getPropertyValue(color.slice(4, -1).trim()).trim()
    : color;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = "round";
  ctx.lineCap     = "round";
  ctx.stroke();

  // ── Punto final (último valor) ───────────────────────────────
  const last = pts[pts.length - 1];
  const resolvedColor = color.startsWith("var(")
    ? style.getPropertyValue(color.slice(4, -1).trim()).trim()
    : color;

  ctx.beginPath();
  ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = resolvedColor;
  ctx.fill();
}

// ── Helper: hex a rgba ───────────────────────────────────────
// Canvas no entiende variables CSS directamente en fillStyle,
// por eso necesitamos convertir el color hex a rgba para el área.
function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith("#")) return `rgba(128,128,128,${alpha})`;
  const clean = hex.replace("#", "");
  const full  = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Componente ────────────────────────────────────────────────
export default function SparkLine({ data = [], color, title, unit }) {
  const canvasRef = useRef(null);

  // Redibuja cuando cambian los datos o el color
  useEffect(() => {
    drawSparkLine({ canvas: canvasRef.current, data, color });
  }, [data, color]);

  // Redibuja al cambiar el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      drawSparkLine({ canvas: canvasRef.current, data, color });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, color]);

  // Último valor para mostrarlo como texto
  const lastValue = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="w-full">
      {/* Cabecera solo si hay título */}
      {title && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</p>
          {lastValue !== null && (
            <span className="text-sm font-bold mono" style={{ color }}>{lastValue.toFixed(1)}{unit}</span>
          )}
        </div>
      )}

      {/* Canvas de la gráfica */}
      {data.length < 2 ? (
        <div className="h-24 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          Esperando datos del sensor…
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ height: "100px" }}
        />
      )}
    </div>
  );
}