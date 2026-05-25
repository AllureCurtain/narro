import {
  Bell,
  Command,
  MagnifyingGlass,
  Sparkle
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { WorkspaceSummary } from "@/lib/domain";
import { RefreshControl } from "./refresh-control";

interface TopBarProps {
  activeLensId: string;
  activeLensName: string;
  activeSourceId?: string;
  searchQuery?: string;
  summary: WorkspaceSummary;
}

export function TopBar({ activeLensId, activeLensName, activeSourceId, searchQuery, summary }: TopBarProps) {
  return (
    <header
      className="grid gap-3 rounded-md bg-[#101827] px-4 py-3 text-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.75)] md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-center"
      role="banner"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <Sparkle size={18} weight="fill" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight tracking-normal">Narro</p>
          <p className="truncate text-[11px] leading-tight text-slate-300">{activeLensName} Lens</p>
        </div>
      </div>

      <form action="/" className="relative block min-w-0">
        <span className="sr-only">搜索信息、实体、事件，或向 Narro 提问</span>
        <input name="lens" type="hidden" value={activeLensId} />
        {activeSourceId ? <input name="source" type="hidden" value={activeSourceId} /> : null}
        <MagnifyingGlass
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
          size={17}
        />
        <input
          aria-label="搜索信息、实体、事件，或向 Narro 提问"
          className="h-9 w-full rounded-md border border-white/10 bg-white/[0.11] px-9 text-sm text-white outline-none transition focus:border-teal-200/60 focus:bg-white/[0.15]"
          defaultValue={searchQuery}
          name="q"
          placeholder="搜索信息、实体、事件，或直接问：最近 AI IDE 有什么变化？"
          type="search"
        />
        <Command
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-slate-400 sm:block"
          size={15}
        />
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 md:justify-end">
        <span className="inline-flex min-h-8 items-center rounded-md bg-white/[0.08] px-3" title="当前 Lens 已启用的信息源数量">
          {summary.updatedSourceCount} 个源
        </span>
        <RefreshControl />
        <Link
          aria-label="查看未读"
          className="inline-flex size-8 items-center justify-center rounded-md bg-white/[0.1] text-slate-200 transition active:translate-y-px"
          href={unreadHref(activeLensId, activeSourceId)}
        >
          <Bell size={16} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}

function unreadHref(lensId: string, sourceId?: string) {
  const params = new URLSearchParams({ lens: lensId, view: "unread" });
  if (sourceId) params.set("source", sourceId);
  return `/?${params.toString()}`;
}
