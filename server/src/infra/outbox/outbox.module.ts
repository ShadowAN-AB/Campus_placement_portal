import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_EVENTS, QUEUE_JOB_OPTIONS } from "../../common/types";
import { OutboxEvent, OutboxEventSchema } from "./outbox.schema";
import { OutboxService } from "./outbox.service";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: OutboxEvent.name, schema: OutboxEventSchema }]),
    BullModule.registerQueue({ name: QUEUE_EVENTS, defaultJobOptions: QUEUE_JOB_OPTIONS }),
  ],
  providers: [OutboxService],
  exports: [OutboxService, MongooseModule],
})
export class OutboxModule {}
