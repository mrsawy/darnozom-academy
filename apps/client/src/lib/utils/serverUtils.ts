'use server';
import { cookies } from 'next/headers';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { createAuthorizedNatsRequest } from './createNatsRequest';

export interface GetUploadUrlResult {
  uploadUrl: string;
  fileKey: string;
}

export async function getCookie(name: string) {
  return (await cookies()).get(name)?.value;
}
export async function setCookie(name: string, value: string, config?: Partial<ResponseCookie>) {
  return (await cookies()).set(name, value, config);
}
export async function removeCookie(name: string) {
  return (await cookies()).delete(name);
}

export async function getAllCookies() {
  return (await cookies()).getAll();
}
/**
 * Get a presigned upload URL from the server (S3) via NATS.
 *
 * @param fileKey - the key/path for the file (e.g. "org/courses/name/file.jpg")
 * @param fileType - MIME type
 * @param fileSize - file size in bytes (used for validation on server)
 * @param isPrivate - if true, object is private; otherwise public-read
 * @returns { uploadUrl, fileKey } - presigned URL and normalized file key from server
 */
export async function getUploadUrl(
  fileKey: string,
  fileType: string,
  fileSize: number,
  isPrivate = false
): Promise<GetUploadUrlResult> {
  const result = await createAuthorizedNatsRequest<GetUploadUrlResult & { expiresAt?: Date }>(
    'file.getPreSignedUrl',
    {
      fileKey,
      fileType,
      fileSize,
      isPublic: !isPrivate,
    }
  );
  if ('err' in result) throw new Error(result.err.message);
  return { uploadUrl: result.uploadUrl, fileKey: result.fileKey };
}

/**
 * Delete an object from S3 by its key
 */
export async function deleteFromS3(objectKey: string) {
  try {
    await createAuthorizedNatsRequest('file.deleteFile', { fileKey: objectKey });
  } catch (error) {
    // eslint-disable-next-line  no-console
    console.error(error);
    throw new Error('Failed to delete file from S3');
  }
}
