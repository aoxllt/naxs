/*
 * @Author: xel
 * @Date: 2026-02-02 05:57:39
 * @LastEditors: xel
 * @LastEditTime: 2026-02-05 14:16:57
 * @FilePath: \frontend\src\components\LoginCard\LoginCard.tsx
 * @Description:
 */
import { Input, Button } from "antd";
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  UserOutlined,
  SignatureOutlined,
} from "@ant-design/icons";
import "./LoginCard.css";
import googleIcon from "@/assets/icons/google.svg";
import { notify } from "@/utils/notify";
import { useState } from "react";
import http from "@/utils/http";
import {
  getUser,
  setAccessToken,
  setUser,
  startTokenRefresh,
} from "@/utils/auth";
import { useNavigate } from "react-router-dom";

type Props = {
  onSwitch: () => void;
};

const LoginCard = ({ onSwitch }: Props) => {
  const navigate = useNavigate();
  const [dataFrame, setdataFrame] = useState({
    username: "",
    password: "",
  });

  const preHandleLoginData = () => {
    if (dataFrame.username === "" || dataFrame.password === "") {
      notify.error("用户名或密码不能为空");
      return false;
    }
    if (dataFrame.username.length < 3) {
      notify.error("用户名长度不能少于3位");
      return false;
    }

    if (dataFrame.password.length < 6) {
      notify.error("密码长度不能少于6位");
      return false;
    }
    return true;
  };

  const handleGoogleLogin = () => {
    http
      .get("/user/google/url")
      .then((res) => {
        console.log(res);
        if (res.data.code === 0 && res.data.url) {
          window.location.href = res.data.url;
        } else {
          notify.error(res.data.message || "获取Google登录链接失败");
        }
      })
      .catch(() => {
        notify.error("Google登录服务暂不可用");
      });
  };

  const handleLogin = () => {
    if (!preHandleLoginData()) return;
    http
      .post("/user/login", dataFrame)
      .then((res) => {
        if (res.data.code === 0) {
          const accessToken = res.data.data.accessToken;
          setAccessToken(accessToken);
          // 解码 JWT 获取用户信息
          const payload = JSON.parse(atob(accessToken.split(".")[1]));
          setUser({
            userId: payload.userId,
            username: payload.username,
            role: payload.role,
          });
          // 启动定时刷新 Token
          startTokenRefresh();
          console.log(getUser());
          notify.success("登录成功");
          navigate("/home");
        } else {
          notify.error(res.data.message || "登录失败");
        }
      })
      .catch(() => {
        notify.error("登录失败，请检查用户名和密码");
      });
  };

  return (
    <div className="LoginCard">
      <h2>登录</h2>
      <div className="form-area">
        <Input
          placeholder="输入你的用户名或邮箱"
          value={dataFrame.username}
          onChange={(e) =>
            setdataFrame({ ...dataFrame, username: e.target.value })
          }
          prefix={<UserOutlined style={{ color: "rgb(7, 170, 224)" }} />}
        />
        <Input.Password
          placeholder="输入你的密码"
          value={dataFrame.password}
          onChange={(e) =>
            setdataFrame({ ...dataFrame, password: e.target.value })
          }
          prefix={<SignatureOutlined style={{ color: "rgb(7, 170, 224)" }} />}
          iconRender={(visible) =>
            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
          }
        />
      </div>
      <div className="action-area">
        <Button type="primary" autoInsertSpace onClick={handleLogin}>
          登录
        </Button>
      </div>
      <div className="register">
        <p>
          没有账号？
          <span onClick={onSwitch}>注册</span>
        </p>
      </div>

      <div className="otherlogin">
        <p>第三方登录</p>
        <div className="otherlogin-icons">
          <img src={googleIcon} alt="google" onClick={handleGoogleLogin} />
        </div>
      </div>
    </div>
  );
};

export default LoginCard;
