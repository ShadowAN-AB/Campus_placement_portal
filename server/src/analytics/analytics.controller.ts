import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles } from "../common/roles.decorator";
import { JwtAuthGuard } from "../identity/guards/jwt-auth.guard";
import { RolesGuard } from "../identity/guards/roles.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("v1/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Roles("admin")
  @Get("analytics")
  get() {
    return this.analytics.read();
  }
}
