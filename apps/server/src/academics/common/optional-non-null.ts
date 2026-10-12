import { ValidateIf } from 'class-validator';

/** Field may be omitted from an update, but when sent it is validated — unlike @IsOptional(), null is not let through. */
export const OptionalNonNull = () => ValidateIf((_object, value) => value !== undefined);
