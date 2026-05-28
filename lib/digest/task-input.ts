const digestTaskInputKind = "tech_digest";
const digestTaskInputLabel = "今日科技简报";

interface DigestTaskInputPayload {
  kind: typeof digestTaskInputKind;
  label: typeof digestTaskInputLabel;
  referenceItemIds: string[];
}

export function buildDigestTaskInput(referenceItemIds: string[]): string {
  const payload: DigestTaskInputPayload = {
    kind: digestTaskInputKind,
    label: digestTaskInputLabel,
    referenceItemIds: referenceItemIds.filter((itemId) => itemId.trim().length > 0)
  };

  return JSON.stringify(payload);
}

export function parseDigestTaskReferenceIds(input: string): string[] {
  try {
    const payload = JSON.parse(input) as Partial<DigestTaskInputPayload>;
    if (payload.kind !== digestTaskInputKind || !Array.isArray(payload.referenceItemIds)) return [];
    return payload.referenceItemIds.filter((itemId): itemId is string => typeof itemId === "string" && itemId.trim().length > 0);
  } catch {
    return [];
  }
}
