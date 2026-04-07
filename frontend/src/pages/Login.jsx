import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import toast from "react-hot-toast";

export default function Login() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const encoded = btoa(`admin:${password}`);
      await api.get("/api/me", {
        headers: { Authorization: `Basic ${encoded}` },
      });
      login(password);
      navigate("/");
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Nieprawidłowe hasło");
      } else {
        toast.error("Błąd połączenia z serwerem");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-gray-900">Rozliczenia</h1>
          <p className="text-gray-500 text-sm mt-1">Mateusz · Jan · Wojciech</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasło dostępu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wprowadź hasło"
              autoFocus
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? "Sprawdzanie..." : "Zaloguj"}
          </button>
        </form>
      </div>
    </div>
  );
}
