import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../components/Modal";
import { getWydatki, createWydatek, updateWydatek, deleteWydatek, eksportXlsx, eksportCsv, importXlsx } from "../api/client";
import { formatKwota, formatData, toInputDate } from "../utils/format";

const OSOBY = ["Mateusz", "Jan", "Wojciech"];
const EMPTY_FORM = {
  data: "",
  opis: "",
  fundator: "Mateusz",
  udzial_mateusz: "",
  udzial_jan: "",
  udzial_wojciech: "",
};

function downloadBlob(response, filename) {
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Wydatki() {
  const [wydatki, setWydatki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const load = async () => {
    try {
      setWydatki(await getWydatki());
    } catch {
      toast.error("Błąd ładowania wydatków");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, data: today });
    setModalOpen(true);
  };

  const openEdit = (w) => {
    setEditItem(w);
    setForm({
      data: toInputDate(w.data),
      opis: w.opis,
      fundator: w.fundator,
      udzial_mateusz: w.udzial_mateusz ?? "",
      udzial_jan: w.udzial_jan ?? "",
      udzial_wojciech: w.udzial_wojciech ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      udzial_mateusz: parseFloat(form.udzial_mateusz) || 0,
      udzial_jan: parseFloat(form.udzial_jan) || 0,
      udzial_wojciech: parseFloat(form.udzial_wojciech) || 0,
    };
    try {
      if (editItem) {
        await updateWydatek(editItem.id, payload);
        toast.success("Zaktualizowano wydatek");
      } else {
        await createWydatek(payload);
        toast.success("Dodano wydatek");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      const msg = err.response?.data?.detail;
      const detail = Array.isArray(msg) ? msg[0]?.msg : msg;
      toast.error(detail || "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWydatek(id);
      toast.success("Usunięto wydatek");
      setDeleteConfirm(null);
      await load();
    } catch {
      toast.error("Błąd usuwania");
    }
  };

  const handleExportXlsx = async () => {
    try {
      const res = await eksportXlsx();
      downloadBlob(res, "rozliczenia.xlsx");
    } catch { toast.error("Błąd eksportu"); }
  };

  const handleExportCsv = async () => {
    try {
      const res = await eksportCsv();
      downloadBlob(res, "rozliczenia.csv");
    } catch { toast.error("Błąd eksportu"); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await importXlsx(fd);
      toast.success(res.message);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd importu");
    }
    e.target.value = "";
  };

  const isRowWarning = (w) => {
    if (!w.data) return false;
    return new Date(w.data) > new Date();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Wydatki</h1>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import XLSX
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={handleExportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
            Eksport CSV
          </button>
          <button onClick={handleExportXlsx} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
            Eksport XLSX
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dodaj wydatek
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Opis</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Fundator</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Mateusz</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Jan</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Wojciech</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Razem</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {wydatki.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  Brak wydatków. Kliknij "Dodaj wydatek".
                </td>
              </tr>
            ) : wydatki.map((w) => (
              <tr
                key={w.id}
                className={`hover:bg-gray-50 ${isRowWarning(w) ? "bg-amber-50" : ""}`}
              >
                <td className="px-4 py-3 text-gray-400">{w.id}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatData(w.data)}</td>
                <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{w.opis}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {w.fundator}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatKwota(w.udzial_mateusz)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatKwota(w.udzial_jan)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatKwota(w.udzial_wojciech)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatKwota(w.razem)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(w)}
                      className="text-indigo-600 hover:text-indigo-800 p-1 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(w)}
                      className="text-red-500 hover:text-red-700 p-1 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal dodaj/edytuj */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? "Edytuj wydatek" : "Dodaj wydatek"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fundator *</label>
              <select
                value={form.fundator}
                onChange={(e) => setForm({ ...form, fundator: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {OSOBY.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opis *</label>
            <input
              type="text"
              value={form.opis}
              onChange={(e) => setForm({ ...form, opis: e.target.value })}
              required
              placeholder="np. Czynsz, zakupy, remont..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Udziały (zł)</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["udzial_mateusz", "Mateusz"],
                ["udzial_jan", "Jan"],
                ["udzial_wojciech", "Wojciech"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Razem:{" "}
              <strong>
                {formatKwota(
                  (parseFloat(form.udzial_mateusz) || 0) +
                  (parseFloat(form.udzial_jan) || 0) +
                  (parseFloat(form.udzial_wojciech) || 0)
                )}
              </strong>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors"
            >
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Potwierdzenie usunięcia */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Potwierdź usunięcie"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Czy na pewno chcesz usunąć wydatek <strong>"{deleteConfirm?.opis}"</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            Anuluj
          </button>
          <button
            onClick={() => handleDelete(deleteConfirm.id)}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Usuń
          </button>
        </div>
      </Modal>
    </div>
  );
}
