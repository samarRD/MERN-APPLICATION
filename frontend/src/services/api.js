import axios from "axios";

const api = axios.create({
  //baseURL: "http://localhost:5000/api",
  baseURL: "https://mern-application-1-ajm7.onrender.com/api",
});

api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem("userInfo");
  if (userInfo) {
    const parsed = JSON.parse(userInfo);
    const token = parsed.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
