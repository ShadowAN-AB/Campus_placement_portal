import { getQueueToken } from "@nestjs/bullmq";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUEUE_EVENTS, QUEUE_JOB_OPTIONS } from "../../common/types";
import { OutboxService } from "./outbox.service";

describe("OutboxService", () => {
  const create = vi.fn();
  const updateOne = vi.fn();
  const add = vi.fn();
  let outbox: OutboxService;

  beforeEach(async () => {
    create.mockReset().mockResolvedValue({ _id: "evt1" });
    updateOne.mockReset();
    add.mockReset().mockResolvedValue({ id: "job1" });
    const moduleRef = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: getModelToken("OutboxEvent"), useValue: { create, updateOne } },
        { provide: getQueueToken(QUEUE_EVENTS), useValue: { add } },
      ],
    }).compile();
    outbox = moduleRef.get(OutboxService);
  });

  it("writes an outbox row then enqueues with retries", async () => {
    await outbox.emit("resume.uploaded", { resumeId: "r1" });
    expect(create).toHaveBeenCalledWith({ type: "resume.uploaded", payload: { resumeId: "r1" }, processedAt: null });
    expect(add).toHaveBeenCalledWith(
      "resume.uploaded",
      { outboxId: "evt1", type: "resume.uploaded", payload: { resumeId: "r1" } },
      QUEUE_JOB_OPTIONS,
    );
  });

  it("keeps the outbox row if Redis enqueue fails", async () => {
    add.mockRejectedValueOnce(new Error("redis down"));
    await expect(outbox.emit("resume.uploaded", { resumeId: "r1" })).resolves.toEqual({ _id: "evt1" });
    expect(create).toHaveBeenCalled();
  });

  it("marks a row processed", async () => {
    await outbox.markProcessed("evt1");
    expect(updateOne).toHaveBeenCalledWith({ _id: "evt1" }, { $set: { processedAt: expect.any(Date) } });
  });
});
