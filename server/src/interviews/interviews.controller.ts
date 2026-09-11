import { Body, Controller, Get, Header, Param, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { AuthUser } from "../common/types";
import { JwtAuthGuard } from "../identity/guards/jwt-auth.guard";
import { RolesGuard } from "../identity/guards/roles.guard";
import { CancelDto, CompleteDto, RescheduleDto, ScheduleInterviewDto } from "./dto/interviews.dto";
import { InterviewsService } from "./interviews.service";

@Controller("v1/interviews")
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("recruiter")
  @Post()
  schedule(@CurrentUser() user: AuthUser, @Body() dto: ScheduleInterviewDto) {
    return this.interviews.schedule(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query("upcoming") upcoming?: string) {
    return this.interviews.list(user, upcoming === "true");
  }

  @Get("slots/:recruiterId")
  slots(@Param("recruiterId") recruiterId: string, @Query("date") date?: string) {
    return this.interviews.slots(recruiterId, date ?? new Date().toISOString().slice(0, 10));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.interviews.get(user, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("recruiter")
  @Put(":id/reschedule")
  reschedule(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: RescheduleDto) {
    return this.interviews.reschedule(user, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("recruiter")
  @Put(":id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CancelDto) {
    return this.interviews.cancel(user, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("recruiter")
  @Put(":id/complete")
  complete(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CompleteDto) {
    return this.interviews.complete(user, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(":id/calendar-link")
  link(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.interviews.calendarToken(user, id);
  }

  @Get(":id/calendar")
  @Header("Content-Type", "text/calendar")
  async calendar(
    @Param("id") id: string,
    @Query("download") token: string,
    @Res() res: Response,
  ) {
    const ics = await this.interviews.downloadWithToken(id, token);
    res.setHeader("Content-Disposition", `attachment; filename="interview-${id}.ics"`);
    res.send(ics);
  }
}
