import { Rng, gcd } from "./rng";

export type Representation = "wheel" | "pie" | "balls" | "dice" | "freqTable" | "barChart";
export type Grade = "ה" | "ו" | "ז" | "ח" | "ט";
export type Level = "basic" | "medium" | "advanced";
export type SizeMode = "fractions" | "percents" | "degrees" | "auto";
export type QuestionType =
  | "expectedCount"
  | "probability"
  | "percent"
  | "missingTrials"
  | "compare"
  | "claim";
export type AnswerFormat = "mc" | "open" | "trueFalse";
export type DistractorLevel = "easy" | "tricky";
export type PrintMode = "one" | "two" | "four";

export interface Category {
  name: string;
  color: string;
  count: number; // share in arbitrary integer units
}

export interface GenSettings {
  grade: Grade;
  level: Level;
  representation: Representation;
  context: string; // narrative context label
  contextCustom: string;
  trials: number;
  numCategories: number;
  categoryNames: string[];
  customColors?: string[];
  sizeMode: SizeMode;
  targetIndex: number; // index of target category, -1 = auto
  questionType: QuestionType;
  answerFormat: AnswerFormat;
  distractorLevel: DistractorLevel;
  showSolution: boolean;
  showScore: boolean;
  showAnswerLines: boolean;
  showNameDate: boolean;
  printMode: PrintMode;
  seed: string;
}

export interface GeneratedQuestion {
  id: string;
  seed: string;
  settings: GenSettings;
  categories: Category[];
  totalUnits: number;
  targetIndex: number;
  questionText: string;
  contextSentence: string;
  options?: { label: string; text: string; correct: boolean }[];
  correctAnswerText: string;
  solutionSteps: string[];
  pedagogicalNote: string;
  difficulty: string;
  skills: string[];
  answerFormat: AnswerFormat;
}

export const HEB_COLORS: { name: string; color: string }[] = [
  { name: "אדום", color: "#e63946" },
  { name: "כחול", color: "#1d70b8" },
  { name: "ירוק", color: "#2a9d4a" },
  { name: "צהוב", color: "#f4c430" },
  { name: "כתום", color: "#f08a24" },
  { name: "סגול", color: "#7b4ea3" },
  { name: "ורוד", color: "#e26da5" },
  { name: "תכלת", color: "#4cc6e0" },
];

export const OPTION_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו"];

export const CONTEXTS: Record<string, (target: string) => { intro: string }> = {};

const NICE_FRACTIONS = [
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [1, 6],
  [1, 8],
  [1, 10],
  [1, 12],
  [3, 10],
  [3, 8],
  [2, 5],
];

const TRIAL_OPTIONS = [60, 100, 120, 200, 240, 360, 400, 600, 800, 1000];

export function defaultSettings(): GenSettings {
  return {
    grade: "ו",
    level: "basic",
    representation: "wheel",
    context: "monthlyGame",
    contextCustom: "",
    trials: 600,
    numCategories: 4,
    categoryNames: ["אדום", "כחול", "ירוק", "צהוב"],
    sizeMode: "auto",
    targetIndex: 0,
    questionType: "expectedCount",
    answerFormat: "mc",
    distractorLevel: "tricky",
    showSolution: true,
    showScore: false,
    showAnswerLines: false,
    showNameDate: false,
    printMode: "one",
    seed: "",
  };
}

const CONTEXT_PHRASES: Record<string, string> = {
  monthlyGame: "גלגל המשחק שלפניכם הוא משחק החודש של הכיתה.",
  classLottery: "לפניכם גלגל ההגרלה הכיתתית של סוף השבוע.",
  survey: "התרשים שלפניכם מתאר את תוצאות הסקר שנערך בכיתה.",
  balls: "בשקית שלפניכם כדורים בצבעים שונים, מערבבים ושולפים כדור.",
  schoolActivity: "לפניכם גלגל הפעילות של היום הספורטיבי בבית הספר.",
  custom: "",
};

