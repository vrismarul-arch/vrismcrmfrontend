import React, { useState, useEffect, useContext } from "react";
import { Form, Input, Button, Card } from "antd";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import toast from "react-hot-toast";
import "../css/Login.css";
import { PresenceContext } from "../context/PresenceContext";
import logo from "../assets/vrismw.png";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { socket } = useContext(PresenceContext);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => navigate("/login", { replace: true });
  }, []);

const onFinish = async (values) => {
  try {
    setLoading(true);

    const res = await axios.post("/api/auth/login", {
      email: values.email, // ✅ FIXED
      password: values.password,
    });

    const { user, token } = res.data;

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    localStorage.setItem("token_expiry", Date.now() + 2 * 24 * 60 * 60 * 1000);

    await axios.post("/api/users/status/update", {
      userId: user._id,
      presence: "online",
    });

    socket.emit("presence_change", {
      userId: user._id,
      presence: "online",
    });

    toast.success(`Welcome ${user.name}!`);

    if (user.role === "SuperAdmin" || user.role === "Admin") {
      navigate("/taskmanage");
    } else if (user.role === "Team Leader" || user.role === "Employee") {
      navigate("/attendance");
    } else if (user.role === "Client") {
      navigate("/mycontent");
    } else {
      navigate("/eodreport");
    }

  } catch (err) {
    console.error(err.response?.data || err.message); // 🔍 debug
    toast.error(err.response?.data?.message || "Invalid credentials");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <img src={logo} alt="Vrism Logo" className="logo-img" />

        <Card className="login-card" bordered={false}>
          <h2 className="login-title">Log In</h2>
          <p className="login-subtitle">Welcome back! Please enter your details</p>

          <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
  name="email"
  label={<span style={{ color: "#fff" }}>Email</span>}
  rules={[{ required: true, message: "Please enter your email" }]}
>
  <Input placeholder="Enter email" />
</Form.Item>

<Form.Item
  name="password"
  label={<span style={{ color: "#fff" }}>Password</span>}
  rules={[{ required: true, message: "Please enter your password" }]}
>
  <Input.Password placeholder="Enter password" />
</Form.Item>


            <div className="forgot-password-wrapper">
              <a href="/forgot-password" className="forgot-password">
                Forgot password?
              </a>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                className="login-button"
                loading={loading}
              >
                {loading ? "Logging in..." : "Log in"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>

      {/* Right side image */}
      <div className="login-right"></div>
    </div>
  );
};

export default Login;
