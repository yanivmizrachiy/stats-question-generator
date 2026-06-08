import { GeneratedQuestion } from "@/lib/questionGenerator";
import { Badge } from "@/components/ui/badge";

export default function QualityPanel({ question }: { question: GeneratedQuestion }) {
  const correct = question.options
    ? question.options.find((o) => o.correct)
    : null;
  const distractors = question.options?.filter((o) => !o.correct) ?? [];

  return (
    <div className="panel-card p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold">בדיקת איכות למורה</h3>
        <Badge className="bg-accent text-accent-foreground">{question.difficulty}</Badge>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">התשובה הנכונה</p>
        <p className="text-sm font-bold text-success">
          {correct ? `${correct.label}. ` : ""}
          {question.correctAnswerText}
        </p>
      </div>

      {distractors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">המסיחים שנוצרו</p>
          <ul className="space-y-1">
            {distractors.map((d, i) => (
              <li key={i} className="text-sm flex justify-between gap-2 border-b border-border/60 pb-1">
                <span>{d.label}. {d.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">מיומנויות נבדקות</p>
        <div className="flex flex-wrap gap-1.5">
          {question.skills.map((s, i) => (
            <Badge key={i} variant="secondary" className="font-normal">{s}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SolutionPanel({ question }: { question: GeneratedQuestion }) {
  return (
    <div className="panel-card p-4 md:p-5 space-y-3 border-r-4 border-r-accent">
      <h3 className="font-display text-base font-bold">פתרון למורה</h3>
      <ol className="space-y-1.5 pr-4 list-decimal text-sm leading-relaxed marker:text-accent marker:font-bold">
        {question.solutionSteps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <div className="bg-secondary/60 rounded-lg p-3 text-sm">
        <span className="font-bold">הערה פדגוגית: </span>
        {question.pedagogicalNote}
      </div>
    </div>
  );
}
