import type { AgentTask, Item, Source } from "@/lib/domain";
import { ArticleList } from "./article-list";
import { DigestActionPanel } from "./digest-action-panel";
import { DigestCard } from "./digest-card";
import { ModelSettingsForm } from "./model-settings-form";

interface DigestWorkspaceProps {
  agentTasks: AgentTask[];
  items: Item[];
  settings: Record<string, string>;
  sources: Source[];
}

export function DigestWorkspace({ agentTasks, items, settings, sources }: DigestWorkspaceProps) {
  const latestDigest = agentTasks.find((task) => task.type === "daily_brief" && task.output);

  return (
    <main aria-label="今日科技简报" className="grid gap-3 bg-[#f8fafc] p-3 sm:p-4">
      <DigestActionPanel />
      <ModelSettingsForm settings={settings} />
      <DigestCard latestDigest={latestDigest} />
      <ArticleList items={items} sources={sources} />
    </main>
  );
}
