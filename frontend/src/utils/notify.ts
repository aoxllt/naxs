import { notification } from "antd";

export type NotifyType = "success" | "info" | "warning" | "error";

let api: ReturnType<typeof notification.useNotification>[0] | null =
  null;

/**
 * 初始化 notification
 * 在 App 根组件调用一次
 */
export const initNotify = (
  notificationApi: ReturnType<typeof notification.useNotification>[0]
) => {
  api = notificationApi;
};

/**
 * 统一通知方法
 */
const open = (
  type: NotifyType,
  message: string,
  description?: string
) => {
  if (!api) {
    console.warn("notification not initialized");
    return;
  }

  api[type]({
    message,
    description,
    showProgress: true,
    pauseOnHover: true,
    duration: 2.5,
  });
};

export const notify = {
  success: (message: string, description?: string) =>
    open("success", message, description),

  info: (message: string, description?: string) =>
    open("info", message, description),

  warning: (message: string, description?: string) =>
    open("warning", message, description),

  error: (message: string, description?: string) =>
    open("error", message, description),
};
