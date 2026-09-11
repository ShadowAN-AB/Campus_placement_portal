import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { OutboxService } from "../outbox/outbox.service";
import { AnalyticsService } from "../../analytics/analytics.service";
import { EventTypes } from "../../common/types";

@Injectable()
export class OutboxSweeper implements OnModuleInit {
  private readonly log = new Logger(OutboxSweeper.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly analytics: AnalyticsService,
  ) {}

  onModuleInit() {
    setInterval(() => {
      this.outbox.sweepUnprocessed().catch((err) => this.log.warn(String(err)));
    }, 15000);
    setInterval(() => {
      this.outbox.emit(EventTypes.AnalyticsRollup, {}).catch((err) => this.log.warn(String(err)));
    }, 10 * 60 * 1000);
    this.analytics.rollup().catch(() => undefined);
  }
}
