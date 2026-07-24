export function useChartEntryNavigation() {
  const auth = useAuthStore();
  const chartStore = useChartStore();

  async function hydrateNavigationState() {
    if (!auth.sessionReady) await auth.hydrate();
    chartStore.hydrate(auth.profile);
  }

  async function openChartEntry() {
    await hydrateNavigationState();
    await navigateTo(
      chartStore.chart ? "/chart" : "/ai-analysis?mode=chart&redirect=/chart",
    );
  }

  async function openReportEntry() {
    await hydrateNavigationState();
    const destination = chartStore.chart
      ? "/report"
      : "/ai-analysis?mode=chart&redirect=/report";
    if (!auth.isAuthenticated) {
      window.dispatchEvent(
        new CustomEvent("auth-login-required", {
          detail: { redirect: destination },
        }),
      );
      return;
    }
    await navigateTo(destination);
  }

  return { openChartEntry, openReportEntry };
}
