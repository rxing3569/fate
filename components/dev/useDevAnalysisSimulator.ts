import { toRaw } from "vue";
import type {
  ActiveAnalysisState,
  AnalysisKind,
  AnalysisStatus,
} from "~/stores/active-analysis";
import {
  completeContents,
  scenarioError,
  streamFrames,
  targetRoutes,
  type DevScenario,
  type DevStreamFrame,
} from "./analysis-fixtures";

export const DEV_ANALYSIS_MARKER = "FATE_DEV_ANALYSIS_PANEL";
export const DEV_ANALYSIS_EVENT = "fate-dev-analysis-applied";

function cloneState(value: ActiveAnalysisState | null) {
  return value ? structuredClone(toRaw(value)) : null;
}

function isDevJob(value: ActiveAnalysisState | null | undefined) {
  return value?.metadata.__devMock === DEV_ANALYSIS_MARKER;
}

export function useDevAnalysisSimulator() {
  const activeAnalysis = useActiveAnalysisStore();
  const chartStore = useChartStore();
  const target = ref<AnalysisKind>("report");
  const scenario = ref<DevScenario>("waiting");
  const speed = ref<0.5 | 1 | 2>(1);
  const playing = ref(false);
  const paused = ref(false);
  const frameIndex = ref(0);
  const frames = ref<DevStreamFrame[]>([]);
  const panelError = ref("");
  const hasSnapshot = ref(false);
  let originalState: ActiveAnalysisState | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const progress = computed(() =>
    frames.value.length
      ? Math.round((frameIndex.value / frames.value.length) * 100)
      : 0,
  );

  function stopTimer() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    playing.value = false;
    paused.value = false;
  }

  function rememberOriginal() {
    if (hasSnapshot.value) return;
    originalState = cloneState(activeAnalysis.active);
    hasSnapshot.value = true;
  }

  function dispatchApplied() {
    window.dispatchEvent(
      new CustomEvent(DEV_ANALYSIS_EVENT, {
        detail: { kind: target.value, scenario: scenario.value },
      }),
    );
  }

  function qaContextKey() {
    const chart = chartStore.chart;
    return chart
      ? `ziwei_qa:${chart.gender}:${chart.solarYear}-${chart.solarMonth}-${chart.solarDay}:${chart.lunarYear}-${chart.lunarMonth}-${chart.lunarDay}:${chart.timeBranch}:${chart.trueSolarTime || ""}`
      : "ziwei_qa:dev-mock";
  }

  function metadata(kind: AnalysisKind) {
    const base: Record<string, unknown> = {
      __devMock: DEV_ANALYSIS_MARKER,
      devScenario: scenario.value,
    };
    if (kind === "report") {
      return {
        ...base,
        currentCategory: "general",
        queue: ["general", "palace_detail", "ten_year"],
        categories: ["general", "palace_detail", "ten_year"],
        completedCategories: [],
        failedCategories: [],
        fullRunning: true,
      };
    }
	if (kind === "flow") {
      const now = new Date();
      return {
        ...base,
		flowType: "流日",
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        dateKey: Number(
          `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`,
        ),
	  };
	}
	if (kind === "annual_flow") return { ...base, year: taipeiToday().year };
    if (kind === "match") return { ...base, matchType: "romance" };
    return {
      ...base,
      chatId: `dev-${crypto.randomUUID()}`,
      question: "這是一個 DEV 模擬問題，請示範串流回覆。",
    };
  }

  function createJob(
    kind: AnalysisKind,
    status: AnalysisStatus = "running",
  ): ActiveAnalysisState {
    return {
      jobId: `dev-${crypto.randomUUID()}`,
      kind,
      contextKey:
        kind === "qa" ? qaContextKey() : `dev:${kind}:${Date.now()}`,
      status,
      contents: {},
      metadata: metadata(kind),
      error: "",
      startedAt: Date.now(),
      connected: true,
    };
  }

  function setActive(job: ActiveAnalysisState | null) {
    activeAnalysis.active = job;
    dispatchApplied();
  }

  function partialContents(kind: AnalysisKind) {
    const allFrames = streamFrames(kind);
    const count = Math.max(1, Math.floor(allFrames.length * 0.38));
    return allFrames.slice(0, count).reduce<Record<string, string>>(
      (result, frame) => {
        result[frame.key] = (result[frame.key] || "") + frame.content;
        return result;
      },
      {},
    );
  }

  function buildScenarioJob(kind: AnalysisKind) {
    const job = createJob(kind);
    switch (scenario.value) {
      case "connecting":
      case "waiting":
        return job;
      case "disconnected":
        job.contents = partialContents(kind);
        job.connected = false;
        return job;
      case "completed":
        job.status = "completed";
        job.connected = false;
        job.contents = completeContents(kind);
        if (kind === "report") {
          job.metadata.completedCategories = [
            "general",
            "palace_detail",
            "ten_year",
          ];
          job.metadata.fullRunning = false;
        }
        return job;
      case "partial":
        job.status = "failed";
        job.connected = false;
        job.contents =
          kind === "report"
            ? {
                general: completeContents(kind).general || "",
                palace_detail: partialContents(kind).palace_detail || "",
              }
            : partialContents(kind);
        job.error = scenarioError("partial");
        if (kind === "report") {
          job.metadata.completedCategories = ["general"];
          job.metadata.failedCategories = ["palace_detail", "ten_year"];
          job.metadata.fullRunning = false;
        }
        return job;
      case "stream_failed":
        job.status = "failed";
        job.connected = false;
        job.contents = partialContents(kind);
        job.error = scenarioError(scenario.value);
        return job;
      case "timed_out":
        job.status = "timed_out";
        job.connected = false;
        job.error = scenarioError(scenario.value);
        return job;
      case "connection_failed":
      case "server_failed":
      case "busy":
      case "auth_required":
      case "membership_required":
      case "insufficient_points":
      case "limit_reached":
        job.status = "failed";
        job.connected = false;
        job.error = scenarioError(scenario.value);
        return job;
      default:
        return job;
    }
  }

  async function prepareTarget() {
    const bootstrap = createJob(target.value);
    activeAnalysis.active = bootstrap;
    await navigateTo(targetRoutes[target.value]);
    await nextTick();
    await nextTick();
  }

  function scheduleNext() {
    if (!playing.value || paused.value) return;
    timer = setTimeout(() => {
      step();
      scheduleNext();
    }, 520 / speed.value);
  }

  function step() {
    const job = activeAnalysis.active;
    const frame = frames.value[frameIndex.value];
    if (!job || !isDevJob(job) || !frame) {
      finishStream();
      return;
    }
    job.contents[frame.key] =
      (job.contents[frame.key] || "") + frame.content;
    if (frame.completesKey && job.kind === "report") {
      const completed = new Set(
        (job.metadata.completedCategories as string[] | undefined) || [],
      );
      completed.add(frame.completesKey);
      job.metadata.completedCategories = [...completed];
    }
    frameIndex.value += 1;
    dispatchApplied();
    if (frameIndex.value >= frames.value.length) finishStream();
  }

  function finishStream() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    playing.value = false;
    paused.value = false;
    const job = activeAnalysis.active;
    if (!job || !isDevJob(job)) return;
    job.status = "completed";
    job.connected = false;
    job.error = "";
    job.metadata.fullRunning = false;
    dispatchApplied();
  }

  function play() {
    if (!frames.value.length) return;
    if (frameIndex.value >= frames.value.length) {
      frameIndex.value = 0;
      const job = createJob(target.value);
      setActive(job);
    }
    playing.value = true;
    paused.value = false;
    scheduleNext();
  }

  function pause() {
    if (!playing.value) return;
    paused.value = true;
    if (timer) clearTimeout(timer);
    timer = undefined;
  }

  function resume() {
    if (!playing.value || !paused.value) return;
    paused.value = false;
    scheduleNext();
  }

  async function apply() {
    panelError.value = "";
    const current = activeAnalysis.active;
    if (current?.status === "running" && !isDevJob(current)) {
      panelError.value =
        "目前有真實分析任務正在執行，為避免中斷串流，完成前不能套用模擬。";
      return;
    }
    rememberOriginal();
    stopTimer();
    frameIndex.value = 0;
    frames.value = streamFrames(target.value);

    if (scenario.value === "idle" || scenario.value === "cancelled") {
      setActive(null);
      await navigateTo(targetRoutes[target.value]);
      return;
    }

    await prepareTarget();
    if (scenario.value === "streaming") {
      const job = createJob(target.value);
      setActive(job);
      play();
      return;
    }
    setActive(buildScenarioJob(target.value));
  }

  function restore() {
    stopTimer();
    frameIndex.value = 0;
    frames.value = [];
    if (hasSnapshot.value) activeAnalysis.active = cloneState(originalState);
    originalState = null;
    hasSnapshot.value = false;
    panelError.value = "";
    // A reload also restores page-local refs and histories that intentionally
    // stay outside Pinia. The mock was never persisted, so hydration returns
    // to the untouched real state.
    window.location.reload();
  }

  onBeforeUnmount(stopTimer);

  return {
    target,
    scenario,
    speed,
    playing,
    paused,
    frameIndex,
    frames,
    progress,
    panelError,
    hasSnapshot,
    apply,
    play,
    pause,
    resume,
    step,
    restore,
  };
}
