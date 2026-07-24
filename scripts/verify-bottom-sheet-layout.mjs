import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(
  new URL("../components/AppBottomSheet.vue", import.meta.url),
  "utf8",
);
const layout = await readFile(
  new URL("../layouts/default.vue", import.meta.url),
  "utf8",
);
const chartGrid = await readFile(
  new URL("../components/ChartGrid.vue", import.meta.url),
  "utf8",
);

assert.match(layout, /provide\("primary-navigation-visible", showTabs\)/);
assert.match(component, /inject<ComputedRef<boolean>>/);
assert.match(component, /'has-primary-navigation': primaryNavigationVisible/);
assert.match(component, /scrollMode\?: "content" \| "nested"/);
assert.match(component, /padding:\s*12px 22px 0;/);
assert.match(
  component,
  /\.app-bottom-sheet-content\.has-nested-scroll :deep\(\[data-sheet-scroll\]\)\s*\{[^}]*padding-bottom:\s*max\(12px, env\(safe-area-inset-bottom\)\);/s,
);

const desktopRules = component.slice(component.indexOf("@media (min-width: 760px)"));
assert.doesNotMatch(
  desktopRules,
  /\.app-bottom-sheet-backdrop\s*\{[^}]*padding-left/s,
  "Desktop navigation padding must never apply without the navigation-state class",
);

assert.match(chartGrid, /height-mode="viewport"/);
assert.match(chartGrid, /scroll-mode="nested"/);
assert.match(chartGrid, /sheet-class="palace-detail-sheet"/);
assert.match(
  chartGrid,
  /\.palace-detail-sheet\.app-bottom-sheet\.is-viewport-height\)\s*\{[^}]*height:\s*min\(65%, 680px\);[^}]*padding:\s*12px 12px 0;/s,
);
assert.match(
  chartGrid,
  /\.sheet-scroll\s*\{[^}]*padding:\s*0 4px 12px;/s,
);
assert.doesNotMatch(chartGrid, /height:\s*calc\(60dvh - 42px\)/);
assert.doesNotMatch(chartGrid, /\.sheet-enter-active[\s\S]*\.palace-sheet/);
assert.doesNotMatch(
  desktopRules,
  /(?<!navigation )\.app-bottom-sheet\s*\{[^}]*margin-left/s,
  "Desktop sheet margin must never apply without the navigation-state class",
);

const sheetWidth = (viewportWidth) =>
  viewportWidth >= 1180 ? 644 : Math.min(644, viewportWidth - 124);
const left = (viewportWidth, navigationVisible) => {
  const width = sheetWidth(viewportWidth);
  if (!navigationVisible) return (viewportWidth - width) / 2;
  if (viewportWidth < 1180) return 88 + (viewportWidth - 88 - width) / 2;
  return 260 + Math.max(24, (viewportWidth - 940) / 2 - 80) + 18;
};

for (const viewportWidth of [760, 900, 1179, 1180, 1440, 1920]) {
  const width = sheetWidth(viewportWidth);
  const centeredLeft = left(viewportWidth, false);
  assert.equal(centeredLeft + width / 2, viewportWidth / 2);

  const navigationLeft = left(viewportWidth, true);
  assert.ok(navigationLeft >= 0);
  assert.ok(navigationLeft + width <= viewportWidth);
  assert.notEqual(navigationLeft, centeredLeft);
}

console.log("Bottom-sheet desktop layout regression checks passed.");
