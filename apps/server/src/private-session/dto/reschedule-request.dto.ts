import { IsMongoId, IsNotEmpty, IsString, IsDate, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class RescheduleRequestDto {
  @IsMongoId()
  bookingId: string;

  /**
   * Preferred: the id of a real, future `PrivateSession.availableSlots` entry to move to.
   * The server re-validates this slot exists, is in the future, and has capacity.
   */
  @IsMongoId()
  @IsOptional()
  newSlotId?: string;

  /**
   * @deprecated Legacy wall-clock fallback for clients not yet updated to the slot picker
   * (see design Phase 3). The server still requires this to match a real available slot —
   * it is never trusted as freeform input.
   */
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  newScheduledDate?: Date;

  /** @deprecated */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(am|pm)$/i, {
    message: 'newStartTime must be in format HH:MM am/pm',
  })
  newStartTime?: string;

  /** @deprecated */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(am|pm)$/i, {
    message: 'newEndTime must be in format HH:MM am/pm',
  })
  newEndTime?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
