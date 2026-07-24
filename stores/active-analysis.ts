import { defineStore } from "pinia";
import {
  ApiError,
  getValidAccessToken,
  wasAuthCheckUnavailable,
} from "~/utils/api";
import { ANALYSIS_TIMEOUT_MS } from "~/composables/useIncompleteAnalysisRecovery";

export type AnalysisKind = "report" | "flow" | "match" | "qa";
export type AnalysisStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "timed_out";

export interface ActiveAnalysisState {
  jobId: string;
  kind: AnalysisKind;
  contextKey: string;
  status: AnalysisStatus;
  contents: Record<string, string>;
  metadata: Record<string, unknown>;
  error: string;
  startedAt: number;
  connected: boolean;
}

interface AnalysisJobResponse {
  client_job_id?: string;
  analysis_type?: string;
  context_key?: string;
  status?: AnalysisStatus;
  error?: string;
  metadata?: unknown;
  started_at?: string;
  updated_at?: string;
}

const CACHE_KEY = "ziwei:active-analysis";
let activeController: AbortController | undefined;

type SnackbarOptions = {
  title?: string;
  actionLabel?: string;
  actionTo?: string;
  duration?: number;
};

function snackbar(
  message: string,
  type: "info" | "error",
  options: SnackbarOptions = {},
) {
  if (!import.meta.client) return;
  window.dispatchEvent(
    new CustomEvent("api-error-snackbar", {
      detail: { message, type, ...options },
    }),
  );
}

const labels: Record<AnalysisKind, string> = {
  report: "命盤解析",
  flow: "時運解析",
  match: "合盤解析",
  qa: "AI 問答",
};

const destinations: Record<AnalysisKind, string> = {
  report: "/report",
  flow: "/flow",
  match: "/match",
  qa: "/qa",
};

function normalizePath(path: string) {
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
}

function notifyCompleted(kind: AnalysisKind) {
  if (
    import.meta.client &&
    normalizePath(window.location.pathname) ===
      normalizePath(destinations[kind])
  )
    return;
  snackbar(`${labels[kind]}結果已保存，點擊下方按鈕即可前往查看。`, "info", {
    title: `${labels[kind]}已完成`,
    actionLabel: kind === "qa" ? "前往 AI 問答" : "查看解析結果",
    actionTo: destinations[kind],
    duration: 6000,
  });
}

function notifyConflict(
  runningKind: AnalysisKind,
  requestedKind: AnalysisKind,
) {
  snackbar(
    `目前正在進行「${labels[runningKind]}」。為避免重複扣點、重複送出或中斷既有結果，完成前無法開始「${labels[requestedKind]}」。`,
    "error",
    {
      title: "已有分析任務進行中",
      actionLabel: `查看${labels[runningKind]}進度`,
      actionTo: destinations[runningKind],
    },
  );
}

