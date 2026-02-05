import { useState } from "react";
import LoginCard from "@/components/LoginCard/LoginCard";
import Header from "@/components/Header/Header";
import Bulletin from "@/components/Bulletin/Bulletin";
import RegisterCard from "@/components/RegisterCard/RegisterCard"
import "@/pages/Login/Login.css"

const Login = () => {
    const [mode, setMode] = useState<"login" | "register">("login");

return (
  <div className="login-page">
    <div className="nav">
      <Header />
    </div>

    <div className="mainsection">
      <div className="bulletin">
        <Bulletin />
      </div>

      <div className="login-card">
        {mode === "login" ? (
          <LoginCard onSwitch={() => setMode("register")} />
        ) : (
          <RegisterCard onSwitch={() => setMode("login")} />
        )}
      </div>
    </div>
  </div>
);

};
export default Login;
