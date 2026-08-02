import { scoreClass, scoreLabel } from "@/lib/utils";

export function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreClass(score)}`}
      title={score === null ? "未评分" : `推荐度 ${score}/10`}
    >
      <span className="tabular-nums leading-none">
        {score ?? "—"}
      </span>
      <span className="opacity-80 leading-none">{scoreLabel(score)}</span>
    </span>
  );
}
