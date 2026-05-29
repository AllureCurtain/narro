import { NarroWorkspace } from "@/components/app-shell/narro-workspace";
import { getDatabase, type NarroDatabase } from "@/lib/db/client";
import { getItem, getWorkspaceData, listDigestItems } from "@/lib/db/repositories";
import { parseDigestTaskReferenceIds } from "@/lib/digest/task-input";
import type { Item } from "@/lib/domain";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;

interface HomeProps {
  searchParams?: PageSearchParams;
}

export default async function Home({ searchParams }: HomeProps = {}) {
  const params = await searchParams;
  const lensId = "ai-coding";
  const searchQuery = firstParam(params?.q);
  const database = getDatabase();
  const workspace = await getWorkspaceData(database, {
    lensId,
    search: searchQuery
  });
  const digestItems = await listDigestItems(database, {
    limit: 120,
    search: searchQuery
  });
  const latestDigest = workspace.agentTasks.find((task) => task.type === "daily_brief" && task.output);
  const digestReferenceItems = latestDigest
    ? await loadDigestReferenceItems(database, parseDigestTaskReferenceIds(latestDigest.input), digestItems)
    : [];

  return (
    <NarroWorkspace
      agentTasks={workspace.agentTasks}
      digestReferenceItems={digestReferenceItems}
      items={digestItems}
      refreshLogs={workspace.refreshLogs}
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

async function loadDigestReferenceItems(database: NarroDatabase, referenceItemIds: string[], currentItems: Item[]) {
  const currentItemIds = new Set(currentItems.map((item) => item.id));
  const missingReferenceIds = [...new Set(referenceItemIds)].filter((itemId) => !currentItemIds.has(itemId));
  const missingItems = await Promise.all(missingReferenceIds.map((itemId) => getItem(database, itemId)));

  return missingItems.filter((item): item is Item => Boolean(item));
}
