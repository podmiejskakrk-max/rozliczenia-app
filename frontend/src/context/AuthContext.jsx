import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("auth"));

  const login = (password) => {
    const encoded = btoa(`admin:${password}`);
    localStorage.setItem("auth", encoded);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
