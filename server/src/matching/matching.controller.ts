import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { AuthUser } from "../common/types";
import { JwtAuthGuard } from "../identity/guards/jwt-auth.guard";
import { RolesGuard } from "../identity/guards/roles.guard";
import { MatchingService } from "./matching.service";

@Controller("v1")
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get("ai/health")
  health() {
    return this.matching.health();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Throttle({ analyze: { limit: 20, ttl: 86400000 } })
  @Post("resumes")
  @HttpCode(202)
  @UseInterceptors(FileInterceptor("resume", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("resume file required");
    const result = await this.matching.upload(user, file);
    return { ...result, accepted: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Get("resumes/status")
  status(@CurrentUser() user: AuthUser) {
    return this.matching.status(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Get("resumes/history")
  history(@CurrentUser() user: AuthUser) {
    return this.matching.history(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Get("resumes/versions")
  versions(@CurrentUser() user: AuthUser) {
    return this.matching.versions(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Get("resumes/compare")
  compare(@CurrentUser() user: AuthUser, @Query("a") a?: string, @Query("b") b?: string) {
    if (!a || !b) throw new BadRequestException("a and b resume ids required");
    return this.matching.compare(user.userId, a, b);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Get("fit/companies")
  companies(@CurrentUser() user: AuthUser) {
    return this.matching.companyFit(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Get("fit/jobs")
  jobs(@CurrentUser() user: AuthUser) {
    return this.matching.jobFit(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Get("ai/chat")
  chat(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    return this.matching.chatHistory(user.userId, Number(limit ?? 50));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Delete("ai/chat")
  clear(@CurrentUser() user: AuthUser) {
    return this.matching.clearChat(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("student")
  @Throttle({ analyze: { limit: 20, ttl: 86400000 } })
  @Post("ai/ask")
  ask(@CurrentUser() user: AuthUser, @Body("question") question: string) {
    if (!question) throw new BadRequestException("question required");
    return this.matching.ask(user.userId, question);
  }
}
