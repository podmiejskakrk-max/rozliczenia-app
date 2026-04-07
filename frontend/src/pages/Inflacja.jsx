import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getInflacja, upsertInflacja, odswiezInflacje } from "../api/client";

const MONTHS_PL = ["", "Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

function formatUpdated(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Inflacja() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const load = async () => {
    try {
      setRecords(await getInflacja());
    } catch {
      toast.error("Błąd ładowania danych inflacji");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOdswierz = async () => {
    setRefreshing(true);
    try {
      const res = await odswiezInflacje();
      toast.success(res.message || "Pobrano dane inflacji");
      if (res.details?.nowe_miesiace?.length > 0) {
        toast.success(`Nowe miesiące: ${res.details.nowe_miesiace.join(", ")}`, { duration: 6000 });
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd pobierania danych z GUS");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveEdit = async (record) => {
    const val = parseFloat(editValue.replace(",", "."));
    if (isNaN(val)) {
      toast.error("Podaj prawidłową wartość procentową");
      return;
    }
    try {
      await upsertInflacja({
        rok: record.rok,
        miesiac: record.miesiac,
        wartosc_procent: val,
        zrodlo: "manual",
      });
      toast.success(`Zapisano inflację ${MONTHS_PL[record.miesiac]} ${record.rok}`);
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd zapisu");
    }
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rok = parseInt(fd.get("rok"));
    const miesiac = parseInt(fd.get("miesiac"));
    const wartosc = parseFloat(fd.get("wartosc").replace(",", "."));

    if (!rok || !miesiac || isNaN(wartosc)) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    try {
      await upsertInflacja({ rok, miesiac, wartosc_procent: wartosc, zrodlo: "manual" });
      toast.success("Zapisano");
      e.target.reset();
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd zapisu");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>
  );

  const lastUpdated = records.length > 0
    ? records.reduce((a, b) => (a.updated_at > b.updated_at ? a : b)).updated_at
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inflacja CPI m/m</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-0.5">
              Ostatnia aktualizacja: {formatUpdated(lastUpdated)}
            </p>
          )}
        </div>
        <button
          onClick={handleOdswierz}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? "Pobieranie..." : "Odśwież z GUS"}
        </button>
      </div>

      {/* Ręczne dodawanie */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Dodaj/edytuj ręcznie</h2>
        <form onSubmit={handleAddManual} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rok</label>
            <input
              type="number"
              name="rok"
              min="2000"
              max="2100"
              defaultValue={new Date().getFullYear()}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Miesiąc</label>
            <select
              name="miesiac"
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTHS_PL.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CPI m/m (%)</label>
            <input
              type="text"
              name="wartosc"
              placeholder="np. 0.5 lub -0.2"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Zapisz
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Wartość CPI m/m = zmiana cen względem poprzedniego miesiąca (np. 0.5 = +0,5%).
          Ręczne wpisy nie są nadpisywane przez automatyczne pobieranie.
        </p>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Rok</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Miesiąc</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">CPI m/m (%)</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Źródło</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Zaktualizowano</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Brak danych. Kliknij "Odśwież z GUS" lub dodaj ręcznie.
                </td>
              </tr>
            ) : records.map((r) => (
              <tr key={r.id} className={`hover:bg-gray-50 ${r.wartosc_procent === null ? "bg-amber-50" : ""}`}>
                <td className="px-4 py-3 font-medium">{r.rok}</td>
                <td className="px-4 py-3">{MONTHS_PL[r.miesiac]} ({String(r.miesiac).padStart(2, "0")})</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {editingId === r.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(r);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="w-24 px-2 py-1 border border-indigo-400 rounded text-right text-sm focus:outline-none"
                    />
                  ) : (
                    <span className={r.wartosc_procent === null ? "text-amber-600 italic" : ""}>
                      {r.wartosc_procent !== null
                        ? `${parseFloat(r.wartosc_procent).toFixed(3).replace(".", ",")} %`
                        : "brak danych"
                      }
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.zrodlo === "auto" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {r.zrodlo === "auto" ? "GUS" : "ręcznie"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatUpdated(r.updated_at)}</td>
                <td className="px-4 py-3 text-center">
                  {editingId === r.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleSaveEdit(r)} className="text-green-600 hover:text-green-800 text-xs font-medium">Zapisz</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Anuluj</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(r.id);
                        setEditValue(r.wartosc_procent !== null ? String(r.wartosc_procent).replace(".", ",") : "");
                      }}
                      className="text-indigo-600 hover:text-indigo-800 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
