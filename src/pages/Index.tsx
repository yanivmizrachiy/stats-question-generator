import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Copy,
  FileText,
  Download,
  Printer,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  ArrowUp,
  ArrowDown,
  ClipboardCopy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GenSettings,
  GeneratedQuestion,
  defaultSettings,
  generateQuestion,
} from "@/lib/questionGenerator";
import SettingsPanel from "@/components/SettingsPanel";
import QuestionView from "@/components/QuestionView";
import QualityPanel, { SolutionPanel } from "@/components/QualityPanel";
import {
  copyRich,
  copyText,
  downloadBlob,
  domToPNGBlob,
  copyImageToClipboard,
  questionToHTML,
  questionToPlainText,
  worksheetToHTML,
  worksheetToPlainText,
} from "@/lib/exporters";

interface StatusInfo {
  action: string;
  ok: boolean;
  output: "PNG" | "HTML" | "טקסט" | "הדפסה" | "—";
  message: string;
}

const STORAGE_KEY = "stat-q-generator-settings-v1";

function loadSettings(): GenSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch (e) {
    /* ignore */
  }
  return defaultSettings();
}

const Index = () => {
  const [settings, setSettings] = useState<GenSettings>(loadSettings);
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [worksheet, setWorksheet] = useState<GeneratedQuestion[]>([]);
  const [printMode, setPrintMode] = useState<"single" | "worksheet" | null>(null);
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // initial example question (matches the inspiration: red = 1/10 of 600 -> 60)
  useEffect(() => {
    setQuestion(buildExample());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      /* ignore */
    }
  }, [settings]);

  const handleGenerate = () => {
    try {
      const q = generateQuestion(settings);
      if (!q.questionText) {
        toast.error("לא ניתן ליצור שאלה עם ההגדרות הנוכחיות. נסו לשנות פרמטרים.");
        return;
      }
      setQuestion(q);
      setShowSolution(false);
    } catch (e) {
      toast.error("אירעה שגיאה ביצירת השאלה. בדקו את ההגדרות.");
    }
  };

  // Main button: copy the full question area as a real PNG image to clipboard.
  const handleCopyImage = async () => {
    if (!question || !captureRef.current) return;
    toast.info("מכין תמונה…");
    let blob: Blob;
    try {
      blob = await domToPNGBlob(captureRef.current, 3);
    } catch (e: any) {
      const msg = "יצירת התמונה נכשלה: " + (e?.message || "שגיאה לא ידועה");
      toast.error(msg);
      setStatus({ action: "העתק לדף עבודה (תמונה)", ok: false, output: "—", message: msg });
      return;
    }
    const res = await copyImageToClipboard(blob);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
      // Fallback only as alternative — not reported as success.
      downloadBlob(blob, `שאלה-${question.seed}.png`);
    }
    setStatus({
      action: "העתק לדף עבודה (תמונה)",
      ok: res.ok,
      output: res.ok ? "PNG" : "—",
      message: res.ok ? res.message : res.message + " הורדה הופעלה כחלופה.",
    });
  };

  const handleCopyRich = async () => {
    if (!question) return;
    const res = await copyRich(questionToHTML(question), questionToPlainText(question));
    res.ok ? toast.success(res.message) : toast.error(res.message);
    setStatus({
      action: "העתק כ-HTML",
      ok: res.ok,
      output: res.ok ? (res.rich ? "HTML" : "טקסט") : "—",
      message: res.message,
    });
  };

  const handleCopyText = async () => {
    if (!question) return;
    const res = await copyText(questionToPlainText(question));
    res.ok ? toast.success(res.message) : toast.error(res.message);
    setStatus({
      action: "העתק טקסט בלבד",
      ok: res.ok,
      output: res.ok ? "טקסט" : "—",
      message: res.message,
    });
  };

  const handlePNG = async () => {
    if (!question || !captureRef.current) return;
    toast.info("מכין PNG…");
    try {
      const blob = await domToPNGBlob(captureRef.current, 3);
      downloadBlob(blob, `שאלה-${question.seed}.png`);
      toast.success("ה-PNG הורד בהצלחה.");
      setStatus({ action: "הורד PNG", ok: true, output: "PNG", message: "קובץ ה-PNG הורד בהצלחה." });
    } catch (e: any) {
      const msg = "הורדת ה-PNG נכשלה: " + (e?.message || "שגיאה לא ידועה");
      toast.error(msg);
      setStatus({ action: "הורד PNG", ok: false, output: "—", message: msg });
    }
  };

  const handlePrintSingle = () => {
    setPrintMode("single");
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 80);
    setStatus({ action: "הדפס שאלה", ok: true, output: "הדפסה", message: "נפתח חלון הדפסה לשאלה בלבד." });
  };

  const handlePrintWorksheet = () => {
    if (!worksheet.length) {
      toast.error("דף העבודה ריק. הוסיפו שאלות תחילה.");
      setStatus({ action: "הדפס דף עבודה", ok: false, output: "—", message: "דף העבודה ריק." });
      return;
    }
    setPrintMode("worksheet");
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 80);
    setStatus({ action: "הדפס דף עבודה", ok: true, output: "הדפסה", message: "נפתח חלון הדפסה לדף העבודה בלבד." });
  };

  const addToWorksheet = () => {
    if (!question) return;
    setWorksheet((w) => [...w, question]);
    toast.success("השאלה נוספה לדף העבודה.");
    setStatus({ action: "הוסף לדף עבודה", ok: true, output: "—", message: "השאלה נוספה לדף העבודה." });
  };

  const removeFromWorksheet = (id: string) =>
    setWorksheet((w) => w.filter((q) => q.id !== id));

  const moveWorksheet = (i: number, dir: -1 | 1) => {
    setWorksheet((w) => {
      const j = i + dir;
      if (j < 0 || j >= w.length) return w;
      const a = [...w];
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  };

  const copyWorksheet = async () => {
    if (!worksheet.length) {
      toast.error("דף העבודה ריק.");
      return;
    }
    const res = await copyRich(worksheetToHTML(worksheet), worksheetToPlainText(worksheet));
    res.ok ? toast.success(res.message) : toast.error(res.message);
  };

  const gridClass =
    settings.printMode === "four"
      ? "grid grid-cols-2 gap-4"
      : settings.printMode === "two"
        ? "grid grid-cols-1 gap-4"
        : "space-y-6";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="no-print bg-gradient-primary text-primary-foreground shadow-card">
        <div className="container py-6 flex items-center gap-3">
          <div className="bg-primary-foreground/15 rounded-2xl p-2.5">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold leading-tight">
              מחולל שאלות סטטיסטיקה והסתברות למורים
            </h1>
            <p className="text-primary-foreground/85 text-sm md:text-base">
              צרו שאלות מבחן יפות על שכיחות יחסית והסתברות — להדפסה ולהעתקה ישירה לדפי עבודה
            </p>
          </div>
        </div>
      </header>

      <main className="container py-6 grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Settings */}
        <aside className="no-print lg:sticky lg:top-4">
          <SettingsPanel settings={settings} onChange={setSettings} />
        </aside>

        {/* Preview + actions */}
        <section className="space-y-5">
          {/* Live preview */}
          <div className="no-print panel-card p-5 md:p-7" ref={printRef}>
            {question ? (
              <div className="max-w-2xl mx-auto">
                <QuestionView question={question} />
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">לחצו "צור שאלה" כדי להתחיל.</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="no-print flex flex-wrap gap-2.5">
            <Button onClick={handleGenerate} className="bg-gradient-primary hover:opacity-90 shadow-soft">
              <Sparkles className="w-4 h-4 ml-1.5" /> צור שאלה חדשה
            </Button>
            <Button onClick={handleCopyRich} variant="default">
              <Copy className="w-4 h-4 ml-1.5" /> העתק לדף עבודה
            </Button>
            <Button onClick={handleCopyText} variant="outline">
              <ClipboardCopy className="w-4 h-4 ml-1.5" /> העתק טקסט בלבד
            </Button>
            <Button onClick={handlePNG} variant="outline">
              <Download className="w-4 h-4 ml-1.5" /> הורד PNG
            </Button>
            <Button onClick={handlePrintSingle} variant="outline">
              <Printer className="w-4 h-4 ml-1.5" /> הדפס
            </Button>
            <Button onClick={() => setShowSolution((s) => !s)} variant="outline">
              {showSolution ? <EyeOff className="w-4 h-4 ml-1.5" /> : <Eye className="w-4 h-4 ml-1.5" />}
              {showSolution ? "הסתר פתרון" : "הצג פתרון למורה"}
            </Button>
            <Button onClick={addToWorksheet} variant="secondary">
              <Plus className="w-4 h-4 ml-1.5" /> הוסף לדף עבודה
            </Button>
          </div>

          {/* Solution */}
          {question && showSolution && (
            <div className="no-print">
              <SolutionPanel question={question} />
            </div>
          )}

          {/* QA */}
          {question && (
            <div className="no-print">
              <QualityPanel question={question} />
            </div>
          )}

          {/* Worksheet builder */}
          <div className="no-print panel-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-bold">
                דף העבודה ({worksheet.length} שאלות)
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyWorksheet} disabled={!worksheet.length}>
                  <Copy className="w-3.5 h-3.5 ml-1" /> העתק הכל
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrintWorksheet} disabled={!worksheet.length}>
                  <Printer className="w-3.5 h-3.5 ml-1" /> הדפס דף
                </Button>
              </div>
            </div>
            {worksheet.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                לחצו "הוסף לדף עבודה" כדי לצבור שאלות, ואז הדפיסו או העתיקו את כולן יחד.
              </p>
            ) : (
              <ul className="space-y-2">
                {worksheet.map((q, i) => (
                  <li
                    key={q.id}
                    className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                    <span className="flex-1 truncate">{q.questionText}</span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => moveWorksheet(i, -1)} className="p-1 hover:text-primary" aria-label="העלה">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveWorksheet(i, 1)} className="p-1 hover:text-primary" aria-label="הורד">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeFromWorksheet(q.id)} className="p-1 hover:text-destructive" aria-label="מחק">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {/* Hidden print containers */}
      {printMode === "single" && question && (
        <div className="hidden print:block print-area p-6">
          <QuestionView question={question} />
        </div>
      )}
      {printMode === "worksheet" && (
        <div className={`hidden print:block print-area p-6 ${gridClass}`}>
          {worksheet.map((q, i) => (
            <QuestionView key={q.id} question={q} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

function buildExample(): GeneratedQuestion {
  const s: GenSettings = {
    ...defaultSettings(),
    seed: "demo-shai-wheel",
    representation: "wheel",
    trials: 600,
    numCategories: 4,
    categoryNames: ["אדום", "כחול", "ירוק", "צהוב"],
    questionType: "expectedCount",
    level: "basic",
    targetIndex: 0,
    context: "monthlyGame",
  };
  const categories = [
    { name: "אדום", color: "#e63946", count: 1 },
    { name: "כחול", color: "#1d70b8", count: 3 },
    { name: "ירוק", color: "#2a9d4a", count: 2 },
    { name: "צהוב", color: "#f4c430", count: 4 },
  ];
  const total = 10;
  const options = [
    { label: "א", text: "30 פעמים בערך", correct: false },
    { label: "ב", text: "40 פעמים בערך", correct: false },
    { label: "ג", text: "50 פעמים בערך", correct: false },
    { label: "ד", text: "60 פעמים בערך", correct: true },
  ];
  return {
    id: "demo-shai-wheel",
    seed: "demo-shai-wheel",
    settings: s,
    categories,
    totalUnits: total,
    targetIndex: 0,
    contextSentence: "גלגל המשחק שלפניכם הוא משחק החודש של שי.",
    questionText:
      "גלגל המשחק שלפניכם הוא משחק החודש של שי. מתוך 600 סיבובים, כמה פעמים בערך נצפה שהמחוג ייעצר בגזרה האדומה?",
    options,
    correctAnswerText: "60 פעמים בערך",
    solutionSteps: [
      "הסתברות לגזרה האדומה: 1/10.",
      "מספר צפוי = הסתברות × מספר ניסיונות = 1/10 × 600.",
      "מספר צפוי ≈ 60.",
    ],
    pedagogicalNote:
      'המילה "בערך" חשובה: ב-600 סיבובים התוצאה תהיה קרובה ל-60, אך לא בהכרח מדויקת.',
    difficulty: "בסיסי · מסיחים מתוחכמים",
    skills: [
      "הסתברות כיחס מתוך שלם",
      "מספר צפוי = הסתברות × ניסיונות",
      "הבחנה בין 'בערך' לתוצאה מובטחת",
    ],
    answerFormat: "mc",
  };
}

export default Index;
