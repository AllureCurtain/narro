"use client";

import { ArrowClockwise } from "@phosphor-icons/react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { refreshTechSourcesAction } from "@/app/actions";
import type { DigestActionState, RefreshLog } from "@/lib/domain";
import { DigestActionStatus } from "./digest-action-panel";

const initialState: DigestActionState = {
  ok: true,
  message: ""
};

interface SourceRefreshPanelProps {
  recentRefreshLogs?: RefreshLog[];
}

export function SourceRefreshPanel({ recentRefreshLogs = [] }: SourceRefreshPanelProps) {
  const [state, formAction] = useActionState(refreshTechSourcesAction, initialState);

  return (
    <form action={formAction} className="rounded-md border border-teal-200 bg-white p-3 shadow-[0_16px_35px_-30px_rgba(15,118,110,0.7)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">获取最新信息</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">刷新默认科技源，先把可阅读的源文章拉到首页。</p>
        </div>
        <RefreshButton />
      </div>
      <SourceRefreshStatus state={state} />
      <RecentRefreshSummary logs={recentRefreshLogs} />
    </form>
  );
}

export function SourceRefreshStatus({ state }: { state: DigestActionState }) {
  return <DigestActionStatus state={state} />;
}

function RefreshButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label="获取最新信息"
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-medium text-white transition active:translate-y-px disabled:cursor-wait disabled:opacity-80"
      disabled={pending}
      type="submit"
    >
      <ArrowClockwise size={16} aria-hidden="true" />
      {pending ? "获取中" : "获取最新信息"}
    </button>
  );
}

function RecentRefreshSummary({ logs }: { logs: RefreshLog[] }) {
  if (logs.length === 0) return null;

  const successCount = logs.filter((log) => log.ok).length;
  const failedLogs = logs.filter((log) => !log.ok);
  const latest = logs[0];

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800">最近刷新</span>
        <span>
          成功 {successCount} 个 / 失败 {failedLogs.length} 个
        </span>
        <span className="text-slate-500">{formatRefreshTime(latest.createdAt)}</span>
      </div>
      {failedLogs.length > 0 ? <p className="mt-1 text-amber-700">失败源：{failedLogs.map((log) => log.sourceName).join("、")}</p> : null}
    </div>
  );
}

function formatRefreshTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "unknown";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
