import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Inject, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import Redis from "ioredis";
import { REDIS } from "../infra/redis/redis.module";
import { idMatch, oid } from "../common/oid";
import { Notification, NotificationDocument } from "./schemas/notification.schema";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notes: Model<NotificationDocument>,
    @Optional() @Inject(REDIS) private readonly redis?: Redis,
  ) {}

  async notify(userId: string, input: { type: string; title: string; body: string; link?: string; meta?: Record<string, unknown> }) {
    const doc = await this.notes.create({ userId: oid(userId), ...input, read: false, meta: input.meta ?? {} });
    await this.redis?.publish(`notify:${userId}`, JSON.stringify(doc));
    return doc;
  }

  async list(userId: string, unreadOnly = false, page = 1, pageSize = 20) {
    const filter: Record<string, unknown> = { userId: idMatch(userId) };
    if (unreadOnly) filter.read = false;
    const [items, total, unreadCount] = await Promise.all([
      this.notes
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.notes.countDocuments(filter),
      this.notes.countDocuments({ userId: idMatch(userId), read: false }),
    ]);
    return { items, total, unreadCount, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async markRead(userId: string, id: string) {
    const doc = await this.notes.findById(id);
    if (!doc) throw new NotFoundException();
    if (String(doc.userId) !== userId) throw new ForbiddenException();
    doc.read = true;
    await doc.save();
    return doc;
  }

  async markAll(userId: string) {
    await this.notes.updateMany({ userId: idMatch(userId), read: false }, { $set: { read: true } });
    return { ok: true };
  }
}
