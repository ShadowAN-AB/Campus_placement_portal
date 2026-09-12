import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Inject, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import { Model } from "mongoose";
import Redis from "ioredis";
import { oid } from "../common/oid";
import { AuthUser, EventTypes } from "../common/types";
import { REDIS } from "../infra/redis/redis.module";
import { OutboxService } from "../infra/outbox/outbox.service";
import { Application, ApplicationDocument } from "../applications/schemas/application.schema";
import { Job, JobDocument } from "../catalog/schemas/job.schema";
import { User, UserDocument } from "../identity/schemas/user.schema";
import { Interview, InterviewDocument } from "./schemas/interview.schema";
import { CancelDto, CompleteDto, RescheduleDto, ScheduleInterviewDto } from "./dto/interviews.dto";
import { buildIcs } from "./ics";
import { interviewWindowsOverlap } from "./conflict";

@Injectable()
export class InterviewsService {
  constructor(
    @InjectModel(Interview.name) private readonly interviews: Model<InterviewDocument>,
    @InjectModel(Application.name) private readonly apps: Model<ApplicationDocument>,
    @InjectModel(Job.name) private readonly jobs: Model<JobDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly outbox: OutboxService,
    private readonly jwt: JwtService,
  ) {}

  async schedule(user: AuthUser, dto: ScheduleInterviewDto) {
    const when = new Date(dto.scheduledAt);
    if (when.getTime() <= Date.now()) throw new BadRequestException("Must be in the future");
    const duration = Math.min(180, Math.max(15, dto.durationMinutes ?? 30));
    const app = await this.apps.findById(dto.applicationId);
    if (!app) throw new NotFoundException("Application not found");
    const job = await this.jobs.findById(app.jobId);
    if (!job || String(job.postedBy) !== user.userId) throw new ForbiddenException();

    const lockKey = `lock:interview:${app.studentId}:${when.toISOString()}`;
    let locked: string | null = "OK";
    try {
      locked = await this.redis.set(lockKey, "1", "EX", 15, "NX");
    } catch {
      locked = "OK";
    }
    if (!locked) throw new ConflictException("Slot is being booked");

    try {
      const conflict = await this.hasConflict(String(app.studentId), when, duration);
      if (conflict) throw new ConflictException("Student already has an interview in this window");
      const interview = await this.interviews.create({
        applicationId: app._id,
        studentId: app.studentId,
        recruiterId: user.userId,
        jobId: job._id,
        scheduledAt: when,
        durationMinutes: duration,
        meetingType: dto.meetingType ?? "online",
        meetingLink: dto.meetingLink,
        location: dto.location,
        notes: dto.notes,
        status: "scheduled",
      });
      app.status = "interview";
      await app.save();
      await this.outbox.emit(EventTypes.InterviewScheduled, {
        interviewId: String(interview._id),
        studentId: String(app.studentId),
        recruiterId: user.userId,
        jobTitle: job.title,
        company: job.company,
        scheduledAt: when.toISOString(),
      });
      return interview;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException("Interview already scheduled for this application");
      }
      throw err;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async list(user: AuthUser, upcoming?: boolean) {
    const filter: Record<string, unknown> = {};
    if (user.role === "student") filter.studentId = oid(user.userId);
    else if (user.role === "recruiter") filter.recruiterId = oid(user.userId);
    if (upcoming) {
      filter.status = "scheduled";
      filter.scheduledAt = { $gte: new Date() };
    }
    return this.interviews
      .find(filter)
      .populate("jobId", "title company")
      .populate("studentId", "name email")
      .sort({ scheduledAt: 1 })
      .lean();
  }

  async get(user: AuthUser, id: string) {
    const interview = await this.interviews.findById(id).lean();
    if (!interview) throw new NotFoundException();
    this.assertViewer(user, interview);
    return interview;
  }

  async reschedule(user: AuthUser, id: string, dto: RescheduleDto) {
    const interview = await this.requireOwner(user, id);
    if (interview.status !== "scheduled") throw new BadRequestException("Cannot reschedule");
    const when = new Date(dto.scheduledAt);
    const duration = dto.durationMinutes ?? interview.durationMinutes;
    if (await this.hasConflict(String(interview.studentId), when, duration, String(interview._id))) {
      throw new ConflictException("Student already has an interview in this window");
    }
    interview.scheduledAt = when;
    interview.durationMinutes = duration;
    await interview.save();
    await this.outbox.emit(EventTypes.InterviewRescheduled, {
      interviewId: id,
      studentId: String(interview.studentId),
      recruiterId: String(interview.recruiterId),
      scheduledAt: when.toISOString(),
    });
    return interview;
  }

  async cancel(user: AuthUser, id: string, dto: CancelDto) {
    const interview = await this.requireOwner(user, id);
    interview.status = "cancelled";
    interview.cancelReason = dto.reason;
    await interview.save();
    await this.apps.updateOne({ _id: interview.applicationId }, { $set: { status: "shortlisted" } });
    await this.outbox.emit(EventTypes.InterviewCancelled, {
      interviewId: id,
      studentId: String(interview.studentId),
      recruiterId: String(interview.recruiterId),
      reason: dto.reason,
    });
    return interview;
  }

  async complete(user: AuthUser, id: string, dto: CompleteDto) {
    const interview = await this.requireOwner(user, id);
    interview.status = "completed";
    interview.feedback = dto.feedback;
    interview.rating = dto.rating ? Math.min(5, Math.max(1, dto.rating)) : undefined;
    await interview.save();
    return interview;
  }

  async calendar(user: AuthUser, id: string) {
    const interview = await this.interviews.findById(id).lean();
    if (!interview) throw new NotFoundException();
    this.assertViewer(user, interview);
    const job = await this.jobs.findById(interview.jobId).lean();
    return buildIcs({
      id: String(interview._id),
      title: `Interview: ${job?.title ?? "Role"} at ${job?.company ?? "Company"}`,
      start: interview.scheduledAt,
      durationMinutes: interview.durationMinutes,
      description: interview.notes,
      location: interview.location ?? interview.meetingLink,
    });
  }

  async calendarToken(user: AuthUser, id: string) {
    await this.get(user, id);
    const token = await this.jwt.signAsync({ sub: user.userId, role: user.role, cal: id }, { expiresIn: "15m" });
    return { url: `/v1/interviews/${id}/calendar?download=${token}` };
  }

  async slots(recruiterId: string, date: string) {
    const day = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(day.getTime())) throw new BadRequestException("date=YYYY-MM-DD");
    const start = new Date(day);
    start.setUTCHours(9, 0, 0, 0);
    const end = new Date(day);
    end.setUTCHours(18, 0, 0, 0);
    const existing = await this.interviews
      .find({
        recruiterId,
        status: "scheduled",
        scheduledAt: { $gte: start, $lt: end },
      })
      .lean();
    void interviewWindowsOverlap;
    const taken = new Set(existing.map((i) => i.scheduledAt.toISOString()));
    const slots: { start: string; available: boolean }[] = [];
    for (let t = start.getTime(); t < end.getTime(); t += 30 * 60000) {
      const iso = new Date(t).toISOString();
      slots.push({ start: iso, available: !taken.has(iso) });
    }
    return { date, slots };
  }

