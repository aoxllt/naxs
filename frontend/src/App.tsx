import { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./app/routes";
import { notification } from "antd";
import { initNotify } from "./utils/notify";
import { startTokenRefresh, stopTokenRefresh, isLoggedIn } from "./utils/auth";

function App() {
  const [api, contextHolder] = notification.useNotification();

  initNotify(api);

  // 启动定时刷新 Token
  useEffect(() => {
    if (isLoggedIn()) {
      startTokenRefresh();
    }
    return () => stopTokenRefresh();
  }, []);

  return (
    <Router>
      {contextHolder}
      <AppRoutes />
    </Router>
  );
}

export default App;
