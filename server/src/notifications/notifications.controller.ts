import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { AuthUser } from "../common/types";
import { JwtAuthGuard } from "../identity/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("v1/notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notes: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("unreadOnly") unreadOnly?: string,
    @Query("page") page?: string,
  ) {
    return this.notes.list(user.userId, unreadOnly === "true", Number(page ?? 1));
  }

  @Post(":id/read")
  read(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notes.markRead(user.userId, id);
  }

  @Post("read-all")
  readAll(@CurrentUser() user: AuthUser) {
    return this.notes.markAll(user.userId);
  }
}
