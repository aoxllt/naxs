/*
 * @Author: xel
 * @Date: 2026-02-05 10:40:25
 * @LastEditors: xel
 * @LastEditTime: 2026-02-05 10:40:32
 * @FilePath: \frontend\src\app\auth.tsx
 * @Description:
 */

import { getUser } from "@/utils/auth";
import { Navigate, Outlet } from "react-router-dom";

const isLogin = () => {
  const user = getUser();
  return !!user;
};

export default function AuthRoute() {
  if (!isLogin()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
