import { NarroWorkspace } from "@/components/app-shell/narro-workspace";
import { getDatabase } from "@/lib/db/client";
import { getWorkspaceData, listDigestItems } from "@/lib/db/repositories";
import { dataSourceCandidates } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;

interface HomeProps {
  searchParams?: PageSearchParams;
}

export default async function Home({ searchParams }: HomeProps = {}) {
  const params = await searchParams;
  const lensId = "ai-coding";
  const searchQuery = firstParam(params?.q);
  const workspace = await getWorkspaceData(getDatabase(), {
    lensId,
    search: searchQuery
  });
  const digestItems = await listDigestItems(getDatabase(), {
    limit: 120,
    search: searchQuery
  });

  return (
    <NarroWorkspace
      agentTasks={workspace.agentTasks}
      dataSources={dataSourceCandidates}
      eventGroups={[]}
      items={digestItems}
      lenses={workspace.lenses}
      refreshLogs={[]}
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
