import {
  initiateMultipartUpload,
  completeMultipartUpload,
  abortMultipartUpload,
} from '@/lib/actions/file/multipart-upload.action';
import { PART_SIZE, MAX_RETRIES } from '@lms-organization/shared-types';

/**
 * Upload a file using S3 multipart upload (initiate → upload parts → complete).
 * Uses server-backed presigned URLs via NATS.
 */
export const uploadFile = async (
  fileContents: ArrayBuffer,
  fileName: string,
  mimeType: string,
  isPrivate = false
): Promise<string> => {
  const fileSize = fileContents.byteLength;
  let uploadId: string | null = null;
  let key: string | null = null;

  try {
    const init = await initiateMultipartUpload({
      key: fileName,
      contentType: mimeType,
      fileSize,
      isPublic: !isPrivate,
    });
    uploadId = init.uploadId;
    key = init.key;

    const parts: { PartNumber: number; ETag: string }[] = [];

    for (const { partNumber, url } of init.presignedUrls) {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, fileSize);
      const chunk = fileContents.slice(start, end);

      let lastError: Error | null = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: chunk,
          });
          if (!response.ok) {
            throw new Error(`Part ${partNumber}: ${response.statusText}`);
          }
          const etag = response.headers.get('etag') ?? response.headers.get('ETag');
          if (!etag) {
            throw new Error(`Missing ETag for part ${partNumber}`);
          }
          parts.push({ PartNumber: partNumber, ETag: etag.trim().replaceAll(/^"|"$/g, '') });
          lastError = null;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          }
        }
      }
      if (lastError) {
        throw lastError;
      }
    }

    await completeMultipartUpload({
      key: init.key,
      uploadId: init.uploadId,
      parts: parts.toSorted((a, b) => a.PartNumber - b.PartNumber),
    });

    return init.key;
  } catch (error) {
    if (key && uploadId) {
      try {
        await abortMultipartUpload({ key, uploadId });
      } catch {
        // best-effort cleanup
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Error Uploading';
    throw new Error(errorMessage);
  }
};
