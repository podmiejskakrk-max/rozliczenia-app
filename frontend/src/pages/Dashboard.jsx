import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { przelicz } from "../api/client";
import { formatKwota, formatProcent, formatMiesiac } from "../utils/format";
import toast from "react-hot-toast";

const COLORS = { mateusz: "#6366f1", jan: "#f59e0b", wojciech: "#10b981" };

function StatCard({ label, value, sub, color = "indigo" }) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl p-5 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-sm mt-0.5 opacity-75">{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-sm">
      <p className="font-medium mb-2">{formatMiesiac(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name.charAt(0).toUpperCase() + p.name.slice(1)}</span>
          <span className="font-medium">{formatKwota(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await przelicz();
      setData(res);
    } catch (err) {
      toast.error("Błąd ładowania danych: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Brak danych</p>;

  const { podsumowanie, rozliczenia, saldo_w_czasie, ostrzezenia } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Ostrzeżenia */}
      {ostrzezenia?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-amber-800 text-sm">Ostrzeżenia</p>
              {ostrzezenia.map((w, i) => (
                <p key={i} className="text-sm text-amber-700 mt-1">{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Karty statystyk */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Wydatki nominalne"
          value={formatKwota(podsumowanie.wydatki_nominalne)}
          color="indigo"
        />
        <StatCard
          label="Po waloryzacji"
          value={formatKwota(podsumowanie.wydatki_zwaloryzowane)}
          color="indigo"
        />
        <StatCard
          label="Efekt inflacji"
          value={formatKwota(podsumowanie.efekt_inflacji_zl)}
          sub={formatProcent(podsumowanie.efekt_inflacji_procent)}
          color="amber"
        />
        <StatCard
          label="Łączne spłaty"
          value={formatKwota(podsumowanie.laczne_splaty)}
          color="green"
        />
      </div>

      {/* Aktualne rozliczenia */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Aktualne rozliczenia</h2>
        </div>
        {rozliczenia.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-500">
            Wszystkie rozliczone!
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {rozliczenia.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{r.dluznik}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="font-medium text-gray-900">{r.wierzyciel}</span>
                </div>
                <span className="text-lg font-bold text-indigo-600">{formatKwota(r.kwota)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wykres saldo w czasie */}
      {saldo_w_czasie?.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-5">Saldo w czasie</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={saldo_w_czasie} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="miesiac"
                tickFormatter={formatMiesiac}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => formatKwota(v, false)}
                tick={{ fontSize: 11 }}
                width={85}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              />
              <Line type="monotone" dataKey="mateusz" name="mateusz" stroke={COLORS.mateusz} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="jan" name="jan" stroke={COLORS.jan} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="wojciech" name="wojciech" stroke={COLORS.wojciech} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
