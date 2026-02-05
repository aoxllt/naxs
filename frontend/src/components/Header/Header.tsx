/*
 * @Author: xel
 * @Date: 2026-02-02 05:57:39
 * @LastEditors: xel
 * @LastEditTime: 2026-02-05 20:41:02
 * @FilePath: \frontend\src\components\Header\Header.tsx
 * @Description:
 */
import { useNavigate, useLocation } from "react-router-dom";
import "./Header.css";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  getAccessToken,
  getUser,
  clearAuth,
  stopTokenRefresh,
} from "@/utils/auth";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";

const DEFAULT_AVATAR = "http://localhost:8080/uploads/a.png";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  const [user, setUserState] = useState(getUser());
  const isLoggedIn = !!user;

  const isIndexPage = location.pathname === "/";

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    clearAuth();
    stopTokenRefresh();
    navigate("/login");
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "space",
      label: "用户空间",
      icon: <UserOutlined />,
      onClick: () => navigate("/userhome"),
    },
    {
      type: "divider",
    },
    ...(user?.role === "admin"
      ? [
          {
            key: "admin",
            label: "管理后台",
            icon: <UserOutlined />,
            onClick: () => navigate("/admin"),
          },
          {
            type: "divider" as const,
          },
        ]
      : []),
    {
      key: "logout",
      label: "退出登录",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  // 头像定时刷新逻辑（1分钟获取一次，fetch图片转dataURL并缓存）
  useEffect(() => {
    let timer: number | null = null;
    let lastUserId = "";
    let lastToken = "";
    let lastUrl = "";
    const CACHE_KEY = "header_avatar_dataurl";
    const CACHE_TTL = 60 * 1000; // 1分钟

    const fetchAndCacheAvatar = async () => {
      const jwt = getAccessToken();
      const currentUser = getUser();
      if (!jwt || !currentUser) {
        setAvatarUrl(DEFAULT_AVATAR);
        setUserState(null);
        localStorage.removeItem(CACHE_KEY);
        lastUrl = "";
        return;
      }
      if (String(currentUser.userId) !== lastUserId) {
        setAvatarUrl(DEFAULT_AVATAR);
        setUserState(currentUser);
        lastUserId = String(currentUser.userId);
        localStorage.removeItem(CACHE_KEY);
        lastUrl = "";
      }
      if (jwt !== lastToken) {
        setAvatarUrl(DEFAULT_AVATAR);
        lastToken = jwt;
        localStorage.removeItem(CACHE_KEY);
        lastUrl = "";
      }
      // 先查缓存
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const obj = JSON.parse(raw);
          if (obj.ts && Date.now() - obj.ts < CACHE_TTL && obj.data) {
            setAvatarUrl(obj.data);
            return;
          }
        }
      } catch {}
      // 获取url
      let url = DEFAULT_AVATAR;
      try {
        const res = await axios.get(
          "http://localhost:8080/api/v1/auth/profiles/avatar",
          {
            headers: { Authorization: `Bearer ${jwt}` },
          },
        );
        url = res.data && res.data.url ? res.data.url : DEFAULT_AVATAR;
      } catch {
        setAvatarUrl(DEFAULT_AVATAR);
        localStorage.removeItem(CACHE_KEY);
        lastUrl = "";
        return;
      }
      // url变化时强制fetch
      if (url !== lastUrl) {
        lastUrl = url;
        try {
          const resp = await fetch(url, { mode: "cors" });
          if (!resp.ok) throw new Error("fetch avatar failed");
          const blob = await resp.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          setAvatarUrl(dataUrl);
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ ts: Date.now(), data: dataUrl }),
            );
          } catch {}
        } catch {
          setAvatarUrl(DEFAULT_AVATAR);
          localStorage.removeItem(CACHE_KEY);
        }
      }
    };
    fetchAndCacheAvatar();
    timer = window.setInterval(fetchAndCacheAvatar, 60 * 1000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const headerClasses = `header ${
    isIndexPage ? "header-sticky header-index-theme" : ""
  }`;

  return (
    <div className={headerClasses}>
      <div className="index" onClick={() => handleNavigate("/")}>
        主页
      </div>

      {isLoggedIn ? (
        <Dropdown
          menu={{ items: menuItems }}
          placement="bottomRight"
          trigger={["hover"]}
        >
          <div className="avatar">
            <img src={avatarUrl} alt="avatar" />
          </div>
        </Dropdown>
      ) : (
        <div className="avatar" onClick={() => navigate("/login")}>
          <img src={avatarUrl} alt="avatar" />
        </div>
      )}
    </div>
  );
};

export default Header;
