'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import axios, { isCancel } from 'axios';
import {
  initiateMultipartUpload,
  completeMultipartUpload,
  abortMultipartUpload,
} from '@/lib/actions/file/multipart-upload.action';
import { MAX_CONCURRENT, MAX_RETRIES, PART_SIZE } from '@darnozom/shared-types';

/** Thrown when the user cancels an in-progress multipart upload (do not toast as a failure). */
export class MultipartUploadCancelledError extends Error {
  override readonly name = 'MultipartUploadCancelledError';
  constructor() {
    super('Upload cancelled');
    Object.setPrototypeOf(this, MultipartUploadCancelledError.prototype);
  }
}

export function isMultipartUploadCancelled(error: unknown): boolean {
  return error instanceof MultipartUploadCancelledError;
}

// ── Types ────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error';

interface UploadOptions {
  isPublic?: boolean;
  /** Student assignment multipart initiate: sent with enrollmentId. */
  contentId?: string;
  enrollmentId?: string;
}

interface UseMultipartUploadReturn {
  progress: number;
  status: UploadStatus;
  error: string | null;
  upload: (file: File, key: string, options?: UploadOptions) => Promise<string | undefined>;
  abort: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Hook ─────────────────────────────────────────────────────────

export function useMultipartUpload(): UseMultipartUploadReturn {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const userAbortedRef = useRef(false);
  const uploadIdRef = useRef<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const completedPartsRef = useRef<Map<number, string>>(new Map());
  const totalPartsRef = useRef(0);
  const fileSizeRef = useRef(0);
  const inProgressRef = useRef<Map<number, number>>(new Map());

  const updateProgress = useCallback(() => {
    const total = fileSizeRef.current;
    const partCount = totalPartsRef.current;
    if (total === 0 || partCount === 0) return;
    let completedBytes = 0;
    for (const partNum of completedPartsRef.current.keys()) {
      completedBytes += partNum < partCount ? PART_SIZE : total - (partCount - 1) * PART_SIZE;
    }
    let inProgressBytes = 0;
    for (const bytes of inProgressRef.current.values()) {
      inProgressBytes += bytes;
    }
    let pct = Math.round(((completedBytes + inProgressBytes) / total) * 100);
    if (pct === 0 && (completedPartsRef.current.size > 0 || inProgressRef.current.size > 0)) {
      pct = 1;
    }
    setProgress(Math.min(100, pct));
  }, []);

  const uploadSinglePart = useCallback(
    async (
      file: File,
      partNumber: number,
      url: string,
      signal: AbortSignal,
      onPartProgress: (partNumber: number, bytesLoaded: number) => void,
      onPartComplete: (partNumber: number) => void
    ): Promise<{ PartNumber: number; ETag: string }> => {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const chunk = file.slice(start, end);

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (signal.aborted) {
          throw new DOMException('Upload aborted', 'AbortError');
        }

        try {
          const response = await axios.put(url, chunk, {
            signal,
            headers: { 'Content-Type': 'application/octet-stream' },
            onUploadProgress: (e) => {
              if (e.loaded != null) onPartProgress(partNumber, e.loaded);
            },
            validateStatus: () => true,
          });

          onPartComplete(partNumber);

          if (response.status < 200 || response.status >= 300) {
            throw new Error(`Part ${partNumber} failed: ${response.statusText}`);
          }

          const rawEtag: string | undefined =
            (response.headers.etag as string | undefined) ??
            (response.headers as Record<string, string | undefined>).ETag;

          const etag = typeof rawEtag === 'string' ? rawEtag : undefined;

          if (!etag) {
            throw new Error(`Missing ETag header for part ${partNumber}`);
          }

          return { PartNumber: partNumber, ETag: etag };
        } catch (err) {
          onPartComplete(partNumber);

          if (signal.aborted || isCancel(err)) {
            throw new DOMException('Upload aborted', 'AbortError');
          }
          lastError = err instanceof Error ? err : new Error(String(err));

          if (attempt < MAX_RETRIES - 1) {
            const delay = Math.pow(2, attempt) * 1000;
            await sleep(delay);
          }
        }
      }

      throw lastError ?? new Error(`Failed to upload part ${partNumber}`);
    },
    []
  );

