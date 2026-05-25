import type {
  AgentTask,
  DataSourceCandidate,
  EventGroup,
  Item,
  Lens,
  RefreshLog,
  Source,
  WorkspaceSummary
} from "@/lib/domain";
import { AgentSidebar } from "@/components/agent-tasks/agent-sidebar";
import { FeedWorkspace } from "@/components/feed/feed-workspace";
import { SourceLensSidebar } from "@/components/navigation/source-lens-sidebar";
import { TopBar } from "./top-bar";

interface NarroWorkspaceProps {
  activeLensId: string;
  activeSourceId?: string;
  activeView?: "all" | "hidden" | "reading" | "saved" | "unread";
  agentTasks: AgentTask[];
  dataSources: DataSourceCandidate[];
  eventGroups: EventGroup[];
  filterValues?: {
    entity?: string;
    minImportance?: number;
    since?: string;
    tag?: string;
  };
  items: Item[];
  lenses: Lens[];
  refreshLogs: RefreshLog[];
  searchQuery?: string;
  selectedEventId?: string;
  selectedItemId?: string;
  settings: Record<string, string>;
  sources: Source[];
  summary: WorkspaceSummary;
}

export function NarroWorkspace({
  activeLensId,
  activeSourceId,
  activeView = "all",
  agentTasks,
  dataSources,
  eventGroups,
  filterValues,
  items,
  lenses,
  refreshLogs,
  searchQuery,
  selectedEventId,
  selectedItemId,
  settings,
  sources,
  summary
}: NarroWorkspaceProps) {
  const activeLens = lenses.find((lens) => lens.id === summary.activeLensId) ?? lenses[0];

  return (
    <div className="min-h-[100dvh] px-3 py-3 text-slate-900 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-4">
        <TopBar
          activeLensId={activeLensId}
          activeLensName={activeLens.name}
          activeSourceId={activeSourceId}
          searchQuery={searchQuery}
          summary={summary}
        />

        <div className="overflow-hidden rounded-md border border-slate-300/80 bg-slate-300/80 shadow-[0_22px_70px_-54px_rgba(15,23,42,0.58)]">
          <div className="grid grid-cols-1 gap-px bg-slate-300/80 lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[244px_minmax(0,1fr)_334px]">
            <SourceLensSidebar activeSourceId={activeSourceId} lenses={lenses} refreshLogs={refreshLogs} sources={sources} />
            <FeedWorkspace
              activeSourceId={activeSourceId}
              activeView={activeView}
              activeLens={activeLens}
              eventGroups={eventGroups}
              filterValues={filterValues}
              items={items}
              searchQuery={searchQuery}
              selectedEventId={selectedEventId}
              selectedItemId={selectedItemId}
              sources={sources}
              summary={summary}
            />
            <AgentSidebar
              activeLensId={activeLensId}
              dataSources={dataSources}
              selectedItemId={selectedItemId}
              settings={settings}
              tasks={agentTasks}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
