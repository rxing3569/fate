import type { NextStepAction, NextStepSource } from "~/types/next-step";
import {
  saveNextStepIntent,
  trackNextStepEvent,
} from "~/utils/next-step";

export function useNextStepNavigation() {
  const auth = useAuthStore();
  const chartStore = useChartStore();

  async function openNextStep(action: NextStepAction, source: NextStepSource) {
    saveNextStepIntent(source, action);
    trackNextStepEvent("next_step_clicked", {
      source_type: source.type,
      source_id: source.id,
      action_id: action.id,
      destination: action.destination,
    });

    if (!auth.sessionReady) await auth.hydrate();
    chartStore.hydrate(auth.profile);

    if (action.destination === "chart") {
      await navigateTo(
        chartStore.chart
          ? "/chart"
          : "/ai-analysis?mode=chart&redirect=/chart",
      );
      return;
    }

    const destination = action.destination;
	const direct = destination === "annual_flow"
	  ? "/annual-flow"
	  : destination === "report" && action.reportCategory
        ? `/report?category=${action.reportCategory}`
        : `/${destination}`;
	const setup = `/ai-analysis?mode=${destination}`;

    if (!auth.isAuthenticated) {
      window.dispatchEvent(
        new CustomEvent("auth-login-required", {
          detail: { redirect: chartStore.chart ? direct : setup },
        }),
      );
      return;
    }
    await navigateTo(chartStore.chart ? direct : setup);
  }

  return { openNextStep };
}
