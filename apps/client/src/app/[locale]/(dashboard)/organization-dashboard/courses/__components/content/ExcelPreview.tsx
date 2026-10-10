'use client';

import BasicLoader from '@/components/atoms/basic-loader';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface ExcelPreviewProps {
  file: File;
  className?: string;
  maxRows?: number;
}

type SheetData = string[][];

/**
 * Renders an Excel file (XLS/XLSX) first sheet as a table using SheetJS (client-side).
 */
export default function ExcelPreview({ file, className, maxRows = 50 }: ExcelPreviewProps) {
  const t = useTranslations('CreateContentForm');
  const [data, setData] = useState<SheetData | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setSheetName(null);

    void (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (cancelled) return;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setError(t('attachmentContent.previewError'));
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: '',
          raw: false,
        });
        if (!cancelled) {
          setSheetName(firstSheetName);
          setData(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('attachmentContent.previewError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, t]);

  if (loading) {
    return (
      <div
        className={className}
        style={{ minHeight: 200 }}
        role="status"
        aria-label={t('attachmentContent.loading')}>
        <BasicLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} role="alert">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={className}>
        <p className="text-muted-foreground text-sm">{t('attachmentContent.previewEmpty')}</p>
      </div>
    );
  }

  const displayRows = data.slice(0, maxRows);
  const headers = displayRows[0] ?? [];
  const bodyRows = displayRows.slice(1);

  return (
    <div className={className} style={{ maxHeight: 400, overflow: 'auto' }}>
      {sheetName ? <p className="text-muted-foreground mb-2 text-xs">{sheetName}</p> : null}
      <div className="rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((cell, i) => (
                <th
                  key={i}
                  className="border-border bg-muted/50 border px-2 py-1.5 text-left font-medium">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((_, colIndex) => (
                  <td key={colIndex} className="border-border border px-2 py-1.5">
                    {row[colIndex] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > maxRows ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {t('attachmentContent.previewTruncated', { count: maxRows })}
        </p>
      ) : null}
    </div>
  );
}
