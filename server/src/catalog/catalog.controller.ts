import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { AuthUser } from "../common/types";
import { JwtAuthGuard } from "../identity/guards/jwt-auth.guard";
import { RolesGuard } from "../identity/guards/roles.guard";
import { CatalogService } from "./catalog.service";
import { CreateJobDto, UpsertProfileDto } from "./dto/catalog.dto";

@Controller("v1")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Roles("student")
  @Get("profile")
  getProfile(@CurrentUser() user: AuthUser) {
    return this.catalog.getProfile(user.userId);
  }

  @Roles("student")
  @Put("profile")
  saveProfile(@CurrentUser() user: AuthUser, @Body() dto: UpsertProfileDto) {
    return this.catalog.upsertProfile(user.userId, dto);
  }

  @Get("jobs")
  listJobs(
    @CurrentUser() user: AuthUser,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("company") company?: string,
  ) {
    return this.catalog.listJobs(user, {
      page: Number(page ?? 1) || 1,
      pageSize: Number(pageSize ?? 20) || 20,
      company,
    });
  }

  @Get("jobs/:jobId")
  getJob(@CurrentUser() user: AuthUser, @Param("jobId") jobId: string) {
    return this.catalog.getJob(user, jobId);
  }

  @Roles("recruiter")
  @Post("jobs")
  createJob(@CurrentUser() user: AuthUser, @Body() dto: CreateJobDto) {
    return this.catalog.createJob(user, dto);
  }

  @Roles("recruiter")
  @Put("jobs/:jobId")
  updateJob(@CurrentUser() user: AuthUser, @Param("jobId") jobId: string, @Body() dto: CreateJobDto) {
    return this.catalog.updateJob(user, jobId, dto);
  }

  @Roles("recruiter")
  @Delete("jobs/:jobId")
  closeJob(@CurrentUser() user: AuthUser, @Param("jobId") jobId: string) {
    return this.catalog.closeJob(user, jobId);
  }

  @Roles("admin")
  @Get("admin/approvals")
  approvals(@Query("page") page?: string) {
    return this.catalog.pendingApprovals(Number(page ?? 1));
  }

  @Roles("admin")
  @Post("admin/jobs/:jobId/approve")
  approve(@Param("jobId") jobId: string) {
    return this.catalog.approveJob(jobId);
  }
}
