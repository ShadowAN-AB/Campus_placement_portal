import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MatchScore, MatchScoreDocument } from "../applications/schemas/match-score.schema";
import { Job, JobDocument } from "../catalog/schemas/job.schema";
import { idMatch, oid } from "../common/oid";
import { AuthUser, EventTypes } from "../common/types";
import { OutboxService } from "../infra/outbox/outbox.service";
import { StorageService } from "../infra/storage/storage.service";
import { LlmService } from "../infra/llm/llm.service";
import { ResumeUpload, ResumeUploadDocument } from "./schemas/resume-upload.schema";
import { ResumeAnalysis, ResumeAnalysisDocument } from "./schemas/resume-analysis.schema";
import { ChatMessage, ChatMessageDocument } from "./schemas/chat-message.schema";

type FitRow = {
  jobId?: unknown;
  title: string;
  company: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  factors?: { skills?: number; experience?: number; salary?: number; education?: number; projects?: number };
};

@Injectable()
export class MatchingService {
  constructor(
    @InjectModel(ResumeUpload.name) private readonly uploads: Model<ResumeUploadDocument>,
    @InjectModel(ResumeAnalysis.name) private readonly analyses: Model<ResumeAnalysisDocument>,
    @InjectModel(ChatMessage.name) private readonly chats: Model<ChatMessageDocument>,
    @InjectModel(MatchScore.name) private readonly scores: Model<MatchScoreDocument>,
    @InjectModel(Job.name) private readonly jobs: Model<JobDocument>,
    private readonly storage: StorageService,
    private readonly outbox: OutboxService,
    private readonly llm: LlmService,
  ) {}

  async upload(user: AuthUser, file: Express.Multer.File) {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException("PDF or DOCX only");
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException("File too large");
    const key = `${user.userId}/${Date.now()}-${file.originalname}`;
    await this.storage.put(key, file.buffer, file.mimetype);
    const doc = await this.uploads.create({
      userId: oid(user.userId),
      filename: file.originalname,
      mimeType: file.mimetype,
      filePath: key,
      status: "uploaded",
    });
    await this.outbox.emit(EventTypes.ResumeUploaded, {
      resumeId: String(doc._id),
      userId: user.userId,
    });
    return { id: String(doc._id), status: doc.status, version: doc.version };
  }

  async status(userId: string) {
    const latest = await this.uploads.findOne({ userId: idMatch(userId) }).sort({ createdAt: -1 }).lean();
    return latest ?? { status: "none" };
  }

  async history(userId: string) {
    return this.uploads.find({ userId: idMatch(userId) }).sort({ createdAt: -1 }).limit(10).lean();
  }

  async versions(userId: string) {
    const uploads = await this.uploads.find({ userId: idMatch(userId) }).sort({ createdAt: -1 }).limit(5).lean();
    const analyses = await this.analyses.find({ userId: idMatch(userId) }).lean();
    const byResume = new Map(analyses.map((a) => [String(a.resumeId), a]));
    return uploads.map((u) => {
      const a = byResume.get(String(u._id));
      const scores = a?.jobFitScores?.map((j) => j.score) ?? [];
      return {
        resumeId: String(u._id),
        version: u.version,
        filename: u.filename,
        uploadedAt: (u as { createdAt?: Date }).createdAt,
        analyzedAt: a ? (a as { updatedAt?: Date }).updatedAt : null,
        topScore: scores.length ? Math.max(...scores) : 0,
        avgScore: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0,
        jobsScored: scores.length,
      };
    });
  }