// Build category distribution as integer units that sum nicely.
function buildCategories(rng: Rng, s: GenSettings): { categories: Category[]; total: number } {
  const n = s.numCategories;
  const palette = HEB_COLORS;
  const names: string[] = [];
  for (let i = 0; i < n; i++) {
    names.push(s.categoryNames[i] || palette[i % palette.length].name);
  }
  const colors = s.customColors && s.customColors.length >= n
    ? s.customColors
    : palette.map((c) => c.color);

  // Determine a common denominator based on trials so expected counts are integers.
  // Strategy: choose target fraction nice, then split remainder.
  let units: number[] = [];

  if (s.level === "basic") {
    // pick a nice fraction for target then distribute remainder in equalish nice parts
    const denomCandidates = [4, 5, 6, 8, 10, 12].filter((d) => s.trials % d === 0 && d >= n);
    const denom = denomCandidates.length ? rng.pick(denomCandidates) : Math.max(n, 8);
    // distribute `denom` units among n categories, each >=1
    units = distributeUnits(rng, denom, n);
  } else if (s.level === "medium") {
    const denomCandidates = [10, 12, 20, 100].filter((d) => s.trials % d === 0 && d >= n);
    const denom = denomCandidates.length ? rng.pick(denomCandidates) : 100;
    units = distributeUnits(rng, denom, n);
  } else {
    // advanced: percentages summing to 100, not necessarily super clean
    units = distributeUnits(rng, 100, n);
  }

  const total = units.reduce((a, b) => a + b, 0);
  const categories: Category[] = names.map((name, i) => ({
    name,
    color: colors[i] || palette[i % palette.length].color,
    count: units[i],
  }));
  return { categories, total };
}

function distributeUnits(rng: Rng, total: number, n: number): number[] {
  // each part >= 1, sum = total
  const units = new Array(n).fill(1);
  let remaining = total - n;
  // weighted random distribution
  while (remaining > 0) {
    const step = remaining >= 4 ? rng.int(1, Math.max(1, Math.floor(remaining / 2))) : 1;
    const idx = rng.int(0, n - 1);
    units[idx] += step;
    remaining -= step;
  }
  return units;
}

function fmtFraction(num: number, den: number): string {
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}

function probParts(count: number, total: number) {
  const g = gcd(count, total);
  return {
    fraction: `${count / g}/${total / g}`,
    percent: (count / total) * 100,
    decimal: count / total,
    degrees: (count / total) * 360,
  };
}

function roundNice(x: number): number {
  return Math.round(x);
}

