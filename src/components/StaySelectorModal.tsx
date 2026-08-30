import React, { useState } from 'react';
import { X, Plus, Calendar, MapPin, Check, Edit2, Copy, Trash2, Download, Sparkles, RefreshCw, CheckCircle2, Shield } from 'lucide-react';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import { STAY_TYPES } from '../utils/constants';
import { formatDateRange } from '../utils/formatters';
import { Stay } from '../types';

interface StaySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewStay: () => void;
  onEditStay: (stay: Stay) => void;
}

export const StaySelectorModal: React.FC<StaySelectorModalProps> = ({
  isOpen,
  onClose,
  onNewStay,
  onEditStay
}) => {
  const {
    stays,
    activeStayId,
    setActiveStayId,
    deleteStay,
    duplicateStay,
    exportDataJson,
    isSyncing,
    refreshFromCloud
  } = useStay();

  const { requireAdmin } = useAuth();
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRefreshCloud = async () => {
    const res = await refreshFromCloud({ forceFetch: true });
    setSyncStatusMsg(res.message);
    setTimeout(() => setSyncStatusMsg(null), 5000);
  };

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stayplan-personal-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateNew = () => {
    requireAdmin(() => {
      onClose();
      onNewStay();
    }, 'Sila sahkan PIN Admin untuk mencipta pelan stay baharu.');
  };

  const handleEdit = (stay: Stay) => {
    requireAdmin(() => {
      onClose();
      onEditStay(stay);
    }, 'Sila sahkan PIN Admin untuk mengedit maklumat stay.');
  };

  const handleDuplicate = (stayId: string) => {
    requireAdmin(async () => {
      await duplicateStay(stayId);
    }, 'Sila sahkan PIN Admin untuk menyalin stay.');
  };

  const handleDelete = (stay: Stay) => {
    requireAdmin(async () => {
      if (confirm(`Adakah anda pasti mahu memadam "${stay.title}"?`)) {
        await deleteStay(stay.id);
      }
    }, 'Sila sahkan PIN Admin untuk memadam stay.');
  };

  return (
    <div id="stay-selector-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="stay-selector-container"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8 space-y-6 text-slate-900"
      >
        {/* Close Button */}
        <button
          id="stay-selector-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Koleksi Stay Peribadi Saya
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 text-teal-950 border border-teal-200 inline-flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-teal-600" />
                Personal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Semua perancangan short stay anda disimpan dan diselaraskan secara langsung ke Firestore.
            </p>
          </div>

          <button
            id="modal-create-stay-btn"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Stay Baharu</span>
          </button>
        </div>

        {/* Stays List */}
        <div className="space-y-3">
          {stays.map((stay) => {
            const isActive = stay.id === activeStayId;
            const typeMeta = STAY_TYPES[stay.type] || STAY_TYPES.custom;

            return (
              <div
                key={stay.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-teal-50/60 border-teal-400 ring-2 ring-teal-400/20'
                    : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div
                  className="flex items-start gap-3.5 cursor-pointer flex-1"
                  onClick={() => {
                    setActiveStayId(stay.id);
                    onClose();
                  }}
                >
                  <span className="text-2xl p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    {typeMeta.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{stay.title}</h3>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-teal-600 text-white">
                          <Check className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {stay.location || 'Tiada lokasi'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateRange(stay.startDate, stay.endDate, stay.durationDays)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar (Right of Card) */}
                <div className="flex items-center justify-end gap-1.5 self-end sm:self-center">
                  {!isActive && (
                    <button
                      onClick={() => {
                        setActiveStayId(stay.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Buka
                    </button>
                  )}

                  <button
                    onClick={() => handleEdit(stay)}
                    title="Edit Stay"
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(stay.id)}
                    title="Salin / Duplikasi Stay"
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(stay)}
                    title="Padam Stay"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {stays.length === 0 && (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <Sparkles className="w-8 h-8 text-teal-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-800">Belum Ada Stay Peribadi</p>
                <p className="text-xs text-slate-500 mt-1">
                  Mulakan dengan mencipta perancangan short stay pertama anda.
                </p>
              </div>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                + Cipta Stay Baharu
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions: Cloud Sync & Backup Export */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshCloud}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyelaras...' : 'Refresh dari Cloud'}</span>
            </button>
            {syncStatusMsg && (
              <span className="text-teal-700 font-semibold text-[11px] inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {syncStatusMsg}
              </span>
            )}
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium cursor-pointer"
            title="Muat turun salinan sandaran JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Eksport Sandaran JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