  async compare(userId: string, aId: string, bId: string) {
    const [a, b] = await Promise.all([
      this.analyses.findOne({ userId: idMatch(userId), resumeId: aId }).lean(),
      this.analyses.findOne({ userId: idMatch(userId), resumeId: bId }).lean(),
    ]);
    if (!a || !b) throw new NotFoundException("Analysis not found");
    const aSkills = new Set(((a.extractedData.skills as string[]) ?? []).map((s) => s.toLowerCase()));
    const bSkills = new Set(((b.extractedData.skills as string[]) ?? []).map((s) => s.toLowerCase()));
    const skillsAdded = [...bSkills].filter((s) => !aSkills.has(s));
    const skillsRemoved = [...aSkills].filter((s) => !bSkills.has(s));
    const bByJob = new Map(b.jobFitScores.map((j) => [String(j.jobId), j]));
    const jobScoreDeltas = a.jobFitScores
      .map((j) => {
        const after = bByJob.get(String(j.jobId));
        if (!after) return null;
        return {
          jobId: String(j.jobId),
          title: j.title,
          company: j.company,
          before: j.score,
          after: after.score,
          delta: after.score - j.score,
        };
      })
      .filter(Boolean)
      .sort((x, y) => Math.abs((y as { delta: number }).delta) - Math.abs((x as { delta: number }).delta));
    return { a, b, diff: { skillsAdded, skillsRemoved, jobScoreDeltas } };
  }

  async companyFit(userId: string) {
    const latest = await this.analyses.findOne({ userId: idMatch(userId) }).sort({ createdAt: -1 }).lean();
    if (latest?.companyFitScores?.length) {
      return { items: latest.companyFitScores, extractedData: latest.extractedData ?? null, source: "resume" as const };
    }
    const jobs = await this.jobFit(userId);
    const byCompany = new Map<string, FitRow>();
    for (const row of jobs.items) {
      const prev = byCompany.get(row.company);
      if (!prev || row.score > prev.score) byCompany.set(row.company, row);
    }
    return {
      items: [...byCompany.values()].sort((a, b) => b.score - a.score),
      extractedData: jobs.extractedData,
      source: jobs.source,
    };
  }

  async jobFit(userId: string) {
    const latest = await this.analyses.findOne({ userId: idMatch(userId) }).sort({ createdAt: -1 }).lean();
    if (latest?.jobFitScores?.length) {
      return { items: latest.jobFitScores, extractedData: latest.extractedData ?? null, source: "resume" as const };
    }
    const scores = await this.scores.find({ studentId: idMatch(userId) }).lean();
    const jobDocs = scores.length
      ? await this.jobs.find({ _id: { $in: scores.map((s) => s.jobId) } }).lean()
      : [];
    const byId = new Map(jobDocs.map((j) => [String(j._id), j]));
    const items: FitRow[] = scores
      .map((s) => {
        const job = byId.get(String(s.jobId));
        return {
          jobId: s.jobId,
          title: job?.title ?? "Role",
          company: job?.company ?? "",
          score: s.score,
          matchedSkills: s.matchedSkills ?? [],
          missingSkills: s.missingSkills ?? [],
        };
      })
      .sort((a, b) => b.score - a.score);
    return { items, extractedData: null, source: "profile" as const };
  }

  async chatHistory(userId: string, limit = 50) {
    return this.chats
      .find({ userId: idMatch(userId) })
      .sort({ createdAt: 1 })
      .limit(Math.min(200, limit))
      .lean();
  }

  async clearChat(userId: string) {
    await this.chats.deleteMany({ userId: idMatch(userId) });
    return { ok: true };
  }

  async ask(userId: string, question: string) {
    const analysis = await this.analyses.findOne({ userId: idMatch(userId) }).sort({ createdAt: -1 }).lean();
    const top = (analysis?.jobFitScores ?? []).slice(0, 10);
    const context = JSON.stringify({ extracted: analysis?.extractedData, topJobs: top });
    let answer = "I don't have enough information yet. Upload and analyze a resume first.";
    let confidence = 0.3;
    if (analysis) {
      try {
        answer = await this.llm.generateText({
          system:
            "Answer only from the provided resume and job-fit context. Weights: skills 55, experience 20, salary 10, education 10, projects 5.",
          prompt: `Context:\n${context}\n\nQuestion: ${question}`,
          temperature: 0.3,
        });
        confidence = /don't have enough information/i.test(answer) ? 0.3 : 0.8;
      } catch {
        answer = "The assistant is unavailable. Try again shortly.";
      }
    }
    await this.chats.create({ userId: new Types.ObjectId(userId), role: "user", text: question });
    await this.chats.create({
      userId: new Types.ObjectId(userId),
      role: "assistant",
      text: answer,
      fromContext: true,
      confidence,
    });
    return { answer, confidence };
  }

  async health() {
    return this.llm.health();
  }
}
