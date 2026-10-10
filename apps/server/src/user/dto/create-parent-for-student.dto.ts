import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateParentForStudentDto {
  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @Matches(/^\+?\d+$/, { message: 'Phone must contain only digits and may start with +' })
  phone!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsNotEmpty()
  @IsString()
  country!: string;
}
