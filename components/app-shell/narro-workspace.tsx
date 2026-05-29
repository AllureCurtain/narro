import type {
  AgentTask,
  Item,
  RefreshLog,
  Source,
  WorkspaceSummary
} from "@/lib/domain";
import { CategoryBoardWorkspace } from "@/components/rankings/category-board-workspace";
import { TopBar } from "./top-bar";

interface NarroWorkspaceProps {
  agentTasks: AgentTask[];
  digestReferenceItems?: Item[];
  items: Item[];
  refreshLogs?: RefreshLog[];
  searchQuery?: string;
  settings: Record<string, string>;
  sources: Source[];
  summary: WorkspaceSummary;
}

export function NarroWorkspace({
  agentTasks,
  digestReferenceItems = [],
  items,
  refreshLogs = [],
  searchQuery,
  settings,
  sources,
  summary
}: NarroWorkspaceProps) {
  return (
    <div className="min-h-[100dvh] px-3 py-3 text-slate-900 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
        <TopBar searchQuery={searchQuery} summary={summary} />

        <div className="overflow-hidden rounded-md border border-slate-300/80 bg-slate-300/80">
          <CategoryBoardWorkspace
            agentTasks={agentTasks}
            digestReferenceItems={digestReferenceItems}
            items={items}
            refreshLogs={refreshLogs}
            searchQuery={searchQuery}
            settings={settings}
            sources={sources}
          />
        </div>
      </div>
    </div>
  );
}
