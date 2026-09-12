import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Job as BullJob } from "bullmq";
import { Model } from "mongoose";
import Redis from "ioredis";
import { Inject } from "@nestjs/common";
import { idMatch, oid } from "../../common/oid";
import { EventTypes, QUEUE_EVENTS } from "../../common/types";
import { Application } from "../../applications/schemas/application.schema";
import { MatchScore } from "../../applications/schemas/match-score.schema";
import { Job } from "../../catalog/schemas/job.schema";
import { StudentProfile } from "../../catalog/schemas/profile.schema";
import { User } from "../../identity/schemas/user.schema";
import { Interview } from "../../interviews/schemas/interview.schema";
import { ResumeUpload } from "../../matching/schemas/resume-upload.schema";
import { ResumeAnalysis } from "../../matching/schemas/resume-analysis.schema";
import { calculateEnhancedMatchScore, calculateMatchScore } from "../../matching/match-algorithm";
import { extractText, regexFallback } from "../../matching/resume-parser";
import { NotificationsService } from "../../notifications/notifications.service";
import { AnalyticsService } from "../../analytics/analytics.service";
import { MailService } from "../mail/mail.service";
import { LlmService } from "../llm/llm.service";
import { StorageService } from "../storage/storage.service";
import { OutboxService } from "../outbox/outbox.service";
import { REDIS } from "../redis/redis.module";
import { buildIcs } from "../../interviews/ics";

@Injectable()
@Processor(QUEUE_EVENTS)
export class EventsProcessor extends WorkerHost {
  private readonly log = new Logger(EventsProcessor.name);

  constructor(
    @InjectModel(ResumeUpload.name) private readonly uploads: Model<ResumeUpload>,
    @InjectModel(ResumeAnalysis.name) private readonly analyses: Model<ResumeAnalysis>,
    @InjectModel(StudentProfile.name) private readonly profiles: Model<StudentProfile>,
    @InjectModel(Job.name) private readonly jobs: Model<Job>,
    @InjectModel(MatchScore.name) private readonly scores: Model<MatchScore>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Interview.name) private readonly interviews: Model<Interview>,
    @InjectModel(Application.name) private readonly apps: Model<Application>,
    private readonly storage: StorageService,
    private readonly llm: LlmService,
    private readonly notes: NotificationsService,
    private readonly mail: MailService,
    private readonly analytics: AnalyticsService,
    private readonly outbox: OutboxService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {
    super();
  }

  async process(job: BullJob<{ outboxId?: string; type: string; payload: Record<string, unknown> }>) {
    const { type, payload, outboxId } = job.data;
    try {
      switch (type) {
        case EventTypes.ResumeUploaded:
          await this.handleResume(payload);
          break;
        case EventTypes.ApplicationApplied:
        case EventTypes.ProfileUpdated:
        case EventTypes.JobChanged:
        case EventTypes.JobApproved:
          await this.recomputeRanks(payload);
          if (type === EventTypes.ApplicationApplied && payload.recruiterId) {
            await this.notes.notify(String(payload.recruiterId), {
              type: "application_applied",
              title: "New application",
              body: "A student applied to one of your roles",
              link: "/dashboard/recruiter",
            });
          }
          if (type === EventTypes.JobApproved && payload.postedBy) {
            await this.notes.notify(String(payload.postedBy), {
              type: "job_approved",
              title: "Job approved",
              body: `${payload.title ?? "Your job"} is now visible to students`,
              link: "/dashboard/recruiter",
            });
          }
          break;
        case EventTypes.ApplicationStatus:
          await this.notes.notify(String(payload.studentId), {
            type: "application_status",
            title: "Application updated",
            body: `Status is now ${payload.status}${payload.jobTitle ? ` for ${payload.jobTitle}` : ""}`,
            link: "/dashboard/student",
          });
          break;
        case EventTypes.InterviewScheduled:
        case EventTypes.InterviewRescheduled:
        case EventTypes.InterviewCancelled:
          await this.handleInterviewMail(type, payload);
          break;
        case EventTypes.AnalyticsRollup:
          await this.analytics.rollup();
          break;
        default:
          this.log.warn(`Unhandled event ${type}`);
      }
      if (outboxId) await this.outbox.markProcessed(outboxId);
    } catch (err) {
      this.log.error(`Event ${type} failed`, err as Error);
      throw err;
    }
  }

