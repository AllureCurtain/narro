"use client";

import { ArrowsClockwise } from "@phosphor-icons/react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { refreshDueSourcesAction, refreshEnabledSourcesAction } from "@/app/actions";
import type { RefreshActionState } from "@/lib/domain";

const initialState: RefreshActionState = {
  ok: true,
  message: ""
};

export function RefreshControl() {
  const [allState, refreshAllAction] = useActionState(refreshEnabledSourcesAction, initialState);
  const [dueState, refreshDueAction] = useActionState(refreshDueSourcesAction, initialState);
  const state = dueState.message ? dueState : allState;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <form action={refreshDueAction}>
        <RefreshButton ariaLabel="刷新到期源" label="到期源" title="只刷新已到刷新间隔的启用源" />
      </form>
      <form action={refreshAllAction}>
        <RefreshButton ariaLabel="手动刷新信息源" label="刷新 8 源" title="并发刷新 8 个已启用源，网络慢时可能需要几秒" />
      </form>
      {state.message ? (
        <span
          aria-live="polite"
          className={[
            "inline-flex min-h-8 max-w-[220px] items-center truncate rounded-md px-3 text-xs",
            state.ok ? "bg-teal-400/15 text-teal-100" : "bg-amber-400/15 text-amber-100"
          ].join(" ")}
          title={state.message}
        >
          {state.message}
        </span>
      ) : null}
    </div>
  );
}

interface RefreshButtonProps {
  ariaLabel: string;
  label: string;
  title: string;
}

function RefreshButton({ ariaLabel, label, title }: RefreshButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex min-h-8 items-center gap-2 rounded-md bg-white/[0.1] px-3 text-slate-200 transition hover:bg-white/[0.14] active:translate-y-px disabled:cursor-wait disabled:opacity-80"
      disabled={pending}
      title={title}
      type="submit"
    >
      <ArrowsClockwise className={pending ? "animate-spin" : ""} size={15} aria-hidden="true" />
      {pending ? "刷新中" : label}
    </button>
  );
}
