/*
 * @Author: xel
 * @Date: 2026-02-02 05:57:39
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 15:33:40
 * @FilePath: \frontend\src\components\RegisterCard\RegisterCard.tsx
 * @Description:
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { Button, Input, Tooltip } from "antd";
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  UserOutlined,
  SignatureOutlined,
  MailOutlined,
  MessageOutlined,
  GiftOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import "./RegisterCard.css";
import { notify } from "@/utils/notify";
import axios from "axios";
import debounce from "lodash.debounce";

type Props = {
  onSwitch: () => void;
};

const RegisterCard = ({ onSwitch }: Props) => {
  const [dataFrame, setDataFrame] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    captcha: "",
    inviteCode: "",
  });

  const [errors, setErrors] = useState({
    confirmPassword: "",
    email: "",
  });

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

  const [captchaButton, setCaptchaButton] = useState({
    disabled: false,
    text: "发送验证码",
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 实时验证用户名是否可用
  const checkUsername = useMemo(
    () =>
      debounce(async (username: string) => {
        const requestId = ++usernameRequestId.current;
        setUsernameCheck({ status: "checking", message: "" });
        try {
          const response = await axios.get(
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
            response.data["code"] === 1 &&
            response.data["message"] === "用户名已存在"
          ) {
            setUsernameCheck({ status: "taken", message: "用户名已被占用" });
          } else if (response.data["code"] === 0) {
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
    if (dataFrame.username.length >= 3) {
      checkUsername(dataFrame.username);
    } else {
      setUsernameCheck({ status: "idle", message: "" });
    }
  }, [dataFrame.username, checkUsername]);

  useEffect(() => () => checkUsername.cancel(), [checkUsername]);

  // 自动隐藏用户名提示
  useEffect(() => {
    if (usernameCheck.status !== "idle" && usernameCheck.message) {
      setTooltipVisible((prev) => ({ ...prev, username: true }));
      const timer = setTimeout(() => {
        setTooltipVisible((prev) => ({ ...prev, username: false }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [usernameCheck.status, usernameCheck.message]);

  // 自动隐藏邮箱提示
  useEffect(() => {
    if (dataFrame.email.length > 0) {
      setTooltipVisible((prev) => ({ ...prev, email: true }));
      const timer = setTimeout(() => {
        setTooltipVisible((prev) => ({ ...prev, email: false }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [dataFrame.email]);

  // 自动隐藏确认密码提示
  useEffect(() => {
    if (errors.confirmPassword) {
      setTooltipVisible((prev) => ({ ...prev, confirmPassword: true }));
      const timer = setTimeout(() => {
        setTooltipVisible((prev) => ({ ...prev, confirmPassword: false }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [errors.confirmPassword]);

  // 实时验证两次密码是否一致
  useEffect(() => {
    if (
      dataFrame.confirmPassword &&
      dataFrame.password !== dataFrame.confirmPassword
    ) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "两次输入的密码不一致",
      }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  }, [dataFrame.password, dataFrame.confirmPassword]);

  const handleSendCaptcha = () => {
    if (!emailRegex.test(dataFrame.email)) {
      notify.error("请输入有效的邮箱地址");
      return;
    }
    axios
      .post("/user/send", { email: dataFrame.email })
      .then((res) => {
        if (res.data["code"] !== 0) {
          notify.error(res.data["message"] || "验证码发送失败，请稍后重试");
          return;
        }
        notify.success("验证码已发送至您的邮箱");
      })
      .catch(() => {
        notify.error("验证码发送失败，请稍后重试");
      });
    //console.log("向邮箱发送验证码：", dataFrame.email);

    setCaptchaButton({ disabled: true, text: "60s" });
    let seconds = 60;
    const interval = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(interval);
        setCaptchaButton({ disabled: false, text: "发送验证码" });
      } else {
        setCaptchaButton({ disabled: true, text: `${seconds}s` });
      }
    }, 1000);
  };

  const preHandleRegisterData = () => {
    if (
      !dataFrame.username ||
      !dataFrame.password ||
      !dataFrame.confirmPassword ||
      !dataFrame.email ||
      !dataFrame.captcha
    ) {
      notify.error("请填写所有必填项");
      return false;
    }
    if (usernameCheck.status === "checking") {
      notify.error("用户名正在校验，请稍后");
      return false;
    }
    if (usernameCheck.status === "taken") {
      notify.error("用户名已被占用");
      return false;
    }
    if (usernameCheck.status === "error") {
      notify.error("无法验证用户名，请稍后重试");
      return false;
    }
    if (errors.confirmPassword) {
      notify.error("请修正表单中的错误");
      return false;
    }
    return true;
  };

  const handleRegister = () => {
    if (!preHandleRegisterData()) return;
    axios
      .post("/user/register", {
        username: dataFrame.username,
        password: dataFrame.password,
        email: dataFrame.email,
        captcha: dataFrame.captcha,
        inviteCode: dataFrame.inviteCode,
      })
      .then((res) => {
        if (res.data["code"] === 0) {
          notify.success("注册成功！请登录。");
          onSwitch();
        } else {
          notify.error(res.data["message"] || "注册失败，请稍后重试");
        }
      })
      .catch(() => {
        notify.error("注册失败，请稍后重试");
      });
    //console.log("注册信息：", dataFrame);
  };

  const usernameHelpText =
    usernameCheck.status === "checking"
      ? "正在校验用户名..."
      : usernameCheck.status === "available"
        ? "用户名可用"
        : usernameCheck.status === "idle"
          ? "请输入至少3位用户名"
          : usernameCheck.message;

  const confirmPasswordHelpText = errors.confirmPassword || "";
  const emailHelpText =
    dataFrame.email.length === 0
      ? "请输入有效邮箱"
      : emailRegex.test(dataFrame.email)
        ? "邮箱格式正确"
        : "邮箱格式不正确";

  return (
    <div className="RegisterCard">
      <h2>注册</h2>
      <div className="form-area">
        <Input
          placeholder="用户名 (不少于3位)"
          value={dataFrame.username}
          onChange={(e) =>
            setDataFrame({ ...dataFrame, username: e.target.value })
          }
          prefix={<UserOutlined className="prefix-icon" />}
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
              title={usernameHelpText}
              placement="top"
              open={tooltipVisible.username}
            >
              <ExclamationCircleOutlined />
            </Tooltip>
          }
        />
        <Input
          placeholder="邮箱"
          value={dataFrame.email}
          onChange={(e) =>
            setDataFrame({ ...dataFrame, email: e.target.value })
          }
          prefix={<MailOutlined className="prefix-icon" />}
          status={
            dataFrame.email.length === 0
              ? undefined
              : emailRegex.test(dataFrame.email)
                ? "success"
                : "error"
          }
          suffix={
            <Tooltip
              title={emailHelpText}
              placement="top"
              open={tooltipVisible.email}
            >
              <ExclamationCircleOutlined />
            </Tooltip>
          }
        />
        <Input.Group compact className="captcha-group">
          <Input
            className="captcha-input"
            placeholder="验证码"
            value={dataFrame.captcha}
            onChange={(e) =>
              setDataFrame({ ...dataFrame, captcha: e.target.value })
            }
            prefix={<MessageOutlined className="prefix-icon" />}
          />
          <Button
            type="primary"
            onClick={handleSendCaptcha}
            disabled={captchaButton.disabled}
            className="cbutton"
          >
            {captchaButton.text}
          </Button>
        </Input.Group>
        <Input.Password
          placeholder="设置你的密码 (不少于6位)"
          value={dataFrame.password}
          onChange={(e) =>
            setDataFrame({ ...dataFrame, password: e.target.value })
          }
          prefix={<SignatureOutlined className="prefix-icon" />}
          iconRender={(visible) =>
            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
          }
        />
        <Input.Password
          placeholder="再次输入你的密码"
          value={dataFrame.confirmPassword}
          onChange={(e) =>
            setDataFrame({ ...dataFrame, confirmPassword: e.target.value })
          }
          prefix={<SignatureOutlined className="prefix-icon" />}
          iconRender={(visible) =>
            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
          }
          status={errors.confirmPassword ? "error" : undefined}
          suffix={
            confirmPasswordHelpText ? (
              <Tooltip
                title={confirmPasswordHelpText}
                placement="top"
                open={tooltipVisible.confirmPassword}
              >
                <ExclamationCircleOutlined />
              </Tooltip>
            ) : undefined
          }
        />
        <Input
          placeholder="邀请码 (可选)"
          value={dataFrame.inviteCode}
          onChange={(e) =>
            setDataFrame({ ...dataFrame, inviteCode: e.target.value })
          }
          prefix={<GiftOutlined className="prefix-icon" />}
        />
      </div>
      <div className="action-area">
        <Button
          type="primary"
          autoInsertSpace
          onClick={handleRegister}
          className="rbutton"
        >
          注册
        </Button>
      </div>

      <div className="login">
        <p>
          已有账号？
          <span onClick={onSwitch}>去登录</span>
        </p>
      </div>
    </div>
  );
};

export default RegisterCard;