  private async handleResume(payload: Record<string, unknown>) {
    const resumeId = String(payload.resumeId);
    const upload = await this.uploads.findById(resumeId);
    if (!upload) return;
    upload.status = "parsing";
    await upload.save();
    try {
      const buf = await this.storage.getBuffer(upload.filePath);
      const text = await extractText(buf, upload.mimeType);
      let extracted = regexFallback(text);
      try {
        const raw = await this.llm.generateJSON({
          system: "Extract resume JSON only. Keys: skills, education[{degree,school,year}], projects[{name,description,skills}], certifications, yearsOfExperience. No markdown.",
          prompt: text.slice(0, 12000),
          temperature: 0.1,
        });
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        extracted = {
          skills: (parsed.skills ?? []).map((s: string) => String(s).toLowerCase()),
          education: parsed.education ?? [],
          projects: parsed.projects ?? [],
          certifications: parsed.certifications ?? [],
          yearsOfExperience: Number(parsed.yearsOfExperience ?? extracted.yearsOfExperience),
        };
      } catch {
        this.log.warn("LLM extract failed; using regex fallback");
      }
      upload.status = "extracted";
      await upload.save();

      const jobs = await this.jobs.find({ approved: true, status: "active" }).lean();
      const profile = await this.profiles.findOne({ userId: idMatch(upload.userId) }).lean();
      const studentSkills = [...new Set([...(profile?.skills ?? []), ...extracted.skills])];
      const jobFitScores = jobs.map((job) => {
        const result = calculateEnhancedMatchScore({
          studentSkills,
          requiredSkills: job.requiredSkills,
          studentMonths: Math.max((profile?.yearsOfExperience ?? 0) * 12, (extracted.yearsOfExperience ?? 0) * 12),
          requiredMonths: (job.minExperience ?? 0) * 12,
          expectedSalary: profile?.expectedSalary,
          minSalary: job.minSalary,
          maxSalary: job.maxSalary,
          education: extracted.education,
          projects: extracted.projects,
        });
        return {
          jobId: job._id,
          title: job.title,
          company: job.company,
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          factors: result.factors,
        };
      });
      const byCompany = new Map<string, (typeof jobFitScores)[number]>();
      for (const row of jobFitScores) {
        const prev = byCompany.get(row.company);
        if (!prev || row.score > prev.score) byCompany.set(row.company, row);
      }

      await this.analyses.findOneAndUpdate(
        { userId: oid(upload.userId), resumeId: upload._id },
        {
          $set: {
            userId: oid(upload.userId),
            resumeId: upload._id,
            extractedData: extracted,
            jobFitScores,
            companyFitScores: [...byCompany.values()],
          },
        },
        { upsert: true },
      );
      await this.profiles.findOneAndUpdate(
        { userId: idMatch(upload.userId) },
        {
          $set: {
            education: extracted.education,
            projects: extracted.projects,
            certifications: extracted.certifications,
            lastAnalyzedAt: new Date(),
          },
          $addToSet: { skills: { $each: extracted.skills } },
        },
      );
      upload.status = "analyzed";
      await upload.save();
      await this.recomputeRanks({ userId: String(upload.userId) });
      await this.notes.notify(String(upload.userId), {
        type: "resume_analyzed",
        title: "Resume analyzed",
        body: "Your resume scores are ready.",
        link: "/resume-intelligence",
      });
    } catch (err) {
      upload.status = "failed";
      upload.error = err instanceof Error ? err.message : "analyze failed";
      await upload.save();
      throw err;
    }
  }

  private async recomputeRanks(payload: Record<string, unknown>) {
    const jobs = await this.jobs.find({ approved: true, status: "active" }).lean();
    const students = payload.userId
      ? await this.profiles.find({ userId: idMatch(String(payload.userId)) }).lean()
      : await this.profiles.find().lean();
    for (const profile of students) {
      const key = `jobs:rank:${String(profile.userId)}`;
      const pipe = this.redis.pipeline();
      pipe.del(key);
      for (const job of jobs) {
        const result = calculateMatchScore({
          studentSkills: profile.skills ?? [],
          requiredSkills: job.requiredSkills,
          studentMonths: (profile.yearsOfExperience ?? 0) * 12,
          requiredMonths: (job.minExperience ?? 0) * 12,
          expectedSalary: profile.expectedSalary,
          minSalary: job.minSalary,
          maxSalary: job.maxSalary,
        });
        pipe.zadd(key, result.score, String(job._id));
        await this.scores.findOneAndUpdate(
          { studentId: oid(profile.userId), jobId: job._id },
          { $set: { studentId: oid(profile.userId), score: result.score, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills } },
          { upsert: true },
        );
      }
      pipe.expire(key, 3600);
      await pipe.exec();
    }
  }

  private async handleInterviewMail(type: string, payload: Record<string, unknown>) {
    const student = await this.users.findById(String(payload.studentId)).lean();
    const recruiter = await this.users.findById(String(payload.recruiterId)).lean();
    const title =
      type === EventTypes.InterviewCancelled
        ? "Interview cancelled"
        : type === EventTypes.InterviewRescheduled
          ? "Interview rescheduled"
          : "Interview scheduled";
    const body = `${payload.jobTitle ?? "A role"} at ${payload.company ?? "the company"} — ${payload.scheduledAt ?? payload.reason ?? ""}`;
    if (student) {
      await this.notes.notify(String(student._id), {
        type: type.replace(".", "_"),
        title,
        body,
        link: "/interviews",
      });
    }
    if (recruiter) {
      await this.notes.notify(String(recruiter._id), {
        type: type.replace(".", "_"),
        title,
        body,
        link: "/interviews",
      });
    }
    const to = [student?.email, recruiter?.email].filter(Boolean) as string[];
    if (!to.length) return;
    let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;
    if (type !== EventTypes.InterviewCancelled && payload.scheduledAt) {
      const ics = buildIcs({
        id: String(payload.interviewId ?? "interview"),
        title: `Interview: ${payload.jobTitle ?? "Role"}`,
        start: new Date(String(payload.scheduledAt)),
        durationMinutes: 30,
        description: body,
      });
      attachments = [{ filename: "interview.ics", content: Buffer.from(ics), contentType: "text/calendar" }];
    }
    await this.mail
      .send({
        to,
        subject: title,
        html: `<p>${body.replace(/</g, "&lt;")}</p>`,
        text: body,
        attachments,
      })
      .catch((err) => this.log.warn(`mail failed: ${err}`));
  }
}
