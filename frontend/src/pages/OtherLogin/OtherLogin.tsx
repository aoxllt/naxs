/*
 * @Author: xel
 * @Date: 2026-02-05 15:22:29
 * @LastEditors: xel
 * @LastEditTime: 2026-02-05 18:20:29
 * @FilePath: \frontend\src\pages\OtherLogin\OtherLogin.tsx
 * @Description: OAuth第三方登录回调页面
 */
import { useEffect, useState, useRef, useMemo } from "react";
import { useLayoutEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input, Button, Spin, Avatar } from "antd";
import { Tooltip } from "antd";
import {
  UserOutlined,
  MailOutlined,
  SignatureOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  LinkOutlined,
  UserAddOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { setAccessToken, setUser, startTokenRefresh } from "@/utils/auth";
import { notify } from "@/utils/notify";
import http from "@/utils/http";
import "./OtherLogin.css";
import debounce from "lodash.debounce";

interface OAuthData {
  bindToken: string;
  avatar: string;
  email: string;
  name: string;
  provider: string;
  providerId: string;
}

type BindMode = "select" | "bindExisting" | "createNew";

const OtherLogin = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bindMode, setBindMode] = useState<BindMode>("select");
  const [oauthData, setOauthData] = useState<OAuthData | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);

  // 绑定已有账号的表单
  const [bindForm, setBindForm] = useState({
    email: "",
    password: "",
  });

  // 新建账号的表单
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // 以下为提示/校验逻辑（从 RegisterCard 迁移）
  const [usernameCheck, setUsernameCheck] = useState({
    status: "idle" as "idle" | "checking" | "available" | "taken" | "error",
    message: "",
  });
  const usernameRequestId = useRef(0);

  const [tooltipVisible, setTooltipVisible] = useState({
    username: false,
    email: false,
    confirmPassword: false,
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const checkUsername = useMemo(
    () =>
      debounce(async (username: string) => {
        const requestId = ++usernameRequestId.current;
        setUsernameCheck({ status: "checking", message: "" });
        try {
          const response = await http.get(
            `/user/checkUsername?username=${username}`,
          );
          if (requestId !== usernameRequestId.current) return;
          if (response.status === 500) {
            setUsernameCheck({
              status: "error",
              message: "服务器错误，请稍后重试",
            });
            return;
          }
          if (
            response.data?.code === 1 &&
            response.data?.message === "用户名已存在"
          ) {
            setUsernameCheck({ status: "taken", message: "用户名已被占用" });
          } else if (response.data?.code === 0) {
            setUsernameCheck({ status: "available", message: "" });
          } else {
            setUsernameCheck({ status: "error", message: "无法验证用户名" });
          }
        } catch (error) {
          if (requestId !== usernameRequestId.current) return;
          console.error("检查用户名时出错:", error);
          setUsernameCheck({ status: "error", message: "无法验证用户名" });
        }
      }, 500),
    [],
  );

  useEffect(() => {
    if (createForm.username.length >= 3) {
      checkUsername(createForm.username);
    } else {
      setUsernameCheck({ status: "idle", message: "" });
    }
  }, [createForm.username, checkUsername]);

  useEffect(() => () => checkUsername.cancel(), [checkUsername]);

  // 自动隐藏提示
  useEffect(() => {
    if (usernameCheck.status !== "idle" && usernameCheck.message) {
      setTooltipVisible((prev) => ({ ...prev, username: true }));
      const timer = setTimeout(() => {
        setTooltipVisible((prev) => ({ ...prev, username: false }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [usernameCheck.status, usernameCheck.message]);

  useEffect(() => {
    if (createForm.email.length > 0) {
      setTooltipVisible((prev) => ({ ...prev, email: true }));
      const timer = setTimeout(() => {
        setTooltipVisible((prev) => ({ ...prev, email: false }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [createForm.email]);

  useEffect(() => {
    if (
      createForm.confirmPassword &&
      createForm.password !== createForm.confirmPassword
    ) {
      setTooltipVisible((prev) => ({ ...prev, confirmPassword: true }));
      const timer = setTimeout(() => {
        setTooltipVisible((prev) => ({ ...prev, confirmPassword: false }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [createForm.password, createForm.confirmPassword]);

  // 实时验证两次密码是否一致
  useEffect(() => {
    if (
      createForm.confirmPassword &&
      createForm.password !== createForm.confirmPassword
    ) {
      // nothing else needed, tooltip handles message
    }
  }, [createForm.password, createForm.confirmPassword]);

  useLayoutEffect(() => {
    const status = params.get("status");
    const bindToken = params.get("bind_token");
    const bindRequired = params.get("bindRequired");
    const error = params.get("error");
    const accessToken = params.get("accessToken");

    if (error) {
      notify.error("第三方登录失败: " + error);
      navigate("/login");
      return;
    }

    // 打印方便调试（避免重复声明）
    console.log(
      status,
      bindToken,
      bindRequired,
      error,
      params.get("avatar"),
      params.get("email"),
      accessToken,
    );

    // 已绑定，直接用 access_token
    if (status === "success" && accessToken) {
      setAccessToken(accessToken);
      try {
        const payload = JSON.parse(atob(accessToken.split(".")[1]));
        setUser({
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
        });
        startTokenRefresh();
        notify.success("登录成功");
        setLoading(false); // 修复：跳转前关闭loading动画
        navigate("/home");
        return;
      } catch {
        notify.error("登录信息解析失败");
        setLoading(false); // 修复：跳转前关闭loading动画
        navigate("/login");
      }
      return;
    }

    // 未绑定，需要绑定账号 — 不再额外请求后端，直接使用 URL 参数 和 bind_token
    if (!(bindToken && bindRequired)) {
      notify.error("登录信息无效");
      navigate("/login");
      return;
    }

    // 从 URL 参数读取可选的用户信息，作为表单默认值（若后端未传则为空）
    const name = params.get("name") || "";
    const email = params.get("email") || "";
    const avatar = params.get("avatar") || "";
    const provider = params.get("provider") || "thirdparty";

    setOauthData({
      bindToken: bindToken,
      avatar,
      email,
      name,
      provider,
      providerId: "",
    });
    setCreateForm((prev) => ({ ...prev, email: email, username: name }));
    setLoading(false);
  }, [params, navigate]);

  // 前端缓存并加载头像，减少对第三方的直接请求导致的 429
  const getCacheKey = (url: string) => {
    try {
      return "avatar_cache_" + btoa(url).slice(0, 64);
    } catch {
      return "avatar_cache_" + encodeURIComponent(url).slice(0, 64);
    }
  };

  const fetchImageWithCache = async (
    url: string,
    cacheKey: string,
    ttl = 24 * 3600 * 1000,
  ): Promise<string | null> => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj?.ts && Date.now() - obj.ts < ttl && obj.data) return obj.data;
      }
    } catch {
      console.log("Avatar cache read error");
    }

    let attempt = 0;
    let wait = 500;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const resp = await fetch(url, { mode: "cors" });
        if (resp.status === 429) throw { code: 429 };
        if (!resp.ok) throw new Error("fetch failed");
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ ts: Date.now(), data: dataUrl }),
          );
        } catch {
          // 本地存储失败可忽略
        }
        return dataUrl;
      } catch (err) {
        // 处理 429 错误重试
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: number }).code === 429
        ) {
          await new Promise((r) => setTimeout(r, wait));
          wait *= 2;
          attempt += 1;
          continue;
        }
        break;
      }
    }
    return null;
  };

  // 当 oauthData.avatar 变化时尝试加载并缓存头像
  useEffect(() => {
    let mounted = true;
    const src = oauthData?.avatar;
    if (!src) {
      setAvatarSrc(undefined);
      return;
    }
    const key = getCacheKey(src);
    fetchImageWithCache(src, key)
      .then((dataUrl) => {
        if (!mounted) return;
        if (dataUrl) setAvatarSrc(dataUrl);
        else setAvatarSrc(src);
      })
      .catch(() => {
        if (mounted) setAvatarSrc(src);
      });
    return () => {
      mounted = false;
    };
  }, [oauthData?.avatar]);

  const handleLoginSuccess = (token: string) => {
    setAccessToken(token);
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      });
      startTokenRefresh();
      notify.success("登录成功");
      navigate("/home");
    } catch {
      notify.error("登录信息解析失败");
      navigate("/login");
    }
  };

  // 绑定已有账号
  const handleBindExisting = () => {
    if (!bindForm.email) {
      notify.error("请输入邮箱或用户名");
      return;
    }
    if (!bindForm.password) {
      notify.error("请输入密码");
      return;
    }

    setSubmitting(true);
    http
      .post("/user/bind", {
        bindToken: oauthData?.bindToken,
        username: bindForm.email,
        password: bindForm.password,
      })
      .then((res) => {
        if (res.data.code === 0) {
          notify.success("绑定成功");
          handleLoginSuccess(res.data.accessToken);
        } else {
          notify.error(res.data.message || "绑定失败");
          setSubmitting(false);
        }
      })
      .catch(() => {
        notify.error("绑定失败，请检查账号密码");
        setSubmitting(false);
      });
  };

  // 新建账号
  const handleCreateNew = () => {
    if (!createForm.username || createForm.username.length < 3) {
      notify.error("用户名长度不能少于3位");
      return;
    }
    if (!createForm.email) {
      notify.error("请输入邮箱");
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      notify.error("密码长度不能少于6位");
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      notify.error("两次密码输入不一致");
      return;
    }

    setSubmitting(true);
    http
      .post("/user/registerWithBind", {
        bindToken: oauthData?.bindToken,
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
      })
      .then((res) => {
        if (res.data.code === 0) {
          notify.success("注册成功");
          handleLoginSuccess(res.data.accessToken);
        } else {
          notify.error(res.data.message || "注册失败");
          setSubmitting(false);
        }
      })
      .catch(() => {
        notify.error("注册失败，请重试");
        setSubmitting(false);
      });
  };

  if (loading) {
    return (
      <div className="oauth-callback-loading">
        <Spin size="large" />
        <p>登录中...</p>
      </div>
    );
  }

  return (
    <div className="oauth-callback-setup">
      <div className="setup-card">
        {/* 用户信息展示 */}
        <div className="oauth-user-info">
          <Avatar
            src={avatarSrc || oauthData?.avatar}
            size={64}
            icon={<UserOutlined />}
          />
          <div className="oauth-user-detail">
            <h3>{oauthData?.name}</h3>
            <p>{oauthData?.email}</p>
          </div>
        </div>

        {/* 选择模式 */}
        {bindMode === "select" && (
          <>
            <h2>绑定账号</h2>
            <p className="setup-hint">
              该{oauthData?.provider === "google" ? "Google" : "第三方"}
              账号尚未绑定，请选择操作
            </p>
            <div className="bind-options">
              <Button
                type="default"
                icon={<LinkOutlined />}
                size="large"
                block
                onClick={() => setBindMode("bindExisting")}
              >
                绑定已有账号
              </Button>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                size="large"
                block
                onClick={() => setBindMode("createNew")}
              >
                创建新账号
              </Button>
            </div>
          </>
        )}

        {/* 绑定已有账号 */}
        {bindMode === "bindExisting" && (
          <>
            <h2>绑定已有账号</h2>
            <p className="setup-hint">输入已有账号的邮箱和密码完成绑定</p>
            <div className="form-area">
              <Input
                placeholder="邮箱或用户名"
                value={bindForm.email}
                onChange={(e) =>
                  setBindForm({ ...bindForm, email: e.target.value })
                }
                prefix={<MailOutlined style={{ color: "rgb(7, 170, 224)" }} />}
              />
              <Input.Password
                placeholder="密码"
                value={bindForm.password}
                onChange={(e) =>
                  setBindForm({ ...bindForm, password: e.target.value })
                }
                prefix={
                  <SignatureOutlined style={{ color: "rgb(7, 170, 224)" }} />
                }
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </div>
            <div className="action-buttons">
              <Button onClick={() => setBindMode("select")}>返回</Button>
              <Button
                type="primary"
                loading={submitting}
                onClick={handleBindExisting}
              >
                确认绑定
              </Button>
            </div>
          </>
        )}

        {/* 创建新账号 */}
        {bindMode === "createNew" && (
          <>
            <h2>创建新账号</h2>
            <p className="setup-hint">设置用户名和密码创建新账号</p>
            <div className="form-area">
              <Input
                placeholder="用户名（至少3位）"
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm({ ...createForm, username: e.target.value })
                }
                prefix={<UserOutlined style={{ color: "rgb(7, 170, 224)" }} />}
                status={
                  usernameCheck.status === "checking"
                    ? "validating"
                    : usernameCheck.status === "taken"
                      ? "error"
                      : usernameCheck.status === "error"
                        ? "warning"
                        : usernameCheck.status === "available"
                          ? "success"
                          : undefined
                }
                suffix={
                  <Tooltip
                    title={
                      usernameCheck.status === "checking"
                        ? "正在校验用户名..."
                        : usernameCheck.status === "available"
                          ? "用户名可用"
                          : usernameCheck.message
                    }
                    placement="top"
                    open={tooltipVisible.username}
                  >
                    <ExclamationCircleOutlined />
                  </Tooltip>
                }
              />
              <Input
                placeholder="邮箱"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                prefix={<MailOutlined style={{ color: "rgb(7, 170, 224)" }} />}
                status={
                  createForm.email.length === 0
                    ? undefined
                    : emailRegex.test(createForm.email)
                      ? "success"
                      : "error"
                }
                suffix={
                  <Tooltip
                    title={
                      createForm.email.length === 0
                        ? "请输入有效邮箱"
                        : emailRegex.test(createForm.email)
                          ? "邮箱格式正确"
                          : "邮箱格式不正确"
                    }
                    placement="top"
                    open={tooltipVisible.email}
                  >
                    <ExclamationCircleOutlined />
                  </Tooltip>
                }
              />
              <Input.Password
                placeholder="密码（至少6位）"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                prefix={
                  <SignatureOutlined style={{ color: "rgb(7, 170, 224)" }} />
                }
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
              <Input.Password
                placeholder="确认密码"
                value={createForm.confirmPassword}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    confirmPassword: e.target.value,
                  })
                }
                prefix={
                  <SignatureOutlined style={{ color: "rgb(7, 170, 224)" }} />
                }
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
                status={
                  createForm.confirmPassword &&
                  createForm.password !== createForm.confirmPassword
                    ? "error"
                    : undefined
                }
                suffix={
                  createForm.confirmPassword ? (
                    <Tooltip
                      title={
                        createForm.password !== createForm.confirmPassword
                          ? "两次输入的密码不一致"
                          : ""
                      }
                      placement="top"
                      open={tooltipVisible.confirmPassword}
                    >
                      <ExclamationCircleOutlined />
                    </Tooltip>
                  ) : undefined
                }
              />
            </div>
            <div className="action-buttons">
              <Button onClick={() => setBindMode("select")}>返回</Button>
              <Button
                type="primary"
                loading={submitting}
                onClick={handleCreateNew}
              >
                创建账号
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OtherLogin;
