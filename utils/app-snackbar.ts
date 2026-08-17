export const APP_SNACKBAR_EVENT = "fate:app-snackbar";

export interface AppSnackbarOptions {
  message: string;
  type?: "success" | "info" | "warning" | "error";
  title?: string;
  actionLabel?: string;
  actionTo?: string;
  action?: () => void | Promise<void>;
  duration?: number;
}

export function showAppSnackbar(options: AppSnackbarOptions) {
  if (!import.meta.client) return;
  window.dispatchEvent(
    new CustomEvent(APP_SNACKBAR_EVENT, { detail: options }),
  );
}

export function showAppInfo(
  message: string,
  options: Omit<AppSnackbarOptions, "message" | "type"> = {},
) {
  showAppSnackbar({ ...options, message, type: "info" });
}

export function showAppSuccess(
  message: string,
  options: Omit<AppSnackbarOptions, "message" | "type"> = {},
) {
  showAppSnackbar({ ...options, message, type: "success" });
}

export function showAppWarning(
  message: string,
  options: Omit<AppSnackbarOptions, "message" | "type"> = {},
) {
  showAppSnackbar({ ...options, message, type: "warning" });
}

export function showAppError(
  message: string,
  options: Omit<AppSnackbarOptions, "message" | "type"> = {},
) {
  showAppSnackbar({ ...options, message, type: "error" });
}
