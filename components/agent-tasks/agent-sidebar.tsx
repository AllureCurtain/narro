import { Compass, FileText, Lightning, Target } from "@phosphor-icons/react/ssr";
import { runAgentTaskAction, saveLlmSettingsAction, testLlmConnectionAction } from "@/app/actions";
import type { AgentTask, DataSourceCandidate } from "@/lib/domain";

interface AgentSidebarProps {
  activeLensId: string;
  dataSources: DataSourceCandidate[];
  selectedItemId?: string;
  settings: Record<string, string>;
  tasks: AgentTask[];
}

const taskIcons = {
  daily_brief: FileText,
  explain_item: Lightning,
  track_lens: Target,
  source_discovery: Compass
};

export function AgentSidebar({ activeLensId, dataSources, selectedItemId, settings, tasks }: AgentSidebarProps) {
  const llmConnected = Boolean(settings["llm.baseUrl"] && settings["llm.model"] && process.env.NARRO_LLM_API_KEY);
  const llmStatus = settings["llm.lastCheckStatus"];
  const llmMessage = settings["llm.lastCheckMessage"];

  return (
    <aside
      aria-label="Agent 任务"
      className="bg-slate-100/95 p-3 lg:col-span-2 xl:col-span-1 xl:min-h-[calc(100dvh-104px)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Agent 任务</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal text-slate-950">能力层</h2>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs text-slate-500">{tasks.length}</span>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const Icon = taskIcons[task.type];

          return (
            <section
              className={[
                "rounded-md border p-3",
                task.primary
                  ? "border-teal-700/30 bg-teal-700 text-white shadow-[0_18px_35px_-28px_rgba(15,118,110,0.75)]"
                  : "border-slate-200 bg-white text-slate-900"
              ].join(" ")}
              key={task.id}
            >
              <div className="flex items-start gap-3">
                <span
                  className={[
                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                    task.primary ? "bg-white/12 text-teal-50" : "bg-slate-100 text-slate-500"
                  ].join(" ")}
                >
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-5 tracking-normal">{task.title}</h3>
                    <StatusBadge status={task.status} primary={task.primary} />
                  </div>
                  <p className={["mt-2 text-sm leading-6", task.primary ? "text-teal-50/85" : "text-slate-600"].join(" ")}>
                    {task.description}
                  </p>
                  {task.output ? (
                    <p className="mt-3 rounded-md bg-white/10 px-3 py-2 text-xs leading-5 text-teal-50/90">
                      {task.output}
                    </p>
                  ) : null}
                </div>
              </div>

              <form action={runAgentTaskAction} className="mt-3">
                <input name="type" type="hidden" value={task.type} />
                <input name="lensId" type="hidden" value={task.lensId ?? activeLensId} />
                {(task.itemId ?? selectedItemId) ? <input name="itemId" type="hidden" value={task.itemId ?? selectedItemId} /> : null}
                <button
                  className={[
                    "inline-flex min-h-8 items-center rounded-md px-3 text-xs font-medium transition active:translate-y-px",
                    task.primary ? "bg-white text-teal-800" : "border border-slate-200 bg-slate-50 text-slate-700"
                  ].join(" ")}
                  type="submit"
                >
                  {task.type === "daily_brief" ? "运行今日简报" : task.type === "explain_item" ? "运行解释" : "运行"}
                </button>
              </form>
            </section>
          );
        })}
      </div>

      <section className="mt-4 border-t border-slate-300/70 pt-4" aria-labelledby="llm-settings-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">模型连接</p>
            <h2 className="mt-1 text-base font-semibold tracking-normal text-slate-950" id="llm-settings-heading">
              LLM 设置
            </h2>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs text-slate-500">
            {llmConnected ? "已配置" : "未连接"}
          </span>
        </div>
        <form action={saveLlmSettingsAction} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
          <label className="block">
            <span className="text-[11px] text-slate-500">Provider</span>
            <input
              className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
              defaultValue={settings["llm.provider"] ?? "openai-compatible"}
              name="provider"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Base URL</span>
            <input
              className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
              defaultValue={settings["llm.baseUrl"] ?? ""}
              name="baseUrl"
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Model</span>
            <input
              className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-teal-600"
              defaultValue={settings["llm.model"] ?? ""}
              name="model"
              placeholder="gpt-5-mini"
            />
          </label>
          <button className="min-h-8 w-full rounded-md bg-slate-950 px-3 text-xs font-medium text-white" type="submit">
            保存模型设置
          </button>
        </form>
        <form action={testLlmConnectionAction} className="mt-2 rounded-md border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500">连接状态</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-600">
              {llmStatus ?? "unchecked"}
            </span>
          </div>
          {llmMessage ? <p className="mb-2 line-clamp-2 text-xs leading-5 text-slate-600">{llmMessage}</p> : null}
          <button className="min-h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700" type="submit">
            测试模型连接
          </button>
        </form>
      </section>

      <section className="mt-4 border-t border-slate-300/70 pt-4" aria-labelledby="data-source-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">数据源路线</p>
            <h2 className="mt-1 text-base font-semibold tracking-normal text-slate-950" id="data-source-heading">
              M1 先接这些
            </h2>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs text-slate-500">
            {dataSources.filter((source) => source.priority === "M1").length}
          </span>
        </div>

        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {dataSources.map((source) => (
            <article className="rounded-md border border-slate-200 bg-white p-3" key={source.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold leading-5 text-slate-950">{source.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{source.coverage}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 font-mono text-[10px] uppercase text-slate-500">
                  {source.channel}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{source.reason}</p>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

interface StatusBadgeProps {
  primary?: boolean;
  status: AgentTask["status"];
}

function StatusBadge({ primary, status }: StatusBadgeProps) {
  const label = {
    ready: "ready",
    queued: "queued",
    running: "running",
    completed: "done",
    failed: "failed"
  }[status];

  return (
    <span
      className={[
        "rounded-full px-2 py-1 font-mono text-[10px]",
        primary ? "bg-white/15 text-teal-50" : "bg-slate-100 text-slate-500"
      ].join(" ")}
    >
      {label}
    </span>
  );
}