export function generateQuestion(settings: GenSettings): GeneratedQuestion {
  const s = { ...settings };
  const seed = s.seed && s.seed.trim() ? s.seed.trim() : Math.random().toString(36).slice(2, 9);
  const rng = new Rng(seed + "|" + s.grade + s.level + s.questionType + s.numCategories + s.trials);

  const { categories, total } = buildCategories(rng, s);

  let targetIndex = s.targetIndex;
  if (targetIndex < 0 || targetIndex >= categories.length) {
    targetIndex = rng.int(0, categories.length - 1);
  }
  const target = categories[targetIndex];
  const p = probParts(target.count, total);

  const contextSentence =
    s.context === "custom" && s.contextCustom.trim()
      ? s.contextCustom.trim()
      : CONTEXT_PHRASES[s.context] || CONTEXT_PHRASES.monthlyGame;

  const reprWord = representationVerb(s.representation);
  const trials = s.trials;

  let questionText = "";
  let correctValue = 0;
  let correctAnswerText = "";
  const solutionSteps: string[] = [];
  let pedagogicalNote = "";
  const skills: string[] = [];

  const probDisplay = probDisplayByLevel(p, s.level);

  switch (s.questionType) {
    case "expectedCount": {
      correctValue = roundNice(p.decimal * trials);
      questionText = `${reprWord.intro} מתוך ${trials} ${reprWord.trialsWord}, כמה פעמים בערך נצפה ש${reprWord.stop} ב${categoryPhrase(target)}?`;
      correctAnswerText = `${correctValue} פעמים בערך`;
      solutionSteps.push(`הסתברות ל${categoryPhrase(target)}: ${probDisplay}.`);
      solutionSteps.push(`מספר צפוי = הסתברות × מספר ניסיונות = ${p.fraction} × ${trials}.`);
      solutionSteps.push(`מספר צפוי ≈ ${correctValue}.`);
      pedagogicalNote = `המילה "בערך" חשובה: ב-${trials} ניסיונות התוצאה תהיה קרובה ל-${correctValue}, אך לא בהכרח מדויקת.`;
      skills.push("הסתברות כיחס מתוך שלם", "מספר צפוי = הסתברות × ניסיונות", "הבחנה בין 'בערך' לתוצאה מובטחת");
      break;
    }
    case "probability": {
      questionText = `${contextSentence} מהי ההסתברות ש${reprWord.stop} ב${categoryPhrase(target)}?`;
      correctAnswerText = probDisplay;
      correctValue = p.decimal;
      solutionSteps.push(`חלק ${categoryPhrase(target)} מתוך השלם: ${target.count} מתוך ${total}.`);
      solutionSteps.push(`הסתברות = ${target.count}/${total} = ${p.fraction}${s.level !== "basic" ? ` = ${formatPercent(p.percent)}` : ""}.`);
      pedagogicalNote = `ההסתברות היא יחס בין גודל הגזרה לשלם — לא מספר הגזרות.`;
      skills.push("הסתברות תאורטית כיחס", "קריאת חלק מתוך שלם", "צמצום שברים");
      break;
    }
    case "percent": {
      questionText = `${contextSentence} איזה אחוז מהשלם מהווה ${categoryPhrase(target)}?`;
      correctValue = p.percent;
      correctAnswerText = formatPercent(p.percent);
      solutionSteps.push(`חלק ${categoryPhrase(target)}: ${target.count} מתוך ${total}.`);
      solutionSteps.push(`אחוז = (${target.count} ÷ ${total}) × 100 = ${formatPercent(p.percent)}.`);
      pedagogicalNote = `אחוז מבטא חלק מתוך 100 — שימו לב לא להתבלבל בין אחוז לבין מספר מופעים.`;
      skills.push("המרת יחס לאחוז", "קריאת חלק מתוך שלם");
      break;
    }
    case "missingTrials": {
      const observed = roundNice(p.decimal * trials);
      questionText = `${contextSentence} ${reprWord.cap} ${reprWord.stop2} ב${categoryPhrase(target)} בערך ${observed} פעמים, וזה תאם להסתברות הצפויה. כמה ${reprWord.trialsWord} בוצעו בסך הכול בערך?`;
      correctValue = trials;
      correctAnswerText = `${trials} ${reprWord.trialsWord}`;
      solutionSteps.push(`הסתברות ל${categoryPhrase(target)}: ${probDisplay}.`);
      solutionSteps.push(`מספר ניסיונות = מספר מופעים ÷ הסתברות = ${observed} ÷ ${p.fraction} = ${trials}.`);
      pedagogicalNote = `כאן הופכים את הנוסחה: מספר ניסיונות = מספר מופעים ÷ הסתברות.`;
      skills.push("הפיכת נוסחת המספר הצפוי", "פרופורציה");
      break;
    }
    case "compare": {
      let otherIndex = rng.int(0, categories.length - 1);
      if (otherIndex === targetIndex) otherIndex = (otherIndex + 1) % categories.length;
      const other = categories[otherIndex];
      const cA = roundNice(p.decimal * trials);
      const cB = roundNice((other.count / total) * trials);
      const diff = Math.abs(cA - cB);
      questionText = `${contextSentence} מתוך ${trials} ${reprWord.trialsWord}, בכמה פעמים בערך נצפה יותר ${reprWord.stop} ב${categoryPhrase(target)} לעומת ${categoryPhrase(other)}?`;
      correctValue = diff;
      correctAnswerText = `${diff} פעמים בערך`;
      solutionSteps.push(`מספר צפוי ל${categoryPhrase(target)}: ${p.fraction} × ${trials} ≈ ${cA}.`);
      solutionSteps.push(`מספר צפוי ל${categoryPhrase(other)}: ${fmtFraction(other.count, total)} × ${trials} ≈ ${cB}.`);
      solutionSteps.push(`ההפרש: ${cA} − ${cB} = ${diff}.`);
      pedagogicalNote = `משווים שני מספרים צפויים — לא את מספר הגזרות.`;
      skills.push("השוואת מספרים צפויים", "חיסור", "מספר צפוי");
      break;
    }
    case "claim": {
      const claimedCount = roundNice(p.decimal * trials);
      const isTrue = rng.float() < 0.5;
      const shown = isTrue ? claimedCount : claimedCount + rng.pick([target.count, -target.count, claimedCount]);
      questionText = `${contextSentence} שי טוען שמתוך ${trials} ${reprWord.trialsWord} ${reprWord.stop2} ב${categoryPhrase(target)} בדיוק ${shown} פעמים — תמיד. האם הטענה נכונה? נמקו.`;
      correctAnswerText = "לא נכון";
      correctValue = 0;
      solutionSteps.push(`ההסתברות ל${categoryPhrase(target)} היא ${probDisplay}, ולכן הצפי הוא בערך ${claimedCount} פעמים.`);
      solutionSteps.push(`אך זהו ערך משוער בלבד — בניסוי אמיתי התוצאה משתנה ואינה מובטחת.`);
      pedagogicalNote = `המספר הצפוי הוא הערכה ("בערך"), אף פעם לא תוצאה מובטחת מדויקת.`;
      skills.push("הבחנה בין צפי לתוצאה מובטחת", "הבנת 'בערך'");
      break;
    }
  }

  // Build answers
  let options: GeneratedQuestion["options"] | undefined;
  let answerFormat = s.answerFormat;

  if (s.questionType === "claim") {
    answerFormat = "trueFalse";
    options = rng.shuffle([
      { text: "נכון", correct: false, label: "" },
      { text: "לא נכון", correct: true, label: "" },
    ]).map((o, i) => ({ ...o, label: OPTION_LETTERS[i] }));
  } else if (answerFormat === "mc") {
    const distractors = buildDistractors(rng, s, {
      categories,
      total,
      targetIndex,
      p,
      trials,
      correctValue,
    });
    const correctOpt = { text: correctAnswerText, value: correctValue, correct: true };
    const all = dedupeOptions(rng, correctOpt, distractors, s.questionType);
    options = rng
      .shuffle(all)
      .map((o, i) => ({ label: OPTION_LETTERS[i], text: o.text, correct: o.correct }));
  }

  const difficulty = difficultyLabel(s.level, s.distractorLevel, s.questionType);

  return {
    id: seed + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    seed,
    settings: { ...s, seed },
    categories,
    totalUnits: total,
    targetIndex,
    questionText,
    contextSentence,
    options,
    correctAnswerText,
    solutionSteps,
    pedagogicalNote,
    difficulty,
    skills,
    answerFormat,
  };
}

