// src/file/file.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { GeneratePresignedUrlDto, PresignedUrlResponseDto } from './dto/file.dto';
import { CloudFrontClient, CreateInvalidationCommand, CreateInvalidationCommandInput } from '@aws-sdk/client-cloudfront';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { MAX_FILE_SIZE, PART_SIZE } from '@lms-organization/shared-types';

/** MIME types allowed for upload (validated in validateFile). Must match attachment/course content allowed types. */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/mkv',
  'application/zip',
  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface UploadToS3Result {
  fileKey: string;
  url: string;
  size: number;
  originalname: string;
  mimetype: string;
  uploadedAt: Date;
}

export interface InitiateMultipartUploadResult {
  uploadId: string;
  key: string;
  presignedUrls: { partNumber: number; url: string }[];
}

export interface CompleteMultipartUploadResult {
  location: string | undefined;
  key: string | undefined;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly s3: S3;
  private readonly bucketName: string;
  private readonly cloudfrontDomain: string | undefined;
  private readonly cloudfront: CloudFrontClient | undefined;
  private readonly cloudfrontDistributionId: string | undefined;

  constructor(private configService: ConfigService) {
    // Validate environment variables
    if (!process.env.S3_BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME environment variable is required');
    }
    if (!process.env.AWS_ACCESS_KEY_ID) {
      throw new Error('AWS_ACCESS_KEY_ID environment variable is required');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS_SECRET_ACCESS_KEY environment variable is required');
    }
    if (!process.env.AWS_REGION) {
      throw new Error('AWS_REGION environment variable is required');
    }

    this.bucketName = process.env.S3_BUCKET_NAME;
    this.cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
    this.cloudfrontDistributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;

    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    this.cloudfront = this.cloudfrontDistributionId
      ? new CloudFrontClient({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
          },
        })
      : undefined;
  }

  /** Returns the S3 bucket name; throws if not configured. */
  private getBucket(): string {
    const bucket = this.configService.get<string>('S3_BUCKET_NAME');
    if (!bucket) {
      throw new BadRequestException('S3_BUCKET_NAME is not configured');
    }
    return bucket;
  }

  /**
   * CloudFront CreateInvalidation requires URL-encoded paths (e.g. spaces → %20).
   * @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html
   */
  private cloudFrontInvalidationPathFromS3Key(fileKey: string): string {
    const relative = fileKey.trim().replace(/^\/+/, '');
    const segments = relative.split('/').filter((s) => s.length > 0);
    return `/${segments.map((s) => encodeURIComponent(s)).join('/')}`;
  }

  /**
   * Invalidates the given S3 keys in CloudFront cache. No-op when CLOUDFRONT_DISTRIBUTION_ID is not set.
   * Failures are logged only so uploads/deletes are not rolled back after S3 already succeeded.
   */
  private async invalidateCloudFront(fileKeys: string[]): Promise<void> {
    if (!this.cloudfront || !this.cloudfrontDistributionId || fileKeys.length === 0) {
      return;
    }
    const paths = fileKeys.map((key) => this.cloudFrontInvalidationPathFromS3Key(key));
    const input: CreateInvalidationCommandInput = {
      DistributionId: this.cloudfrontDistributionId,
      InvalidationBatch: {
        CallerReference: `file-invalidation-${Date.now()}-${uuidv4()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    };
    try {
      await this.cloudfront.send(new CreateInvalidationCommand(input));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`CloudFront invalidation skipped or failed: ${message}`);
    }
  }

  async generatePresignedUrl(generatePresignedUrlDto: GeneratePresignedUrlDto): Promise<PresignedUrlResponseDto> {
    const { fileType, fileSize, fileKey } = generatePresignedUrlDto;
    const normalizedFileKey = this.normalizeFileKey(fileKey, Boolean(generatePresignedUrlDto.isPublic));

    // Validate file type and size
    this.validateFile(fileType, fileSize);

    const bucketName = this.getBucket();

    const params = {
      Bucket: bucketName,
      Key: normalizedFileKey,
      Expires: 3600, // seconds for getSignedUrlPromise (SDK accepts number; typed as PutObjectRequest for call)
      ContentType: fileType,
    };

    try {
      const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params as unknown as S3.PutObjectRequest);

      return {
        uploadUrl,
        fileKey: normalizedFileKey,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate upload URL';
      throw new BadRequestException('Failed to generate upload URL', errorMessage);
    }
  }

  async validateFileKeys(fileKeys: string[]): Promise<boolean> {
    if (!fileKeys?.length) return true;

    const bucket = this.getBucket();
    const validationPromises = fileKeys.map(async (fileKey: string): Promise<boolean> => {
      try {
        await this.s3
          .headObject({
            Bucket: bucket,
            Key: fileKey,
          })
          .promise();
        return true;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(validationPromises);
    return results.every(Boolean);
  }

  /**
   * Public URL for a file key. Uses CloudFront when CLOUDFRONT_DOMAIN is set, otherwise direct S3 URL.
   * Use for avatars, thumbnails, gallery, and any public assets.
   */
  getPublicFileUrl(fileKey: string): string {
    if (!fileKey?.trim()) return '';
    const domain = this.configService.get<string>('CLOUDFRONT_DOMAIN') ?? this.cloudfrontDomain;
    if (domain) {
      const base = domain.startsWith('http') ? domain : `https://${domain}`;
      return `${base.replace(/\/$/, '')}/${fileKey.replace(/^\//, '')}`;
    }
    const bucketName = this.configService.get<string>('S3_BUCKET_NAME');
    const region = this.configService.get<string>('AWS_REGION');
    if (!bucketName || !region) return '';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey.replace(/^\//, '')}`;
  }

  /**
   * Signed URL for private content (e.g. course videos). Uses CloudFront signed URL when
   * CLOUDFRONT_DOMAIN + CLOUDFRONT_KEY_PAIR_ID + CLOUDFRONT_PRIVATE_KEY are set; otherwise S3 presigned getObject.
   */
  async getFileUrl<T extends string | undefined>(fileKey: T): Promise<T extends string ? string : undefined> {
    if (!fileKey) return undefined as T extends string ? string : undefined;
    const domain = this.configService.get<string>('CLOUDFRONT_DOMAIN') ?? this.cloudfrontDomain;
    const keyPairId = this.configService.get<string>('CLOUDFRONT_KEY_PAIR_ID');
    const privateKeyRaw = this.configService.get<string>('CLOUDFRONT_PRIVATE_KEY');

    if (domain && keyPairId && privateKeyRaw) {
      const base = domain.startsWith('http') ? domain : `https://${domain}`;
      const url = `${base.replace(/\/$/, '')}/${fileKey.replace(/^\//, '')}`;
      const dateLessThan = new Date(Date.now() + 3600 * 1000); // 1 hour
      const privateKey = privateKeyRaw.replaceAll(String.raw`\n`, '\n');
      return getSignedUrl({
        url,
        keyPairId,
        dateLessThan,
        privateKey,
      }) as T extends string ? string : undefined;
    }

    const bucket = this.getBucket();
    const params = {
      Bucket: bucket,
      Key: fileKey,
      Expires: 3600, // seconds for getSignedUrlPromise
    };
    return (await this.s3.getSignedUrlPromise('getObject', params as unknown as S3.GetObjectRequest)) as T extends string ? string : undefined;
  }

  async deleteFile(fileKey: string): Promise<void> {
    const bucket = this.getBucket();
    await this.s3
      .deleteObject({
        Bucket: bucket,
        Key: fileKey,
      })
      .promise();
    await this.invalidateCloudFront([fileKey]);
  }

  async deleteFiles(fileKeys: string[]): Promise<void> {
    if (!fileKeys?.length) return;

    const bucket = this.getBucket();
    const deleteParams: S3.DeleteObjectsRequest = {
      Bucket: bucket,
      Delete: {
        Objects: fileKeys.map((key): S3.ObjectIdentifier => ({ Key: key })),
      },
    };
    await this.s3.deleteObjects(deleteParams).promise();
    await this.invalidateCloudFront(fileKeys);
  }

  private validateFile(fileType: string, fileSize: number, maxSizeBytes: number = MAX_FILE_SIZE): void {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(fileType)) {
      throw new BadRequestException('File type not allowed');
    }
    if (fileSize > maxSizeBytes) {
      throw new BadRequestException('File size exceeds maximum limit');
    }
  }

  private static readonly MIME_TO_EXTENSION: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'application/zip': 'zip',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };

  private getFileExtension(mimeType: string): string {
    return FileService.MIME_TO_EXTENSION[mimeType] ?? 'bin';
  }

  /** Returns the file extension (e.g. "pdf") from a fileName. */
  getMimeType(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? (parts.at(-1) ?? '') : '';
  }

  /**
   * Upload a file directly to S3 (server-side upload)
   */
  async uploadToS3(file: Express.Multer.File, path: string): Promise<UploadToS3Result> {
    const { buffer, originalname, mimetype } = file;

    this.validateFile(mimetype, buffer.length);

    const fileName = originalname ? this.sanitizeFileName(originalname) : `file_${Date.now()}`;
    const inferredPublic = path.trim().replace(/^\/+/, '').startsWith('public/');
    const fileKey = this.normalizeFileKey(`${path}/${uuidv4()}_${fileName}`, inferredPublic);

    const bucket = this.getBucket();
    const uploadParams: S3.PutObjectRequest = {
      Bucket: bucket,
      Key: fileKey,
      Body: buffer,
      ContentType: mimetype,
      ContentDisposition: `inline; filename="${originalname ?? 'unknown'}"`,
      Metadata: {
        originalName: originalname ?? 'unknown',
        uploadedAt: new Date().toISOString(),
      },
    };

    try {
      await this.s3.upload(uploadParams).promise();
      await this.invalidateCloudFront([fileKey]);

      const result: UploadToS3Result = {
        fileKey,
        url: this.getPublicFileUrl(fileKey),
        size: buffer.length,
        originalname: originalname ?? 'unknown',
        mimetype,
        uploadedAt: new Date(),
      };
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file to S3';
      throw new BadRequestException(`Failed to upload file to S3: ${errorMessage}`);
    }
  }

  // /**
  //  * Upload multiple files to S3
  //  */
  // async uploadMultipleToS3(uploadFileDtos: UploadFileDto[]): Promise<UploadFileResponseDto[]> {
  //   const uploadPromises = uploadFileDtos.map(dto => this.uploadToS3(dto));
  //   return Promise.all(uploadPromises);
  // }

  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const bucket = this.getBucket();
      await this.s3
        .headObject({
          Bucket: bucket,
          Key: fileKey,
        })
        .promise();
      return true;
    } catch {
      return false;
    }
  }

  private sanitizeFileName(fileName: string): string {
    // Remove special characters and replace spaces with underscores
    let sanitized = fileName.replaceAll(/[^a-zA-Z0-9.-]/g, '_').replaceAll(/_{2,}/g, '_');

    // Remove leading and trailing underscores using string methods to avoid ReDoS
    while (sanitized.startsWith('_')) {
      sanitized = sanitized.slice(1);
    }
    while (sanitized.endsWith('_')) {
      sanitized = sanitized.slice(0, -1);
    }

    return sanitized;
  }

  // ── Multipart upload ──────────────────────────────────────────────

  async initiateMultipartUpload(
    key: string,
    contentType: string,
    fileSize: number,
    isPublic = false,
    options?: { maxFileSizeBytes?: number }
  ): Promise<InitiateMultipartUploadResult> {
    const bucket = this.getBucket();
    this.validateFile(contentType, fileSize, options?.maxFileSizeBytes ?? MAX_FILE_SIZE);

    const normalizedKey = this.normalizeFileKey(key, isPublic);
    const partCount = Math.ceil(fileSize / PART_SIZE);

    const { UploadId } = await this.s3
      .createMultipartUpload({
        Bucket: bucket,
        Key: normalizedKey,
        ContentType: contentType,
      })
      .promise();

    if (!UploadId) {
      throw new BadRequestException('Failed to create multipart upload');
    }

    const presignedUrls = await Promise.all(
      Array.from(
        { length: partCount },
        (_, i): Promise<{ partNumber: number; url: string }> =>
          this.s3
            .getSignedUrlPromise('uploadPart', {
              Bucket: bucket,
              Key: normalizedKey,
              UploadId,
              PartNumber: i + 1,
              Expires: 3600,
            })
            .then((url: string) => ({ partNumber: i + 1, url }))
      )
    );

    return { uploadId: UploadId, key: normalizedKey, presignedUrls };
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: { ETag: string; PartNumber: number }[]
  ): Promise<CompleteMultipartUploadResult> {
    const bucket = this.getBucket();

    if (!parts?.length) {
      throw new BadRequestException('At least one part is required to complete the upload');
    }

    const sortedParts = [...parts].toSorted((a, b) => a.PartNumber - b.PartNumber);

    const result = await this.s3
      .completeMultipartUpload({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sortedParts,
        },
      })
      .promise();

    await this.invalidateCloudFront([key]);
    return { location: result.Location, key: result.Key };
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const bucket = this.getBucket();
    await this.s3
      .abortMultipartUpload({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      })
      .promise();
  }

  /**
   * Enforce top-level S3 key namespaces:
   * - public/*
   * - private/*
   */
  private normalizeFileKey(fileKey: string, isPublic: boolean): string {
    const trimmed = fileKey.trim().replace(/^\/+/, '');

    if (trimmed.startsWith('public/') || trimmed.startsWith('private/')) {
      return trimmed;
    }

    const prefix = isPublic ? 'public' : 'private';
    return `${prefix}/${trimmed}`;
  }
}
