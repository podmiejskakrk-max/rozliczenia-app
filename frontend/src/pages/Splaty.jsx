import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../components/Modal";
import { getSplaty, createSplata, updateSplata, deleteSplata } from "../api/client";
import { formatKwota, formatData, toInputDate } from "../utils/format";

const OSOBY = ["Mateusz", "Jan", "Wojciech"];
const EMPTY_FORM = { data: "", kto: "Mateusz", kwota: "" };

export default function Splaty() {
  const [splaty, setSplaty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const load = async () => {
    try {
      setSplaty(await getSplaty());
    } catch {
      toast.error("Błąd ładowania spłat");
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

  const openEdit = (s) => {
    setEditItem(s);
    setForm({ data: toInputDate(s.data), kto: s.kto, kwota: s.kwota });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, kwota: parseFloat(form.kwota) };
    try {
      if (editItem) {
        await updateSplata(editItem.id, payload);
        toast.success("Zaktualizowano spłatę");
      } else {
        await createSplata(payload);
        toast.success("Dodano spłatę");
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
      await deleteSplata(id);
      toast.success("Usunięto spłatę");
      setDeleteConfirm(null);
      await load();
    } catch {
      toast.error("Błąd usuwania");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Spłaty</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Dodaj spłatę
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Kto zapłacił</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Kwota</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {splaty.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Brak spłat.
                </td>
              </tr>
            ) : splaty.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{s.id}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatData(s.data)}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {s.kto}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-green-600">
                  {formatKwota(s.kwota)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(s)} className="text-indigo-600 hover:text-indigo-800 p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => setDeleteConfirm(s)} className="text-red-500 hover:text-red-700 p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {splaty.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-700">Łącznie</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-green-700">
                  {formatKwota(splaty.reduce((s, r) => s + parseFloat(r.kwota || 0), 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? "Edytuj spłatę" : "Dodaj spłatę"}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Kto zapłacił *</label>
            <select
              value={form.kto}
              onChange={(e) => setForm({ ...form, kto: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {OSOBY.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kwota (zł) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.kwota}
              onChange={(e) => setForm({ ...form, kwota: e.target.value })}
              required
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
              Anuluj
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg">
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Potwierdzenie usunięcia */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Potwierdź usunięcie" size="sm">
        <p className="text-gray-600 mb-4">Usunąć spłatę {deleteConfirm?.kto} z {formatData(deleteConfirm?.data)} na kwotę <strong>{formatKwota(deleteConfirm?.kwota)}</strong>?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Anuluj</button>
          <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Usuń</button>
        </div>
      </Modal>
    </div>
  );
}