function categoryPhrase(cat: Category): string {
  // e.g. "הגזרה האדומה" if it's a color, else the name
  const colorMap: Record<string, string> = {
    אדום: "הגזרה האדומה",
    כחול: "הגזרה הכחולה",
    ירוק: "הגזרה הירוקה",
    צהוב: "הגזרה הצהובה",
    כתום: "הגזרה הכתומה",
    סגול: "הגזרה הסגולה",
    ורוד: "הגזרה הוורודה",
    תכלת: "הגזרה התכולה",
  };
  return colorMap[cat.name] || `קטגוריית "${cat.name}"`;
}

function representationVerb(r: Representation) {
  switch (r) {
    case "wheel":
      return {
        intro: "גלגל המשחק שלפניכם.",
        trialsWord: "סיבובים",
        stop: "המחוג ייעצר",
        stop2: "המחוג עצר",
        cap: "המחוג",
      };
    case "pie":
      return {
        intro: "דיאגרמת העוגה שלפניכם מתארת התפלגות.",
        trialsWord: "פריטים",
        stop: "פריט יישתייך",
        stop2: "השתייכו",
        cap: "פריטים",
      };
    case "balls":
      return {
        intro: "בשקית שלפניכם כדורים בצבעים שונים.",
        trialsWord: "שליפות",
        stop: "יישלף כדור",
        stop2: "נשלף כדור",
        cap: "הכדור",
      };
    default:
      return {
        intro: "התרשים שלפניכם.",
        trialsWord: "ניסיונות",
        stop: "נצפה מאורע",
        stop2: "נצפה מאורע",
        cap: "המאורע",
      };
  }
}

function probDisplayByLevel(
  p: { fraction: string; percent: number; degrees: number },
  level: Level,
): string {
  if (level === "basic") return p.fraction;
  if (level === "medium") return `${p.fraction} (${formatPercent(p.percent)})`;
  return `${formatPercent(p.percent)} (${p.fraction})`;
}

function formatPercent(x: number): string {
  const r = Math.round(x * 10) / 10;
  return (Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)) + "%";
}

interface DistractorCtx {
  categories: Category[];
  total: number;
  targetIndex: number;
  p: { fraction: string; percent: number; decimal: number; degrees: number };
  trials: number;
  correctValue: number;
}

