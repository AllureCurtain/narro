import { NarroWorkspace } from "@/components/app-shell/narro-workspace";
import { getDatabase } from "@/lib/db/client";
import { getWorkspaceData } from "@/lib/db/repositories";
import { dataSourceCandidates } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;

interface HomeProps {
  searchParams?: PageSearchParams;
}

export default async function Home({ searchParams }: HomeProps = {}) {
  const params = await searchParams;
  const lensId = firstParam(params?.lens) ?? "ai-coding";
  const searchQuery = firstParam(params?.q);
  const sourceId = firstParam(params?.source);
  const view = parseView(firstParam(params?.view));
  const itemId = firstParam(params?.item);
  const entity = firstParam(params?.entity);
  const tag = firstParam(params?.tag);
  const since = firstParam(params?.since);
  const minImportance = parseNumber(firstParam(params?.min));
  const eventId = firstParam(params?.event);
  const workspace = await getWorkspaceData(getDatabase(), {
    entity,
    itemId,
    lensId,
    minImportance,
    search: searchQuery,
    since,
    sourceId,
    tag,
    view
  });

  return (
    <NarroWorkspace
      activeSourceId={sourceId}
      activeView={view}
      filterValues={{ entity, minImportance, since, tag }}
      selectedEventId={eventId}
      selectedItemId={itemId}
      agentTasks={workspace.agentTasks}
      dataSources={dataSourceCandidates}
      eventGroups={workspace.eventGroups}
      items={workspace.items}
      lenses={workspace.lenses}
      refreshLogs={workspace.refreshLogs}
      activeLensId={lensId}
      searchQuery={searchQuery}
      settings={workspace.settings}
      sources={workspace.sources}
      summary={workspace.summary}
    />
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseView(value: string | undefined) {
  return value === "saved" || value === "reading" || value === "hidden" || value === "unread" ? value : "all";
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
