import React, { useState, useEffect, useMemo } from 'react';
import { ChecklistItem, ChecklistCategory, Stay } from '../types';
import { CHECKLIST_CATEGORIES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import {
  Check,
  Plus,
  Trash2,
  ListChecks,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Pencil,
  RotateCcw,
  X,
  Settings2
} from 'lucide-react';
import { toTitleCase } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface PackingChecklistProps {
  items: ChecklistItem[];
  stay: Stay;
  onAddItem: (item: Omit<ChecklistItem, 'id'>) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

export interface SuggestionCategoryGroup {
  category: ChecklistCategory;
  categoryLabel: string;
  items: string[];
}

// Default short-stay suggestions categorized by practical needs (4 categories)
const DEFAULT_SUGGESTIONS_BY_CATEGORY: SuggestionCategoryGroup[] = [
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
    categoryLabel: 'Penginapan & Keperluan',
    items: [
      'Extension plug / soket tambahan',
      'Beg plastik baju kotor',
      'Sejadah / telekung',
      'Selipar basah bilik air'
    ]
  },
  {
    category: 'food_gifts',
    categoryLabel: 'Makanan & Minuman',
    items: [
      'Air mineral botol untuk bilik',
      'Snek & biskut perjalanan',
      'Buah tangan / ole-ole khas',
      'Pek kopi / teh 3-in-1'
    ]
  },
  {
    category: 'custom',
    categoryLabel: 'Lain-lain',
    items: [
      'Kad Touch \'n Go (baki mencukupi)',
      'Kit kecemasan / panadol & koyok',
      'Payung lipat',
      'Plastik muntah perjalanan',
      'Minyak telon / ubatan demam anak',
      'Lampin pakai buang ekstra',
      'Ubat rutin harian (Darah tinggi / Kencing manis)',
      'Termometer suhu badan'
    ]
  }
];

// Helper to normalize category labels and migrate old 'kids_elderly' into 'custom'
const normalizeAndMigrateSuggestions = (parsed: any[]): { groups: SuggestionCategoryGroup[]; didMigrate: boolean } => {
  let didMigrate = false;
  const kidsElderlyGroup = parsed.find((g) => g.category === 'kids_elderly');
  const migratedItems: string[] = Array.isArray(kidsElderlyGroup?.items) ? kidsElderlyGroup.items : [];
  if (kidsElderlyGroup) {
    didMigrate = true;
  }

  // Filter out kids_elderly group
  const nonKidsGroups = parsed.filter((g) => g.category !== 'kids_elderly');

  let customFound = false;
  const groups: SuggestionCategoryGroup[] = nonKidsGroups.map((g) => {
    let updated = { ...g };
    if (g.category === 'custom') {
      customFound = true;
      const existingItems: string[] = Array.isArray(g.items) ? g.items : [];
      const merged = [...existingItems];
      migratedItems.forEach((item) => {
        if (!merged.some((m) => m.toLowerCase() === item.toLowerCase())) {
          merged.push(item);
        }
      });
      updated = {
        category: 'custom',
        categoryLabel: 'Lain-lain',
        items: merged
      };
    } else if (g.category === 'house_homestay') {
      updated = {
        ...g,
        category: 'house_homestay',
        categoryLabel: 'Penginapan & Keperluan'
      };
    } else if (g.category === 'food_gifts') {
      if (g.categoryLabel !== 'Makanan & Minuman') {
        didMigrate = true;
      }
      updated = {
        ...g,
        category: 'food_gifts',
        categoryLabel: 'Makanan & Minuman'
      };
    }
    return updated;
  });

  if (!customFound) {
    groups.push({
      category: 'custom',
      categoryLabel: 'Lain-lain',
      items: [
        'Kad Touch \'n Go (baki mencukupi)',
        'Kit kecemasan / panadol & koyok',
        'Payung lipat',
        'Plastik muntah perjalanan',
        'Minyak telon / ubatan demam anak',
        'Lampin pakai buang ekstra',
        'Ubat rutin harian (Darah tinggi / Kencing manis)',
        'Termometer suhu badan'
      ]
    });
    didMigrate = true;
  }

  return { groups, didMigrate };
};

export const PackingChecklist: React.FC<PackingChecklistProps> = ({
  items,
  stay,
  onAddItem,
  onToggleItem,
  onDeleteItem
}) => {
  const { user, requireAdmin } = useAuth();
  const storageKey = `stayplan_checklist_suggestions_${user?.uid || 'guest'}`;

  // Custom Suggestion Items managed by Account Owner
  const [suggestions, setSuggestions] = useState<SuggestionCategoryGroup[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const { groups, didMigrate } = normalizeAndMigrateSuggestions(parsed);
          if (didMigrate) {
            localStorage.setItem(storageKey, JSON.stringify(groups));
          }
          return groups;
        }
      }
    } catch {}
    return DEFAULT_SUGGESTIONS_BY_CATEGORY;
  });

  // Keep in sync with user's account storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const { groups, didMigrate } = normalizeAndMigrateSuggestions(parsed);
          if (didMigrate) {
            localStorage.setItem(storageKey, JSON.stringify(groups));
          }
          setSuggestions(groups);
          return;
        }
      }
    } catch {}
  }, [storageKey]);

  const saveSuggestions = (updated: SuggestionCategoryGroup[]) => {
    setSuggestions(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed saving suggestions to local storage:', e);
    }
  };

  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChecklistCategory>('essentials');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChecklistItem | null>(null);

  // Suggestions Management State (Add / Edit / Delete by Account Owner)
  const [isManageMode, setIsManageMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSuggestionCat, setNewSuggestionCat] = useState<ChecklistCategory>('essentials');
  const [newSuggestionText, setNewSuggestionText] = useState('');
  const [editingSuggestion, setEditingSuggestion] = useState<{ category: ChecklistCategory; oldText: string } | null>(null);
  const [editSuggestionText, setEditSuggestionText] = useState('');
  const [suggestionToDelete, setSuggestionToDelete] = useState<{ category: ChecklistCategory; text: string } | null>(null);

  // Normalize any legacy item category if it was kids_elderly -> custom
  const normalizedItems = useMemo(() => {
    return items.map((i) => {
      if ((i.category as string) === 'kids_elderly') {
        return { ...i, category: 'custom' as ChecklistCategory };
      }
      return i;
    });
  }, [items]);

  const completedCount = normalizedItems.filter((i) => i.isCompleted).length;
  const totalCount = normalizedItems.length;
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
      if (!normalizedItems.some((i) => i.text.toLowerCase() === text.toLowerCase())) {
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

  // --- Handlers for Owner Suggestion Customization ---
  const handleToggleManageMode = () => {
    requireAdmin(() => {
      setIsManageMode((prev) => !prev);
    }, 'Sila sahkan PIN Admin untuk mengurus item lazim.');
  };

  const handleOpenAddSuggestion = (presetCat?: ChecklistCategory) => {
    requireAdmin(() => {
      setNewSuggestionCat(presetCat || 'essentials');
      setNewSuggestionText('');
      setIsAddModalOpen(true);
    }, 'Sila sahkan PIN Admin untuk menambah cadangan lazim.');
  };

  const handleSaveNewSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuggestionText.trim()) return;
    const trimmed = toTitleCase(newSuggestionText.trim());

    const updated = suggestions.map((group) => {
      if (group.category === newSuggestionCat) {
        if (!group.items.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
          return { ...group, items: [...group.items, trimmed] };
        }
      }
      return group;
    });

    saveSuggestions(updated);
    setNewSuggestionText('');
    setIsAddModalOpen(false);
  };

  const handleOpenEditSuggestion = (category: ChecklistCategory, text: string) => {
    requireAdmin(() => {
      setEditingSuggestion({ category, oldText: text });
      setEditSuggestionText(text);
    }, 'Sila sahkan PIN Admin untuk mengubah item lazim.');
  };

  const handleSaveEditSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSuggestion || !editSuggestionText.trim()) return;
    const trimmed = toTitleCase(editSuggestionText.trim());

    const updated = suggestions.map((group) => {
      if (group.category === editingSuggestion.category) {
        return {
          ...group,
          items: group.items.map((i) => (i === editingSuggestion.oldText ? trimmed : i))
        };
      }
      return group;
    });

    saveSuggestions(updated);
    setEditingSuggestion(null);
    setEditSuggestionText('');
  };

  const handlePromptDeleteSuggestion = (category: ChecklistCategory, text: string) => {
    requireAdmin(() => {
      setSuggestionToDelete({ category, text });
    }, 'Sila sahkan PIN Admin untuk memadam item lazim.');
  };

  const handleConfirmDeleteSuggestion = () => {
    if (!suggestionToDelete) return;
    const updated = suggestions.map((group) => {
      if (group.category === suggestionToDelete.category) {
        return {
          ...group,
          items: group.items.filter((i) => i !== suggestionToDelete.text)
        };
      }
      return group;
    });

    saveSuggestions(updated);
    setSuggestionToDelete(null);
  };

  const handleResetSuggestions = () => {
    requireAdmin(() => {
      if (confirm('Adakah anda pasti mahu menetapkan semula semua cadangan item lazim kepada senarai asal?')) {
        saveSuggestions(DEFAULT_SUGGESTIONS_BY_CATEGORY);
      }
    }, 'Sila sahkan PIN Admin untuk menetapkan semula item lazim.');
  };

  const filteredItems = filterCategory === 'all'
    ? normalizedItems
    : normalizedItems.filter((i) => i.category === filterCategory);

  const totalSuggestionsCount = suggestions.reduce((acc, g) => acc + g.items.length, 0);

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
            Semua ({normalizedItems.length})
          </button>
          {(Object.keys(CHECKLIST_CATEGORIES) as ChecklistCategory[]).map((catKey) => {
            const count = normalizedItems.filter((i) => i.category === catKey).length;
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

      {/* Suggestions Accordion (Modifiable by Account Owner: Add, Edit, Delete, Reset) */}
      {isSuggestionsOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/60 border border-teal-200/90 space-y-4 animate-in fade-in duration-150">
          
          {/* Controls Bar for Account Owner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-teal-200/60">
            <div>
              <span className="text-xs font-bold text-teal-950 block">
                Cadangan Item Lazim ({totalSuggestionsCount} item)
              </span>
              <span className="text-[11px] text-teal-800">
                {isManageMode
                  ? 'Mod Pengurusan Aktif: Klik ikon pensel untuk ubah teks atau tong sampah untuk memadam.'
                  : 'Klik mana-mana item untuk dimasukkan ke senarai semak stay anda.'}
              </span>
            </div>

            {/* Owner Management Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenAddSuggestion()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-2xs cursor-pointer transition-colors"
                title="Tambah cadangan item lazim baharu"
              >
                <Plus className="w-3 h-3" />
                <span>+ Item Lazim</span>
              </button>

              <button
                type="button"
                onClick={handleToggleManageMode}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  isManageMode
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white hover:bg-teal-100/80 text-teal-900 border-teal-300'
                }`}
                title="Buka mod ubah dan padam item"
              >
                <Settings2 className="w-3 h-3" />
                <span>{isManageMode ? 'Selesai Urus' : 'Urus / Edit'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetSuggestions}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white border border-slate-300 rounded-lg cursor-pointer transition-colors"
                title="Tetapkan semula kepada cadangan asal"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Asal</span>
              </button>
            </div>
          </div>

          {/* Categorized Suggestions List */}
          <div className="space-y-3.5">
            {suggestions.map((catGroup) => (
              <div key={catGroup.category} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{CHECKLIST_CATEGORIES[catGroup.category]?.icon || '📌'}</span>
                    <span>{CHECKLIST_CATEGORIES[catGroup.category]?.label || catGroup.categoryLabel}</span>
                    <span className="text-teal-700 font-normal">({catGroup.items.length})</span>
                  </span>

                  {isManageMode && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddSuggestion(catGroup.category)}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-950 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah ke {CHECKLIST_CATEGORIES[catGroup.category]?.label || catGroup.categoryLabel}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {catGroup.items.map((sug) => {
                    const alreadyAdded = normalizedItems.some((i) => i.text.toLowerCase() === sug.toLowerCase());
                    
                    if (isManageMode) {
                      return (
                        <div
                          key={sug}
                          className="px-2.5 py-1 text-xs rounded-lg border bg-white border-amber-300 text-slate-900 font-medium flex items-center gap-2 shadow-2xs group"
                        >
                          <span className="truncate max-w-[200px]">{sug}</span>
                          <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSuggestion(catGroup.category, sug)}
                              className="p-0.5 text-slate-400 hover:text-teal-700 transition-colors cursor-pointer"
                              title="Ubah teks item ini"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteSuggestion(catGroup.category, sug)}
                              className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Padam item ini daripada cadangan"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    }

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
                        title={alreadyAdded ? 'Item sudah berada dalam senarai stay' : 'Klik untuk tambah ke senarai'}
                      >
                        {alreadyAdded ? (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <Plus className="w-3 h-3 text-teal-600 shrink-0" />
                        )}
                        <span>{sug}</span>
                      </button>
                    );
                  })}

                  {catGroup.items.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">Tiada item dalam kategori ini.</span>
                  )}
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

      {/* Modal: Tambah Cadangan Item Lazim Baharu */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-base font-black text-slate-900">Tambah Item Lazim Baharu</h4>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSuggestion} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kategori
                </label>
                <select
                  value={newSuggestionCat}
                  onChange={(e) => setNewSuggestionCat(e.target.value as ChecklistCategory)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                >
                  {(Object.keys(CHECKLIST_CATEGORIES) as ChecklistCategory[]).map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {CHECKLIST_CATEGORIES[catKey].icon} {CHECKLIST_CATEGORIES[catKey].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Item Lazim
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSuggestionText}
                  onChange={(e) => setNewSuggestionText(e.target.value)}
                  placeholder="Cth: Minyak wangi / Baju renang / Tikar piknik"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newSuggestionText.trim()}
                  className="flex-1 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Simpan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ubah / Edit Teks Item Lazim */}
      {editingSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-base font-black text-slate-900">Ubah Item Lazim</h4>
              <button
                type="button"
                onClick={() => setEditingSuggestion(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSuggestion} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Item
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editSuggestionText}
                  onChange={(e) => setEditSuggestionText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSuggestion(null)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!editSuggestionText.trim()}
                  className="flex-1 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Padam Item Lazim */}
      {suggestionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Padam Item Lazim?</h4>
              <p className="text-xs text-slate-600 line-clamp-2 px-2">
                Adakah anda pasti ingin memadam <strong>&ldquo;{suggestionToDelete.text}&rdquo;</strong> daripada senarai cadangan lazim akaun anda?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuggestionToDelete(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSuggestion}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accidental Delete Confirmation Modal (Regular Stay Checklist Item) */}
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
