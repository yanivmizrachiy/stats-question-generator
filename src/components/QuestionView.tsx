import { GeneratedQuestion } from "@/lib/questionGenerator";
import { questionToHTML } from "@/lib/exporters";
import { useMemo } from "react";

export default function QuestionView({
  question,
  index,
}: {
  question: GeneratedQuestion;
  index?: number;
}) {
  const html = useMemo(() => questionToHTML(question, index), [question, index]);
  return (
    <div
      className="worksheet-question"
      // builder produces safe, self-generated markup
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
