/*
 * @Author: xel
 * @Date: 2026-02-04 11:00:17
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 17:34:41
 * @FilePath: \frontend\src\utils\http.ts
 * @Description: 双Token机制 HTTP 封装
 */
import axios from "axios";
import { getAccessToken, setAccessToken, clearAuth } from "./auth";

const http = axios.create({
  baseURL: "http://localhost:8080/api/v1",
  timeout: 15000,
  withCredentials: true,
});

// 请求拦截：自动添加 Access Token
http.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截：401 时自动刷新 Token
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 且不是刷新请求本身
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        // 正在刷新中，把请求加入队列等待
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(http(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          "http://localhost:8080/api/v1/auth/refresh",
          {},
          { withCredentials: true },
        );

        if (res.data.code === 0 && res.data.accessToken) {
          const newToken = res.data.accessToken;
          setAccessToken(newToken);

          // 重试所有等待中的请求
          pendingRequests.forEach((cb) => cb(newToken));
          pendingRequests = [];

          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return http(originalRequest);
        } else {
          throw new Error("刷新失败");
        }
      } catch {
        // 刷新也失败，清除认证信息，跳转登录页
        clearAuth();
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default http;
