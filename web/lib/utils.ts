import clsx from "clsx";

export function scoreClass(score: number | null): string {
  if (score === null) return "score-null";
  if (score <= 3) return "score-low";
  if (score <= 6) return "score-mid";
  if (score <= 8) return "score-high";
  return "score-top";
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score <= 3) return "低相关";
  if (score <= 6) return "相关";
  if (score <= 8) return "推荐";
  return "强推";
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function cn(...inputs: Parameters<typeof clsx>) {
  return clsx(inputs);
}
