import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AuthUser, EventTypes } from "../common/types";
import { OutboxService } from "../infra/outbox/outbox.service";
import { Job, JobDocument } from "../catalog/schemas/job.schema";
import { StudentProfile, StudentProfileDocument } from "../catalog/schemas/profile.schema";
import { calculateMatchScore } from "../matching/match-algorithm";
import { Application, ApplicationDocument } from "./schemas/application.schema";
import { MatchScore, MatchScoreDocument } from "./schemas/match-score.schema";
import { ApplyDto, BulkStatusDto, StatusDto } from "./dto/applications.dto";

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private readonly apps: Model<ApplicationDocument>,
    @InjectModel(MatchScore.name) private readonly scores: Model<MatchScoreDocument>,
    @InjectModel(Job.name) private readonly jobs: Model<JobDocument>,
    @InjectModel(StudentProfile.name) private readonly profiles: Model<StudentProfileDocument>,
    private readonly outbox: OutboxService,
  ) {}

  async apply(user: AuthUser, dto: ApplyDto, headerKey?: string) {
    const job = await this.jobs.findById(dto.jobId);
    if (!job || !job.approved || job.status !== "active") throw new NotFoundException("Job not found");
    const key = headerKey || dto.idempotencyKey;
    if (key) {
      const replay = await this.apps.findOne({ idempotencyKey: key });
      if (replay) return { ...replay.toObject(), replayed: true };
    }
    const profile = await this.profiles.findOne({ userId: user.userId }).lean();
    const match = calculateMatchScore({
      studentSkills: profile?.skills ?? [],
      requiredSkills: job.requiredSkills,
      studentMonths: (profile?.yearsOfExperience ?? 0) * 12,
      requiredMonths: (job.minExperience ?? 0) * 12,
      expectedSalary: profile?.expectedSalary,
      minSalary: job.minSalary,
      maxSalary: job.maxSalary,
    });
    try {
      const app = await this.apps.create({
        studentId: user.userId,
        jobId: job._id,
        status: "pending",
        matchScore: match.score,
        idempotencyKey: key,
      });
      await this.scores.findOneAndUpdate(
        { studentId: user.userId, jobId: job._id },
        { $set: { score: match.score, matchedSkills: match.matchedSkills, missingSkills: match.missingSkills } },
        { upsert: true },
      );
      await this.outbox.emit(EventTypes.ApplicationApplied, {
        applicationId: String(app._id),
        studentId: user.userId,
        jobId: String(job._id),
        recruiterId: String(job.postedBy),
      });
      return app;
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 11000) throw new ConflictException("Already applied");
      throw err;
    }
  }

  async mine(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.apps
        .find({ studentId: userId })
        .populate("jobId")
        .sort({ appliedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.apps.countDocuments({ studentId: userId }),
    ]);
    return { items, total, page, pageSize };
  }

  async forJob(user: AuthUser, jobId: string, query: Record<string, string | undefined>) {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new NotFoundException("Job not found");
    if (String(job.postedBy) !== user.userId && user.role !== "admin") throw new ForbiddenException();
    const filter: Record<string, unknown> = { jobId };
    if (query.status) filter.status = query.status;
    if (query.minMatchScore) filter.matchScore = { $gte: Number(query.minMatchScore) };
    const sortBy = query.sortBy === "appliedAt" ? "appliedAt" : "matchScore";
    const order = query.order === "asc" ? 1 : -1;
    const items = await this.apps
      .find(filter)
      .populate("studentId", "name email")
      .sort({ [sortBy]: order })
      .lean();
    return { items };
  }

  async setStatus(user: AuthUser, appId: string, dto: StatusDto) {
    const app = await this.apps.findById(appId);
    if (!app) throw new NotFoundException();
    const job = await this.jobs.findById(app.jobId);
    if (!job || String(job.postedBy) !== user.userId) throw new ForbiddenException();
    app.status = dto.status;
    await app.save();
    await this.outbox.emit(EventTypes.ApplicationStatus, {
      applicationId: appId,
      studentId: String(app.studentId),
      status: dto.status,
      jobTitle: job.title,
    });
    return app;
  }

  async bulkStatus(user: AuthUser, dto: BulkStatusDto) {
    const ids = dto.appIds.map((id) => new Types.ObjectId(id));
    const apps = await this.apps.find({ _id: { $in: ids } }).lean();
    if (apps.length !== ids.length) throw new ForbiddenException("Unknown applications");
    const jobIds = [...new Set(apps.map((a) => String(a.jobId)))];
    const owned = await this.jobs.countDocuments({
      _id: { $in: jobIds },
      postedBy: user.userId,
    });
    if (owned !== jobIds.length) throw new ForbiddenException("Not all applications are yours");
    await this.apps.updateMany({ _id: { $in: ids } }, { $set: { status: dto.status } });
    for (const app of apps) {
      await this.outbox.emit(EventTypes.ApplicationStatus, {
        applicationId: String(app._id),
        studentId: String(app.studentId),
        status: dto.status,
      });
    }
    return { updated: apps.length, skipped: 0 };
  }
}
