'use server';

import { randomUUID } from 'node:crypto';
import { getCookie } from '@/lib/utils/serverUtils';
import { connectToNats, request } from '@/lib/nats/client';
import { NatsError } from 'nats';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';

interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
}

interface GalleryItem {
  _id: string;
  userId: string;
  url: string;
  fileKey: string;
  type: string;
  title?: string;
  isPublic: boolean;
  createdAt: string;
}

export async function generateGalleryPresignedUrl(
  fileType: string,
  fileSize: number,
  fileName: string
) {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const response = await request<PresignedUrlResponse>(
      natsClient,
      'gallery.generatePresignedUrl',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          fileType,
          fileSize,
          fileName,
          isPublic: true,
        },
      })
    );

    if ('err' in response) {
      return {
        err: { message: (response as { err: NatsError }).err.message },
      } as unknown as PresignedUrlResponse;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to generate upload URL');
  }
}

export async function createGalleryItem(data: {
  url: string;
  fileKey: string;
  type?: string;
  title?: string;
  isPublic?: boolean;
}) {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const response = await request<GalleryItem>(
      natsClient,
      'gallery.create',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          ...data,
        },
      })
    );

    if ('err' in response) {
      return {
        err: { message: (response as { err: NatsError }).err.message },
      } as unknown as GalleryItem;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to save gallery item');
  }
}

interface GalleryItemsResponse {
  docs: GalleryItem[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export async function getGalleryItems(page = 1, limit = 10): Promise<GalleryItemsResponse> {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const response = await request<GalleryItemsResponse>(
      natsClient,
      'gallery.findAll',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          page,
          limit,
        },
      })
    );

    if ('err' in response) {
      return {
        err: { message: (response as { err: NatsError }).err.message },
      } as unknown as GalleryItemsResponse;
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to fetch gallery items');
  }
}

export async function deleteGalleryItem(galleryId: string) {
  try {
    const natsClient = await connectToNats();
    const idToken = await getCookie(AUTH_COOKIE_NAME);

    const response = await request<{ success: boolean; deletedId: string }>(
      natsClient,
      'gallery.delete',
      JSON.stringify({
        id: randomUUID(),
        data: {
          authorization: idToken,
          galleryId,
        },
      })
    );

    if ('err' in response) {
      return { err: { message: (response as { err: NatsError }).err.message } } as unknown as {
        success: boolean;
        deletedId: string;
      };
    }

    return response;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to delete gallery item');
  }
}
