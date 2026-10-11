// src/file/file.controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { FileService } from './file.service';
import { GeneratePresignedUrlDto, PresignedUrlResponseDto } from './dto/file.dto';
import { InitiateMultipartUploadDto, CompleteMultipartUploadDto, AbortMultipartUploadDto } from './dto/multipart-upload.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, FileSuccessMessages, Roles, Subjects } from '@darnozom/shared-types';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { MultipartUploadAccessService } from './multipart-upload-access.service';

@ApplyRpcErrorHandling
@Controller()
export class FileMessageController {
  constructor(
    private readonly fileService: FileService,
    private readonly multipartUploadAccess: MultipartUploadAccessService
  ) {}

  // @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.FILE })
  @UseGuards(AuthGuard)
  @MessagePattern('file.getPreSignedUrl')
  async generatePresignedUrl(
    @Payload(new RpcValidationPipe())
    generatePresignedUrlDto: GeneratePresignedUrlDto,
    @Ctx() context: IUserContext
  ): Promise<PresignedUrlResponseDto> {
    const user = context.userPayload;

    return this.fileService.generatePresignedUrl({
      ...generatePresignedUrlDto,
      userUserName: user.username,
    });
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.FILE })
  @UseGuards(AuthGuard)
  @MessagePattern('file.getFileUrl')
  async getFileUrl(
    @Payload(new RpcValidationPipe())
    Payload: {
      fileKey: string;
    }
  ) {
    const result = await this.fileService.getFileUrl(Payload.fileKey);
    return result;
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.FILE })
  @MessagePattern('file.deleteFile')
  @UseGuards(AuthGuard)
  async deleteFile(
    @Payload(new RpcValidationPipe())
    Payload: {
      fileKey: string;
    }
  ) {
    await this.fileService.deleteFile(Payload.fileKey);
    return { message: FileSuccessMessages.FILE_DELETED, success: true };
  }

  // @Post('validate')
  // async validateFileKeys(@Body() validateFileKeysDto: ValidateFileKeysDto) {
  //   const isValid = await this.fileService.validateFileKeys(
  //     validateFileKeysDto.fileKeys,
  //   );
  //   return { valid: isValid };
  // }

  // @Get('download/*fileKey')
  // async getDownloadUrl(@Param('fileKey') fileKey: string) {
  //   const downloadUrl = await this.fileService.getFileUrl(fileKey);
  //   return { downloadUrl };
  // }

  // @Delete('*fileKey')
  // async deleteFile(@Param('fileKey') fileKey: string) {
  //   await this.fileService.deleteFile(fileKey);
  //   return { message: 'File deleted successfully' };
  // }

  // ── Multipart upload message patterns ────────────────────────

  // @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.FILE })
  @UseGuards(AuthGuard)
  @MessagePattern('file.multipart.initiate')
  async initiateMultipartUpload(@Payload(new RpcValidationPipe()) dto: InitiateMultipartUploadDto, @Ctx() context: IUserContext) {
    const { maxFileSizeBytes } = await this.multipartUploadAccess.assertCanInitiateMultipart(context.userPayload, dto);
    const isStudent = context.userPayload.roleName === Roles.STUDENT;
    const isPublic = isStudent ? false : Boolean(dto.isPublic);
    return this.fileService.initiateMultipartUpload(dto.key, dto.contentType, dto.fileSize, isPublic, {
      maxFileSizeBytes,
    });
  }

  // @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.FILE })
  @UseGuards(AuthGuard)
  @MessagePattern('file.multipart.complete')
  async completeMultipartUpload(@Payload(new RpcValidationPipe()) dto: CompleteMultipartUploadDto) {
    return this.fileService.completeMultipartUpload(dto.key, dto.uploadId, dto.parts);
  }

  // @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.FILE })
  @UseGuards(AuthGuard)
  @MessagePattern('file.multipart.abort')
  async abortMultipartUpload(@Payload(new RpcValidationPipe()) dto: AbortMultipartUploadDto) {
    return this.fileService.abortMultipartUpload(dto.key, dto.uploadId);
  }
}
