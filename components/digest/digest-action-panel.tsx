"use client";

import { NewspaperClipping } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { generateTechDigestAction } from "@/app/actions";
import type { DigestActionState } from "@/lib/domain";

const initialState: DigestActionState = {
  ok: true,
  message: ""
};

export function DigestActionPanel() {
  const [state, formAction] = useActionState(generateTechDigestAction, initialState);

  return (
    <form action={formAction} className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">生成今日科技简报</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">抓取默认科技源，合并要点，并生成一篇中文摘要。</p>
        </div>
        <GenerateButton />
      </div>
      <DigestActionStatus state={state} />
    </form>
  );
}

export function DigestActionStatus({ state }: { state: DigestActionState }) {
  const hasCounts =
    typeof state.refreshedCount === "number" ||
    typeof state.insertedCount === "number" ||
    typeof state.failedCount === "number";
  const hasStatusPills = hasCounts || Boolean(state.mode);

  if (!state.message && !hasStatusPills) return null;

  return (
    <div className="mt-3 space-y-2">
      {hasStatusPills ? (
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          {state.mode ? (
            <StatusPill tone={state.mode === "empty" ? "warning" : "neutral"}>
              {state.mode === "ai" ? "AI 简报" : state.mode === "local" ? "本地简报" : "暂无可用文章"}
            </StatusPill>
          ) : null}
          {typeof state.refreshedCount === "number" ? <StatusPill>刷新 {state.refreshedCount} 个源</StatusPill> : null}
          {typeof state.insertedCount === "number" ? <StatusPill>新增 {state.insertedCount} 条</StatusPill> : null}
          {typeof state.failedCount === "number" && state.failedCount > 0 ? <StatusPill tone="warning">失败 {state.failedCount} 个</StatusPill> : null}
        </div>
      ) : null}
      {state.message ? (
        <p className={["text-xs leading-5", state.ok ? "text-teal-700" : "text-amber-700"].join(" ")}>
          {state.message}
        </p>
      ) : null}
      {state.sourceResults && state.sourceResults.length > 0 ? (
        <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">刷新明细</summary>
          <div className="mt-2 divide-y divide-slate-200">
            {state.sourceResults.map((result) => (
              <div className="grid gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto]" key={result.sourceId}>
                <span className="font-medium text-slate-700">{result.sourceName}</span>
                <span className={result.ok ? "text-slate-500" : "text-amber-700"}>
                  {result.ok
                    ? `${result.fetchedCount} 抓取 / ${result.insertedCount} 新增`
                    : result.error ?? "刷新失败"}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warning" }) {
  return (
    <span
      className={[
        "inline-flex min-h-6 items-center rounded-md border px-2 font-medium",
        tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function GenerateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label="生成今日科技简报"
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition active:translate-y-px disabled:cursor-wait disabled:opacity-80"
      disabled={pending}
      type="submit"
    >
      <NewspaperClipping size={16} aria-hidden="true" />
      {pending ? "生成中" : "生成今日科技简报"}
    </button>
  );
}
