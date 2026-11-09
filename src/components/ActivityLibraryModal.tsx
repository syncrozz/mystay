import React, { useState } from 'react';
import { X, Plus, Trash2, Edit3, ArrowUp, ArrowDown, Sparkles, Check, Bookmark, AlertCircle, HelpCircle } from 'lucide-react';
import { useStay } from '../context/StayContext';
import { ActivityLibraryItem } from '../types';
import { DEFAULT_ACTIVITY_LIBRARY_SEEDS } from '../utils/constants';

interface ActivityLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLibraryModal: React.FC<ActivityLibraryModalProps> = ({ isOpen, onClose }) => {
  const {
    activityLibraryItems,
    addActivityLibraryItem,
    updateActivityLibraryItem,
    deleteActivityLibraryItem,
    reorderActivityLibraryItems,
    seedDefaultActivityLibrary
  } = useStay();

  const [newName, setNewName] = useState('');
  const [editingItem, setEditingItem] = useState<ActivityLibraryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<ActivityLibraryItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      await addActivityLibraryItem({
        name: newName.trim(),
        emoji: '📌',
        sortOrder: activityLibraryItems.length + 1
      });
      setNewName('');
      showToast(`Aktiviti "${newName.trim()}" berjaya ditambah ke Aktiviti Kebiasaan!`);
    } catch (err) {
      console.error('Failed adding activity library item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (item: ActivityLibraryItem) => {
    setEditingItem(item);
    setEditName(item.name);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) return;

    try {
      await updateActivityLibraryItem(editingItem.id, {
        name: editName.trim()
      });
      setEditingItem(null);
      showToast('Perubahan berjaya disimpan.');
    } catch (err) {
      console.error('Failed saving edit:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteActivityLibraryItem(itemToDelete.id);
      showToast(`"${itemToDelete.name}" telah dipadam daripada Pautan Pantas.`);
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed deleting item:', err);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activityLibraryItems.length) return;

    const reordered = [...activityLibraryItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    reorderActivityLibraryItems(reordered);
  };

  const handleLoadDefaults = async () => {
    try {
      await seedDefaultActivityLibrary();
      showToast('10 cadangan lazim telah dimuatkan ke Aktiviti Kebiasaan anda!');
    } catch (err) {
      console.error('Failed loading defaults:', err);
    }
  };

  return (
    <div
      id="activity-library-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="activity-library-modal-container"
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-teal-50/60 to-slate-50">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-100/70 text-teal-950 text-[11px] font-bold">
              <Bookmark className="w-3 h-3 text-teal-700" />
              <span>Koleksi Peribadi</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Aktiviti Kebiasaan (Pautan Pantas)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Senarai aktiviti yang sering anda lakukan. Boleh diguna semula untuk mana-mana perjalanan tanpa perlu menaip berulang kali.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick Toast feedback */}
          {toastMessage && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs font-bold text-teal-900 flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Form: Add New Reusable Activity */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 text-teal-600" />
              <span>Tambah Aktiviti Kebiasaan Baharu</span>
            </h3>

            <form onSubmit={handleAddNew} className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama aktiviti kebiasaan (Cth: Makan Nasi Dagang / Singgah Rumah Ayah)..."
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!newName.trim() || isSubmitting}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
              >
                + Tambah
              </button>
            </form>
          </div>

          {/* List of Saved Activities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Senarai Aktiviti Anda ({activityLibraryItems.length})</span>
              </h3>
              {activityLibraryItems.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadDefaults}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Muat Cadangan Lazim Malaysia</span>
                </button>
              )}
            </div>

            {activityLibraryItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    Belum ada aktiviti kebiasaan.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Tambahkan aktiviti yang sering anda lakukan supaya mudah digunakan untuk perjalanan akan datang.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDefaults}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Muat 10 Cadangan Lazim</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/90 rounded-2xl overflow-hidden bg-white">
                {activityLibraryItems.map((item, index) => {
                  const isBeingEdited = editingItem?.id === item.id;

                  if (isBeingEdited) {
                    return (
                      <div key={item.id} className="p-3 bg-teal-50/60 flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-teal-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Nama aktiviti..."
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="px-2.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 ml-1" />
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Reorder Buttons */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Gerak ke atas"
                          aria-label="Gerak ke atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === activityLibraryItems.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Gerak ke bawah"
                          aria-label="Gerak ke bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          title="Sunting nama"
                          aria-label="Sunting"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Padam aktiviti kebiasaan"
                          aria-label="Padam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Aktiviti disimpan kekal dan diselaras ke semua peranti anda.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Deletion (Per Section 6 Requirement) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-sm font-black text-slate-900">
                Padam Aktiviti Kebiasaan?
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                Padam daripada Pautan Pantas sahaja. Aktiviti yang telah dimasukkan dalam perjalanan terdahulu tidak akan terjejas.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
