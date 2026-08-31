import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  FileCheck,
  Eye,
  ArrowRight,
  Database,
  Info,
  Check,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import {
  generateApplicationCsv,
  createDataBackupPayload,
  validateBackupPayload,
  auditDuplicateRecords,
  parseRawCsvText,
  validateCsvRows,
  DuplicateAuditReport,
  CsvValidationResult,
  ValidatedCsvRow
} from '../utils/dataSafety';

interface DataSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'overview' | 'export_csv' | 'backup_data' | 'audit_duplicates' | 'import_csv';
}

export const DataSafetyModal: React.FC<DataSafetyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'overview'
}) => {
  const {
    stays,
    activeStay,
    agendaItems,
    checklistItems,
    importCsvRows,
    restoreDataBackup,
    deleteDuplicateItems,
    isSyncing,
    refreshFromCloud
  } = useStay();

  const { requireAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'export_csv' | 'backup_data' | 'audit_duplicates' | 'import_csv'>(initialTab);

  // Status & Feedback messages
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');

  // 1. Export CSV State
  const [csvScope, setCsvScope] = useState<'active' | 'all'>('active');

  // 2. Backup Data State
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [stagedBackup, setStagedBackup] = useState<{
    rawText: string;
    summary: { staysCount: number; agendaCount: number; checklistCount: number; date: string };
  } | null>(null);

  // 3. Duplicate Audit State
  const [auditReport, setAuditReport] = useState<DuplicateAuditReport | null>(null);
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<{
    agendaIds: string[];
    checklistIds: string[];
    stayIds: string[];
  }>({ agendaIds: [], checklistIds: [], stayIds: [] });

  // 4. Import CSV State
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvValidation, setCsvValidation] = useState<CsvValidationResult | null>(null);
  const [importFilter, setImportFilter] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');
  const [importConflictMode, setImportConflictMode] = useState<'skip_duplicates' | 'import_all_valid'>('skip_duplicates');

  // Reset tab when reopened with initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFeedback(null);
      // Run quick scan when opening modal
      runDuplicateScan();
    }
  }, [isOpen, initialTab, stays, agendaItems, checklistItems]);

  if (!isOpen) return null;

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // ----------------------------------------------------------------------------------
  // FUNCTION 1: SIMPAN CSV
  // ----------------------------------------------------------------------------------
  const handleDownloadCsv = () => {
    if (stays.length === 0) {
      showToast('error', 'Tiada rekod data pengguna untuk disimpan ke CSV.');
      return;
    }

    try {
      setIsProcessing(true);
      const targetStayId = csvScope === 'active' && activeStay ? activeStay.id : undefined;
      const csvString = generateApplicationCsv(stays, agendaItems, checklistItems, targetStayId);

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateSlug = new Date().toISOString().split('T')[0];
      const nameSlug = csvScope === 'active' && activeStay ? activeStay.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'semua_rancangan';

      link.href = url;
      link.setAttribute('download', `mystay_${nameSlug}_${dateSlug}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Fail CSV telah berjaya dimuat turun dengan format UTF-8 standard.');
    } catch (err: any) {
      showToast('error', 'Gagal menghasilkan fail CSV: ' + (err?.message || 'Ralat tidak diketahui'));
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------------------------------------
  // FUNCTION 2: BACKUP DATA
  // ----------------------------------------------------------------------------------
  const handleDownloadBackup = () => {
    if (stays.length === 0) {
      showToast('error', 'Tiada rekod data pengguna untuk disandarkan.');
      return;
    }

    try {
      setIsProcessing(true);
      const payload = createDataBackupPayload(stays, agendaItems, checklistItems, activeStay ? activeStay.id : null);
      const jsonStr = JSON.stringify(payload, null, 2);

      const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateSlug = new Date().toISOString().split('T')[0];

      link.href = url;
      link.setAttribute('download', `mystay-backup-${dateSlug}.mystay`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Salinan Backup Data berjaya dimuat turun untuk pemulihan luar talian.');
    } catch (err: any) {
      showToast('error', 'Gagal memuat turun backup: ' + (err?.message || 'Ralat tidak diketahui'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const validation = validateBackupPayload(text);
      if (!validation.isValid || !validation.summary) {
        showToast('error', validation.error || 'Fail sandaran tidak sah.');
        return;
      }
      setStagedBackup({
        rawText: text,
        summary: validation.summary
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCommitRestoreBackup = () => {
    if (!stagedBackup) return;

    requireAdmin(async () => {
      try {
        setIsProcessing(true);
        const validation = validateBackupPayload(stagedBackup.rawText);
        if (!validation.isValid || !validation.payload) {
          showToast('error', 'Fail sandaran tidak sah.');
          return;
        }

        const res = await restoreDataBackup(validation.payload);
        setStagedBackup(null);
        showToast('success', res.message);
      } catch (err: any) {
        showToast('error', 'Gagal memulihkan data: ' + (err?.message || 'Ralat pelayan'));
      } finally {
        setIsProcessing(false);
      }
    }, 'Sahkan PIN Admin untuk memulihkan data daripada sandaran.');
  };

  // ----------------------------------------------------------------------------------
  // FUNCTION 3: AUDIT DUPLIKASI
  // ----------------------------------------------------------------------------------
  const runDuplicateScan = () => {
    const report = auditDuplicateRecords(stays, agendaItems, checklistItems);
    setAuditReport(report);

    // Pre-select all duplicate candidates for easy review
    const allDupAgenda: string[] = [];
    const allDupChecklist: string[] = [];
    const allDupStays: string[] = [];

    report.groups.forEach((g) => {
      if (g.type === 'agenda') {
        allDupAgenda.push(...g.duplicateIds);
      } else if (g.type === 'checklist') {
        allDupChecklist.push(...g.duplicateIds);
      } else if (g.type === 'stay') {
        allDupStays.push(...g.duplicateIds);
      }
    });

    setSelectedDuplicateIds({
      agendaIds: allDupAgenda,
      checklistIds: allDupChecklist,
      stayIds: allDupStays
    });
  };

  const handleToggleDuplicateSelection = (type: 'agenda' | 'checklist' | 'stay', id: string) => {
    setSelectedDuplicateIds((prev) => {
      const key = type === 'agenda' ? 'agendaIds' : type === 'checklist' ? 'checklistIds' : 'stayIds';
      const exists = prev[key].includes(id);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((itemId) => itemId !== id) : [...prev[key], id]
      };
    });
  };

  const handleRemoveSelectedDuplicates = () => {
    const totalCount =
      selectedDuplicateIds.agendaIds.length +
      selectedDuplicateIds.checklistIds.length +
      selectedDuplicateIds.stayIds.length;

    if (totalCount === 0) {
      showToast('info', 'Tiada rekod duplikasi yang dipilih.');
      return;
    }

    requireAdmin(async () => {
      try {
        setIsProcessing(true);
        const res = await deleteDuplicateItems(selectedDuplicateIds);
        showToast('success', res.message);
        runDuplicateScan();
      } catch (err: any) {
        showToast('error', 'Gagal membuang duplikasi: ' + (err?.message || 'Ralat'));
      } finally {
        setIsProcessing(false);
      }
    }, `Sahkan PIN Admin untuk memadamkan ${totalCount} rekod duplikasi terpilih.`);
  };

  // ----------------------------------------------------------------------------------
  // FUNCTION 4: IMPORT CSV
  // ----------------------------------------------------------------------------------
  const handleSelectCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedRows = parseRawCsvText(text);
      const validation = validateCsvRows(
        parsedRows,
        stays,
        agendaItems,
        checklistItems,
        activeStay ? activeStay.id : undefined
      );
      setCsvValidation(validation);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCommitCsvImport = () => {
    if (!csvValidation || csvValidation.validCount === 0) {
      showToast('error', 'Tiada rekod sah yang sedia diimport.');
      return;
    }

    requireAdmin(async () => {
      try {
        setIsProcessing(true);
        const rowsToImport = csvValidation.rows.filter((r) => {
          if (r.status === 'valid') return true;
          if (r.status === 'duplicate' && importConflictMode === 'import_all_valid') {
            return false; // Skip duplicates
          }
          return false;
        });

        const res = await importCsvRows(
          rowsToImport,
          activeStay ? activeStay.id : undefined,
          (msg) => setProgressMsg(msg)
        );

        showToast('success', res.message);
        setCsvValidation(null);
        setCsvFileName('');
      } catch (err: any) {
        showToast('error', 'Gagal mengimport fail CSV: ' + (err?.message || 'Ralat pelayan'));
      } finally {
        setIsProcessing(false);
        setProgressMsg('');
      }
    }, `Sahkan PIN Admin untuk mengimport ${csvValidation.validCount} rekod ke dalam MyStay.`);
  };

  return (
    <div
      id="data-safety-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="data-safety-modal-container"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/10 border border-teal-600/20 flex items-center justify-center text-teal-700">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Data Safety & Portability
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-extrabold uppercase tracking-wider">
                  SES v4.4
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Pengurusan sandaran, eksport/import CSV dan semakan integriti data MyStay.
              </p>
            </div>
          </div>

          <button
            id="data-safety-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="px-4 sm:px-6 border-b border-slate-200 bg-white flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs font-bold py-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pusat Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export_csv')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'export_csv'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Simpan CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup_data')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'backup_data'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup Data</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('audit_duplicates');
              runDuplicateScan();
            }}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'audit_duplicates'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Audit Duplikasi</span>
            {auditReport && auditReport.totalDuplicatesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
                {auditReport.totalDuplicatesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import_csv')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'import_csv'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Toast Notification Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-blue-50 text-blue-900 border-blue-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : feedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 0: OVERVIEW (FOUR STANDARD ACTION BUTTONS AS REQUIRED BY SES 4.4) */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Context Summary Banner */}
              <div className="p-4 rounded-2xl bg-teal-950 text-white space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                      Prinsip Asas Data Safety
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Pengguna tidak perlu memasukkan semula data yang sama.
                    </h3>
                  </div>
                  <div className="text-right text-xs text-teal-200 font-medium">
                    <p>{stays.length} Rancangan</p>
                    <p>{agendaItems.length} Aktiviti • {checklistItems.length} Item</p>
                  </div>
                </div>
                <p className="text-[11px] text-teal-100 leading-relaxed max-w-2xl">
                  Platform MyStay dilengkapi dengan keselamatan sandaran dan portabiliti penuh. Data anda selamat, mudah dialihkan ke fail CSV, dan boleh dipulihkan pada bila-bila masa.
                </p>
              </div>

              {/* Required 4 Actions Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Simpan CSV */}
                <button
                  id="btn-simpan-csv"
                  type="button"
                  onClick={() => setActiveTab('export_csv')}
                  className="p-4 rounded-2xl bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-300 text-left shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Download className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-teal-700 font-bold">↓</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-teal-950">
                      Simpan CSV
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                      Eksport jadual perjalanan & senarai semak pengguna ke dalam fail CSV standard untuk Excel atau Google Sheets.
                    </p>
                  </div>
                </button>

                {/* 2. Backup Data */}
                <button
                  id="btn-backup-data"
                  type="button"
                  onClick={() => setActiveTab('backup_data')}
                  className="p-4 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 text-left shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Database className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-blue-700 font-bold">▣</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-950">
                      Backup Data
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                      Buat salinan sandaran lengkap data pengguna untuk pemulihan kecemasan atau migrasi peranti tanpa sambungan awan.
                    </p>
                  </div>
                </button>

                {/* 3. Audit Duplikasi */}
                <button
                  id="btn-audit-duplikasi"
                  type="button"
                  onClick={() => {
                    setActiveTab('audit_duplicates');
                    runDuplicateScan();
                  }}
                  className="p-4 rounded-2xl bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 text-left shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-amber-700 font-bold">♢</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-950">
                        Audit Duplikasi
                      </h4>
                      {auditReport && auditReport.totalDuplicatesCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                          {auditReport.totalDuplicatesCount} dikesan
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                      Semak dan kesan rekod berulang atau bertindih secara automatik dengan selamat tanpa memadam data sedia ada.
                    </p>
                  </div>
                </button>

                {/* 4. Import CSV */}
                <button
                  id="btn-import-csv"
                  type="button"
                  onClick={() => setActiveTab('import_csv')}
                  className="p-4 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-emerald-700 font-bold">↑</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-950">
                      Import CSV
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                      Muat naik data CSV terus ke MyStay dengan pra-semakan kesahihan, pengesanan duplikasi dan resolusi konflik.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: SIMPAN CSV */}
          {/* ========================================================================= */}
          {activeTab === 'export_csv' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Konfigurasi Eksport CSV
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fail CSV yang dijana mengandungi semua medan penting (Aktiviti, Slot Masa, Status, Senarai Semak & Maklumat Penginapan) dan mematuhi standard RFC 4180 dengan pengekodan UTF-8.
                </p>

                {/* Scope Selection */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700">Skop Data:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        csvScope === 'active'
                          ? 'bg-teal-50/70 border-teal-300 text-teal-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="csvScope"
                        checked={csvScope === 'active'}
                        onChange={() => setCsvScope('active')}
                        disabled={!activeStay}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <div className="text-xs min-w-0">
                        <p className="truncate">Rancangan Semasa: {activeStay?.title || 'Tiada'}</p>
                        <p className="text-[10px] text-slate-500 font-normal">
                          Eksport aktiviti & senarai semak bagi rancangan aktif sahaja
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        csvScope === 'all'
                          ? 'bg-teal-50/70 border-teal-300 text-teal-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="csvScope"
                        checked={csvScope === 'all'}
                        onChange={() => setCsvScope('all')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <div className="text-xs min-w-0">
                        <p className="truncate">Semua Rancangan ({stays.length} rancangan)</p>
                        <p className="text-[10px] text-slate-500 font-normal">
                          Eksport keseluruhan pangkalan data peribadi anda
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={isProcessing || stays.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isProcessing ? 'Menjana Fail...' : 'Muat Turun Fail CSV'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BACKUP DATA (OFFLINE RECOVERY) */}
          {/* ========================================================================= */}
          {activeTab === 'backup_data' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Download Backup Card */}
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-900">
                      <Download className="w-4 h-4 text-blue-700" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Cipta Salinan Sandaran</h4>
                    </div>
                    <p className="text-xs text-blue-950 font-medium leading-relaxed">
                      Muat turun sandaran lengkap (.mystay) yang mengandungi semua rancangan, aktiviti dan senarai semak anda untuk disimpan secara selamat di luar talian.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isProcessing || stays.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Muat Turun Backup Data</span>
                  </button>
                </div>

                {/* 2. Restore Backup Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Upload className="w-4 h-4 text-slate-700" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Pulihkan daripada Sandaran</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pilih fail sandaran MyStay yang disimpan sebelum ini untuk memulihkan keseluruhan data ke pangkalan data peribadi anda.
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={backupFileInputRef}
                    onChange={handleSelectBackupFile}
                    accept=".mystay,.backup,.json"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih Fail Sandaran</span>
                  </button>
                </div>
              </div>

              {/* Staged Restore Confirmation Area */}
              {stagedBackup && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      Pratonton & Pengesahan Pemulihan Data
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-amber-950 font-bold">
                    <div className="p-2 bg-white/80 rounded-lg border border-amber-200">
                      <p className="text-[10px] text-amber-700 font-normal">Rancangan</p>
                      <p className="text-sm">{stagedBackup.summary.staysCount}</p>
                    </div>
                    <div className="p-2 bg-white/80 rounded-lg border border-amber-200">
                      <p className="text-[10px] text-amber-700 font-normal">Aktiviti</p>
                      <p className="text-sm">{stagedBackup.summary.agendaCount}</p>
                    </div>
                    <div className="p-2 bg-white/80 rounded-lg border border-amber-200">
                      <p className="text-[10px] text-amber-700 font-normal">Senarai Semak</p>
                      <p className="text-sm">{stagedBackup.summary.checklistCount}</p>
                    </div>
                    <div className="p-2 bg-white/80 rounded-lg border border-amber-200">
                      <p className="text-[10px] text-amber-700 font-normal">Tarikh Sandaran</p>
                      <p className="text-sm">{stagedBackup.summary.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStagedBackup(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitRestoreBackup}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      {isProcessing ? 'Memulihkan Data...' : 'Sahkan & Pulihkan Data Sekarang'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AUDIT DUPLIKASI (DETECTION & REVIEW ONLY - NO AUTO DELETE) */}
          {/* ========================================================================= */}
          {activeTab === 'audit_duplicates' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Status Semakan Integriti
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        auditReport && auditReport.totalDuplicatesCount > 0
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {auditReport && auditReport.totalDuplicatesCount > 0
                        ? `${auditReport.totalDuplicatesCount} Rekod Duplikasi Dijumpai`
                        : 'Tiada Duplikasi Dijumpai'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Diimbas: {auditReport?.scannedCount.stays || 0} rancangan,{' '}
                    {auditReport?.scannedCount.agenda || 0} aktiviti,{' '}
                    {auditReport?.scannedCount.checklist || 0} item senarai semak.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={runDuplicateScan}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Imbas Semula</span>
                </button>
              </div>

              {/* Duplicate Groups List */}
              {auditReport && auditReport.groups.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-slate-500 font-medium">
                      Pilih rekod duplikasi yang ingin dibuang (Rekod asal dikekalkan):
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveSelectedDuplicates}
                      disabled={
                        isProcessing ||
                        selectedDuplicateIds.agendaIds.length +
                          selectedDuplicateIds.checklistIds.length +
                          selectedDuplicateIds.stayIds.length ===
                          0
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Buang Duplikasi Terpilih</span>
                    </button>
                  </div>

                  {auditReport.groups.map((group) => (
                    <div
                      key={group.groupId}
                      className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                            {group.type === 'agenda'
                              ? 'Aktiviti'
                              : group.type === 'checklist'
                              ? 'Senarai Semak'
                              : 'Rancangan'}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900">
                            {group.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {group.stayTitle} • {group.reason}
                          </p>
                        </div>
                      </div>

                      {/* Items in duplicate cluster */}
                      <div className="space-y-1.5 pt-1">
                        {group.items.map((item, idx) => {
                          const isPrimary = item.id === group.primaryId;
                          const isSelectedForDeletion =
                            (group.type === 'agenda' && selectedDuplicateIds.agendaIds.includes(item.id)) ||
                            (group.type === 'checklist' && selectedDuplicateIds.checklistIds.includes(item.id)) ||
                            (group.type === 'stay' && selectedDuplicateIds.stayIds.includes(item.id));

                          return (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                                isPrimary
                                  ? 'bg-slate-50/70 border-slate-200'
                                  : isSelectedForDeletion
                                  ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                                  : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                  #{idx + 1}
                                </span>
                                <div className="truncate">
                                  <p className="font-bold truncate">{item.title}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{item.detail}</p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isPrimary ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                                    Rekod Utama (Kekal)
                                  </span>
                                ) : (
                                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-rose-700">
                                    <input
                                      type="checkbox"
                                      checked={isSelectedForDeletion}
                                      onChange={() => handleToggleDuplicateSelection(group.type, item.id)}
                                      className="rounded text-rose-600 focus:ring-rose-500"
                                    />
                                    <span>Tanda Buang</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-950">Integriti Data Sempurna</h4>
                  <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                    Tiada duplikasi dikesan. Semua rancangan, aktiviti dan senarai semak anda tersusun rapi.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: IMPORT CSV (PARSING, VALIDATION & SAFE COMMIT) */}
          {/* ========================================================================= */}
          {activeTab === 'import_csv' && (
            <div className="space-y-5">
              {/* File Upload Stage */}
              {!csvValidation ? (
                <div className="p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/50 text-center space-y-4 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      Pilih Fail CSV untuk Diimport
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Sokongan fail CSV standard MyStay atau format spreadsheet biasa. Data akan disemak dan disahkan sebelum dimasukkan.
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={csvFileInputRef}
                    onChange={handleSelectCsvFile}
                    accept=".csv,text/csv"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => csvFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih Fail CSV</span>
                  </button>
                </div>
              ) : (
                /* Validation & Review Stage */
                <div className="space-y-4 animate-in fade-in">
                  {/* Summary Bar */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                        Hasil Semakan Fail: {csvFileName}
                      </p>
                      <p className="text-xs text-slate-300">
                        {csvValidation.totalRows} baris dikesan • {csvValidation.validCount} sah •{' '}
                        {csvValidation.duplicateCount} duplikasi • {csvValidation.invalidCount} tidak sah
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCsvValidation(null)}
                      className="text-xs text-slate-400 hover:text-white underline self-start sm:self-auto cursor-pointer"
                    >
                      Pilih Fail Lain
                    </button>
                  </div>

                  {/* Filter & Conflict Mode Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">Tapis:</span>
                      <button
                        type="button"
                        onClick={() => setImportFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                          importFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Semua ({csvValidation.totalRows})
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportFilter('valid')}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                          importFilter === 'valid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-900'
                        }`}
                      >
                        Sah ({csvValidation.validCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportFilter('duplicate')}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                          importFilter === 'duplicate' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-900'
                        }`}
                      >
                        Duplikasi ({csvValidation.duplicateCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportFilter('invalid')}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                          importFilter === 'invalid' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-900'
                        }`}
                      >
                        Tidak Sah ({csvValidation.invalidCount})
                      </button>
                    </div>

                    {/* Conflict Handling Option */}
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-600 font-medium">Resolusi Duplikasi:</label>
                      <select
                        value={importConflictMode}
                        onChange={(e) => setImportConflictMode(e.target.value as any)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                      >
                        <option value="skip_duplicates">Langkau Duplikasi (Disyorkan)</option>
                        <option value="import_all_valid">Abaikan Duplikasi Semasa</option>
                      </select>
                    </div>
                  </div>

                  {/* Rows Preview Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 border-b border-slate-200 w-12 text-center">Baris</th>
                          <th className="p-2.5 border-b border-slate-200">Jenis</th>
                          <th className="p-2.5 border-b border-slate-200">Tajuk Item / Rancangan</th>
                          <th className="p-2.5 border-b border-slate-200">Rancangan</th>
                          <th className="p-2.5 border-b border-slate-200">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvValidation.rows
                          .filter((r) => importFilter === 'all' || r.status === importFilter)
                          .map((row) => (
                            <tr key={row.rowNumber} className="hover:bg-slate-50/80">
                              <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">
                                {row.rowNumber}
                              </td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {row.recordType}
                                </span>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-900 truncate max-w-xs">
                                {row.itemTitle || '(Tiada Tajuk)'}
                              </td>
                              <td className="p-2.5 text-slate-600 truncate max-w-xs">
                                {row.stayTitle}
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                    row.status === 'valid'
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : row.status === 'duplicate'
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-rose-100 text-rose-900'
                                  }`}
                                  title={row.statusReason}
                                >
                                  {row.status === 'valid'
                                    ? '✓ Sah'
                                    : row.status === 'duplicate'
                                    ? '⚠️ Duplikasi'
                                    : '❌ Tidak Sah'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Commit Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      {progressMsg || `${csvValidation.validCount} rekod sah akan ditambah ke Cloud Firestore.`}
                    </p>

                    <button
                      type="button"
                      onClick={handleCommitCsvImport}
                      disabled={isProcessing || csvValidation.validCount === 0}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isProcessing ? 'Mengimport...' : 'Sahkan & Import Rekod Sah'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0 text-xs text-slate-500 font-medium">
          <span>Standard Data Safety & Portability SES v4.4 Locked</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
