export interface DigestBullet {
  references: number[];
  text: string;
}

export interface DigestSection {
  bullets: DigestBullet[];
  title: string;
}

export interface ParsedDigestMarkdown {
  invalidReferences: number[];
  referenceIndexes: number[];
  sections: DigestSection[];
}

export function parseDigestMarkdown(output: string, maxReferenceIndex = 0): ParsedDigestMarkdown {
  const sections: DigestSection[] = [];
  const seenReferences = new Set<number>();
  const invalidReferences = new Set<number>();
  let currentSection: DigestSection | null = null;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      currentSection = { title: heading[1].trim(), bullets: [] };
      sections.push(currentSection);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (!bullet) continue;

    if (!currentSection) {
      currentSection = { title: "今日重点", bullets: [] };
      sections.push(currentSection);
    }

    const references = parseReferenceIndexes(bullet[1]);
    for (const reference of references) {
      seenReferences.add(reference);
      if (maxReferenceIndex > 0 && reference > maxReferenceIndex) {
        invalidReferences.add(reference);
      }
    }

    currentSection.bullets.push({
      references,
      text: bullet[1].replace(/\[(\d+)\]/g, "").replace(/\s+/g, " ").trim()
    });
  }

  return {
    invalidReferences: [...invalidReferences].sort((left, right) => left - right),
    referenceIndexes: [...seenReferences].sort((left, right) => left - right),
    sections
  };
}

function parseReferenceIndexes(value: string): number[] {
  return [...value.matchAll(/\[(\d+)\]/g)]
    .map((match) => Number(match[1]))
    .filter((reference) => Number.isInteger(reference) && reference > 0);
}
