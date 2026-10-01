import type { ActiveAnalysisState } from "~/stores/active-analysis";

function normalizedAnalysisPath(path: string) {
  return path.replace(/\/+$/, "") || "/";
}

export function analysisNavigationLockLabel(
  path: string,
  active: ActiveAnalysisState | null,
) {
  const currentPath = normalizedAnalysisPath(path);
  if (
    currentPath === "/qa" &&
    active?.kind === "qa" &&
    active.status === "running"
  )
    return "線上問答";
  if (
    (currentPath === "/consult" || currentPath === "/consult/result") &&
    active?.kind === "consult" &&
    active.status === "running" &&
    (active.connected || active.metadata.navigationLocked === true)
  )
    return "問事解惑";
  return "";
}

export function useAnalysisNavigationLock() {
  const route = useRoute();
  const activeAnalysis = useActiveAnalysisStore();
  const label = computed(() =>
    analysisNavigationLockLabel(route.path, activeAnalysis.active),
  );
  const locked = computed(() => Boolean(label.value));

  function notifyLocked() {
    if (!label.value) return;
    showAppInfo("回答仍在接收中，完成前請留在此頁。", {
      title: `${label.value}進行中`,
      duration: 4000,
    });
  }

  function blockIfLocked() {
    if (!locked.value) return false;
    notifyLocked();
    return true;
  }

  return { locked, label, notifyLocked, blockIfLocked };
}
