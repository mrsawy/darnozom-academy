export interface FileAttachmentData {
  filename: string;
  mimetype: string;
  data: string; // base64-encoded file data
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = reader.result as string;
      // Extract base64 part (remove data:application/pdf;base64, prefix)
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    });
    reader.addEventListener('error', () => reject(new Error('Failed to read file')));
    reader.readAsDataURL(file);
  });
}

export async function convertFilesToAttachments(
  files: File[] | undefined
): Promise<FileAttachmentData[]> {
  if (!files?.length) return [];
  return Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      mimetype: file.type,
      data: await fileToBase64(file),
    }))
  );
}
