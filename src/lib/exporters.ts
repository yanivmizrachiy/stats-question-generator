import { GeneratedQuestion, OPTION_LETTERS } from "./questionGenerator";
import { buildChartSVG, buildLegendHTML } from "./chartSvg";

// Build rich HTML for a single question (for Google Docs / Word paste).
export function questionToHTML(q: GeneratedQuestion, index?: number, opts?: { forClipboard?: boolean }): string {
  const num = index != null ? `${index}. ` : "";
  const svg = buildChartSVG(q, { size: 300 });
  const legend = buildLegendHTML(q);

  let optionsHtml = "";
  if (q.options && q.options.length) {
    const lis = q.options
      .map(
        (o) =>
          `<li style="margin:4px 0;list-style:none;">${o.label ? `<b>${o.label}.</b> ` : ""}${o.text}</li>`,
      )
      .join("");
    optionsHtml = `<ol style="padding:0;margin:8px 0;direction:rtl;">${lis}</ol>`;
  } else if (q.answerFormat === "open") {
    optionsHtml = `<div style="border-bottom:1px solid #999;height:22px;margin:10px 0;"></div><div style="border-bottom:1px solid #999;height:22px;margin:10px 0;"></div>`;
  }

  const s = q.settings;
  const nameDate = s.showNameDate
    ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;direction:rtl;"><span>שם: ____________________</span><span>תאריך: ____________</span></div>`
    : "";
  const score = s.showScore ? `<div style="font-size:12px;color:#555;direction:rtl;">ניקוד: ______ / 10</div>` : "";

  return `<div style="direction:rtl;text-align:right;font-family:Heebo,Arial,sans-serif;color:#1a2730;border:1.5px solid #cfe2ea;border-radius:12px;padding:18px 20px;max-width:680px;margin:0 0 16px 0;">
    ${nameDate}
    <p style="font-size:16px;line-height:1.7;margin:0 0 10px 0;font-weight:600;">${num}${escapeHtml(q.questionText)}</p>
    <div style="text-align:center;margin:12px 0;">${svg}</div>
    ${legend}
    ${optionsHtml}
    ${score}
  </div>`;
}

export function questionToPlainText(q: GeneratedQuestion, index?: number): string {
  const num = index != null ? `${index}. ` : "";
  let txt = `${num}${q.questionText}\n`;
  txt += q.categories
    .map((c) => `   • ${c.name}: ${c.count}/${q.totalUnits}`)
    .join("\n");
  txt += "\n";
  if (q.options && q.options.length) {
    txt += "\n" + q.options.map((o) => `${o.label}. ${o.text}`).join("\n") + "\n";
  } else if (q.answerFormat === "open") {
    txt += "\n_______________________________\n_______________________________\n";
  }
  return txt;
}

export function worksheetToHTML(questions: GeneratedQuestion[]): string {
  const inner = questions.map((q, i) => questionToHTML(q, i + 1)).join("");
  return `<div style="direction:rtl;">${inner}</div>`;
}

export function worksheetToPlainText(questions: GeneratedQuestion[]): string {
  return questions.map((q, i) => questionToPlainText(q, i + 1)).join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface CopyResult {
  ok: boolean;
  rich: boolean;
  message: string;
}

export async function copyRich(html: string, plain: string): Promise<CopyResult> {
  // Try rich clipboard
  try {
    if (navigator.clipboard && (window as any).ClipboardItem) {
      const item = new (window as any).ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return { ok: true, rich: true, message: "הועתק בהצלחה! ניתן להדביק ב-Google Docs / Word." };
    }
  } catch (e) {
    // fall through to plain
  }
  // Plain clipboard API
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(plain);
      return { ok: true, rich: false, message: "הועתק כטקסט פשוט (העתקת HTML עשיר אינה נתמכת בדפדפן זה)." };
    }
  } catch (e) {
    // fall through to execCommand
  }
  // execCommand fallback
  try {
    const ta = document.createElement("textarea");
    ta.value = plain;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return { ok: true, rich: false, message: "הועתק כטקסט פשוט." };
  } catch (e) {
    /* ignore */
  }
  return { ok: false, rich: false, message: "ההעתקה נכשלה. נסו שוב או העתיקו ידנית." };
}

export async function copyText(plain: string): Promise<CopyResult> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain);
      return { ok: true, rich: false, message: "הטקסט הועתק בהצלחה." };
    }
  } catch (e) {
    /* ignore */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = plain;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return { ok: true, rich: false, message: "הטקסט הועתק בהצלחה." };
  } catch (e) {
    /* ignore */
  }
  return { ok: false, rich: false, message: "ההעתקה נכשלה." };
}

// Render an HTML element to PNG via SVG foreignObject -> canvas
export async function elementToPNG(html: string, width = 720): Promise<Blob> {
  // wrap html in a styled container
  const wrapper = `<div xmlns="http://www.w3.org/1999/xhtml" style="background:#ffffff;padding:20px;direction:rtl;font-family:Heebo,Arial,sans-serif;width:${width - 40}px;">${html}</div>`;
  // measure height by rendering off-screen
  const measure = document.createElement("div");
  measure.style.position = "fixed";
  measure.style.left = "-99999px";
  measure.style.top = "0";
  measure.style.width = `${width}px`;
  measure.innerHTML = wrapper;
  document.body.appendChild(measure);
  const height = Math.max(200, measure.firstElementChild!.scrollHeight + 40);
  document.body.removeChild(measure);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">${wrapper}</foreignObject>
  </svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("img load failed"));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- Real DOM -> PNG capture (includes SVG charts, colors, options, frame) ----
import { toBlob } from "html-to-image";

export async function domToPNGBlob(el: HTMLElement, scale = 3): Promise<Blob> {
  const blob = await toBlob(el, {
    pixelRatio: scale,
    backgroundColor: "#ffffff",
    cacheBust: true,
    style: { margin: "0" },
  });
  if (!blob) throw new Error("המרת התמונה נכשלה");
  return blob;
}

export interface ImageCopyResult {
  ok: boolean;
  message: string;
  output: "PNG" | "none";
}

// Copy a real PNG image to the clipboard. Only reports success if the image
// was actually written to the clipboard.
export async function copyImageToClipboard(blob: Blob): Promise<ImageCopyResult> {
  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof (window as any).ClipboardItem !== "undefined" &&
    typeof navigator.clipboard.write === "function";

  if (!supported) {
    return {
      ok: false,
      output: "none",
      message: "הדפדפן לא מאפשר העתקת תמונה ישירה. השתמש בכפתור הורד PNG.",
    };
  }

  try {
    const item = new (window as any).ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
    return {
      ok: true,
      output: "PNG",
      message: "השאלה הועתקה כתמונה. אפשר להדביק בוורד, קנבה או Google Docs.",
    };
  } catch (e: any) {
    return {
      ok: false,
      output: "none",
      message:
        "העתקת התמונה ללוח נכשלה: " +
        (e?.message || "שגיאה לא ידועה") +
        ". השתמש בכפתור הורד PNG.",
    };
  }
}
