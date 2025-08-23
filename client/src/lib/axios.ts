import axios, { AxiosError, AxiosRequestConfig } from "axios";

// --- 🔐 Track refresh state and subscribers ---
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// --- ✅ Extend Axios config to allow _retry flag ---
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// --- 🚀 Create Axios instance ---
const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});

// --- 📦 Attach access token to every request ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers = config.headers || {}; // 🛡 Ensure headers exist
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// --- 🔁 Handle token expiration and refresh ---
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalReq = error.config as CustomAxiosRequestConfig;

    if (error.response?.status === 403 && !originalReq._retry) {
      if (isRefreshing) {
        // 🕐 Refresh in progress – queue this request
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalReq.headers = originalReq.headers || {}; // 🛡 Ensure headers exist
            originalReq.headers["Authorization"] = `Bearer ${newToken}`;
            resolve(api(originalReq)); // ✅ Retry original request
          });
        });
      }

      // 🆕 Start token refresh
      originalReq._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.get("/api/auth/refresh");

        const newAccessToken = data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);
        api.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;

        // 🔔 Notify all queued requests
        onRefreshed(newAccessToken);

        // 🔁 Retry original failed request
        originalReq.headers = originalReq.headers || {};
        originalReq.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalReq);
      } catch (refreshError) {
        // ❌ Refresh failed – log out
        localStorage.removeItem("accessToken");
        window.location.href = "/auth";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
