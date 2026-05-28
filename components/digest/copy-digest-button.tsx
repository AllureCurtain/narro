"use client";

import { ClipboardText } from "@phosphor-icons/react";
import { useState } from "react";

interface CopyDigestButtonProps {
  output: string;
}

export function CopyDigestButton({ output }: CopyDigestButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      aria-label="复制简报"
      className="inline-flex min-h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      onClick={handleCopy}
      type="button"
    >
      <ClipboardText size={14} aria-hidden="true" />
      {copied ? "已复制" : "复制"}
    </button>
  );
}
