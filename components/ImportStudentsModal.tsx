'use client';

import { useState, useRef } from 'react';
import Modal from './ui/Modal';
import { bulkAddStudents } from '@/lib/actions/import';
import type { ImportStudentRow } from '@/types';

const DEFAULT_BALANCE = 20000;

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classGroupId: string;
  classGroupName: string;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview';

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(String(val).replace(/[,，￥¥\s]/g, ''));
  return isNaN(n) ? null : Math.round(n);
}

async function parseFile(file: File): Promise<{ rows: ImportStudentRow[]; error: string | null }> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (raw.length === 0) return { rows: [], error: 'The file appears to be empty.' };

  // Find columns case-insensitively
  const keys = Object.keys(raw[0]);
  const nameKey = keys.find((k) => /^name$/i.test(k.trim()));
  const balanceKey = keys.find((k) => /^(balance|starting_balance|balance_yen)$/i.test(k.trim()));

  if (!nameKey) {
    return { rows: [], error: "Could not find a 'name' column. Check your file and try again." };
  }

  const rows: ImportStudentRow[] = raw.map((r) => {
    const name = String(r[nameKey] ?? '').trim();
    if (!name) return { name: '', balance_yen: DEFAULT_BALANCE, usesDefault: true, status: 'missing_name' as const };

    const rawBalance = balanceKey ? r[balanceKey] : undefined;
    const parsed = parseNumber(rawBalance);
    const usesDefault = parsed === null;
    return {
      name,
      balance_yen: usesDefault ? DEFAULT_BALANCE : parsed!,
      usesDefault,
      status: 'ok' as const,
    };
  });

  return { rows, error: null };
}

export default function ImportStudentsModal({
  isOpen,
  onClose,
  classGroupId,
  classGroupName,
  onSuccess,
}: ImportStudentsModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [parsedRows, setParsedRows] = useState<ImportStudentRow[]>([]);
  const [defaultBalance, setDefaultBalance] = useState(DEFAULT_BALANCE);
  const [parseError, setParseError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setStep('upload');
    setParsedRows([]);
    setDefaultBalance(DEFAULT_BALANCE);
    setParseError('');
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    const { rows, error } = await parseFile(file);
    if (error) {
      setParseError(error);
      return;
    }
    setParsedRows(rows);
    setStep('preview');
  }

  // Rows shown in preview with live default-balance applied
  const displayRows = parsedRows.map((r) =>
    r.status === 'missing_name' ? r : { ...r, balance_yen: r.usesDefault ? defaultBalance : r.balance_yen }
  );

  const okRows = displayRows.filter((r) => r.status === 'ok');
  const skippedCount = displayRows.filter((r) => r.status === 'missing_name').length;

  async function handleConfirm() {
    if (okRows.length === 0) return;
    setLoading(true);
    setErrorMsg('');
    const { error } = await bulkAddStudents(
      okRows.map((r) => ({ name: r.name, balance_yen: r.balance_yen })),
      classGroupId
    );
    setLoading(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    onSuccess();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Import students into ${classGroupName}`}>
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Upload a <strong className="text-foreground">.csv</strong> or{' '}
            <strong className="text-foreground">.xlsx</strong> file. Required column:{' '}
            <code className="text-primary">name</code>. Optional column:{' '}
            <code className="text-primary">balance</code> (or{' '}
            <code className="text-primary">starting_balance</code>).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:text-sm file:bg-card file:text-foreground hover:file:bg-background cursor-pointer"
          />
          {parseError && <p className="text-sm text-red-500">{parseError}</p>}
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {/* Default balance field */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-foreground whitespace-nowrap">Default starting balance (¥)</label>
            <input
              type="number"
              value={defaultBalance}
              onChange={(e) => setDefaultBalance(Number(e.target.value) || 0)}
              className="w-32 bg-card border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <span className="text-xs text-muted">applied to rows without a balance column</span>
          </div>

          {/* Summary */}
          <p className="text-sm text-muted">
            <span className="text-foreground font-medium">{okRows.length}</span> student
            {okRows.length !== 1 ? 's' : ''} ready to import
            {skippedCount > 0 && (
              <span className="text-muted">, {skippedCount} row{skippedCount !== 1 ? 's' : ''} skipped (missing name)</span>
            )}
            .
          </p>

          {/* Preview table */}
          <div className="max-h-64 overflow-y-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted">Name</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted">Balance</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayRows.map((row, i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-3 py-1.5 text-foreground">{row.name || <span className="text-muted italic">—</span>}</td>
                    <td className="px-3 py-1.5 text-right text-foreground">
                      {row.status === 'ok' ? (
                        <>
                          ¥{row.balance_yen.toLocaleString('ja-JP')}
                          {row.usesDefault && <span className="ml-1 text-muted text-xs">(default)</span>}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      {row.status === 'ok' ? (
                        <span className="text-primary text-xs">OK</span>
                      ) : (
                        <span className="text-red-500 text-xs">Missing name</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => { setStep('upload'); if (fileRef.current) fileRef.current.value = ''; }}
              className="px-3 py-1.5 text-sm border border-border rounded-lg text-muted hover:bg-background transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || okRows.length === 0}
              className="px-4 py-1.5 text-sm rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing…' : `Import ${okRows.length} student${okRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
