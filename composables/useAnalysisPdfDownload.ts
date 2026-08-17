import type { Ref } from "vue";
import { ApiError } from "~/utils/api";
import {
  generateReportPdf,
  saveReportPdf,
} from "~/utils/report-pdf.client";

interface AnalysisPdfDownloadOptions {
  source: Ref<HTMLElement | null>;
  filename: () => string;
  prepare: () => void | Promise<void>;
  cleanup?: () => void;
  onPremiumRequired?: () => void | Promise<void>;
}

function httpStatus(reason: unknown) {
  if (reason instanceof ApiError) return reason.status;
  if (reason && typeof reason === "object" && "status" in reason) {
    const status = Number((reason as { status?: unknown }).status);
    return Number.isFinite(status) ? status : 0;
  }
  return 0;
}

export function useAnalysisPdfDownload() {
  const auth = useAuthStore();
  const downloading = ref(false);

  async function download(options: AnalysisPdfDownloadOptions) {
    if (downloading.value) return false;
    if (!auth.premium) {
      if (options.onPremiumRequired) await options.onPremiumRequired();
      else await navigateTo("/store");
      return false;
    }
    downloading.value = true;
    try {
      await ziweiApi.authorizeAnalysisPDF();
      await options.prepare();
      await nextTick();
      await document.fonts?.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (!options.source.value) throw new Error("找不到可下載的分析內容");
      const { blob } = await generateReportPdf(options.source.value);
      saveReportPdf(blob, options.filename());
      showAppSuccess("PDF 已下載");
      return true;
    } catch (reason) {
      if (httpStatus(reason) === 403) {
        auth.premium = false;
        if (options.onPremiumRequired) await options.onPremiumRequired();
        else {
          showAppError("PDF 下載為 Premium 會員專屬功能");
          await navigateTo("/store");
        }
        return false;
      }
      showAppError(
        reason instanceof Error ? reason.message : "PDF 產生失敗，請稍後再試",
      );
      return false;
    } finally {
      options.cleanup?.();
      downloading.value = false;
    }
  }

  return { downloading, download };
}
