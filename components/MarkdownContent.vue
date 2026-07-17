<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";

const props = withDefaults(defineProps<{ source: string; reportFormatting?: boolean }>(), { reportFormatting: true });

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderFlowchart(source: string) {
  const lines = source
    .split("\n")
    .map((line) => line.trim().replace(/;$/, ""))
    .filter(Boolean);
  const declaration = lines.shift()?.match(/^(?:flowchart|graph)\s+(LR|RL|TD|TB|BT)/i);
  const direction = declaration?.[1]?.toUpperCase() || "TD";
  const nodes = new Map<string, string>();
  const edges: Array<[string, string]> = [];

  function readNode(value: string) {
    const match = value.trim().match(
      /^([\w-]+)\s*(?:\[([^\]]+)\]|\(\(([^)]+)\)\)|\(([^)]+)\)|\{([^}]+)\})?/,
    );
    if (!match) return "";
    const id = match[1] || "";
    const label = (match[2] || match[3] || match[4] || match[5] || id)
      .replace(/^['"]|['"]$/g, "")
      .trim();
    if (id && !nodes.has(id)) nodes.set(id, label);
    return id;
  }

  for (const line of lines) {
    if (line.startsWith("%%") || /^(?:classDef|class|style|linkStyle)\b/.test(line)) continue;
    const parts = line.split(/\s*(?:-->|---|-\.->|==>)\s*/);
    if (parts.length < 2) {
      readNode(line);
      continue;
    }
    for (let index = 0; index < parts.length - 1; index += 1) {
      const from = readNode(parts[index] || "");
      const to = readNode(parts[index + 1] || "");
      if (from && to) edges.push([from, to]);
    }
  }

  if (!nodes.size) {
    return `<pre class="markdown-flowchart-fallback"><code>${escapeHtml(source)}</code></pre>`;
  }

  const orderedIds: string[] = [];
  for (const [from, to] of edges) {
    if (!orderedIds.includes(from)) orderedIds.push(from);
    if (!orderedIds.includes(to)) orderedIds.push(to);
  }
  for (const id of nodes.keys()) if (!orderedIds.includes(id)) orderedIds.push(id);
  const isSimplePath = edges.every(([from, to], index) => {
    const fromIndex = orderedIds.indexOf(from);
    const toIndex = orderedIds.indexOf(to);
    return toIndex === fromIndex + 1 || (index === edges.length - 1 && fromIndex === orderedIds.length - 1 && toIndex === 0);
  });
  const vertical = ["TD", "TB", "BT"].includes(direction);
  const closesLoop = edges.some(
    ([from, to]) =>
      from === orderedIds[orderedIds.length - 1] && to === orderedIds[0],
  );

  const content = isSimplePath
    ? orderedIds
        .map((id, index) => {
          const arrow = index < orderedIds.length - 1 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : "";
          return `<span class="flow-node">${escapeHtml(nodes.get(id) || id)}</span>${arrow}`;
        })
        .join("") +
      (closesLoop
        ? `<span class="flow-loop">↩ 回到 ${escapeHtml(nodes.get(orderedIds[0] || "") || orderedIds[0] || "起點")}</span>`
        : "")
    : edges
        .map(([from, to]) => `<span class="flow-edge"><span class="flow-node">${escapeHtml(nodes.get(from) || from)}</span><span class="flow-arrow" aria-hidden="true">→</span><span class="flow-node">${escapeHtml(nodes.get(to) || to)}</span></span>`)
        .join("");

  return `<div class="markdown-flowchart markdown-flowchart--${vertical ? "vertical" : "horizontal"}" role="img" aria-label="流程圖"><div class="flow-track">${content}</div></div>`;
}

function renderRichMarkdownBlocks(source: string) {
  return source
    .replace(
      /```(?:mermaid|flowchart)\s*\n([\s\S]*?)```/gi,
      (_, diagram: string) => `\n${renderFlowchart(diagram.trim())}\n`,
    )
    .replace(
      /```(?:markdown|md)?[ \t]*\n([\s\S]*?)```/gi,
      (block: string, content: string) => {
        const lines = content.replace(/\r\n?/g, "\n").split("\n");
        const listPattern = /^(\s*)(?:[-*+]\s+|\d+[.)]\s+)/;
        const listIndents = lines
          .map((line) => line.match(listPattern)?.[1]?.length)
          .filter((indent): indent is number => typeof indent === "number");
        if (!listIndents.length) return block;

        const minimumIndent = Math.min(...listIndents);
        const normalized: string[] = [];
        let previousWasList = false;
        for (const line of lines) {
          const match = line.match(listPattern);
          const isList = Boolean(match);
          const adjusted = isList && minimumIndent > 0
            ? line.slice(Math.min(minimumIndent, match?.[1]?.length || 0))
            : line;
          if (
            isList &&
            !previousWasList &&
            normalized.length &&
            normalized[normalized.length - 1]?.trim()
          ) {
            normalized.push("");
          }
          normalized.push(adjusted.replace(/[ \t]+$/, ""));
          previousWasList = isList;
        }
        return `\n${normalized.join("\n").trim()}\n`;
      },
    );
}

