import type { AgentTask } from "@/lib/domain";

interface DigestCardProps {
  latestDigest?: AgentTask;
}

export function DigestCard({ latestDigest }: DigestCardProps) {
  const output = latestDigest?.output?.trim();

  return (
    <section aria-labelledby="digest-heading" className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Digest</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950" id="digest-heading">
            今日科技简报
          </h2>
        </div>
        {latestDigest ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">
            {formatTime(latestDigest.updatedAt)}
          </span>
        ) : null}
      </div>
      {output ? (
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700">{output}</pre>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          <p className="font-medium text-slate-900">还没有生成简报。</p>
          <p className="mt-1">配置模型后点击生成；没有模型时也会先生成本地可读摘要。</p>
        </div>
      )}
    </section>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "unknown";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
