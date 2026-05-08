import { useEffect, useRef } from "react";

/**
 * GaugeCanvas — gauge semicircular con Canvas API
 * Props:
 *  - value   {number}
 *  - min     {number}
 *  - max     {number}
 *  - unit    {string}
 *  - color   {string}  color hex directo, ej. "#f97316"
 */
function drawGauge({ canvas, value, min, max, color, unit, isDark }) {
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth  || 200;
  const H   = canvas.offsetHeight || 130;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H * 0.78;
  const r  = Math.min(W * 0.42, H * 0.70);

  const startAngle = Math.PI * 1.12;
  const endAngle   = Math.PI * 1.88;
  const totalAngle = endAngle - startAngle;
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));

  // Colores según tema
  const trackColor  = isDark ? "#1e293b" : "#f1f5f9";
  const textColor   = isDark ? "#f1f5f9" : "#1e293b";
  const text2Color  = isDark ? "#94a3b8" : "#64748b";
  const text3Color  = isDark ? "#475569" : "#94a3b8";

  // Arco de fondo
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = trackColor;
  ctx.lineWidth   = 11;
  ctx.lineCap     = "round";
  ctx.stroke();

  // Arco de relleno
  if (pct > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, startAngle + pct * totalAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 11;
    ctx.lineCap     = "round";
    ctx.stroke();
  }

  // Aguja
  const needleAngle  = startAngle + pct * totalAngle;
  const needleLength = r * 0.68;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + needleLength * Math.cos(needleAngle), cy + needleLength * Math.sin(needleAngle));
  ctx.strokeStyle = textColor;
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = "round";
  ctx.stroke();

  // Centro de aguja
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = textColor;
  ctx.fill();

  // Valor numérico
  ctx.textAlign = "center";
  ctx.font      = `600 25px 'IBM Plex Mono', monospace`;
  ctx.fillStyle = textColor;
  ctx.fillText(value.toFixed(1), cx, cy + 20);

  // Unidad
  ctx.font      = `400 11px 'Inter', sans-serif`;
  ctx.fillStyle = text2Color;
  ctx.fillText(unit, cx, cy + 34);

  // Min / Max
  const margin = r + 14;
  ctx.font      = `400 9px 'IBM Plex Mono', monospace`;
  ctx.fillStyle = text3Color;
  ctx.textAlign = "right";
  ctx.fillText(min, cx + margin * Math.cos(startAngle), cy + margin * Math.sin(startAngle));
  ctx.textAlign = "left";
  ctx.fillText(max, cx + margin * Math.cos(endAngle), cy + margin * Math.sin(endAngle));
}

export default function GaugeCanvas({ value, min, max, unit, color }) {
  const canvasRef = useRef(null);

  const redraw = () => {
    const isDark = document.documentElement.classList.contains("dark");
    drawGauge({ canvas: canvasRef.current, value, min, max, color, unit, isDark });
  };

  useEffect(() => { redraw(); }, [value, min, max, color, unit]);

  useEffect(() => {
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [value, min, max, color, unit]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: "150px" }}
    />
  );
}