function normalizeReportMarkdown(source: string) {
  return source
    .replace(/\\\*\\\*/g, "**")
    .replace(/＊＊/g, "**")
    .replace(/\*{4}([^*\n]+?)\*{4}/g, "**$1**")
    .replace(/\*\*\s*([^*\n]+?)\s*\*\*/g, "**$1**")
    .split("\n")
    .map((line) => {
      const point = line.match(/^\s*[-*+]\s+\*\*(.+?)\*\*\s*(?:[：:]\s*)?(.*)$/);
      if (!point) return line;
      return `\n#### ${point[1]?.trim()}\n\n${point[2]?.trim()}\n`;
    })
    .join("\n")
    .replace(/\*\*([\s\S]*?)\*\*/g, (_, content: string) => {
      return `ZIWEI_BOLD_OPEN${content.trim()}ZIWEI_BOLD_CLOSE`;
    });
}
const html = computed(() => {
  const source = props.reportFormatting ? normalizeReportMarkdown(props.source || "") : props.source || "";
  const richSource = renderRichMarkdownBlocks(source);
  const rendered = (marked.parse(richSource, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string)
    .replaceAll("ZIWEI_BOLD_OPEN", "<strong>")
    .replaceAll("ZIWEI_BOLD_CLOSE", "</strong>")
    .replaceAll("<table>", '<div class="markdown-table-wrap"><table>')
    .replaceAll("</table>", "</table></div>");
  if (import.meta.server) return rendered;
  return DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true } });
});
</script>

<template>
  <div class="markdown-content" v-html="html" />
</template>

<style scoped>
.markdown-content {
  color: rgba(36, 87, 90, 0.84);
  font-size: 15.5px;
  line-height: 1.72;
  overflow-wrap: anywhere;
}
.markdown-content :deep(p) {
  margin: 0 0 14px;
}
.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4) {
  margin: 24px 0 11px;
  color: var(--mountain);
  font-weight: 800;
  line-height: 1.45;
}
.markdown-content :deep(h1) {
  font-size: 22px;
}
.markdown-content :deep(h2) {
  font-size: 20px;
}
.markdown-content :deep(h3),
.markdown-content :deep(h4) {
  padding-bottom: 6px;
  border-bottom: 1.5px solid rgba(200, 174, 120, 0.58);
  color: var(--cinnabar);
  font-size: 18px;
}
.markdown-content :deep(h4 + p) {
  margin-bottom: 36px;
  line-height: 1.78;
}
.markdown-content :deep(strong),
.markdown-content :deep(b) {
  color: var(--cinnabar);
  font-weight: 800;
  font-synthesis: weight;
}
.markdown-content :deep(em) {
  color: var(--mountain);
}
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0 15px;
  padding-left: 23px;
}
.markdown-content :deep(li) {
  margin: 6px 0;
  padding-left: 2px;
}
.markdown-content :deep(li::marker) {
  color: var(--jade);
  font-weight: 800;
}
.markdown-content :deep(blockquote) {
  margin: 14px 0;
  padding: 12px 15px;
  border-left: 3px solid var(--gold);
  border-radius: 0 12px 12px 0;
  background: rgba(200, 174, 120, 0.09);
}
.markdown-content :deep(blockquote p) {
  margin: 0;
}
.markdown-content :deep(hr) {
  margin: 20px 0;
  border: 0;
  border-top: 1px solid rgba(36, 87, 90, 0.12);
}
.markdown-content :deep(a) {
  color: var(--mountain);
  font-weight: 700;
  text-decoration: underline;
}
.markdown-content :deep(code) {
  padding: 2px 5px;
  border-radius: 5px;
  background: rgba(36, 87, 90, 0.08);
  font-size: 0.9em;
}
.markdown-content :deep(pre) {
  overflow: auto;
  padding: 14px;
  border-radius: 12px;
  background: rgba(36, 87, 90, 0.08);
}
.markdown-content :deep(pre code) {
  padding: 0;
  background: transparent;
}
.markdown-content :deep(.markdown-table-wrap) {
  width: 100%;
  margin: 14px 0 18px;
  overflow-x: auto;
  border: 1px solid rgba(36, 87, 90, 0.13);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.6);
  -webkit-overflow-scrolling: touch;
}
.markdown-content :deep(table) {
  width: 100%;
  min-width: 480px;
  border-collapse: collapse;
  font-size: 13.5px;
  line-height: 1.5;
}
.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 10px 12px;
  border-right: 1px solid rgba(36, 87, 90, 0.1);
  border-bottom: 1px solid rgba(36, 87, 90, 0.1);
  text-align: left;
  vertical-align: top;
}
.markdown-content :deep(th:last-child),
.markdown-content :deep(td:last-child) {
  border-right: 0;
}
.markdown-content :deep(tr:last-child td) {
  border-bottom: 0;
}
.markdown-content :deep(th) {
  background: rgba(107, 166, 160, 0.13);
  color: var(--mountain);
  font-weight: 800;
  white-space: nowrap;
}
.markdown-content :deep(.markdown-flowchart) {
  width: 100%;
  margin: 14px 0 18px;
  padding: 16px;
  overflow: auto;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.64);
}
.markdown-content :deep(.flow-track) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: max-content;
}
.markdown-content :deep(.markdown-flowchart--vertical .flow-track) {
  flex-direction: column;
  min-width: 0;
}
.markdown-content :deep(.flow-node) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid rgba(36, 87, 90, 0.2);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 5px 12px rgba(36, 87, 90, 0.07);
  color: var(--mountain);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}
.markdown-content :deep(.flow-arrow) {
  flex: 0 0 auto;
  color: var(--jade);
  font-size: 20px;
  font-weight: 900;
}
.markdown-content :deep(.flow-loop) {
  flex: 0 0 auto;
  color: var(--tea);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}
.markdown-content :deep(.markdown-flowchart--vertical .flow-arrow) {
  transform: rotate(90deg);
}
.markdown-content :deep(.flow-edge) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.markdown-content :deep(.markdown-flowchart--vertical .flow-edge) {
  flex-direction: column;
}
.markdown-content :deep(.markdown-flowchart-fallback) {
  white-space: pre-wrap;
}
</style>
