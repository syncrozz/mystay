import React, { useState, useMemo } from 'react';
import { Stay, AgendaItem, TimeSlot, ActivityPriority } from '../types';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_CONFIG, TIME_SLOTS } from '../utils/constants';
import { getDayContextLabel, toTitleCase, parseActivityLines, getDateForDay, getTodayStayDayInfo } from '../utils/formatters';
import { OrganisePlanModal } from './OrganisePlanModal';
import {
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  Edit2,
  Search,
  Check,
  MapPin,
  User,
  Lock,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  X,
  Loader2,
  EyeOff,
  Eye,
  Bookmark,
  MoreVertical,
  Clock,
  Pencil
} from 'lucide-react';
import { ActivityLibraryModal } from './ActivityLibraryModal';

interface PlanBoardProps {
  stay: Stay;
  onOpenAddModal?: () => void;
  onOpenAddModalForDay?: (dayNumber: number) => void;
  onEditItem?: (item: AgendaItem) => void;
  onOpenActivityLibrary?: () => void;
}

type FilterType = 'all' | 'backlog' | 'scheduled';
type SortOption = 'date_asc' | 'date_desc' | 'time_slot' | 'title_asc' | 'created_desc';

const TIME_SLOT_ORDER: Record<string, number> = {
  morning: 1,
  midday: 2,
  afternoon: 3,
  evening: 4,
  flexible: 5
};

