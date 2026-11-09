import React, { useState, useEffect, useRef } from 'react';
import { Download, FileSpreadsheet, X } from 'lucide-react';

/**
 * Reusable modal for customizing CSV file name prior to download.
 *
 * @param {boolean} isOpen - Whether modal is open
 * @param {string} defaultFileName - Initial suggested file name (e.g., 'ChitFund_Collections_2026-11-09')
 * @param {string} title - Optional title (defaults to "Export CSV Report")
 * @param {string} description - Optional description
 * @param {function} onClose - Cancel/close handler
 * @param {function} onExport - Callback receiving the sanitized full file name (with .csv)
 */
export default function ExportCsvModal({
  isOpen,
  defaultFileName = 'Export_Report',
  title = 'Export CSV Report',
  description = 'Enter a custom file name for your exported spreadsheet',
  onClose,
  onExport,
}) {
  // Strip existing .csv extension for the input box
  const sanitizeInitialName = (name) => {
    if (!name) return 'Export_Report';
    return String(name).replace(/\.csv$/i, '').trim();
  };

  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const clean = sanitizeInitialName(defaultFileName);
      setFileName(clean);
      // Autofocus and select text on open
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, defaultFileName]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanName = (fileName || '').trim() || sanitizeInitialName(defaultFileName) || 'Report';
    const finalFileName = cleanName.toLowerCase().endsWith('.csv') ? cleanName : `${cleanName}.csv`;
    if (typeof onExport === 'function') {
      onExport(finalFileName);
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 text-left transform transition-all animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="custom-csv-filename"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading mb-1.5"
            >
              File Name
            </label>
            <div className="relative flex items-center">
              <input
                id="custom-csv-filename"
                ref={inputRef}
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name"
                className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
              />
              <span className="absolute right-3 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 pointer-events-none font-mono">
                .csv
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              Will save as: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                {(fileName.trim() || 'Report').replace(/\.csv$/i, '')}.csv
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer font-heading"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