  async downloadWithToken(id: string, token: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: AuthUser["role"]; cal?: string }>(token);
      if (payload.cal && payload.cal !== id) throw new UnauthorizedException();
      return this.calendar({ userId: payload.sub, email: "", role: payload.role }, id);
    } catch {
      throw new UnauthorizedException("Invalid download token");
    }
  }

  private async hasConflict(studentId: string, when: Date, duration: number, exceptId?: string) {
    const candidates = await this.interviews.find({ studentId, status: "scheduled" }).lean();
    const hit = candidates.some((row) => {
      if (exceptId && String(row._id) === exceptId) return false;
      return interviewWindowsOverlap(row.scheduledAt, row.durationMinutes, when, duration);
    });
    return hit;
  }

  private async requireOwner(user: AuthUser, id: string) {
    const interview = await this.interviews.findById(id);
    if (!interview) throw new NotFoundException();
    if (String(interview.recruiterId) !== user.userId) throw new ForbiddenException();
    return interview;
  }

  private assertViewer(user: AuthUser, interview: { studentId: unknown; recruiterId: unknown }) {
    const sid = String(interview.studentId);
    const rid = String(interview.recruiterId);
    if (user.role !== "admin" && user.userId !== sid && user.userId !== rid) {
      throw new ForbiddenException();
    }
  }
}