function failureText(error: string) {
  if (error === "analysis_interrupted" || error === "analysis_timeout")
    return "系統服務中斷，本次分析已停止，請重新執行。";
  return error || "工作未完成，請稍後重新執行。";
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function analysisKind(value: string | undefined, fallback?: AnalysisKind) {
  return value && ["report", "flow", "match", "qa"].includes(value)
    ? (value as AnalysisKind)
    : fallback;
}

export const useActiveAnalysisStore = defineStore("active-analysis", {
  state: () => ({
    active: null as ActiveAnalysisState | null,
    hydrated: false,
  }),
  getters: {
    isRunning: (state) => state.active?.status === "running",
    runningLabel: (state) => (state.active ? labels[state.active.kind] : ""),
  },
  actions: {
    persist() {
      if (!import.meta.client) return;
      if (this.active) {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ...this.active, contents: {} }),
        );
      } else localStorage.removeItem(CACHE_KEY);
    },
    async hydrate() {
      if (!import.meta.client) return;
      if (this.hydrated) return;
      const hasValidSession = Boolean(await getValidAccessToken());
      if (!hasValidSession && !wasAuthCheckUnavailable()) {
        this.active = null;
        localStorage.removeItem(CACHE_KEY);
        return;
      }
      this.hydrated = true;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          this.active = JSON.parse(raw) as ActiveAnalysisState;
          if (this.active.status === "running") this.active.connected = false;
        }
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
      await this.reconcileActive();
      this.persist();
    },
    async reconcileActive() {
      if (!import.meta.client) return false;
      if (!(await getValidAccessToken())) return false;
      if (
        this.active?.status === "running" &&
        Date.now() - this.active.startedAt >= ANALYSIS_TIMEOUT_MS
      ) {
        await this.finalizeTimedOut();
        return true;
      }
      try {
        const response = (await ziweiApi.getActiveAnalysisJob({
          notifyError: false,
        })) as { data?: AnalysisJobResponse | null };
        const serverJob = response?.data;
        if (serverJob?.status === "running") {
          const kind = analysisKind(serverJob.analysis_type, this.active?.kind);
          if (kind) {
            const metadata = normalizeMetadata(serverJob.metadata);
            if (!this.active || this.active.jobId !== serverJob.client_job_id) {
              this.active = {
                jobId: serverJob.client_job_id || crypto.randomUUID(),
                kind,
                contextKey: serverJob.context_key || "",
                status: "running",
                contents: {},
                metadata,
                error: "",
                startedAt: Date.parse(serverJob.started_at || "") || Date.now(),
                connected: false,
              };
            } else {
              this.active.kind = kind;
              this.active.contextKey =
                serverJob.context_key || this.active.contextKey;
              this.active.status = "running";
              this.active.error = "";
              if (Object.keys(metadata).length) {
                this.active.metadata = { ...this.active.metadata, ...metadata };
              }
            }
            this.persist();
          }
          return true;
        }
        if (this.active?.status === "running") await this.refreshStatus();
        return true;
      } catch (reason) {
        if (
          reason instanceof ApiError &&
          reason.status === 401 &&
          this.active?.status === "running"
        ) {
          this.active.status = "failed";
          this.active.connected = false;
          this.active.error = "登入狀態已失效";
          this.persist();
        }
        return false;
      }
    },
    async refreshStatus() {
      const job = this.active;
      if (!job || job.status !== "running") return job?.status || "idle";
      if (Date.now() - job.startedAt >= ANALYSIS_TIMEOUT_MS) {
        await this.finalizeTimedOut();
        return this.active?.status || "idle";
      }
      if (!(await getValidAccessToken())) {
        if (wasAuthCheckUnavailable()) return job.status;
        job.status = "failed";
        job.connected = false;
        job.error = "登入狀態已失效";
        this.persist();
        return job.status;
      }
      try {
        const response = (await ziweiApi.getAnalysisJob(job.jobId, {
          notifyError: false,
        })) as { data?: AnalysisJobResponse };
        const status = response.data?.status;
        const metadata = normalizeMetadata(response.data?.metadata);
        if (Object.keys(metadata).length)
          job.metadata = { ...job.metadata, ...metadata };
        if (!status || status === "running") {
          job.connected = false;
          this.persist();
          return job.status;
        }
        const serverError = response.data?.error || "";
        job.status = status;
        job.error = status === "completed" ? "" : failureText(serverError);
        job.connected = false;
        this.persist();
        if (status === "completed") notifyCompleted(job.kind);
        else
          snackbar(job.error, "error", {
            title: `${labels[job.kind]}執行失敗`,
          });
        return job.status;
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 401) {
          job.status = "failed";
          job.connected = false;
          job.error = "登入狀態已失效";
          this.persist();
          return job.status;
        }
        if (
          reason instanceof ApiError &&
          reason.status === 404 &&
          this.active?.jobId === job.jobId
        ) {
          job.status = "failed";
          job.error = "找不到分析工作，請重新執行";
          this.persist();
          snackbar(`${labels[job.kind]}失敗：${job.error}`, "error");
          return job.status;
        }
        throw reason;
      }
    },
    async ensureAvailable(kind: AnalysisKind) {
      await this.hydrate();
      await this.reconcileActive();
      if (this.active?.status === "running") {
        notifyConflict(this.active.kind, kind);
        return false;
      }
      return true;
    },
    async begin(
      kind: AnalysisKind,
      contextKey: string,
      metadata: Record<string, unknown> = {},
    ) {
      if (!(await this.ensureAvailable(kind))) return false;
      this.active = {
        jobId: crypto.randomUUID(),
        kind,
        contextKey,
        status: "running",
        contents: {},
        metadata,
        error: "",
        startedAt: Date.now(),
        connected: false,
      };
      activeController?.abort();
      activeController = new AbortController();
      this.persist();
      return true;
    },
    updateMetadata(metadata: Record<string, unknown>) {
      if (!this.active) return;
      this.active.metadata = { ...this.active.metadata, ...metadata };
      this.persist();
    },
    async runStep(
      payload: Record<string, unknown>,
      contentKey = "main",
      final = true,
    ) {
      const job = this.active;
      if (!job || job.status !== "running")
        throw new Error("沒有可執行的分析工作");
      job.contents[contentKey] = "";
      job.connected = true;
      this.persist();
      try {
        await streamAnalysis({
          type: job.kind,
          payload: {
            ...payload,
            client_job_id: job.jobId,
            analysis_context_key: job.contextKey,
            analysis_job_metadata: job.metadata,
            job_is_final: final,
          },
          signal: activeController?.signal,
          onMessage: (chunk) => {
            if (this.active?.jobId !== job.jobId) return;
            this.active.contents[contentKey] =
              (this.active.contents[contentKey] || "") + chunk;
            this.persist();
          },
        });
        if (this.active?.jobId !== job.jobId) return "";
        this.active.connected = false;
        if (final) {
          this.active.status = "completed";
          activeController = undefined;
          notifyCompleted(job.kind);
        }
        this.persist();
        return this.active.contents[contentKey] || "";
      } catch (reason) {
        const failureMessage =
          reason instanceof Error ? reason.message : "分析連線失敗";
        if (failureMessage === "analysis_connection_lost") {
          if (this.active?.jobId === job.jobId) {
            this.active.connected = false;
            this.active.error = "";
            activeController = undefined;
            this.persist();
            if (job.kind !== "qa")
              snackbar(
                "任務可能仍在背景處理，請使用畫面上的「重新讀取」確認最新結果。",
                "info",
                { title: `${labels[job.kind]}正在背景作業` },
              );
          }
          throw reason;
        }
        if (failureMessage === "analysis_connection_failed") {
          if (this.active?.jobId === job.jobId) {
            this.active.connected = false;
            this.active.status = "failed";
            this.active.error = "無法連線分析服務，請稍後再試。";
            activeController = undefined;
            this.persist();
            snackbar(this.active.error, "error", {
              title: `${labels[job.kind]}執行失敗`,
            });
          }
          throw reason;
        }
        if (failureMessage === "analysis_in_progress") {
          activeController = undefined;
          let runningKind = job.kind;
          try {
            const response = (await ziweiApi.getActiveAnalysisJob({
              notifyError: false,
            })) as { data?: AnalysisJobResponse | null };
            const running = response.data;
            const recoveredKind =
              analysisKind(running?.analysis_type, runningKind) || runningKind;
            runningKind = recoveredKind;
            if (running?.client_job_id) {
              this.active = {
                jobId: running.client_job_id,
                kind: recoveredKind,
                contextKey: running.context_key || "",
                status: "running",
                contents: {},
                metadata: normalizeMetadata(running.metadata),
                error: "",
                startedAt: Date.parse(running.started_at || "") || Date.now(),
                connected: false,
              };
              this.persist();
            }
          } catch {
            /* The explanatory snackbar is still useful while offline. */
          }
          notifyConflict(runningKind, job.kind);
          throw reason;
        }
        if (this.active?.jobId === job.jobId) {
          this.active.connected = false;
          this.active.status = "failed";
          this.active.error = failureMessage;
          activeController = undefined;
          this.persist();
          snackbar(this.active.error, "error", {
            title: `${labels[job.kind]}執行失敗`,
          });
        }
        throw reason;
      }
    },
    async runBatch(payload: Record<string, unknown>, categories: string[]) {
      const job = this.active;
      if (!job || job.kind !== "report" || job.status !== "running")
        throw new Error("沒有可執行的命盤解析工作");
      job.connected = true;
      job.metadata = {
        ...job.metadata,
        categories,
        completedCategories: [],
        failedCategories: [],
      };
      for (const category of categories) job.contents[category] = "";
      this.persist();
      try {
        await streamBatchAnalysis({
          payload: {
            ...payload,
            categories,
            client_job_id: job.jobId,
            analysis_context_key: job.contextKey,
          },
          signal: activeController?.signal,
          onEvent: (event) => {
            if (this.active?.jobId !== job.jobId) return;
            const key = event.step_key || "";
            if (event.type === "chunk" && key) {
              this.active.contents[key] =
                (this.active.contents[key] || "") + (event.content || "");
            } else if (event.type === "step_completed" && key) {
              const completed = new Set(
                (this.active.metadata.completedCategories as
                  | string[]
                  | undefined) || [],
              );
              completed.add(key);
              this.active.metadata.completedCategories = [...completed];
            } else if (event.type === "step_failed" && key) {
              const failed = new Set(
                (this.active.metadata.failedCategories as
                  | string[]
                  | undefined) || [],
              );
              failed.add(key);
              this.active.metadata.failedCategories = [...failed];
              this.active.error =
                event.message || "部分解析未完成，可免費重新執行。";
            } else if (event.type === "batch_completed") {
              const failed = event.failed_steps || [];
              this.active.metadata.failedCategories = failed;
              this.active.status = failed.length ? "failed" : "completed";
              this.active.connected = false;
              if (!failed.length) notifyCompleted("report");
              void useAuthStore().loadBilling();
            }
            this.persist();
          },
        });
      } catch (reason) {
        const message =
          reason instanceof Error ? reason.message : "analysis_connection_lost";
        if (this.active?.jobId === job.jobId) {
          this.active.connected = false;
          if (message !== "analysis_connection_lost")
            this.active.error = message;
          this.persist();
        }
        throw reason;
      }
    },
    async finalizeTimedOut() {
      const job = this.active;
      if (
        !job ||
        job.status !== "running" ||
        Date.now() - job.startedAt < ANALYSIS_TIMEOUT_MS
      )
        return false;
      try {
        const response = (await ziweiApi.finalizeAnalysisTimeout(
          job.jobId,
        )) as { data?: { status?: Record<string, string> } };
        const status = response.data?.status || {};
        const failed = Object.entries(status)
          .filter(([, value]) => value === "failed")
          .map(([key]) => key);
        const completed = Object.entries(status)
          .filter(([, value]) => value === "completed")
          .map(([key]) => key);
        job.metadata = {
          ...job.metadata,
          failedCategories: failed,
          completedCategories: completed,
        };
        job.status = failed.length ? "failed" : "completed";
        job.connected = false;
        job.error = failed.length
          ? "部分解析超過預期時間，可免費重新執行未完成項目。"
          : "";
        this.persist();
        await useAuthStore().loadBilling();
        return true;
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 409) return false;
        return false;
      }
    },
    dismiss(kind?: AnalysisKind) {
      if (kind && this.active?.kind !== kind) return;
      activeController?.abort();
      activeController = undefined;
      this.active = null;
      this.persist();
    },
    reset() {
      activeController?.abort();
      activeController = undefined;
      this.active = null;
      this.hydrated = false;
      if (import.meta.client) localStorage.removeItem(CACHE_KEY);
    },
  },
});
