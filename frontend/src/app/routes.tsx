import { Routes, Route } from "react-router-dom";
import Login from "@/pages/Login/Login";
import Home from "@/pages/Home/Home";
import Index from "@/pages/Index/Index";
import Notices from "@/pages/Notices/Notices";
import UserHome from "@/pages/UserHome/UserHome";
import OtherLogin from "@/pages/OtherLogin/OtherLogin";
import AuthRoute from "./auth";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/oauth/callback" element={<OtherLogin />} />
      <Route path="/notices" element={<Notices />} />
      <Route element={<AuthRoute />}>
        <Route path="/home" element={<Home />} />

        <Route path="/userhome" element={<UserHome />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
