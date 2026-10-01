export const consultSegmentMarkers = [
  { key: "main", open: "/main", close: "/main_end" },
  { key: "auxiliary", open: "/auxiliary", close: "/auxiliary_end" },
  { key: "misc", open: "/misc", close: "/misc_end" },
  { key: "cycle", open: "/cycle", close: "/cycle_end" },
  { key: "summary", open: "/summary", close: "/summary_end" },
] as const;

export interface ConsultSegment {
  key: (typeof consultSegmentMarkers)[number]["key"];
  content: string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const markerPattern = new RegExp(
  consultSegmentMarkers
    .flatMap(({ open, close }) => [close, open])
    .map(escapeRegExp)
    .join("|"),
  "gi",
);

function stripKnownMarkers(content: string) {
  return content.replace(markerPattern, "").trim();
}

function stripPartialMarker(content: string) {
  const slash = content.lastIndexOf("/");
  if (slash < 0) return content;
  const suffix = content.slice(slash).toLowerCase();
  const knownMarkers = consultSegmentMarkers.flatMap(({ open, close }) => [
    close,
    open,
  ]);
  return knownMarkers.some((marker) => marker.startsWith(suffix))
    ? content.slice(0, slash)
    : content;
}

function isTemplatePlaceholder(content: string) {
  const value = content.trim();
  return (
    /^\{[^{}\n]+\}$/.test(value) &&
    /(?:段落內容|項目重點|一個結論)/.test(value)
  );
}

function nextOpeningIndex(source: string, fromIndex: number) {
  return consultSegmentMarkers.reduce((nearest, marker) => {
    let index = source.indexOf(marker.open, fromIndex);
    while (index >= 0 && source.startsWith(marker.close, index)) {
      index = source.indexOf(marker.open, index + marker.close.length);
    }
    return index >= 0 && (nearest < 0 || index < nearest) ? index : nearest;
  }, -1);
}

export function parseConsultSegments(content: string, streaming = false): ConsultSegment[] {
  const source = content.replace(/\r\n?/g, "\n");
  const lowerSource = source.toLowerCase();
  const hasOpeningMarker = consultSegmentMarkers.some(({ open }) =>
    lowerSource.includes(open),
  );

  if (!hasOpeningMarker) {
    const fallback = streaming ? stripPartialMarker(source).trim() : source.trim();
    return fallback ? [{ key: "main", content: fallback }] : [];
  }

  const segments: ConsultSegment[] = [];
  let cursor = 0;

  for (const marker of consultSegmentMarkers) {
    const openIndex = lowerSource.indexOf(marker.open, cursor);
    if (openIndex < 0) {
      continue;
    }
    let bodyStart = openIndex + marker.open.length;
    let closeIndex = lowerSource.indexOf(marker.close, bodyStart);

    if (
      closeIndex >= 0 &&
      isTemplatePlaceholder(source.slice(bodyStart, closeIndex))
    ) {
      const contentStart = closeIndex + marker.close.length;
      const secondCloseIndex = lowerSource.indexOf(marker.close, contentStart);
      const nextOpenIndex = nextOpeningIndex(lowerSource, contentStart);
      if (
        secondCloseIndex >= 0 &&
        (nextOpenIndex < 0 || secondCloseIndex < nextOpenIndex)
      ) {
        bodyStart = contentStart;
        closeIndex = secondCloseIndex;
      } else if (streaming && nextOpenIndex < 0) {
        bodyStart = contentStart;
        closeIndex = -1;
      }
    }

    const bodyEnd = closeIndex >= 0 ? closeIndex : source.length;
    const body = (streaming && closeIndex < 0
      ? stripPartialMarker(source.slice(bodyStart, bodyEnd))
      : source.slice(bodyStart, bodyEnd)
    ).trim();
    if (body && !isTemplatePlaceholder(body)) {
      segments.push({ key: marker.key, content: body });
    }
    if (closeIndex < 0) {
      break;
    }
    cursor = closeIndex + marker.close.length;
  }

  if (!streaming && !segments.length) {
    const fallback = stripKnownMarkers(source);
    return fallback ? [{ key: "main", content: fallback }] : [];
  }
  return segments;
}
