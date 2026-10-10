import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as multer from 'multer';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

export class S3StreamStorage implements multer.StorageEngine {
  private s3Client: S3Client;
  private bucket: string;

  constructor(s3Client: S3Client, bucket: string) {
    this.s3Client = s3Client;
    this.bucket = bucket;
  }

  _handleFile(req: Request, file: Express.Multer.File, callback: (error?: Error | null, info?: Partial<Express.Multer.File>) => void): void {
    const key = `private/uploads/${uuidv4()}-${file.originalname}`;

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: file.stream,
        ContentType: file.mimetype,
      },
    });

    upload
      .done()
      .then((result) => {
        callback(null, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: undefined, // Size will be determined by S3
          destination: this.bucket,
          filename: key,
          path: result.Location,
          buffer: undefined, // No buffer since we're streaming
        });
      })
      .catch((error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)));
      });
  }

  _removeFile(req: Request, file: Express.Multer.File, callback: (error: Error | null) => void): void {
    // Implement S3 deletion if needed
    callback(null);
  }
}
