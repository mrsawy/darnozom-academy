import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@/lib/utils';
import { useMemo } from 'react';
import {
  generateGalleryPresignedUrl,
  createGalleryItem,
  getGalleryItems,
  deleteGalleryItem,
} from './../../actions/gallery/gallery.actions';
import { compressImage } from './../../utils/image-compression';
import { toast } from 'sonner';
import axios, { isAxiosError } from 'axios';

export interface GalleryItem {
  _id: string;
  url: string;
  fileKey: string;
  type?: string;
  title?: string;
  createdAt: string;
}

export interface IUseGalleryProps {
  onProgress?: (progress: UploadProgress) => void;
}

export interface PaginatedResponse {
  docs: GalleryItem[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export function useGallery(props?: IUseGalleryProps) {
  const queryClient = useQueryClient();
  const onProgress = props?.onProgress;

  // Infinite Query for Gallery Items
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery<PaginatedResponse, Error, InfiniteData<PaginatedResponse>, string[], number>(
    {
      queryKey: ['gallery-items'],
      queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
        const response = await getGalleryItems(pageParam, 10);
        // Transform GalleryItemsResponse to PaginatedResponse
        return {
          ...response,
          pagingCounter: (pageParam - 1) * response.limit + 1,
          prevPage: response.hasPrevPage ? (pageParam > 1 ? pageParam - 1 : null) : null,
          nextPage: response.hasNextPage ? pageParam + 1 : null,
        };
      },
      getNextPageParam: (lastPage: PaginatedResponse) => {
        return lastPage.hasNextPage ? lastPage.nextPage : undefined;
      },
      initialPageParam: 1,
    }
  );

  // Flatten the pages into a single array of items
  const items = useMemo(
    () => data?.pages.flatMap((page: PaginatedResponse) => page.docs) ?? [],
    [data]
  );
  const totalItems = data?.pages[0]?.totalDocs ?? 0;

  // Mutation for Uploading File
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      let fileToUpload = file;

      // Attempt compression if it's an image
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Image compression failed, using original file:', error);
          // Continue with original file
        }
      }
      // 1. Get Presigned URL
      const { uploadUrl, fileKey } = await generateGalleryPresignedUrl(
        fileToUpload.type,
        fileToUpload.size,
        fileToUpload.name
      );
      const normalizedPublicFileKey =
        fileKey.startsWith('public/') || fileKey.startsWith('private/')
          ? fileKey
          : `public/${fileKey.replace(/^\/+/, '')}`;

      // 2. Upload to S3
      await uploadToS3(uploadUrl, fileToUpload, onProgress);

      // 3. Create Gallery Item
      const newItem = await createGalleryItem({
        url: uploadUrl.split('?')[0],
        fileKey: normalizedPublicFileKey,
        isPublic: true,
        type: fileToUpload.type,
        title: fileToUpload.name,
      });

      return newItem;
    },
    onSuccess: (newItem) => {
      toast.success('File uploaded successfully');
      // Invalidate query to refetch or optimistically update
      // Simple invalidation for now to ensure consistency,
      // though manual cache update is better for UX to show it immediately at top
      queryClient.setQueryData<InfiniteData<PaginatedResponse>>(['gallery-items'], (oldData) => {
        if (!oldData) return oldValue(newItem);

        // Return new data structure with new item at the beginning
        return {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            if (index === 0) {
              return {
                ...page,
                docs: [newItem, ...page.docs], // Add to first page
              };
            }
            return page;
          }),
        };
      });
      // Also invalidate to eventually sync
      void queryClient.invalidateQueries({ queryKey: ['gallery-items'] });
    },
    onError: (error: Error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      toast.error(error.message ?? 'Upload failed');
    },
  });

  // Mutation for Deleting File
  const deleteMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      return await deleteGalleryItem(galleryId);
    },
    onSuccess: (_, deletedId) => {
      toast.success('Item deleted successfully');
      // Optimistically remove from cache
      queryClient.setQueryData<InfiniteData<PaginatedResponse>>(['gallery-items'], (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            docs: page.docs.filter((item) => item._id !== deletedId),
            totalDocs: page.totalDocs - 1,
          })),
        };
      });
      void queryClient.invalidateQueries({ queryKey: ['gallery-items'] });
    },
    onError: (error: Error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      toast.error(error.message ?? 'Delete failed');
    },
  });

  return {
    items,
    totalItems,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    uploading: uploadMutation.isPending,
    deleting: deleteMutation.isPending,
    uploadFile: uploadMutation.mutateAsync,
    deleteFile: deleteMutation.mutateAsync,
    refresh: refetch,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    isError,
    error,
  };
}

// Helper function for optimistic update (unused but illustrative)
function oldValue(newItem: GalleryItem): InfiniteData<PaginatedResponse> {
  return {
    pages: [
      {
        docs: [newItem],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      },
    ],
    pageParams: [1],
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  remainingTime?: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
}

export const uploadToS3 = async (
  presignedUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> => {
  const startTime = Date.now();

  try {
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
        // Do not set Authorization header unless your S3 setup requires it for presigned URLs (usually it doesn't)
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const currentTime = Date.now();
          const timeElapsed = (currentTime - startTime) / 1000; // seconds
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;

          // Calculate speed (bytes per second)
          const speed = loaded / (timeElapsed || 1); // avoid divide by zero

          // Calculate remaining time
          const remainingBytes = total - loaded;
          const remainingTime = speed > 0 ? remainingBytes / speed : 0;

          const progress: UploadProgress = {
            loaded,
            total,
            percentage: Math.round((loaded * 100) / total),
            speed,
            remainingTime,
          };

          onProgress(progress);
        }
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error uploading to S3:', error);
    if (isAxiosError(error) && error.response) {
      // eslint-disable-next-line no-console
      console.error('Response status:', error.response.status);
      // eslint-disable-next-line no-console
      console.error('Response data:', error.response.data);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Upload failed: ${errorMessage}`);
  }
};
