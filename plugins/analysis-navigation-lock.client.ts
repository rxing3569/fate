export default defineNuxtPlugin(() => {
  const activeAnalysis = useActiveAnalysisStore();

  addRouteMiddleware(
    "analysis-navigation-lock",
    (to, from) => {
      if (to.fullPath === from.fullPath) return;
      const label = analysisNavigationLockLabel(from.path, activeAnalysis.active);
      if (!label) return;
      if (
        from.path.replace(/\/+$/, "") === "/consult" &&
        to.path.replace(/\/+$/, "") === "/consult/result"
      )
        return;

      showAppInfo("回答仍在接收中，完成前請留在此頁。", {
        title: `${label}進行中`,
        duration: 4000,
      });
      return abortNavigation();
    },
    { global: true },
  );
});
