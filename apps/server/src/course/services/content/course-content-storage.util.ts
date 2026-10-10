import { CreateCourseContentDto } from '../../dto/create-course-content.dto';
import { ContentType } from '../../enum/contentType.enum';
import { VideoType } from '../../enum/videoType.enum';

const BYTES_PER_GB = 1024 ** 3;

export function bytesToGB(bytes: number): number {
  return bytes / BYTES_PER_GB;
}

/** Whether this content type stores an uploaded file that counts against the organization's storage quota. */
export function hasFileStorage(dto: CreateCourseContentDto): boolean {
  return (
    (dto.type === ContentType.VIDEO && dto.videoType === VideoType.UPLOAD) ||
    (dto.type === ContentType.ASSIGNMENT && !!dto.fileKey) ||
    dto.type === ContentType.ATTACHMENT
  );
}