  const upload = useCallback(
    async (file: File, key: string, options?: UploadOptions): Promise<string | undefined> => {
      try {
        setStatus('uploading');
        setError(null);
        setProgress(0);
        userAbortedRef.current = false;
        completedPartsRef.current = new Map();
        inProgressRef.current = new Map();
        fileSizeRef.current = file.size;

        const result = await initiateMultipartUpload({
          key,
          contentType: file.type,
          fileSize: file.size,
          isPublic: options?.isPublic,
          contentId: options?.contentId,
          enrollmentId: options?.enrollmentId,
        });

        const partCount = result.presignedUrls.length;
        totalPartsRef.current = partCount;

        uploadIdRef.current = result.uploadId;
        keyRef.current = result.key;

        abortControllerRef.current = new AbortController();

        const urlMap = new Map(result.presignedUrls.map((p) => [p.partNumber, p.url]));

        const queueRef = { current: result.presignedUrls.map((p) => p.partNumber) };
        const getNext = (): number | undefined => queueRef.current.shift();

        const onPartProgress = (partNumber: number, bytesLoaded: number): void => {
          inProgressRef.current.set(partNumber, bytesLoaded);
          updateProgress();
        };
        const onPartComplete = (partNumber: number): void => {
          inProgressRef.current.delete(partNumber);
          updateProgress();
        };

        const worker = async (): Promise<void> => {
          // Intentional infinite loop until queue is drained
          for (;;) {
            if (abortControllerRef.current?.signal.aborted) return;

            const partNumber = getNext();
            if (partNumber === undefined) return;

            const url = urlMap.get(partNumber);
            if (!url) return;

            const signal = abortControllerRef.current?.signal;
            if (!signal) return;

            const completed = await uploadSinglePart(
              file,
              partNumber,
              url,
              signal,
              onPartProgress,
              onPartComplete
            );
            completedPartsRef.current.set(completed.PartNumber, completed.ETag);
            updateProgress();
          }
        };

        const workerCount = Math.min(MAX_CONCURRENT, partCount);
        const workers = Array.from({ length: workerCount }, () => worker());
        await Promise.all(workers);

        if (userAbortedRef.current) {
          throw new MultipartUploadCancelledError();
        }

        // Complete the upload: sort by PartNumber and ensure we have all parts
        const parts = [...completedPartsRef.current.entries()]

          .map(([PartNumber, ETag]) => ({ PartNumber, ETag }))
          .toSorted((a, b) => a.PartNumber - b.PartNumber);

        if (parts.length !== partCount) {
          setError(
            `Upload incomplete: ${parts.length}/${partCount} parts. One or more parts failed after retries.`
          );
          setStatus('error');
          return undefined;
        }

        await completeMultipartUpload({
          key: result.key,
          uploadId: result.uploadId,
          parts,
        });

        setProgress(100);
        setStatus('completed');
        return result.key;
      } catch (err) {
        if (err instanceof MultipartUploadCancelledError) {
          setStatus('idle');
          setProgress(0);
          setError(null);
          throw err;
        }
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStatus('idle');
          setProgress(0);
          if (userAbortedRef.current) {
            setError(null);
            throw new MultipartUploadCancelledError();
          }
          return undefined;
        }
        if (isCancel(err) && userAbortedRef.current) {
          setStatus('idle');
          setProgress(0);
          setError(null);
          throw new MultipartUploadCancelledError();
        }
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        setStatus('error');
        return undefined;
      }
    },
    [uploadSinglePart, updateProgress]
  );

  const abort = useCallback(async () => {
    userAbortedRef.current = true;
    abortControllerRef.current?.abort();

    const currentKey = keyRef.current;
    const currentUploadId = uploadIdRef.current;

    if (currentKey && currentUploadId) {
      try {
        await abortMultipartUpload({ key: currentKey, uploadId: currentUploadId });
      } catch {
        // Best-effort S3 cleanup
      }
    }

    uploadIdRef.current = null;
    keyRef.current = null;
    completedPartsRef.current = new Map();
    setStatus('idle');
    setProgress(0);
    setError(null);
  }, []);

  // Cleanup on unmount: abort any in-flight upload
  useEffect(() => {
    return () => {
      const controller = abortControllerRef.current;
      const currentKey = keyRef.current;
      const currentUploadId = uploadIdRef.current;

      if (controller && !controller.signal.aborted) {
        controller.abort();
      }

      if (currentKey && currentUploadId) {
        abortMultipartUpload({ key: currentKey, uploadId: currentUploadId }).catch(() => {
          /* best-effort cleanup */
        });
      }
    };
  }, []);

  return { progress, status, error, upload, abort };
}
