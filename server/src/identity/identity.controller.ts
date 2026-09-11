import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { CurrentUser } from "../common/current-user.decorator";
import { AuthUser } from "../common/types";
import { ForgotPasswordDto, LoginDto, ResetPasswordDto, SignupDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { IdentityService } from "./identity.service";

@Controller("v1/auth")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post("signup")
  signup(@Body() dto: SignupDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.identity.signup(dto, res, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Throttle({ login: { limit: 10, ttl: 900000 } })
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.identity.login(dto, res, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.identity.me(user.userId);
  }

  @Post("refresh")
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.identity.refresh(req.cookies?.refresh_token, res);
  }

  @Post("logout")
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.identity.logout(req.cookies?.refresh_token, res);
  }

  @Throttle({ reset: { limit: 5, ttl: 3600000 } })
  @Post("forgot-password")
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.identity.forgotPassword(dto);
  }

  @Post("reset-password")
  reset(@Body() dto: ResetPasswordDto) {
    return this.identity.resetPassword(dto);
  }
}
