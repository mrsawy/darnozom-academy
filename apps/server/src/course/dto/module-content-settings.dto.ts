import { IsBoolean, IsOptional } from 'class-validator';

/** Embedded `settings` for modules and contents (mirrors course `settings.discussionEnabled` pattern). */
export class ModuleContentSettingsDto {
  @IsBoolean()
  @IsOptional()
  discussionEnabled?: boolean;
}
