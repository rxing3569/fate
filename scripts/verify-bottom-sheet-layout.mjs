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

assert.match(layout, /provide\("primary-navigation-visible", showTabs\)/);
assert.match(component, /inject<ComputedRef<boolean>>/);
assert.match(component, /'has-primary-navigation': primaryNavigationVisible/);

const desktopRules = component.slice(component.indexOf("@media (min-width: 760px)"));
assert.doesNotMatch(
  desktopRules,
  /\.app-bottom-sheet-backdrop\s*\{[^}]*padding-left/s,
  "Desktop navigation padding must never apply without the navigation-state class",
);
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
