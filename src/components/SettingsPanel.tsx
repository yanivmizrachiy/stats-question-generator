import { GenSettings, HEB_COLORS, TRIAL_OPTIONS } from "@/lib/questionGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  settings: GenSettings;
  onChange: (s: GenSettings) => void;
}

const SELECT_CLS = "bg-background";

export default function SettingsPanel({ settings, onChange }: Props) {
  const update = (patch: Partial<GenSettings>) => onChange({ ...settings, ...patch });

  const setCategoryName = (i: number, name: string) => {
    const names = [...settings.categoryNames];
    names[i] = name;
    update({ categoryNames: names });
  };

  const setNumCategories = (n: number) => {
    const names = [...settings.categoryNames];
    while (names.length < n) names.push(HEB_COLORS[names.length % HEB_COLORS.length].name);
    names.length = n;
    const targetIndex = settings.targetIndex >= n ? 0 : settings.targetIndex;
    update({ numCategories: n, categoryNames: names, targetIndex });
  };

  return (
    <div className="panel-card p-4 md:p-5">
      <h2 className="font-display text-lg font-bold mb-3 text-foreground">הגדרות השאלה</h2>
      <Tabs defaultValue="base" dir="rtl">
        <TabsList className="grid grid-cols-5 w-full h-auto">
          <TabsTrigger value="base" className="text-xs px-1">בסיס</TabsTrigger>
          <TabsTrigger value="graphic" className="text-xs px-1">ייצוג</TabsTrigger>
          <TabsTrigger value="answers" className="text-xs px-1">תשובות</TabsTrigger>
          <TabsTrigger value="print" className="text-xs px-1">הדפסה</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs px-1">מתקדם</TabsTrigger>
        </TabsList>

        {/* BASE */}
        <TabsContent value="base" className="space-y-4 mt-4">
          <Field label="שכבת גיל">
            <Select value={settings.grade} onValueChange={(v) => update({ grade: v as any })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["ה", "ו", "ז", "ח", "ט"] as const).map((g) => (
                  <SelectItem key={g} value={g}>כיתה {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="רמת קושי">
            <Select value={settings.level} onValueChange={(v) => update({ level: v as any })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">בסיסית — שברים נוחים</SelectItem>
                <SelectItem value="medium">בינונית — שברים ואחוזים</SelectItem>
                <SelectItem value="advanced">מתקדמת — אחוזים</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="סוג שאלה">
            <Select value={settings.questionType} onValueChange={(v) => update({ questionType: v as any })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expectedCount">מספר מופעים צפוי</SelectItem>
                <SelectItem value="probability">חישוב הסתברות</SelectItem>
                <SelectItem value="percent">מציאת אחוז</SelectItem>
                <SelectItem value="missingTrials">מספר ניסיונות חסר</SelectItem>
                <SelectItem value="compare">השוואה בין קטגוריות</SelectItem>
                <SelectItem value="claim">האם הטענה נכונה</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="הקשר מילולי">
            <Select value={settings.context} onValueChange={(v) => update({ context: v })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthlyGame">משחק החודש</SelectItem>
                <SelectItem value="classLottery">הגרלה כיתתית</SelectItem>
                <SelectItem value="survey">סקר העדפות</SelectItem>
                <SelectItem value="balls">צבעי כדורים</SelectItem>
                <SelectItem value="schoolActivity">פעילות בית ספרית</SelectItem>
                <SelectItem value="custom">מותאם אישית</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {settings.context === "custom" && (
            <Field label="משפט פתיחה מותאם">
              <Input
                className={SELECT_CLS}
                value={settings.contextCustom}
                placeholder="לדוגמה: גלגל המזל של יום ההולדת..."
                onChange={(e) => update({ contextCustom: e.target.value })}
              />
            </Field>
          )}

          <Field label="מספר ניסיונות כולל">
            <div className="flex gap-2">
              <Select
                value={TRIAL_OPTIONS.includes(settings.trials) ? String(settings.trials) : "custom"}
                onValueChange={(v) => v !== "custom" && update({ trials: Number(v) })}
              >
                <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIAL_OPTIONS.map((t) => (
                    <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                  ))}
                  <SelectItem value="custom">ידני…</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                className={`w-24 ${SELECT_CLS}`}
                value={settings.trials}
                min={1}
                onChange={(e) => update({ trials: Math.max(1, Number(e.target.value)) })}
              />
            </div>
          </Field>
        </TabsContent>

        {/* GRAPHIC */}
        <TabsContent value="graphic" className="space-y-4 mt-4">
          <Field label="סוג ייצוג גרפי">
            <Select value={settings.representation} onValueChange={(v) => update({ representation: v as any })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wheel">גלגל משחק</SelectItem>
                <SelectItem value="pie">דיאגרמת עוגה</SelectItem>
                <SelectItem value="balls">שקית כדורים</SelectItem>
                <SelectItem value="barChart">תרשים עמודות</SelectItem>
                <SelectItem value="freqTable">טבלת שכיחויות</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={`מספר קטגוריות / גזרות: ${settings.numCategories}`}>
            <input
              type="range"
              min={3}
              max={8}
              value={settings.numCategories}
              onChange={(e) => setNumCategories(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </Field>

          <Field label="אופן קביעת גדלים">
            <Select value={settings.sizeMode} onValueChange={(v) => update({ sizeMode: v as any })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">צור אוטומטית מספרים נוחים</SelectItem>
                <SelectItem value="fractions">שברים פשוטים</SelectItem>
                <SelectItem value="percents">אחוזים</SelectItem>
                <SelectItem value="degrees">זוויות במעלות</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div>
            <Label className="text-sm font-semibold">שמות הקטגוריות</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Array.from({ length: settings.numCategories }).map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded shrink-0 border"
                    style={{ background: HEB_COLORS[i % HEB_COLORS.length].color }}
                  />
                  <Input
                    className={`h-8 text-sm ${SELECT_CLS}`}
                    value={settings.categoryNames[i] || ""}
                    onChange={(e) => setCategoryName(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Field label="קטגוריית היעד לשאלה">
            <Select
              value={String(settings.targetIndex)}
              onValueChange={(v) => update({ targetIndex: Number(v) })}
            >
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">אקראי (לפי seed)</SelectItem>
                {Array.from({ length: settings.numCategories }).map((_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {settings.categoryNames[i] || `קטגוריה ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </TabsContent>

        {/* ANSWERS */}
        <TabsContent value="answers" className="space-y-4 mt-4">
          <Field label="פורמט תשובה">
            <Select value={settings.answerFormat} onValueChange={(v) => update({ answerFormat: v as any })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mc">רב־ברירה (4 אפשרויות)</SelectItem>
                <SelectItem value="open">תשובה פתוחה</SelectItem>
                <SelectItem value="trueFalse">נכון / לא נכון עם נימוק</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="רמת מסיחים">
            <Select value={settings.distractorLevel} onValueChange={(v) => update({ distractorLevel: v as any })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">קלים</SelectItem>
                <SelectItem value="tricky">מתוחכמים</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <ToggleRow label="הצג פתרון מפורט למורה" checked={settings.showSolution} onChange={(v) => update({ showSolution: v })} />
        </TabsContent>

        {/* PRINT */}
        <TabsContent value="print" className="space-y-4 mt-4">
          <Field label="מצב הדפסה">
            <Select value={settings.printMode} onValueChange={(v) => update({ printMode: v as any })}>
              <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="one">שאלה אחת גדולה בעמוד</SelectItem>
                <SelectItem value="two">2 שאלות בעמוד</SelectItem>
                <SelectItem value="four">4 שאלות בעמוד</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ToggleRow label="הצג שם ותאריך" checked={settings.showNameDate} onChange={(v) => update({ showNameDate: v })} />
          <ToggleRow label="הצג ניקוד" checked={settings.showScore} onChange={(v) => update({ showScore: v })} />
          <ToggleRow label="שורות נימוק / מקום לתשובה" checked={settings.showAnswerLines} onChange={(v) => update({ showAnswerLines: v })} />
        </TabsContent>

        {/* ADVANCED */}
        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Field label="Seed (לשחזור שאלה)">
            <Input
              className={SELECT_CLS}
              value={settings.seed}
              placeholder="ריק = אקראי בכל יצירה"
              onChange={(e) => update({ seed: e.target.value })}
            />
          </Field>
          <p className="text-xs text-muted-foreground leading-relaxed">
            הזינו seed קבוע כדי לקבל את אותה שאלה שוב ושוב. השאירו ריק כדי לקבל שאלה חדשה בכל לחיצה על "צור שאלה".
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm font-medium cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
