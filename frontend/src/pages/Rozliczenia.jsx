import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { przelicz } from "../api/client";
import { formatKwota, formatData } from "../utils/format";

export default function Rozliczenia() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    try {
      setData(await przelicz());
    } catch (err) {
      toast.error("Błąd ładowania rozliczeń: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!data) return <p className="text-gray-500">Brak danych</p>;

  const { rozliczenia, historia_przelewow, podsumowanie, ostrzezenia } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rozliczenia</h1>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Odśwież
        </button>
      </div>

      {ostrzezenia?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          {ostrzezenia.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      )}

      {/* Podsumowanie */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Nominalne", podsumowanie.wydatki_nominalne],
          ["Zwaloryzowane", podsumowanie.wydatki_zwaloryzowane],
          ["Efekt inflacji (zł)", podsumowanie.efekt_inflacji_zl],
          ["Efekt inflacji (%)", null],
          ["Łączne spłaty", podsumowanie.laczne_splaty],
        ].map(([label, val], i) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <p className="text-base font-bold text-gray-900">
              {i === 3
                ? `${parseFloat(podsumowanie.efekt_inflacji_procent || 0).toFixed(2).replace(".", ",")} %`
                : formatKwota(val)}
            </p>
          </div>
        ))}
      </div>

      {/* Wynik nettowany */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Wynik po netowaniu</h2>
          <p className="text-xs text-gray-500 mt-0.5">Uwzględnia waloryzację inflacyjną i wszystkie spłaty</p>
        </div>
        {rozliczenia.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500 font-medium">Wszyscy rozliczeni!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rozliczenia.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">
                    {r.dluznik[0]}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{r.dluznik}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="font-medium text-gray-900">{r.wierzyciel}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600">{formatKwota(r.kwota)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historia przelewów */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historia spłat</h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showHistory ? "Ukryj" : `Pokaż (${historia_przelewow.length})`}
          </button>
        </div>

        {showHistory && (
          historia_przelewow.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-400">Brak historii spłat</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Kto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Komu</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Kwota spłaty</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Pokryta kwota</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Pozostały dług</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historia_przelewow.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatData(h.data_splaty)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{h.kto}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{h.komu}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKwota(h.kwota_splaty)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-indigo-600 font-medium">{formatKwota(h.kwota_pokryta)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">{formatKwota(h.pozostaly_dług)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
