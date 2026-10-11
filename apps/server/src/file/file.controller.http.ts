// src/file/file.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { FileService } from './file.service';
import { GeneratePresignedUrlDto, PresignedUrlResponseDto } from './dto/file.dto';
import { InitiateMultipartUploadDto, CompleteMultipartUploadDto, AbortMultipartUploadDto } from './dto/multipart-upload.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { MultipartUploadAccessService } from './multipart-upload-access.service';
import { Roles } from '@darnozom/shared-types';

@UseGuards(AuthGuard)
@Controller('file')
export class FileHttpController {
  constructor(
    private readonly fileService: FileService,
    private readonly multipartUploadAccess: MultipartUploadAccessService
  ) {}

  @Post('presigned-url')
  async generatePresignedUrl(
    @Body() generatePresignedUrlDto: GeneratePresignedUrlDto,
    @Request() req: IUserRequest
  ): Promise<PresignedUrlResponseDto> {
    return this.fileService.generatePresignedUrl({
      ...generatePresignedUrlDto,
      userUserName: req.user.username,
    });
  }

  @Get('/file-url/:fileKey')
  async getFileUrl(@Param('fileKey') fileKey: string) {
    return await this.fileService.getFileUrl(fileKey);
  }

  // ── Multipart upload endpoints ────────────────────────────────

  @Post('multipart/initiate')
  async initiateMultipartUpload(@Body() dto: InitiateMultipartUploadDto, @Request() req: IUserRequest) {
    const { maxFileSizeBytes } = await this.multipartUploadAccess.assertCanInitiateMultipart(req.user, dto);
    const isStudent = req.user.roleName === Roles.STUDENT;
    const isPublic = isStudent ? false : Boolean(dto.isPublic);
    return this.fileService.initiateMultipartUpload(dto.key, dto.contentType, dto.fileSize, isPublic, {
      maxFileSizeBytes,
    });
  }

  @Post('multipart/complete')
  async completeMultipartUpload(@Body() dto: CompleteMultipartUploadDto) {
    return this.fileService.completeMultipartUpload(dto.key, dto.uploadId, dto.parts);
  }

  @Post('multipart/abort')
  async abortMultipartUpload(@Body() dto: AbortMultipartUploadDto) {
    return this.fileService.abortMultipartUpload(dto.key, dto.uploadId);
  }
}
