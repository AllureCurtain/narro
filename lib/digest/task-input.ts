import type { DigestMode } from "@/lib/domain";

const digestTaskInputKind = "tech_digest";
const digestTaskInputLabel = "今日科技简报";

interface DigestTaskInputPayload {
  kind: typeof digestTaskInputKind;
  label: typeof digestTaskInputLabel;
  mode?: DigestMode;
  referenceItemIds: string[];
}

export function buildDigestTaskInput(input: { mode?: DigestMode; referenceItemIds: string[] }): string {
  const payload: DigestTaskInputPayload = {
    kind: digestTaskInputKind,
    label: digestTaskInputLabel,
    mode: input.mode,
    referenceItemIds: input.referenceItemIds.filter((itemId) => itemId.trim().length > 0)
  };

  return JSON.stringify(payload);
}

export function parseDigestTaskReferenceIds(input: string): string[] {
  return parseDigestTaskInput(input)?.referenceItemIds ?? [];
}

export function parseDigestTaskMode(input: string): DigestMode | undefined {
  return parseDigestTaskInput(input)?.mode;
}

function parseDigestTaskInput(input: string): DigestTaskInputPayload | null {
  try {
    const payload = JSON.parse(input) as Partial<DigestTaskInputPayload>;
    if (payload.kind !== digestTaskInputKind || !Array.isArray(payload.referenceItemIds)) return null;
    const mode = payload.mode === "ai" || payload.mode === "empty" || payload.mode === "local" ? payload.mode : undefined;
    return {
      kind: digestTaskInputKind,
      label: digestTaskInputLabel,
      mode,
      referenceItemIds: payload.referenceItemIds.filter((itemId): itemId is string => typeof itemId === "string" && itemId.trim().length > 0)
    };
  } catch {
    return null;
  }
}
