"use client";

import { NewspaperClipping } from "@phosphor-icons/react";
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
      {state.message ? (
        <p className={["mt-3 text-xs leading-5", state.ok ? "text-teal-700" : "text-amber-700"].join(" ")}>
          {state.message}
        </p>
      ) : null}
    </form>
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
