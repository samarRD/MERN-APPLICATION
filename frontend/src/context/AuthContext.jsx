import { createContext, useContext, useState } from "react";
import axios from "axios";

// ✅ export ajouté
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("userInfo")) || null,
  );

  const register = async (name, email, password, role) => {
    const { data } = await axios.post(
      "http://localhost:5000/api/auth/register",
      { name, email, password, role },
    );
    localStorage.setItem("userInfo", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await axios.post("http://localhost:5000/api/auth/login", {
      email,
      password,
    });
    localStorage.setItem("userInfo", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Hook useAuth exporté
export const useAuth = () => useContext(AuthContext);
