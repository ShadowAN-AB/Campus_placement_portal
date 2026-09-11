import { Body, Controller, Get, Headers, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { AuthUser } from "../common/types";
import { JwtAuthGuard } from "../identity/guards/jwt-auth.guard";
import { RolesGuard } from "../identity/guards/roles.guard";
import { ApplicationsService } from "./applications.service";
import { ApplyDto, BulkStatusDto, StatusDto } from "./dto/applications.dto";

@Controller("v1/applications")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly apps: ApplicationsService) {}

  @Roles("student")
  @Post()
  apply(
    @CurrentUser() user: AuthUser,
    @Body() dto: ApplyDto,
    @Headers("idempotency-key") key?: string,
  ) {
    return this.apps.apply(user, dto, key);
  }

  @Roles("student")
  @Get("me")
  mine(@CurrentUser() user: AuthUser, @Query("page") page?: string) {
    return this.apps.mine(user.userId, Number(page ?? 1));
  }

  @Roles("recruiter", "admin")
  @Get("job/:jobId")
  forJob(
    @CurrentUser() user: AuthUser,
    @Param("jobId") jobId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.apps.forJob(user, jobId, query);
  }

  @Roles("recruiter")
  @Put(":appId/status")
  status(@CurrentUser() user: AuthUser, @Param("appId") appId: string, @Body() dto: StatusDto) {
    return this.apps.setStatus(user, appId, dto);
  }

  @Roles("recruiter")
  @Post("bulk-status")
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BulkStatusDto) {
    return this.apps.bulkStatus(user, dto);
  }
}
