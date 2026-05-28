import { WarningCircle } from "@phosphor-icons/react/ssr";
import { parseDigestMarkdown } from "@/lib/digest/markdown";
import type { AgentTask, Item } from "@/lib/domain";
import { CopyDigestButton } from "./copy-digest-button";

interface DigestCardProps {
  latestDigest?: AgentTask;
  referenceItems: Item[];
}

export function DigestCard({ latestDigest, referenceItems }: DigestCardProps) {
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          {output ? <CopyDigestButton output={output} /> : null}
          {latestDigest ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">
              {formatTime(latestDigest.updatedAt)}
            </span>
          ) : null}
        </div>
      </div>
      {output ? (
        <DigestMarkdown output={output} referenceItems={referenceItems} />
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          <p className="font-medium text-slate-900">还没有生成简报。</p>
          <p className="mt-1">配置模型后点击生成；没有模型时也会先生成本地可读摘要。</p>
        </div>
      )}
    </section>
  );
}

function DigestMarkdown({ output, referenceItems }: { output: string; referenceItems: Item[] }) {
  const document = parseDigestMarkdown(output, referenceItems.length);

  if (document.sections.length === 0) {
    return <p className="text-sm leading-7 text-slate-700">{output}</p>;
  }

  return (
    <div className="space-y-5">
      {document.invalidReferences.length > 0 ? (
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          <WarningCircle className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
          <p>引用校验：发现无匹配文章的编号 {document.invalidReferences.map((reference) => `[${reference}]`).join("、")}。</p>
        </div>
      ) : null}

      {document.sections.map((section) => (
        <section className="space-y-2" key={section.title}>
          <h3 className="text-base font-semibold tracking-normal text-slate-950">{section.title}</h3>
          <ul className="space-y-2">
            {section.bullets.map((bullet, index) => (
              <li className="rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm leading-7 text-slate-700" key={`${section.title}-${index}`}>
                {bullet.references.length > 0 ? (
                  <span className="mr-2 inline-flex flex-wrap gap-1 align-baseline">
                    {bullet.references.map((reference) => (
                      <CitationLink exists={reference <= referenceItems.length} key={reference} reference={reference} />
                    ))}
                  </span>
                ) : null}
                <span>{bullet.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CitationLink({ exists, reference }: { exists: boolean; reference: number }) {
  const className = [
    "inline-flex min-h-6 items-center rounded-md px-1.5 font-mono text-[11px] font-medium",
    exists ? "bg-teal-50 text-teal-700 hover:bg-teal-100" : "bg-amber-100 text-amber-800"
  ].join(" ");

  if (!exists) {
    return <span className={className}>[{reference}]</span>;
  }

  return (
    <a aria-label={`查看引用 ${reference}`} className={className} href={`#article-ref-${reference}`}>
      [{reference}]
    </a>
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
