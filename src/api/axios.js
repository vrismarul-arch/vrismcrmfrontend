import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:1001",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // ✅ important if using cookies later
});

// ✅ Attach token automatically
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle global errors (PRO FEATURE)
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API ERROR:", error.response?.data || error.message);

    // 🔥 Auto logout if token expired
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // optional redirect
      // window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default instance;