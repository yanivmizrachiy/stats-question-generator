import { Category, GeneratedQuestion, Representation } from "./questionGenerator";

interface ChartOpts {
  size?: number;
  showLabels?: boolean;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

// Returns a self-contained SVG string (no external deps) suitable for inline display, clipboard and PNG.
export function buildChartSVG(q: GeneratedQuestion, opts: ChartOpts = {}): string {
  const size = opts.size ?? 320;
  const showLabels = opts.showLabels ?? true;
  const rep = q.settings.representation;
  if (rep === "balls") return buildBallsSVG(q, size);
  if (rep === "freqTable" || rep === "barChart") return buildBarSVG(q, size);
  return buildPieSVG(q, size, showLabels, rep);
}

function buildPieSVG(q: GeneratedQuestion, size: number, showLabels: boolean, rep: Representation) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 26;
  const total = q.totalUnits;
  let angle = 0;
  const paths: string[] = [];
  const labels: string[] = [];

  q.categories.forEach((cat, i) => {
    const sweep = (cat.count / total) * 360;
    const start = angle;
    const end = angle + sweep;
    paths.push(
      `<path d="${arcPath(cx, cy, r, start, end)}" fill="${cat.color}" stroke="#ffffff" stroke-width="2.5" ${i === q.targetIndex ? 'stroke="#1a2730" stroke-width="3"' : ""}/>`,
    );
    const mid = (start + end) / 2;
    const lp = polar(cx, cy, r * 0.62, mid);
    const frac = simplify(cat.count, total);
    if (showLabels) {
      labels.push(
        `<text x="${lp.x.toFixed(1)}" y="${lp.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Heebo, sans-serif" font-size="${size * 0.045}" font-weight="700" fill="${contrastText(cat.color)}" direction="rtl">${frac}</text>`,
      );
    }
    angle = end;
  });

  // pointer for wheel
  let pointer = "";
  if (rep === "wheel") {
    pointer = `
      <g>
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r * 0.78}" stroke="#1a2730" stroke-width="4" stroke-linecap="round"/>
        <polygon points="${cx - 9},${cy - r * 0.7} ${cx + 9},${cy - r * 0.7} ${cx},${cy - r * 0.92}" fill="#1a2730"/>
        <circle cx="${cx}" cy="${cy}" r="9" fill="#1a2730"/>
        <circle cx="${cx}" cy="${cy}" r="4" fill="#ffffff"/>
      </g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img">
    <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="#ffffff" stroke="#dfe7ec" stroke-width="2"/>
    ${paths.join("\n")}
    ${labels.join("\n")}
    ${pointer}
  </svg>`;
}

function buildBallsSVG(q: GeneratedQuestion, size: number) {
  const total = q.totalUnits;
  const max = Math.min(total, 40);
  const scale = total > max ? max / total : 1;
  const balls: { color: string }[] = [];
  q.categories.forEach((c) => {
    const n = Math.max(1, Math.round(c.count * scale));
    for (let i = 0; i < n; i++) balls.push({ color: c.color });
  });
  const w = size;
  const h = size * 0.95;
  const cols = Math.ceil(Math.sqrt(balls.length * (w / h)));
  const rad = Math.max(8, (w - 60) / cols / 2 - 3);
  let bx = 30;
  let by = 55;
  const items: string[] = [];
  balls.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 30 + rad + col * (rad * 2 + 6);
    const y = 55 + rad + row * (rad * 2 + 6);
    items.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${b.color}" stroke="#ffffff" stroke-width="1.5"/>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
    <rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="22" fill="#f4fafc" stroke="#cfe2ea" stroke-width="2"/>
    <text x="${w / 2}" y="40" text-anchor="middle" font-family="Heebo,sans-serif" font-size="16" font-weight="700" fill="#1a2730" direction="rtl">שקית הכדורים</text>
    ${items.join("\n")}
  </svg>`;
}

function buildBarSVG(q: GeneratedQuestion, size: number) {
  const w = size;
  const h = size;
  const total = q.totalUnits;
  const n = q.categories.length;
  const padB = 50;
  const padT = 30;
  const padX = 40;
  const chartH = h - padB - padT;
  const bw = (w - padX * 2) / n;
  const maxCount = Math.max(...q.categories.map((c) => c.count));
  const bars: string[] = [];
  q.categories.forEach((c, i) => {
    const bh = (c.count / maxCount) * chartH;
    const x = padX + i * bw + bw * 0.15;
    const y = padT + chartH - bh;
    const bwIn = bw * 0.7;
    bars.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bwIn.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${c.color}" ${i === q.targetIndex ? 'stroke="#1a2730" stroke-width="2.5"' : ""}/>`);
    bars.push(`<text x="${(x + bwIn / 2).toFixed(1)}" y="${(padT + chartH + 18).toFixed(1)}" text-anchor="middle" font-family="Heebo,sans-serif" font-size="13" fill="#1a2730" direction="rtl">${c.name}</text>`);
    bars.push(`<text x="${(x + bwIn / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-family="Heebo,sans-serif" font-size="13" font-weight="700" fill="#1a2730">${c.count}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
    <line x1="${padX}" y1="${padT + chartH}" x2="${w - padX}" y2="${padT + chartH}" stroke="#9bb3bf" stroke-width="2"/>
    ${bars.join("\n")}
  </svg>`;
}

function simplify(num: number, den: number): string {
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}
function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function contrastText(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1a2730" : "#ffffff";
}

// Build a legend (HTML) string for color categories
export function buildLegendHTML(q: GeneratedQuestion): string {
  const items = q.categories
    .map((c) => {
      const frac = simplify(c.count, q.totalUnits);
      return `<span style="display:inline-flex;align-items:center;gap:6px;margin:0 4px;"><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${c.color};border:1px solid #ccc;"></span><span style="font-size:13px;">${c.name} (${frac})</span></span>`;
    })
    .join("");
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;direction:rtl;margin-top:8px;">${items}</div>`;
}
