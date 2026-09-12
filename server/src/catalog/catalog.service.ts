import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import Redis from "ioredis";
import { Inject } from "@nestjs/common";
import { AuthUser } from "../common/types";
import { EventTypes } from "../common/types";
import { OutboxService } from "../infra/outbox/outbox.service";
import { REDIS } from "../infra/redis/redis.module";
import { oid } from "../common/oid";
import { Application, ApplicationDocument } from "../applications/schemas/application.schema";
import { Job, JobDocument } from "./schemas/job.schema";
import { StudentProfile, StudentProfileDocument } from "./schemas/profile.schema";
import { CreateJobDto, UpsertProfileDto } from "./dto/catalog.dto";

const lower = (xs: string[] = []) => xs.map((s) => s.trim().toLowerCase()).filter(Boolean);

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Job.name) private readonly jobs: Model<JobDocument>,
    @InjectModel(StudentProfile.name) private readonly profiles: Model<StudentProfileDocument>,
    @InjectModel(Application.name) private readonly apps: Model<ApplicationDocument>,
    private readonly outbox: OutboxService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async getProfile(userId: string) {
    const doc = await this.profiles.findOne({ userId: oid(userId) }).lean();
    return (
      doc ?? {
        userId,
        skills: [],
        bio: "",
        expectedSalary: 0,
        prefJobTitles: [],
        yearsOfExperience: 0,
        education: [],
        projects: [],
        certifications: [],
      }
    );
  }

  async upsertProfile(userId: string, dto: UpsertProfileDto) {
    const update: Record<string, unknown> = { ...dto };
    if (dto.skills) update.skills = lower(dto.skills);
    const doc = await this.profiles.findOneAndUpdate(
      { userId: oid(userId) },
      { $set: { ...update, userId: oid(userId) } },
      { new: true, upsert: true },
    );
    await this.outbox.emit(EventTypes.ProfileUpdated, { userId });
    return doc;
  }

  async listJobs(user: AuthUser, query: { page?: number; pageSize?: number; company?: string }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize ?? 20)));
    const filter: Record<string, unknown> = {};
    if (user.role === "student") Object.assign(filter, { approved: true, status: "active" });
    if (user.role === "recruiter") filter.postedBy = new Types.ObjectId(user.userId);
    if (query.company) filter.company = new RegExp(query.company, "i");

    if (user.role === "student") {
      let cached: string[] = [];
      try {
        cached = await this.redis.zrevrange(`jobs:rank:${user.userId}`, 0, 199, "WITHSCORES");
      } catch {
        cached = [];
      }
      if (cached.length) {
        const scored: { id: string; score: number }[] = [];
        for (let i = 0; i < cached.length; i += 2) {
          scored.push({ id: cached[i], score: Number(cached[i + 1]) });
        }
        const ids = scored.map((s) => new Types.ObjectId(s.id));
        const docs = await this.jobs.find({ _id: { $in: ids }, ...filter }).lean();
        const byId = new Map(docs.map((d) => [String(d._id), d]));
        const items = scored
          .map((s) => (byId.has(s.id) ? { ...byId.get(s.id), matchScore: s.score } : null))
          .filter(Boolean);
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      }
    }

    const [items, total] = await Promise.all([
      this.jobs
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.jobs.countDocuments(filter),
    ]);
    if (user.role === "recruiter" && items.length) {
      const counts = await this.apps.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { jobId: { $in: items.map((j) => j._id) } } },
        { $group: { _id: "$jobId", n: { $sum: 1 } } },
      ]);
      const byJob = new Map(counts.map((c) => [String(c._id), c.n]));
      return {
        items: items.map((j) => ({ ...j, totalApplicants: byJob.get(String(j._id)) ?? 0 })),
        total,
        page,
        pageSize,
      };
    }
    return { items, total, page, pageSize };
  }

  async getJob(user: AuthUser, jobId: string) {
    const job = await this.jobs.findById(jobId).lean();
    if (!job) throw new NotFoundException("Job not found");
    if (user.role === "student" && (!job.approved || job.status !== "active")) {
      throw new NotFoundException("Job not found");
    }
    if (user.role === "recruiter" && String(job.postedBy) !== user.userId) {
      throw new ForbiddenException();
    }
    return job;
  }

  async createJob(user: AuthUser, dto: CreateJobDto) {
    return this.jobs.create({
      ...dto,
      requiredSkills: lower(dto.requiredSkills),
      approved: false,
      status: "active",
      postedBy: user.userId,
    });
  }

  async updateJob(user: AuthUser, jobId: string, dto: Partial<CreateJobDto>) {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new NotFoundException("Job not found");
    if (String(job.postedBy) !== user.userId) throw new ForbiddenException();
    if (dto.requiredSkills) dto.requiredSkills = lower(dto.requiredSkills);
    Object.assign(job, dto);
    await job.save();
    await this.outbox.emit(EventTypes.JobChanged, { jobId });
    return job;
  }

  async closeJob(user: AuthUser, jobId: string) {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new NotFoundException("Job not found");
    if (String(job.postedBy) !== user.userId) throw new ForbiddenException();
    job.status = "closed";
    await job.save();
    await this.outbox.emit(EventTypes.JobChanged, { jobId });
    return job;
  }

  async pendingApprovals(page = 1, pageSize = 20) {
    const filter = { approved: false, status: "active" };
    const [items, total] = await Promise.all([
      this.jobs
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.jobs.countDocuments(filter),
    ]);
    return { items, total, page, pageSize };
  }

  async approveJob(jobId: string) {
    const job = await this.jobs.findByIdAndUpdate(jobId, { $set: { approved: true } }, { new: true });
    if (!job) throw new NotFoundException("Job not found");
    await this.outbox.emit(EventTypes.JobApproved, {
      jobId: String(job._id),
      postedBy: String(job.postedBy),
      title: job.title,
    });
    return job;
  }
}
