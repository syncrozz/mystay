import React, { useState } from 'react';
import { ChecklistItem, ChecklistCategory, Stay } from '../types';
import { CHECKLIST_CATEGORIES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { Check, Plus, Trash2, ListChecks, Sparkles, Lock } from 'lucide-react';
import { toTitleCase } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface PackingChecklistProps {
  items: ChecklistItem[];
  stay: Stay;
  onAddItem: (item: Omit<ChecklistItem, 'id'>) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

export const PackingChecklist: React.FC<PackingChecklistProps> = ({
  items,
  stay,
  onAddItem,
  onToggleItem,
  onDeleteItem
}) => {
  const { isAdminMode, requireAdmin } = useAuth();
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChecklistCategory>('essentials');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    requireAdmin(() => {
      onAddItem({
        stayId: stay.id,
        category: selectedCategory,
        text: toTitleCase(inputText.trim()),
        isCompleted: false
      });
      setInputText('');
    }, 'Sila sahkan PIN Admin untuk menambah item senarai semak.');
  };

  const handleToggle = (id: string, currentState: boolean) => {
    onToggleItem(id);
    if (!currentState && completedCount + 1 === totalCount && totalCount > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch {}
    }
  };

  const handleDelete = (id: string) => {
    requireAdmin(() => {
      onDeleteItem(id);
    }, 'Sila sahkan PIN Admin untuk memadam item senarai semak.');
  };

  const addPresetSuggestions = () => {
    requireAdmin(() => {
      const suggestions: { category: ChecklistCategory; text: string }[] = [
        { category: 'essentials', text: 'Ubat Rutin / Kit Kecemasan Keluarga' },
        { category: 'essentials', text: 'Pengecas Telefon & Power Bank' },
        { category: 'house_homestay', text: 'Extension Plug / Soket Tambahan' },
        { category: 'food_gifts', text: 'Buah Tangan Khas / Kuih Tradisi' },
        { category: 'kids_elderly', text: 'Minyak Telon / Ubatan Anak Kecil' }
      ];

      suggestions.forEach((sug) => {
        if (!items.some((i) => i.text.toLowerCase() === sug.text.toLowerCase())) {
          onAddItem({
            stayId: stay.id,
            category: sug.category,
            text: sug.text,
            isCompleted: false
          });
        }
      });
    }, 'Sila sahkan PIN Admin untuk menambah cadangan senarai semak.');
  };

  const filteredItems = filterCategory === 'all'
    ? items
    : items.filter((i) => i.category === filterCategory);

  return (
    <div id="packing-checklist-section" className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-5">
      {/* Header & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
            <ListChecks className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Senarai Semak & Beg Persediaan</h3>
            <p className="text-[11px] text-slate-500">Pastikan barang penting tidak tertinggal sebelum bertolak.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">{completedCount}/{totalCount} Siap</p>
            <p className="text-[10px] text-slate-500">{progressPercent}% selesai</p>
          </div>
          <div className="w-20 sm:w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as ChecklistCategory)}
          className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium shrink-0 text-slate-800"
        >
          {(Object.keys(CHECKLIST_CATEGORIES) as ChecklistCategory[]).map((catKey) => (
            <option key={catKey} value={catKey}>
              {CHECKLIST_CATEGORIES[catKey].icon} {CHECKLIST_CATEGORIES[catKey].label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(toTitleCase(e.target.value))}
          placeholder="Cth: Ubat Darah Tinggi Tok / Extension Plug / Buah Tangan..."
          className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 placeholder:text-slate-400 font-medium"
        />

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </form>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            filterCategory === 'all'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          Semua ({items.length})
        </button>
        {(Object.keys(CHECKLIST_CATEGORIES) as ChecklistCategory[]).map((catKey) => {
          const count = items.filter((i) => i.category === catKey).length;
          if (count === 0 && filterCategory !== catKey) return null;
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setFilterCategory(catKey)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer ${
                filterCategory === catKey
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>{CHECKLIST_CATEGORIES[catKey].icon}</span>
              <span>{CHECKLIST_CATEGORIES[catKey].label}</span>
              <span className="opacity-80 text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Checklist Items */}
      <div className="space-y-1.5 pt-1">
        {filteredItems.map((item) => {
          const catMeta = CHECKLIST_CATEGORIES[item.category] || CHECKLIST_CATEGORIES.custom;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                item.isCompleted
                  ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                  : 'bg-white hover:bg-slate-50/90 border-slate-200 text-slate-800 shadow-2xs'
              }`}
            >
              <div
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => handleToggle(item.id, item.isCompleted)}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                    item.isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  {item.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs">{catMeta.icon}</span>
                  <span className={`text-xs font-semibold ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {item.text}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Padam"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Tiada senarai semak dalam kategori ini.
          </div>
        )}
      </div>

      {/* Preset Suggestions Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={addPresetSuggestions}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>+ Tambah Cadangan Item Penting Automatik</span>
        </button>
      </div>
    </div>
  );
};