export const PlanBoard: React.FC<PlanBoardProps> = ({
  stay,
  onOpenAddModal,
  onOpenAddModalForDay,
  onEditItem,
  onOpenActivityLibrary
}) => {
  const {
    activeAgendaItems,
    addAgendaItem,
    updateAgendaItem,
    batchUpdateAgendaItems,
    deleteAgendaItem,
    toggleAgendaComplete,
    activityLibraryItems,
    addActivityLibraryItem,
    seedDefaultActivityLibrary
  } = useStay();
  const { requireAdmin } = useAuth();

  const [quickTitle, setQuickTitle] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all' | '0' | '1' | '2' ...
  const [sortBy, setSortBy] = useState<SortOption>('date_asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrganiseModalOpen, setIsOrganiseModalOpen] = useState(false);
  const [isInternalLibraryOpen, setIsInternalLibraryOpen] = useState(false);
  const [libraryPromptItem, setLibraryPromptItem] = useState<{ title: string; emoji?: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AgendaItem | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [selectedIdeaTitles, setSelectedIdeaTitles] = useState<string[]>([]);
  const [isAddingIdeas, setIsAddingIdeas] = useState(false);
  const [isSuggestionsDismissed, setIsSuggestionsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('stayplan_hide_starter_suggestions') === 'true';
    } catch {
      return false;
    }
  });
  const [dismissedIdeaTitles, setDismissedIdeaTitles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('stayplan_dismissed_starter_ideas');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const duration = stay.durationDays || 3;
  const todayInfo = useMemo(() => getTodayStayDayInfo(stay), [stay]);

  // Filter items for this stay
  const items = useMemo(() => {
    return activeAgendaItems.filter((i) => i.stayId === stay.id);
  }, [activeAgendaItems, stay.id]);

  // Statistics
  const totalItems = items.length;
  const backlogCount = items.filter((i) => !i.dayNumber || i.dayNumber === 0).length;
  const scheduledCount = totalItems - backlogCount;

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      // 1. Status Filter
      if (activeFilter === 'backlog' && (item.dayNumber || 0) !== 0) return false;
      if (activeFilter === 'scheduled' && (item.dayNumber || 0) === 0) return false;

      // 2. Date Filter
      if (dateFilter !== 'all') {
        const targetDayNum = Number(dateFilter);
        if (targetDayNum === 0) {
          if ((item.dayNumber || 0) !== 0) return false;
        } else {
          if (item.dayNumber !== targetDayNum) return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        const matchesLoc = (item.locationName || '').toLowerCase().includes(query);
        const matchesPic = (item.personInCharge || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesPic) return false;
      }

      return true;
    });

    // 4. Sort Items
    return [...filtered].sort((a, b) => {
      if (sortBy === 'date_asc') {
        const dayA = a.dayNumber || 0;
        const dayB = b.dayNumber || 0;
        // Scheduled dates first (Day 1, Day 2...), unscheduled (0) at end
        if (dayA === 0 && dayB !== 0) return 1;
        if (dayB === 0 && dayA !== 0) return -1;
        if (dayA !== dayB) return dayA - dayB;
        // If same day, sort by time slot
        const slotA = TIME_SLOT_ORDER[a.timeSlot || 'flexible'] || 5;
        const slotB = TIME_SLOT_ORDER[b.timeSlot || 'flexible'] || 5;
        if (slotA !== slotB) return slotA - slotB;
        return a.title.localeCompare(b.title);
      }

      if (sortBy === 'date_desc') {
        const dayA = a.dayNumber || 0;
        const dayB = b.dayNumber || 0;
        if (dayA === 0 && dayB !== 0) return 1;
        if (dayB === 0 && dayA !== 0) return -1;
        if (dayA !== dayB) return dayB - dayA;
        const slotA = TIME_SLOT_ORDER[a.timeSlot || 'flexible'] || 5;
        const slotB = TIME_SLOT_ORDER[b.timeSlot || 'flexible'] || 5;
        return slotA - slotB;
      }


      if (sortBy === 'time_slot') {
        const slotA = TIME_SLOT_ORDER[a.timeSlot || 'flexible'] || 5;
        const slotB = TIME_SLOT_ORDER[b.timeSlot || 'flexible'] || 5;
        if (slotA !== slotB) return slotA - slotB;
        const dayA = a.dayNumber || 0;
        const dayB = b.dayNumber || 0;
        return dayA - dayB;
      }

      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }

      if (sortBy === 'created_desc') {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      }

      return 0;
    });
  }, [items, activeFilter, dateFilter, searchQuery, sortBy]);

  // Subtle, consistent styling for time periods (Requirement 7)
  const getTimeSlotBadge = (slot?: TimeSlot) => {
    switch (slot) {
      case 'morning':
        return {
          label: 'Pagi',
          icon: '🌅',
          className: 'bg-amber-50/90 text-amber-900 border-amber-200/80',
        };
      case 'midday':
        return {
          label: 'Tengah Hari',
          icon: '☀️',
          className: 'bg-rose-50/90 text-rose-900 border-rose-200/80',
        };
      case 'afternoon':
        return {
          label: 'Petang',
          icon: '🌤️',
          className: 'bg-sky-50/90 text-sky-900 border-sky-200/80',
        };
      case 'evening':
        return {
          label: 'Malam',
          icon: '🌙',
          className: 'bg-purple-50/90 text-purple-900 border-purple-200/80',
        };
      case 'flexible':
      default:
        return {
          label: 'Fleksibel',
          icon: '🍃',
          className: 'bg-slate-100/90 text-slate-700 border-slate-200/80',
        };
    }
  };

  // Group activities by date / day number (Requirements 2, 3, 8)
  const groupedSections = useMemo(() => {
    const sections: Array<{
      id: string;
      dayNumber: number;
      isBacklog: boolean;
      heading: string;
      subHeading?: string;
      contextBadge?: { icon: string; label: string; shortLabel: string; type: string };
      dateInfo?: ReturnType<typeof getDateForDay>;
      items: AgendaItem[];
    }> = [];

    const isDateDesc = sortBy === 'date_desc';
    const dayIndices = Array.from({ length: duration }).map((_, i) => i + 1);
    if (isDateDesc) {
      dayIndices.reverse();
    }

    // 1. Scheduled Days
    if (activeFilter !== 'backlog') {
      for (const dNum of dayIndices) {
        if (dateFilter !== 'all' && dateFilter !== dNum.toString()) {
          continue;
        }

        const dInfo = getDateForDay(stay.startDate, dNum);
        const dCtx = getDayContextLabel(stay, dNum);
        const dayItems = filteredItems.filter((i) => i.dayNumber === dNum);

        // When user is searching or filtering by search query, hide days with 0 matches
        if (searchQuery.trim() !== '' && dayItems.length === 0) {
          continue;
        }

        sections.push({
          id: `day-${dNum}`,
          dayNumber: dNum,
          isBacklog: false,
          heading: dInfo.dateFormatted !== 'Belum Set' ? dInfo.dateFormatted : `Hari ${dNum}`,
          subHeading: dInfo.dayNameFull ? `${dInfo.dayNameFull} (${dInfo.secondaryLabel})` : dInfo.secondaryLabel,
          contextBadge: dCtx,
          dateInfo: dInfo,
          items: dayItems
        });
      }
    }

    // 2. Unscheduled (Belum Dijadualkan) Group
    if (activeFilter !== 'scheduled' && (dateFilter === 'all' || dateFilter === '0')) {
      const unscheduledItems = filteredItems.filter((i) => !i.dayNumber || i.dayNumber === 0);

      // Only show if there are unscheduled items, or if user explicitly selected backlog / date 0
      if (unscheduledItems.length > 0 || activeFilter === 'backlog' || dateFilter === '0') {
        sections.push({
          id: 'unscheduled',
          dayNumber: 0,
          isBacklog: true,
          heading: 'Belum Dijadualkan',
          subHeading: 'Aktiviti yang belum ditentukan tarikh atau hari',
          items: unscheduledItems
        });
      }
    }

    return sections;
  }, [filteredItems, duration, sortBy, activeFilter, dateFilter, stay.startDate, stay, searchQuery]);

  // Helper to add parsed activities via existing addAgendaItem flow with single requireAdmin auth
  const addActivitiesBatch = (titles: string[]) => {
    if (titles.length === 0) return;

    requireAdmin(() => {
      // Clear input immediately so user can type next idea without delay
      setQuickTitle('');

      // Add item(s) using existing addAgendaItem flow
      titles.forEach((title) => {
        addAgendaItem({
          stayId: stay.id,
          title,
          dayNumber: 0, // 0 = Belum dijadualkan / Backlog Pool
          timeSlot: 'flexible',
          priority: 'undecided',
          isCompleted: false,
          locationName: '',
          personInCharge: '',
          description: '',
          notes: ''
        }).catch((err) => {
          console.error('Failed adding plan item:', err);
        });
      });
      setFeedbackToast(`Ditambah ${titles.length} aktiviti!`);
      setTimeout(() => setFeedbackToast(null), 2500);
    }, 'Sila masukkan PIN Admin untuk menambah aktiviti.');
  };

  // Handle Frictionless Quick Add (Single-line submit & form submit fallback)
  const handleQuickAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseActivityLines(quickTitle);
    if (parsed.length === 0) return;

    addActivitiesBatch(parsed);
  };

  // Handle Multiline Paste directly on the quick-add input
  const handleQuickPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData?.getData('text');
    if (pasteText && (pasteText.includes('\n') || pasteText.includes('\r'))) {
      const parsed = parseActivityLines(pasteText);
      if (parsed.length > 0) {
        e.preventDefault();
        addActivitiesBatch(parsed);
      }
    }
  };

  // Visible library items
  const visibleLibraryItems = useMemo(() => {
    return activityLibraryItems.filter((item) => !dismissedIdeaTitles.includes(item.name));
  }, [activityLibraryItems, dismissedIdeaTitles]);

  // Toggle selection of library idea chip (allows picking any number of items)
  const handleToggleIdeaSelection = (name: string) => {
    setSelectedIdeaTitles((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  // Add all selected ideas into the current stay as independent Stay Activities
  const handleAddSelectedIdeas = async () => {
    if (selectedIdeaTitles.length === 0 || isAddingIdeas) return;
    setIsAddingIdeas(true);

    try {
      const selectedItems = activityLibraryItems.filter((item) =>
        selectedIdeaTitles.includes(item.name)
      );

      let addedCount = 0;
      for (const idea of selectedItems) {
        // Prevent accidental duplicate if already present in this stay
        const exists = items.some((i) => i.title.toLowerCase() === idea.name.toLowerCase());
        if (exists) continue;

        await addAgendaItem({
          stayId: stay.id,
          title: idea.name,
          emoji: idea.emoji || '📌',
          sourceLibraryId: idea.id,
          dayNumber: 0,
          timeSlot: 'flexible',
          priority: 'undecided', // Trip-level independent default
          isCompleted: false,
          locationName: '',
          personInCharge: '',
          description: '',
          notes: ''
        });
        addedCount++;
      }

      setFeedbackToast(`Berjaya menambah ${addedCount} aktiviti pilihan ke perjalanan!`);
      setTimeout(() => setFeedbackToast(null), 3000);
      setSelectedIdeaTitles([]);
    } catch (err) {
      console.error('Failed adding selected ideas:', err);
    } finally {
      setIsAddingIdeas(false);
    }
  };

  // Add single library idea directly
  const handleAddSingleLibraryIdea = async (idea: { name: string; emoji?: string; id?: string }) => {
    const exists = items.some((i) => i.title.toLowerCase() === idea.name.toLowerCase());
    if (exists) {
      setFeedbackToast(`Aktiviti "${idea.name}" sudah ada dalam jadual.`);
      setTimeout(() => setFeedbackToast(null), 2000);
      return;
    }

    try {
      await addAgendaItem({
        stayId: stay.id,
        title: idea.name,
        emoji: idea.emoji || '📌',
        sourceLibraryId: idea.id,
        dayNumber: 0,
        timeSlot: 'flexible',
        priority: 'undecided',
        isCompleted: false,
        locationName: '',
        personInCharge: '',
        description: '',
        notes: ''
      });
      setFeedbackToast(`Ditambah: "${idea.name}"`);
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (err) {
      console.error('Failed adding single idea:', err);
    }
  };

  const handleDismissIdea = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIdeaTitles((prev) => {
      const next = prev.includes(name) ? prev : [...prev, name];
      try {
        localStorage.setItem('stayplan_dismissed_starter_ideas', JSON.stringify(next));
      } catch {}
      return next;
    });
    setSelectedIdeaTitles((prev) => prev.filter((t) => t !== name));
  };

  const handleRestoreIdeas = () => {
    setDismissedIdeaTitles([]);
    try {
      localStorage.removeItem('stayplan_dismissed_starter_ideas');
    } catch {}
    setFeedbackToast('Semua cadangan aktiviti telah dipulihkan.');
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const handleToggleSuggestionsVisibility = () => {
    setIsSuggestionsDismissed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('stayplan_hide_starter_suggestions', String(next));
      } catch {}
      return next;
    });
  };

  const handleSaveToLibrary = async () => {
    if (!libraryPromptItem) return;
    try {
      await addActivityLibraryItem({
        name: libraryPromptItem.title,
        emoji: libraryPromptItem.emoji || '📌'
      });
      setFeedbackToast(`"${libraryPromptItem.title}" disimpan ke Aktiviti Kebiasaan!`);
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (err) {
      console.error('Failed saving to library:', err);
    } finally {
      setLibraryPromptItem(null);
    }
  };


  // Quick assign day
  const handleAssignDay = async (item: AgendaItem, targetDay: number) => {
    requireAdmin(async () => {
      await updateAgendaItem(item.id, { dayNumber: targetDay });
    }, 'Sila sahkan PIN Admin untuk menjadualkan aktiviti.');
  };

  // Quick change time slot
  const handleAssignSlot = async (item: AgendaItem, targetSlot: TimeSlot) => {
    requireAdmin(async () => {
      await updateAgendaItem(item.id, { timeSlot: targetSlot });
    }, 'Sila sahkan PIN Admin untuk menukar slot masa aktiviti.');
  };

  // Handle Edit Item
  const handleEditClick = (item: AgendaItem) => {
    if (onEditItem) {
      requireAdmin(() => onEditItem(item), 'Sila sahkan PIN Admin untuk mengedit aktiviti.');
    }
  };

  // Accidental Deletion Protection
  const handleDeletePrompt = (item: AgendaItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const deletedTitle = itemToDelete.title;
    const targetId = itemToDelete.id;
    setItemToDelete(null);
    try {
      await deleteAgendaItem(targetId);
      setFeedbackToast(`Aktiviti "${deletedTitle}" telah dipadam.`);
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (e) {
      console.error('Delete activity error:', e);
      setFeedbackToast(`Aktiviti "${deletedTitle}" telah dipadam.`);
      setTimeout(() => setFeedbackToast(null), 2500);
    }
  };

  // Handle Susun Agenda
  const handleOrganiseClick = () => {
    requireAdmin(() => {
      setIsOrganiseModalOpen(true);
    }, 'Sila sahkan PIN Admin untuk menggunakan pembantu susun automatik agenda.');
  };

  const isFilterActive = activeFilter !== 'all' || dateFilter !== 'all' || searchQuery.trim() !== '' || sortBy !== 'date_asc';

  return (
    <div id="plan-board-view" className="space-y-4 max-w-6xl mx-auto">
      {/* Hero Empty State (When Planning is Empty) */}
      {totalItems === 0 ? (
        <div className="space-y-4">
          <div
            id="planning-hero-empty-state"
            className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-10 text-center space-y-6 max-w-2xl mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600 shadow-2xs">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Belum ada aktiviti
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Mulakan rancangan dengan menambah aktiviti pertama anda.
              </p>
            </div>

            {/* HERO ACTION: Tambah Aktiviti (Prominent & Unmissable) */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                id="hero-add-activity-btn"
                onClick={() => {
                  if (onOpenAddModal) {
                    onOpenAddModal();
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-sm font-black rounded-2xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Aktiviti</span>
              </button>
            </div>

            {/* Quick Starter Form (Zero-friction alternative directly in empty state) */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Atau taip pantas & tekan Enter:
              </p>
              <form onSubmit={handleQuickAdd} className="flex items-center gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(toTitleCase(e.target.value))}
                  onPaste={handleQuickPaste}
                  placeholder="Cth: Makan Nasi Dagang / Pergi Pantai..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all animate-flash-5s"
                />
                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Tambah
                </button>
              </form>
            </div>

            {/* Prompt to optionally save manually added activity to Activity Library */}
            {libraryPromptItem && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 bg-teal-50/80 border border-teal-200/90 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs text-teal-950 font-semibold text-left">
                  <Bookmark className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Simpan &ldquo;{libraryPromptItem.title}&rdquo; juga sebagai Aktiviti Kebiasaan?</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveToLibrary}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Simpan untuk perjalanan akan datang
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryPromptItem(null)}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Tidak, untuk perjalanan ini sahaja
                  </button>
                </div>
              </div>
            )}

            {/* Collapsed / Hidden Suggestions State */}
            {isSuggestionsDismissed ? (
              <div className="pt-3 border-t border-slate-100 text-center animate-in fade-in duration-150">
                <button
                  type="button"
                  id="show-suggestions-btn"
                  onClick={handleToggleSuggestionsVisibility}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-teal-900 bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer shadow-2xs"
                  title="Tunjukkan semula Pautan Pantas aktiviti kebiasaan"
                >
                  <Eye className="w-3.5 h-3.5 text-teal-600" />
                  <span>💡 Tunjukkan Pautan Pantas ({visibleLibraryItems.length})</span>
                </button>
              </div>
            ) : (
              /* Pautan Pantas: Reusable Activity Library Chips */
              <div className="space-y-3 pt-3 border-t border-slate-100 text-left sm:text-center animate-in fade-in duration-150">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-teal-600">⚡</span>
                      <span>Pautan Pantas</span>
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedIdeaTitles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedIdeaTitles([])}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer underline"
                        >
                          Batal pilihan
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => (onOpenActivityLibrary ? onOpenActivityLibrary() : setIsInternalLibraryOpen(true))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 transition-colors cursor-pointer"
                        title="Urus senarai aktiviti kebiasaan peribadi anda"
                      >
                        <Bookmark className="w-3 h-3 text-teal-600" />
                        <span>Urus Aktiviti Kebiasaan</span>
                      </button>
                      <button
                        type="button"
                        id="hide-suggestions-btn"
                        onClick={handleToggleSuggestionsVisibility}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Sembunyikan bahagian pautan pantas dari paparan"
                      >
                        <EyeOff className="w-3 h-3 text-slate-500" />
                        <span>Sembunyikan</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pilih aktiviti kebiasaan anda untuk dimasukkan ke dalam perancangan perjalanan ini.
                  </p>
                </div>

                {/* Multi-Select Chips Container (No 2-3 limit, No Wajib/Pilihan badges) */}
                {visibleLibraryItems.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto pt-1">
                    {visibleLibraryItems.map((idea) => {
                      const isSelected = selectedIdeaTitles.includes(idea.name);
                      const isAlreadyInTrip = items.some(
                        (i) => i.title.toLowerCase() === idea.name.toLowerCase()
                      );

                      return (
                        <div
                          key={idea.id}
                          className={`inline-flex items-center rounded-full text-xs transition-all select-none ${
                            isAlreadyInTrip
                              ? 'bg-slate-100 text-slate-400 border border-slate-200'
                              : isSelected
                              ? 'bg-teal-600 text-white font-bold border border-teal-600 shadow-xs ring-2 ring-teal-300 scale-[1.02]'
                              : 'bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-slate-700 font-medium'
                          }`}
                        >
                          {/* Main Selection Area */}
                          <button
                            type="button"
                            disabled={isAlreadyInTrip}
                            onClick={() => handleToggleIdeaSelection(idea.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer disabled:cursor-not-allowed"
                            aria-pressed={isSelected}
                          >
                            <span>{isAlreadyInTrip ? '✓' : isSelected ? '✓' : idea.emoji || '📌'}</span>
                            <span>{idea.name}</span>
                            {isAlreadyInTrip && (
                              <span className="text-[10px] text-slate-400 font-normal">(Sudah ada)</span>
                            )}
                          </button>

                          {/* Delete / Dismiss Single Idea from this view */}
                          {!isAlreadyInTrip && (
                            <button
                              type="button"
                              onClick={(e) => handleDismissIdea(idea.name, e)}
                              title={`Sembunyikan "${idea.name}" daripada cadangan perjalanan ini`}
                              aria-label={`Padam cadangan ${idea.name}`}
                              className={`p-1 mr-1.5 rounded-full transition-colors cursor-pointer ${
                                isSelected
                                  ? 'text-teal-200 hover:text-white hover:bg-teal-700'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty state for Activity Library per Section 4 */
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 max-w-md mx-auto">
                    <p className="text-xs font-bold text-slate-700">Belum ada aktiviti kebiasaan.</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Tambahkan aktiviti yang sering anda lakukan supaya mudah digunakan untuk perjalanan akan datang.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => (onOpenActivityLibrary ? onOpenActivityLibrary() : setIsInternalLibraryOpen(true))}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        + Tambah Aktiviti Kebiasaan
                      </button>
                      <button
                        type="button"
                        onClick={() => seedDefaultActivityLibrary()}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-teal-800 hover:border-teal-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        Muat Cadangan Lazim
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-action if some ideas were hidden */}
                {dismissedIdeaTitles.length > 0 && visibleLibraryItems.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleRestoreIdeas}
                      className="text-[11px] text-slate-400 hover:text-teal-700 font-medium underline cursor-pointer"
                    >
                      Pulihkan {dismissedIdeaTitles.length} cadangan yang telah disembunyikan
                    </button>
                  </div>
                )}

                {/* Action Bar when 1 or more ideas are selected */}
                {selectedIdeaTitles.length > 0 ? (
                  <div className="pt-2 flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      id="confirm-selected-ideas-btn"
                      onClick={handleAddSelectedIdeas}
                      disabled={isAddingIdeas}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-teal-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isAddingIdeas ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Memasukkan aktiviti...</span>
                        </>
                      ) : (
                        <>
                          <span>✨ Masukkan {selectedIdeaTitles.length} Aktiviti ke Perjalanan Ini</span>
                          <span className="text-teal-200">→</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-teal-800 font-semibold">
                      {selectedIdeaTitles.length} aktiviti dipilih • Anda boleh susun hari & masa di langkah seterusnya.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. Normal Planning Workspace (Progressive Disclosure when items exist) */
        <>
          {/* Fast Direct Input */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 space-y-3">
            <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  id="quick-brain-dump-input"
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(toTitleCase(e.target.value))}
                  onPaste={handleQuickPaste}
                  placeholder="Tambah aktiviti dirancang..."
                  className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all animate-flash-5s"
                />
              </div>

              <div className="flex items-center gap-2">

                <button
                  type="submit"
                  id="quick-add-submit-button"
                  disabled={!quickTitle.trim()}
                  aria-label="Tambah Aktiviti"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>

                {onOpenAddModal && (
                  <button
                    type="button"
                    onClick={onOpenAddModal}
                    className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Buka Borang Lengkap Aktiviti (Lokasi, Masa, PIC)"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Prompt to optionally save manually added activity to Activity Library */}
            {libraryPromptItem && (
              <div className="p-3 bg-teal-50/80 border border-teal-200/90 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-teal-950 font-semibold text-left">
                  <Bookmark className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Simpan &ldquo;{libraryPromptItem.title}&rdquo; juga sebagai Aktiviti Kebiasaan?</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveToLibrary}
                    className="flex-1 sm:flex-initial px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Simpan untuk perjalanan akan datang
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryPromptItem(null)}
                    className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Tidak, untuk perjalanan ini sahaja
                  </button>
                </div>
              </div>
            )}

            {/* Pautan Pantas: Horizontal Quick Addition Strip in Active Workspace */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  Pautan Pantas:
                </span>
                {visibleLibraryItems.slice(0, 10).map((idea) => {
                  const alreadyAdded = items.some(
                    (i) => i.title.toLowerCase() === idea.name.toLowerCase()
                  );
                  return (
                    <button
                      key={idea.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAddSingleLibraryIdea(idea)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs shrink-0 transition-all ${
                        alreadyAdded
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default opacity-60'
                          : 'bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-slate-700 cursor-pointer active:scale-95 font-medium'
                      }`}
                      title={alreadyAdded ? `"${idea.name}" sudah ditambah ke perjalanan ini` : `Tambah "${idea.name}"`}
                    >
                      <span>{alreadyAdded ? '✓' : idea.emoji || '📌'}</span>
                      <span>{idea.name}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => (onOpenActivityLibrary ? onOpenActivityLibrary() : setIsInternalLibraryOpen(true))}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50/70 hover:bg-teal-100 rounded-lg shrink-0 cursor-pointer"
                title="Buka pengurusan Aktiviti Kebiasaan"
              >
                <Bookmark className="w-3 h-3" />
                <span>Urus</span>
              </button>
            </div>
          </div>

          {/* Filters & Search Controls (Target element) */}
          <div className="space-y-2.5">
            {/* Top Row: Category Filter Chips & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Semua ({totalItems})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('backlog')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'backlog'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Belum Dijadualkan ({backlogCount})
                </button>


                <button
                  type="button"
                  onClick={() => setActiveFilter('scheduled')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'scheduled'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Sudah Dijadualkan ({scheduledCount})
                </button>

                {todayInfo.isTodayInStay && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter('all');
                      setDateFilter(dateFilter === todayInfo.dayNumber.toString() ? 'all' : todayInfo.dayNumber.toString());
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      dateFilter === todayInfo.dayNumber.toString()
                        ? 'bg-amber-500 text-slate-900 ring-2 ring-amber-300 shadow-2xs'
                        : 'bg-amber-50 border border-amber-300 text-amber-950 hover:bg-amber-100'
                    }`}
                    title={`Tapis aktiviti Hari Ini: Hari ${todayInfo.dayNumber} (${todayInfo.dateInfo.dateFormatted})`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Hari Ini (Hari {todayInfo.dayNumber})</span>
                  </button>
                )}
              </div>

              <div className="relative w-full md:w-auto md:min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari aktiviti..."
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Row: Date Specific Filter & Sorting by Date / Priority */}
            <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Date Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Tapis Tarikh:</span>
                  </span>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 hover:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-2xs"
                  >
                    <option value="all">Semua Tarikh ({items.length})</option>
                    <option value="0">📋 Belum Dijadualkan ({backlogCount})</option>
                    {Array.from({ length: duration }).map((_, idx) => {
                      const dNum = idx + 1;
                      const dCtx = getDayContextLabel(stay, dNum);
                      const dInfo = getDateForDay(stay.startDate, dNum);
                      const dayItemCount = items.filter((i) => i.dayNumber === dNum).length;
                      return (
                        <option key={dNum} value={dNum.toString()}>
                          {dCtx.icon} {dInfo.displayLabel} · {dayItemCount} aktiviti
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Sorting Option Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
                    <ArrowUpDown className="w-3.5 h-3.5 text-teal-600" />
                    <span>Susun:</span>
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 hover:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-2xs"
                  >
                    <option value="date_asc">📅 Tarikh: Awal ➔ Akhir</option>
                    <option value="date_desc">📅 Tarikh: Akhir ➔ Awal</option>
                    <option value="time_slot">⏰ Slot Masa: Pagi ➔ Malam</option>
                    <option value="title_asc">🔤 Nama Aktiviti: A ➔ Z</option>
                    <option value="created_desc">⏱️ Terkini Ditambah</option>
                  </select>
                </div>
              </div>

              {/* Status & Reset Action */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">
                  Memaparkan <strong className="text-teal-950">{filteredItems.length}</strong> daripada {totalItems} aktiviti
                </span>

                {isFilterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter('all');
                      setDateFilter('all');
                      setSearchQuery('');
                      setSortBy('date_asc');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                    title="Set semula semua penapis dan susunan"
                  >
                    <X className="w-3 h-3" />
                    <span>Set Semula</span>
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Reassurance banner when all activities are scheduled */}
          {backlogCount === 0 && totalItems > 0 && (
            <div
              id="all-scheduled-reassurance-badge"
              className="px-4 py-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 text-xs flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-950">
                  Semua {totalItems} aktiviti telah berjaya dijadualkan mengikut hari.
                </span>
              </div>
              <button
                type="button"
                onClick={handleOrganiseClick}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer shrink-0"
              >
                Susun Semula Agenda
              </button>
            </div>
          )}

          {/* List of Planned Items or Filter Empty State */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Tiada aktiviti padan</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tiada aktiviti yang sepadan dengan penapis status, tarikh, atau carian &quot;{searchQuery}&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('all');
                  setDateFilter('all');
                  setSearchQuery('');
                  setSortBy('date_asc');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Papar Semua Aktiviti</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 relative">
              {/* Outside-click backdrop for three-dot action menu */}
              {activeMenuId && (
                <div
                  className="fixed inset-0 z-20 bg-slate-900/5 backdrop-blur-[0.5px]"
                  onClick={() => setActiveMenuId(null)}
                />
              )}

              {groupedSections.map((section) => (
                <section
                  key={section.id}
                  id={`plan-group-${section.id}`}
                  className="space-y-2 pt-1 first:pt-0"
                >
                  {/* Group Heading: Harmonious, luminous & prominent date anchor */}
                  <div
                    className={`flex items-center justify-between p-3 sm:px-4 sm:py-3 rounded-2xl shadow-2xs transition-all border-y border-r ${
                      section.isBacklog
                        ? 'bg-gradient-to-r from-slate-100/90 via-slate-50/60 to-white border-slate-200 border-l-4 border-l-slate-400'
                        : section.contextBadge?.type === 'travel_day'
                        ? 'bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white border-amber-200/90 border-l-4 border-l-amber-500'
                        : 'bg-gradient-to-r from-teal-50/90 via-teal-50/40 to-white border-teal-200/90 border-l-4 border-l-teal-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Visual Date Tile or Icon */}
                      {section.isBacklog ? (
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 text-lg">
                          📋
                        </div>
                      ) : (
                        <div
                          className={`flex flex-col items-center justify-center min-w-[44px] px-2 py-1 rounded-xl shadow-2xs border bg-white ${
                            section.contextBadge?.type === 'travel_day'
                              ? 'border-amber-200/90 text-amber-950'
                              : 'border-teal-200/90 text-teal-950'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
                              section.contextBadge?.type === 'travel_day' ? 'text-amber-700' : 'text-teal-700'
                            }`}
                          >
                            {section.dateInfo?.dayName || 'HARI'}
                          </span>
                          <span className="text-base sm:text-lg font-black leading-tight text-slate-900">
                            {section.dateInfo?.dayOfMonth || section.dayNumber}
                          </span>
                          {section.dateInfo?.monthShort && (
                            <span className="text-[9px] font-semibold text-slate-400 leading-none">
                              {section.dateInfo.monthShort}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Title & Context Information */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                            {section.isBacklog
                              ? 'Belum Dijadualkan'
                              : section.dateInfo?.dateFormatted !== 'Belum Set'
                              ? section.dateInfo?.dateFormatted
                              : `Hari ${section.dayNumber}`}
                          </span>

                          {section.contextBadge && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md border font-bold inline-flex items-center gap-1 shrink-0 ${
                                section.contextBadge.type === 'travel_day'
                                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                                  : 'bg-teal-100 text-teal-950 border-teal-300'
                              }`}
                            >
                              <span>{section.contextBadge.icon}</span>
                              <span>{section.contextBadge.label}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 font-medium truncate">
                          {section.isBacklog
                            ? 'Tentukan hari melalui menu ••• atau pembantu Susun Agenda'
                            : section.dateInfo?.dayNameFull
                            ? `${section.dateInfo.dayNameFull} · ${section.dateInfo.secondaryLabel}`
                            : `Hari ${section.dayNumber}`}
                        </p>
                      </div>
                    </div>

                    {/* Right: Activity Count & Add Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
                          section.isBacklog
                            ? 'bg-white border-slate-200 text-slate-700'
                            : section.contextBadge?.type === 'travel_day'
                            ? 'bg-white border-amber-200 text-amber-900'
                            : 'bg-white border-teal-200 text-teal-950'
                        }`}
                      >
                        {section.items.length} {section.items.length === 1 ? 'aktiviti' : 'aktiviti'}
                      </span>

                      {!section.isBacklog && onOpenAddModalForDay && (
                        <button
                          type="button"
                          onClick={() => onOpenAddModalForDay(section.dayNumber)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all cursor-pointer shadow-xs"
                          title={`Tambah aktiviti untuk ${section.heading}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Tambah</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compact Activity List Rows */}
                  {section.items.length > 0 ? (
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const slotBadge = getTimeSlotBadge(item.timeSlot);
                        const isMenuOpen = activeMenuId === item.id;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleEditClick(item)}
                            className={`group relative flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                              isMenuOpen
                                ? 'z-30 ring-2 ring-teal-500/30 bg-white shadow-md'
                                : 'hover:border-slate-300 active:scale-[0.99] ' +
                                  (item.isCompleted
                                    ? 'bg-slate-50/70 border-slate-200/80'
                                    : 'bg-white hover:bg-slate-50/90 border-slate-200 shadow-2xs')
                            }`}
                          >
                            {/* Left: Checkbox + Emoji + Activity Name */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAgendaComplete(item.id);
                                }}
                                className="p-1 -m-1 text-slate-400 hover:text-teal-600 transition-colors shrink-0 cursor-pointer"
                                title={item.isCompleted ? 'Tanda belum selesai' : 'Tanda selesai'}
                                aria-label={item.isCompleted ? 'Tanda belum selesai' : 'Tanda selesai'}
                              >
                                {item.isCompleted ? (
                                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                                ) : (
                                  <Circle className="w-4.5 h-4.5 text-slate-300 group-hover:text-slate-400" />
                                )}
                              </button>

                              {/* Activity Name */}
                              <span
                                className={`text-xs sm:text-sm font-semibold truncate leading-snug ${
                                  item.isCompleted
                                    ? 'line-through text-slate-400 font-normal'
                                    : 'text-slate-900'
                                }`}
                              >
                                {item.title}
                              </span>

                              {/* Subtle Desktop-Only Location Badge */}
                              {item.locationName && (
                                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 font-normal truncate max-w-[140px]">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{item.locationName}</span>
                                </span>
                              )}
                            </div>

                            {/* Right: Assigned Time Period Badge + Three-dot Menu */}
                            <div
                              className="flex items-center gap-1.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Time Period Badge with consistent subtle styling */}
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${slotBadge.className}`}
                              >
                                <span className="text-[10px] leading-none">{slotBadge.icon}</span>
                                <span>{slotBadge.label}</span>
                              </span>

                              {/* Three-dot Action Menu Trigger */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(isMenuOpen ? null : item.id);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isMenuOpen
                                      ? 'bg-slate-200 text-slate-800'
                                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                  }`}
                                  title="Tindakan aktiviti"
                                  aria-label="Tindakan aktiviti"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Action Menu Popover */}
                                {isMenuOpen && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 text-left overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                  >
                                    {/* Action 1: Edit Butiran Lengkap */}
                                    <div className="p-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuId(null);
                                          handleEditClick(item);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:text-teal-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-teal-600" />
                                        <span>Edit Butiran Aktiviti</span>
                                      </button>
                                    </div>

                                    {/* Action 2: Change Date / Day */}
                                    <div className="p-2 border-t border-slate-100 bg-slate-50/60">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                          <Calendar className="w-3 h-3 text-slate-400" />
                                          <span>Tukar Tarikh:</span>
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            handleAssignDay(item, 0);
                                          }}
                                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                            (item.dayNumber || 0) === 0
                                              ? 'bg-teal-600 text-white shadow-2xs'
                                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                          }`}
                                        >
                                          📋 Belum Set
                                        </button>
                                        {Array.from({ length: duration }).map((_, idx) => {
                                          const dNum = idx + 1;
                                          const dInfo = getDateForDay(stay.startDate, dNum);
                                          const isSelected = item.dayNumber === dNum;
                                          return (
                                            <button
                                              key={dNum}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                handleAssignDay(item, dNum);
                                              }}
                                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                isSelected
                                                  ? 'bg-teal-600 text-white shadow-2xs'
                                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300'
                                              }`}
                                              title={dInfo.secondaryLabel}
                                            >
                                              {dInfo.dateFormatted}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Action 3: Change Time Slot */}
                                    <div className="p-2 border-t border-slate-100 bg-slate-50/60">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          <span>Tukar Waktu:</span>
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {(['morning', 'midday', 'afternoon', 'evening', 'flexible'] as TimeSlot[]).map((slot) => {
                                          const meta = getTimeSlotBadge(slot);
                                          const isSelected = (item.timeSlot || 'flexible') === slot;
                                          return (
                                            <button
                                              key={slot}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                handleAssignSlot(item, slot);
                                              }}
                                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                isSelected
                                                  ? 'bg-teal-600 text-white shadow-2xs'
                                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300'
                                              }`}
                                            >
                                              <span>{meta.icon}</span>
                                              <span>{meta.label}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Action 4: Delete */}
                                    <div className="p-1.5 border-t border-slate-100 bg-rose-50/30">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setActiveMenuId(null);
                                          handleDeletePrompt(item);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100/80 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Padam Aktiviti</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Clean empty state for scheduled day without activities */
                    <div className="py-2.5 px-3 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/40 text-center flex items-center justify-center gap-2">
                      <p className="text-xs text-slate-400 font-medium">
                        Belum ada aktiviti untuk hari ini.
                      </p>
                      {onOpenAddModalForDay && (
                        <button
                          type="button"
                          onClick={() => onOpenAddModalForDay(section.dayNumber)}
                          className="text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                        >
                          + Tambah aktiviti
                        </button>
                      )}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Accidental Delete Confirmation Modal */}
      {itemToDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setItemToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Padam Aktiviti?</h4>
              <p className="text-xs text-slate-600 line-clamp-2 px-2">
                Adakah anda pasti ingin memadam <strong>&ldquo;{itemToDelete.title}&rdquo;</strong>?
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmDelete();
                }}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Smart Organiser Modal */}
      <OrganisePlanModal
        isOpen={isOrganiseModalOpen}
        onClose={() => setIsOrganiseModalOpen(false)}
        stay={stay}
        agendaItems={activeAgendaItems}
        onApplyDistribution={batchUpdateAgendaItems}
      />

      {/* Activity Library (Pautan Pantas) Modal */}
      <ActivityLibraryModal
        isOpen={isInternalLibraryOpen}
        onClose={() => setIsInternalLibraryOpen(false)}
      />
    </div>
  );
};
