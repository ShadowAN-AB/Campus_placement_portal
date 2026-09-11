import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "../../common/types";

export class SignupDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(["student", "recruiter", "admin"])
  role: Role;

  @IsOptional()
  @IsString()
  adminCode?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
