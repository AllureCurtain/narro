import type { AgentTaskType, Item } from "@/lib/domain";

export interface LlmSettings {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  provider?: string;
}

export interface LlmRunOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
}

export interface AgentPromptInput {
  items: Item[];
  selectedItem: Item | null;
  taskInput: string;
  type: AgentTaskType;
}

export interface LlmResult {
  ok: boolean;
  output?: string;
  error?: string;
}

export function llmIsConfigured(settings: LlmSettings, options: LlmRunOptions = {}) {
  return Boolean(
    (settings.provider || "openai-compatible") === "openai-compatible" &&
      settings.baseUrl &&
      settings.model &&
      (options.apiKey || process.env.NARRO_LLM_API_KEY)
  );
}

export async function runOpenAiCompatibleTask(
  settings: LlmSettings,
  input: AgentPromptInput,
  options: LlmRunOptions = {}
): Promise<LlmResult> {
  if (!llmIsConfigured(settings, options)) {
    return { ok: false, error: "LLM is not configured" };
  }

  const fetcher = options.fetcher ?? fetch;
  const baseUrl = normalizeBaseUrl(settings.baseUrl ?? "");
  const response = await fetcher(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${options.apiKey ?? process.env.NARRO_LLM_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: "system",
          content:
            "你是 Narro 的情报助理。只基于用户提供的信息输出中文结果，保持简洁、可执行，并保留关键来源线索。"
        },
        {
          role: "user",
          content: buildPrompt(input)
        }
      ],
      temperature: 0.2
    })
  });

  const body = await safeJson(response);
  if (!response.ok) {
    return { ok: false, error: extractError(body) || `LLM HTTP ${response.status}` };
  }

  const output = extractMessage(body);
  if (!output) {
    return { ok: false, error: "LLM returned an empty response" };
  }

  return { ok: true, output };
}

function buildPrompt(input: AgentPromptInput) {
  const itemLines = input.items
    .slice(0, 12)
    .map((item, index) => {
      const source = item.author || item.sourceId;
      return `${index + 1}. ${item.title}\n来源: ${source}\n摘要: ${item.summary}\n实体: ${item.entities.join(", ") || "无"}`;
    })
    .join("\n\n");

  if (input.type === "explain_item") {
    const item = input.selectedItem ?? input.items[0];
    return item
      ? `请解释这条信息的背景、重要性和下一步关注点。\n标题: ${item.title}\n摘要: ${item.summary}\n链接: ${item.url}`
      : "当前没有选中信息，请说明无法解释的原因。";
  }

  if (input.type === "track_lens") {
    return `请基于这些信息生成持续追踪计划，列出主题、观察指标和下一次应该关注的变化。\n任务输入: ${input.taskInput}\n\n${itemLines}`;
  }

  if (input.type === "source_discovery") {
    return `请根据这些信息推荐免费、可靠、非爬虫的数据源方向，只推荐 RSS/Atom 或公开 API。\n任务输入: ${input.taskInput}\n\n${itemLines}`;
  }

  return `请为当前 Lens 生成今日简报。要求：3-5 条要点，每条说明为什么重要，并尽量合并重复事件。\n任务输入: ${input.taskInput}\n\n${itemLines}`;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/g, "");
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractMessage(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";
  const first = choices[0] as { message?: { content?: unknown }; text?: unknown } | undefined;
  const content = first?.message?.content ?? first?.text;
  return typeof content === "string" ? content.trim() : "";
}

function extractError(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const error = (body as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}
