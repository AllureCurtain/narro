import { CheckCircle, GithubLogo, Newspaper, Rss, StackSimple, Target } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  addCustomSourceAction,
  deleteLensAction,
  importSourcesFromOpmlAction,
  refreshSourceAction,
  saveLensAction,
  toggleSourceEnabledAction
} from "@/app/actions";
import type { Lens, RefreshLog, Source } from "@/lib/domain";
import { verifiedFreeSourcePresets } from "@/lib/sources/presets";

interface SourceLensSidebarProps {
  activeSourceId?: string;
  lenses: Lens[];
  refreshLogs: RefreshLog[];
  sources: Source[];
}

function sourceIcon(source: Source) {
  if (source.type === "github") {
    return <GithubLogo size={15} aria-hidden="true" />;
  }

  if (source.group === "产品更新") {
    return <StackSimple size={15} aria-hidden="true" />;
  }

  if (source.group === "社区讨论") {
    return <Newspaper size={15} aria-hidden="true" />;
  }

  return <Rss size={15} aria-hidden="true" />;
}

export function SourceLensSidebar({ activeSourceId, lenses, refreshLogs, sources }: SourceLensSidebarProps) {
  const totalUnread = sources.find((source) => source.id === "all")?.unreadCount ?? 0;
  const activeLens = lenses.find((lens) => lens.active) ?? lenses[0];
  const realSources = sources.filter((source) => source.id !== "all");
  const unhealthySources = realSources.filter((source) => source.healthStatus === "degraded" || source.healthStatus === "failing");
  const healthRows = unhealthySources.length > 0 ? unhealthySources.slice(0, 3) : realSources.slice(0, 3);
  const qualityRows = sortSourcesForQuality(realSources).slice(0, 3);

  return (
    <aside
      aria-label="信息源和视角"
      className="bg-slate-100/95 p-3 lg:min-h-[calc(100dvh-104px)]"
      role="navigation"
    >
      <div className="space-y-6">
        <section aria-labelledby="source-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="source-heading">
              信息源
            </h2>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">
              {totalUnread}
            </span>
          </div>

          <div className="max-h-[410px] divide-y divide-slate-200 overflow-y-auto rounded-md border border-slate-200 bg-white">
            {sources.map((source) => {
              const active = source.id === "all" ? !activeSourceId : activeSourceId === source.id;

              return (
                <div
                  className={[
                    "px-2.5 py-2 text-sm transition",
                    active ? "bg-teal-50 text-teal-950 shadow-[inset_3px_0_0_rgba(15,118,110,0.9)]" : "text-slate-700"
                  ].join(" ")}
                  key={source.id}
                >
                  <Link className="flex min-h-8 items-center gap-2 hover:underline" href={sourceHref(source.id, activeLens?.id)}>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      {sourceIcon(source)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{source.name}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {source.group} · {source.enabled ? "启用" : "停用"}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">{source.unreadCount}</span>
                  </Link>
                  {source.id !== "all" ? (
                    <div className="mt-1 flex flex-wrap gap-1 pl-9">
                      <form action={toggleSourceEnabledAction}>
                        <input name="sourceId" type="hidden" value={source.id} />
                        <input name="enabled" type="hidden" value={String(!source.enabled)} />
                        <button
                          aria-label={`${source.enabled ? "禁用" : "启用"} ${source.name}`}
                          className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-500 hover:text-slate-900"
                          type="submit"
                        >
                          {source.enabled ? "禁用" : "启用"}
                        </button>
                      </form>
                      <form action={refreshSourceAction}>
                        <input name="sourceId" type="hidden" value={source.id} />
                        <button
                          aria-label={`刷新 ${source.name}`}
                          className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-500 hover:text-slate-900"
                          type="submit"
                        >
                          刷新
                        </button>
                      </form>
                      {source.failureCount > 0 ? (
                        <span className="rounded-md bg-amber-50 px-1.5 py-1 text-[10px] text-amber-700">
                          失败 {source.failureCount}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="source-health-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="source-health-heading">
              健康状态
            </h2>
            <span className="rounded-full bg-white px-2 py-1 font-mono text-[11px] text-slate-500">
              {unhealthySources.length}
            </span>
          </div>
          <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            {healthRows.map((source) => (
              <div className="border-b border-slate-100 pb-2 last:border-0 last:pb-0" key={source.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-slate-800">{source.name}</p>
                  <span className={["rounded-full px-2 py-1 font-mono text-[10px]", healthClass(source.healthStatus)].join(" ")}>
                    {source.healthStatus}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] leading-4 text-slate-500">
                  {source.lastError || `${source.averageLatencyMs}ms · ${source.nextRefreshAt ? `${formatShortTime(source.nextRefreshAt)} 下次` : "等待首次刷新"}`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="refresh-log-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="refresh-log-heading">
              刷新记录
            </h2>
            <span className="rounded-full bg-white px-2 py-1 font-mono text-[11px] text-slate-500">
              {refreshLogs.length}
            </span>
          </div>
          <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            {refreshLogs.length > 0 ? (
              refreshLogs.slice(0, 3).map((log) => (
                <div className="border-b border-slate-100 pb-2 last:border-0 last:pb-0" key={log.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-slate-800">{log.sourceName}</p>
                    <span className={["rounded-full px-2 py-1 font-mono text-[10px]", log.ok ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"].join(" ")}>
                      {log.ok ? "ok" : "fail"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] leading-4 text-slate-500">
                    {log.ok ? `${log.fetchedCount} fetched · ${log.insertedCount} new · ${log.latencyMs}ms` : `刷新失败：${log.error}`}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[11px] leading-4 text-slate-500">还没有刷新记录。</p>
            )}
          </div>
        </section>

        <section aria-labelledby="source-quality-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="source-quality-heading">
              源质量
            </h2>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">
              RSS/API
            </span>
          </div>
          <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            {qualityRows.map((source) => {
              const preset = verifiedFreeSourcePresets.find((candidate) => candidate.id === source.id);

              return (
                <div className="border-b border-slate-100 pb-2 last:border-0 last:pb-0" key={source.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-800">{sourceQualityLabel(source)}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                        {preset?.coverage ?? "用户添加的免费 RSS/Atom 来源"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-teal-50 px-2 py-1 font-mono text-[10px] text-teal-700">
                      {preset?.quality ?? "custom"}
                    </span>
                  </div>
                  <form action={refreshSourceAction} className="mt-2">
                    <input name="sourceId" type="hidden" value={source.id} />
                    <button
                      aria-label={`测试 ${source.name}`}
                      className="min-h-7 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-950"
                      type="submit"
                    >
                      测试来源
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="source-add-heading">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="source-add-heading">
            添加来源
          </h2>
          <form action={addCustomSourceAction} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            <label className="block">
              <span className="text-[11px] text-slate-500">名称</span>
              <input className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600" name="name" placeholder="自定义 RSS" />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-500">RSS/Atom URL</span>
              <input className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600" name="url" placeholder="https://example.com/feed.xml" />
            </label>
            <input name="group" type="hidden" value="自定义" />
            <button className="min-h-8 w-full rounded-md bg-slate-950 px-3 text-xs font-medium text-white" type="submit">
              添加 RSS
            </button>
          </form>
        </section>

        <section aria-labelledby="opml-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="opml-heading">
              OPML
            </h2>
            <div className="flex gap-1">
              <Link className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-950" href="/backup.json">
                导出备份
              </Link>
              <Link className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-950" href="/sources.opml">
                导出 OPML
              </Link>
            </div>
          </div>
          <form action={importSourcesFromOpmlAction} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            <label className="block">
              <span className="text-[11px] text-slate-500">导入内容</span>
              <textarea
                className="mt-1 min-h-20 w-full resize-y rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-teal-600"
                name="opml"
                placeholder="<opml>...</opml>"
              />
            </label>
            <button className="min-h-8 w-full rounded-md bg-slate-950 px-3 text-xs font-medium text-white" type="submit">
              导入 OPML
            </button>
          </form>
        </section>

        <section aria-labelledby="lens-heading">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="lens-heading">
              Lens
            </h2>
            <Target size={15} className="text-slate-400" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            {lenses.map((lens) => (
              <div
                className={[
                  "rounded-md border px-3 py-2 text-sm transition",
                  lens.active
                    ? "border-teal-700/30 bg-white text-teal-950 shadow-[inset_3px_0_0_rgba(15,118,110,0.9)]"
                    : "border-slate-200 bg-white text-slate-700"
                ].join(" ")}
                key={lens.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    className="min-w-0 flex-1 truncate text-[13px] font-semibold"
                    href={lensHref(lens.id, activeSourceId)}
                  >
                    {lens.name}
                  </Link>
                  {lens.active ? (
                    <CheckCircle size={15} weight="fill" className="shrink-0 text-teal-700" aria-hidden="true" />
                  ) : (
                    <span className="font-mono text-[11px] text-slate-500">{lens.unreadCount}</span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{lens.description}</p>
                {!isDefaultLens(lens.id) ? (
                  <form action={deleteLensAction} className="mt-2">
                    <input name="lensId" type="hidden" value={lens.id} />
                    <button className="text-[11px] font-medium text-slate-500 hover:text-rose-700" type="submit">
                      删除
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="lens-edit-heading">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" id="lens-edit-heading">
            Lens 设置
          </h2>
          <form action={saveLensAction} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            <input name="id" type="hidden" value={activeLens?.id ?? ""} />
            <label className="block">
              <span className="text-[11px] text-slate-500">名称</span>
              <input
                className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
                defaultValue={activeLens?.name}
                name="name"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-500">来源分组</span>
              <input
                className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
                defaultValue={activeLens?.sourceGroupFilters.join("，")}
                name="sourceGroupFilters"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-500">关键词</span>
              <input
                className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
                defaultValue={activeLens?.keywordFilters.join("，")}
                name="keywordFilters"
              />
            </label>
            <input name="description" type="hidden" value={activeLens?.description ?? ""} />
            <button className="min-h-8 w-full rounded-md bg-slate-950 px-3 text-xs font-medium text-white" type="submit">
              保存 Lens
            </button>
          </form>
        </section>
      </div>
    </aside>
  );
}

function isDefaultLens(id: string) {
  return ["ai-coding", "tech-trends", "research-watch", "security-watch", "chinese-tech"].includes(id);
}

function sourceHref(sourceId: string, lensId?: string) {
  const params = new URLSearchParams();
  if (lensId) params.set("lens", lensId);
  if (sourceId !== "all") params.set("source", sourceId);

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function lensHref(lensId: string, sourceId?: string) {
  const params = new URLSearchParams({ lens: lensId });
  if (sourceId) params.set("source", sourceId);

  return `/?${params.toString()}`;
}

function healthClass(status: Source["healthStatus"]) {
  if (status === "healthy") return "bg-teal-50 text-teal-700";
  if (status === "degraded") return "bg-amber-50 text-amber-700";
  if (status === "failing") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-500";
}

function formatShortTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "未知";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function sortSourcesForQuality(sources: Source[]) {
  const priorityById = new Map(
    [
      "hacker-news-rss",
      "lobsters-rss",
      "hugging-face-blog",
      "google-ai-blog",
      "aws-machine-learning-blog",
      "ollama-blog",
      "cloudflare-blog"
    ].map((id, index) => [id, index])
  );

  return [...sources].sort((left, right) => {
    const enabledDelta = Number(right.enabled) - Number(left.enabled);
    if (enabledDelta !== 0) return enabledDelta;

    const leftPriority = priorityById.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priorityById.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftPriority - rightPriority || left.name.localeCompare(right.name);
  });
}

function sourceQualityLabel(source: Source) {
  if (source.group === "社区讨论") return "社区高信号源";
  if (source.group === "模型厂商") return "官方 AI 源";
  if (source.group === "中文技术") return "中文技术源";
  if (source.group === "论文研究") return "论文源";
  if (source.group === "安全公告") return "安全公告源";
  return "可靠 RSS/API 源";
}
