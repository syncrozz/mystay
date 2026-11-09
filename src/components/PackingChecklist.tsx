import React, { useState } from 'react';
import { ChecklistItem, ChecklistCategory, Stay } from '../types';
import { CHECKLIST_CATEGORIES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { Check, Plus, Trash2, ListChecks, Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { toTitleCase } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface PackingChecklistProps {
  items: ChecklistItem[];
  stay: Stay;
  onAddItem: (item: Omit<ChecklistItem, 'id'>) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

// Optional short-stay suggestions categorized by practical needs
const SUGGESTIONS_BY_CATEGORY: {
  category: ChecklistCategory;
  categoryLabel: string;
  items: string[];
}[] = [
  {
    category: 'essentials',
    categoryLabel: 'Asas & Pakaian',
    items: [
      'Pakaian harian & pakaian tidur',
      'Pengecas telefon & power bank',
      'Berus & ubat gigi / Kelengkapan mandian',
      'Tuala mandi ekstra'
    ]
  },
  {
    category: 'house_homestay',
    categoryLabel: 'Homestay & Penginapan',
    items: [
      'Extension plug / soket tambahan',
      'Beg plastik baju kotor',
      'Sejadah / telekung',
      'Selipar basah bilik air'
    ]
  },
  {
    category: 'food_gifts',
    categoryLabel: 'Makanan & Bekalan',
    items: [
      'Air mineral botol untuk bilik',
      'Snek & biskut perjalanan',
      'Buah tangan / ole-ole khas',
      'Pek kopi / teh 3-in-1'
    ]
  },
  {
    category: 'kids_elderly',
    categoryLabel: 'Anak Kecil & Warga Emas',
    items: [
      'Minyak telon / ubatan demam anak',
      'Lampin pakai buang ekstra',
      'Ubat rutin harian (Darah tinggi / Kencing manis)',
      'Termometer suhu badan'
    ]
  },
  {
    category: 'custom',
    categoryLabel: 'Perjalanan & Keselamatan',
    items: [
      'Kad Touch \'n Go (baki mencukupi)',
      'Kit kecemasan / panadol & koyok',
      'Payung lipat',
      'Plastik muntah perjalanan'
    ]
  }
];

export const PackingChecklist: React.FC<PackingChecklistProps> = ({
  items,
  stay,
  onAddItem,
  onToggleItem,
  onDeleteItem
}) => {
  const { requireAdmin } = useAuth();
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChecklistCategory>('essentials');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChecklistItem | null>(null);

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

  const handleAddSuggestionItem = (category: ChecklistCategory, text: string) => {
    requireAdmin(() => {
      if (!items.some((i) => i.text.toLowerCase() === text.toLowerCase())) {
        onAddItem({
          stayId: stay.id,
          category,
          text: toTitleCase(text),
          isCompleted: false
        });
      }
    }, 'Sila sahkan PIN Admin untuk menambah cadangan senarai semak.');
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

  const handleDeletePrompt = (item: ChecklistItem) => {
    requireAdmin(() => {
      setItemToDelete(item);
    }, 'Sila sahkan PIN Admin untuk memadam item.');
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const targetId = itemToDelete.id;
    setItemToDelete(null);
    onDeleteItem(targetId);
  };

  const filteredItems = filterCategory === 'all'
    ? items
    : items.filter((i) => i.category === filterCategory);

  return (
    <div id="packing-checklist-section" className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
      {/* Header & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Senarai Semak & Persediaan
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {completedCount}/{totalCount} item selesai ({progressPercent}%)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-28 sm:w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
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
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-teal-500 font-medium shrink-0 text-slate-800 cursor-pointer"
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
          placeholder="Tambah item semakan persediaan..."
          className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900 placeholder:text-slate-400 font-medium"
        />

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah</span>
        </button>
      </form>

      {/* Filter Tabs & Toggle Suggestions Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
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
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer ${
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

        <button
          type="button"
          onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
          className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Cadangan Item Lazim</span>
          {isSuggestionsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Optional Suggestions Accordion (SES v4.5 3.4 - Purely Optional, Never Auto-Inserted) */}
      {isSuggestionsOpen && (
        <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-950">
              Cadangan Item untuk Short Stay (Klik untuk tambah ke senarai anda):
            </span>
            <span className="text-[10px] text-teal-800">Pilihan bebas</span>
          </div>

          <div className="space-y-3">
            {SUGGESTIONS_BY_CATEGORY.map((catGroup) => (
              <div key={catGroup.category} className="space-y-1.5">
                <span className="text-[11px] font-bold text-teal-900 block">
                  {catGroup.categoryLabel}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {catGroup.items.map((sug) => {
                    const alreadyAdded = items.some((i) => i.text.toLowerCase() === sug.toLowerCase());
                    return (
                      <button
                        key={sug}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => handleAddSuggestionItem(catGroup.category, sug)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all text-left flex items-center gap-1.5 ${
                          alreadyAdded
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                            : 'bg-white hover:bg-teal-100/70 border-teal-200 text-teal-950 font-medium cursor-pointer shadow-2xs active:scale-95'
                        }`}
                      >
                        {alreadyAdded ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-teal-600" />}
                        <span>{sug}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-1.5 pt-1">
        {filteredItems.map((item) => {
          const catMeta = CHECKLIST_CATEGORIES[item.category] || CHECKLIST_CATEGORIES.custom;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
                item.isCompleted
                  ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                  : 'bg-white hover:bg-slate-50/90 border-slate-200 text-slate-800 shadow-2xs'
              }`}
            >
              <div
                className="flex items-center gap-2.5 cursor-pointer flex-1"
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
                onClick={() => handleDeletePrompt(item)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Padam"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            Tiada item senarai semak dalam kategori ini.
          </div>
        )}
      </div>

      {/* Accidental Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Padam Item?</h4>
              <p className="text-xs text-slate-600 line-clamp-2 px-2">
                Adakah anda pasti ingin memadam <strong>&ldquo;{itemToDelete.text}&rdquo;</strong>?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
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