function buildDistractors(
  rng: Rng,
  s: GenSettings,
  ctx: DistractorCtx,
): { text: string; value: number; correct: boolean; reason?: string }[] {
  const { categories, total, p, trials, correctValue } = ctx;
  const n = categories.length;
  const out: { text: string; value: number; correct: boolean; reason?: string }[] = [];

  if (s.questionType === "expectedCount" || s.questionType === "compare" || s.questionType === "missingTrials") {
    const v = correctValue;
    // tricky distractors based on common errors
    const candidates: { value: number; reason: string }[] = [];
    // use number of categories instead of size
    candidates.push({ value: roundNice((1 / n) * trials), reason: "חלוקה שווה שגויה (לפי מספר הגזרות)" });
    // use complement
    candidates.push({ value: roundNice((1 - p.decimal) * trials), reason: "חישוב המשלים" });
    // off by the units count (color count confusion)
    candidates.push({ value: roundNice(p.decimal * trials) + Math.max(5, Math.round(v * 0.2)), reason: "טעות חישוב קלה" });
    candidates.push({ value: Math.max(1, roundNice(p.decimal * trials) - Math.max(5, Math.round(v * 0.2))), reason: "טעות חישוב קלה" });
    // percent vs number confusion
    candidates.push({ value: roundNice(p.percent), reason: "בלבול בין אחוז למספר מופעים" });

    const chosen = pickDistinct(rng, candidates, v, 3, s.distractorLevel);
    for (const c of chosen) {
      out.push({
        text: s.questionType === "missingTrials" ? `${c.value} ${representationVerb(s.representation).trialsWord}` : `${c.value} פעמים בערך`,
        value: c.value,
        correct: false,
        reason: c.reason,
      });
    }
    return out;
  }

  if (s.questionType === "probability") {
    const target = categories[ctx.targetIndex];
    const cands: { text: string; reason: string }[] = [];
    cands.push({ text: `1/${n}`, reason: "חלוקה שווה לפי מספר הגזרות" });
    cands.push({ text: fmtFraction(total - target.count, total), reason: "חישוב המשלים" });
    cands.push({ text: `${target.count}/${total + 1}`, reason: "ספירת השלם שגויה" });
    cands.push({ text: fmtFraction(Math.max(1, target.count - 1), total), reason: "ספירת הגזרה שגויה" });
    const correctTxt = p.fraction;
    const chosen: { text: string; reason: string }[] = [];
    for (const c of rng.shuffle(cands)) {
      if (c.text !== correctTxt && !chosen.some((x) => x.text === c.text)) chosen.push(c);
      if (chosen.length === 3) break;
    }
    for (const c of chosen) out.push({ text: c.text, value: NaN, correct: false, reason: c.reason });
    return out;
  }

  if (s.questionType === "percent") {
    const cands: { value: number; reason: string }[] = [
      { value: Math.round(100 / n), reason: "חלוקה שווה לפי מספר הגזרות" },
      { value: Math.round(100 - p.percent), reason: "חישוב המשלים" },
      { value: Math.round(p.percent) + 10, reason: "טעות חישוב" },
      { value: Math.max(1, Math.round(p.percent) - 10), reason: "טעות חישוב" },
    ];
    const chosen = pickDistinct(
      rng,
      cands,
      Math.round(p.percent),
      3,
      s.distractorLevel,
    );
    for (const c of chosen) out.push({ text: formatPercent(c.value), value: c.value, correct: false, reason: c.reason });
    return out;
  }

  return out;
}

function pickDistinct(
  rng: Rng,
  candidates: { value: number; reason: string }[],
  correct: number,
  count: number,
  level: DistractorLevel,
): { value: number; reason: string }[] {
  const seen = new Set<number>([correct]);
  const result: { value: number; reason: string }[] = [];
  const pool = rng.shuffle(candidates);
  for (const c of pool) {
    if (c.value > 0 && !seen.has(c.value)) {
      seen.add(c.value);
      result.push(c);
    }
    if (result.length === count) break;
  }
  // top up with nearby values if needed
  let delta = 1;
  while (result.length < count) {
    const v = correct + (delta % 2 === 0 ? delta : -delta) * Math.max(1, Math.round(correct * 0.1));
    if (v > 0 && !seen.has(v)) {
      seen.add(v);
      result.push({ value: v, reason: "ערך קרוב כמסיח" });
    }
    delta++;
    if (delta > 40) break;
  }
  return result;
}

function dedupeOptions(
  rng: Rng,
  correct: { text: string; correct: boolean },
  distractors: { text: string; correct: boolean }[],
  qtype: QuestionType,
) {
  const seen = new Set<string>([correct.text]);
  const out = [correct];
  for (const d of distractors) {
    if (!seen.has(d.text)) {
      seen.add(d.text);
      out.push(d);
    }
  }
  return out;
}

function difficultyLabel(level: Level, dl: DistractorLevel, qt: QuestionType): string {
  const base = level === "basic" ? "בסיסי" : level === "medium" ? "בינוני" : "מתקדם";
  const tricky = dl === "tricky" ? " · מסיחים מתוחכמים" : " · מסיחים קלים";
  return base + tricky;
}

export { TRIAL_OPTIONS };
