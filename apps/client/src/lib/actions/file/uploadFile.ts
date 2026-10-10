import { getPresignedUrl } from './getPreSignedUrl';
import { getAuthUser } from '../user/user.action';
import { slugify } from '@/lib/utils/slugify';

export interface UploadFileOptions {
  file: File;
  fileKey?: string;
  isPublic?: boolean;
  customPath?: string;
}

/**
 * Uploads a file to S3 using presigned URL
 * @param options - Upload options including file, optional fileKey, isPublic flag, and custom path
 * @returns The fileKey of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadFileToS3({
  file,
  fileKey,
  isPublic = false,
  customPath,
}: UploadFileOptions): Promise<string> {
  try {
    const user = await getAuthUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate fileKey if not provided
    let finalFileKey = fileKey;
    if (!finalFileKey) {
      // Extract file extension and base name
      const lastDotIndex = file.name.lastIndexOf('.');
      const fileExtension = lastDotIndex > 0 ? file.name.slice(lastDotIndex + 1) : '';
      const baseFileName = lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;
      const slugifiedBaseName = slugify(baseFileName);

      // Construct filename with extension
      const fileName = fileExtension ? `${slugifiedBaseName}.${fileExtension}` : slugifiedBaseName;

      // Default path structure
      finalFileKey = customPath
        ? `${customPath}/${globalThis.crypto.randomUUID()}_${fileName}`
        : `${user.organization?.slug}/files/${globalThis.crypto.randomUUID()}_${fileName}`;
    }

    // Get presigned URL
    const preSigned = await getPresignedUrl({
      fileType: file.type,
      fileSize: file.size,
      fileKey: finalFileKey,
      isPublic,
    });

    if (!preSigned) {
      throw new Error('Failed to get presigned URL');
    }

    // Upload file to S3
    const response = await fetch(preSigned.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    // Return the normalized key issued by the server.
    return preSigned.fileKey;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    throw new Error(errorMessage);
  }
}
