import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { InjectModel } from "@nestjs/mongoose";
import { Queue } from "bullmq";
import { Model } from "mongoose";
import { QUEUE_EVENTS } from "../../common/types";
import { OutboxEvent, OutboxEventDocument } from "./outbox.schema";

@Injectable()
export class OutboxService {
  constructor(
    @InjectModel(OutboxEvent.name) private readonly model: Model<OutboxEventDocument>,
    @InjectQueue(QUEUE_EVENTS) private readonly queue: Queue,
  ) {}

  async emit(type: string, payload: Record<string, unknown>) {
    const doc = await this.model.create({ type, payload, processedAt: null });
    try {
      await this.queue.add(type, { outboxId: String(doc._id), type, payload }, { removeOnComplete: 200 });
    } catch {
      // Sweeper will republish if Redis is briefly down.
    }
    return doc;
  }

  async markProcessed(id: string) {
    await this.model.updateOne({ _id: id }, { $set: { processedAt: new Date() } });
  }

  async sweepUnprocessed(limit = 50) {
    const stale = await this.model
      .find({ processedAt: null })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    for (const doc of stale) {
      await this.queue.add(
        doc.type,
        { outboxId: String(doc._id), type: doc.type, payload: doc.payload },
        { jobId: `outbox-${doc._id}`, removeOnComplete: 200 },
      );
    }
    return stale.length;
  }
}
