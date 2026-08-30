import React, { useState } from 'react';
import { ChecklistItem, ChecklistCategory, Stay } from '../types';
import { CHECKLIST_CATEGORIES } from '../utils/constants';
import { Check, Plus, Trash2, CheckCircle2, ListChecks, Sparkles } from 'lucide-react';
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
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChecklistCategory>('essentials');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onAddItem({
      stayId: stay.id,
      category: selectedCategory,
      text: toTitleCase(inputText.trim()),
      isCompleted: false
    });
    setInputText('');
  };

  const handleToggle = (id: string, currentState: boolean) => {
    onToggleItem(id);
    if (!currentState && completedCount + 1 === totalCount && totalCount > 0) {
      // Trigger subtle celebration when 100% completed
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch {}
    }
  };

  const addPresetSuggestions = () => {
    const suggestions: { category: ChecklistCategory; text: string }[] = [
      { category: 'essentials', text: 'Ubat Rutin / Kit Kecemasan Keluarga' },
      { category: 'essentials', text: 'Pengecas Telefon & Power Bank' },
      { category: 'house_homestay', text: 'Extension Plug / Soket Tambahan' },
      { category: 'food_gifts', text: 'Buah Tangan Khas / Kuih Tradisi' },
      { category: 'kids_elderly', text: 'Minyak Telon / Ubatan Anak Kecil' }
    ];

    suggestions.forEach((sug) => {
      // check if not duplicate
      if (!items.some((i) => i.text.toLowerCase() === sug.text.toLowerCase())) {
        onAddItem({
          stayId: stay.id,
          category: sug.category,
          text: sug.text,
          isCompleted: false
        });
      }
    });
  };

  const filteredItems = filterCategory === 'all'
    ? items
    : items.filter((i) => i.category === filterCategory);

  return (
    <div id="packing-checklist-section" className="p-5 sm:p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-5">
      {/* Header & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
            <ListChecks className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Senarai Semak & Beg Persediaan</h3>
            <p className="text-[11px] text-stone-500">Pastikan barang penting tidak tertinggal sebelum bertolak.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-stone-800">{completedCount}/{totalCount} Siap</p>
            <p className="text-[10px] text-stone-500">{progressPercent}% selesai</p>
          </div>
          <div className="w-20 sm:w-24 h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
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
          className="px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium shrink-0"
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
          className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition-all shrink-0"
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
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
            filterCategory === 'all'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
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
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 ${
                filterCategory === catKey
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              <span>{CHECKLIST_CATEGORIES[catKey].icon}</span>
              <span>{CHECKLIST_CATEGORIES[catKey].label}</span>
              <span className="opacity-70 text-[10px]">({count})</span>
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
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                item.isCompleted
                  ? 'bg-stone-50/70 border-stone-200 text-stone-400'
                  : 'bg-white hover:bg-stone-50/90 border-stone-200 text-stone-800'
              }`}
            >
              <div
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => handleToggle(item.id, item.isCompleted)}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    item.isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-stone-300 bg-white hover:border-stone-400'
                  }`}
                >
                  {item.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs">{catMeta.icon}</span>
                  <span className={`text-xs font-medium ${item.isCompleted ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                    {item.text}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteItem(item.id)}
                className="p-1.5 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Padam"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
            Tiada senarai semak dalam kategori ini.
          </div>
        )}
      </div>

      {/* Preset Suggestions Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={addPresetSuggestions}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>+ Tambah Cadangan Item Penting Automatik</span>
        </button>
      </div>
    </div>
  );
};
