import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      if (!location.pathname.startsWith("/login")) {
        location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function mensajeError(e: any): string {
  const data = e?.response?.data;
  if (Array.isArray(data?.detalles) && data.detalles.length) {
    return `${data.error}: ${data.detalles.join(" · ")}`;
  }
  return data?.error ?? e?.message ?? "Error inesperado";
}
