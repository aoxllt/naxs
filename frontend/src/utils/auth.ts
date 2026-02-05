/*
 * @Author: xel
 * @Date: 2026-02-04
 * @Description: 双Token认证管理
 */
import axios from "axios";

// 用户信息类型（与后端 CustomClaims 对应）
export interface User {
  userId: number;
  username: string;
  role: string;
}

// Access Token 存内存，更安全
let accessToken: string | null = null;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  accessToken = null;
};

// 用户信息存 localStorage
export const setUser = (user: User) => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const getUser = (): User | null => {
  const user = localStorage.getItem("user");
  if (!user || user === "undefined" || user === "null") {
    return null;
  }
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};

export const clearUser = () => {
  localStorage.removeItem("user");
};

// 清除所有认证信息
export const clearAuth = () => {
  clearAccessToken();
  clearUser();
};

// 判断是否已登录
export const isLoggedIn = () => {
  return !!getUser();
};

// 刷新 Access Token
export const refreshAccessToken = async (): Promise<boolean> => {
  if (!getUser()) return false;

  try {
    const res = await axios.post(
      "http://localhost:8080/api/v1/auth/refresh",
      {},
      { withCredentials: true },
    );
    if (res.data.code === 0 && res.data.data?.accessToken) {
      const newToken = res.data.data.accessToken;
      setAccessToken(newToken);
      // 更新用户信息
      const payload = JSON.parse(atob(newToken.split(".")[1]));
      setUser({
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      });
      return true;
    }
  } catch {
    // 刷新失败
  }
  return false;
};


// 刷新 Access Token
export const bindRefreshAccessToken = async (): Promise<boolean> => {

  try {
    const res = await axios.post(
      "http://localhost:8080/api/v1/auth/refresh",
      {},
      { withCredentials: true,
        headers: { Authorization: `Bearer ${getRefreshToken()}` }
       },
    );
    if (res.data.code === 0 && res.data.data?.accessToken) {
      const newToken = res.data.data.accessToken;
      setAccessToken(newToken);
      // 更新用户信息
      const payload = JSON.parse(atob(newToken.split(".")[1]));
      setUser({
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      });
      return true;
    }
  } catch {
    // 刷新失败
  }
  return false;
};

// 定时刷新 Token（10分钟）
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export const startTokenRefresh = () => {
  stopTokenRefresh();
  // 每 10 分钟刷新一次
  refreshTimer = setInterval(
    async () => {
      if (isLoggedIn()) {
        console.log("begin")
        const success = await refreshAccessToken();
        if (!success) {
          clearAuth();
          window.location.href = "/login";
        }
      }
    },
    10 *60 * 1000,
  ); // 10分钟
};

export const stopTokenRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};


