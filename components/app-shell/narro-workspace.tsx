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
import { DigestWorkspace } from "@/components/digest/digest-workspace";
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
  agentTasks,
  items,
  lenses,
  searchQuery,
  settings,
  sources,
  summary
}: NarroWorkspaceProps) {
  const activeLens = lenses.find((lens) => lens.id === summary.activeLensId) ?? lenses[0];

  return (
    <div className="min-h-[100dvh] px-3 py-3 text-slate-900 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
        <TopBar
          activeLensId={activeLensId}
          activeLensName={activeLens.name}
          activeSourceId={activeSourceId}
          searchQuery={searchQuery}
          summary={summary}
        />

        <div className="overflow-hidden rounded-md border border-slate-300/80 bg-slate-300/80">
          <DigestWorkspace agentTasks={agentTasks} items={items} settings={settings} sources={sources} />
        </div>
      </div>
    </div>
  );
}
