import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Application, ApplicationDocument } from "../applications/schemas/application.schema";
import { Job, JobDocument } from "../catalog/schemas/job.schema";
import { User, UserDocument } from "../identity/schemas/user.schema";
import { AnalyticsSnapshot, AnalyticsSnapshotDocument } from "./schemas/snapshot.schema";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AnalyticsSnapshot.name) private readonly snaps: Model<AnalyticsSnapshotDocument>,
    @InjectModel(Application.name) private readonly apps: Model<ApplicationDocument>,
    @InjectModel(Job.name) private readonly jobs: Model<JobDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async read() {
    const snap = await this.snaps.findOne({ key: "latest" }).lean();
    if (snap) return snap.data;
    return this.compute();
  }

  async rollup() {
    const data = await this.compute();
    await this.snaps.findOneAndUpdate(
      { key: "latest" },
      { $set: { data, computedAt: new Date() } },
      { upsert: true },
    );
    return data;
  }

  private async compute() {
    const [students, recruiters, jobs, apps] = await Promise.all([
      this.users.countDocuments({ role: "student" }),
      this.users.countDocuments({ role: "recruiter" }),
      this.jobs.countDocuments(),
      this.apps.find().populate("jobId").lean(),
    ]);
    const placed = apps.filter((a) => a.status === "shortlisted" || a.status === "interview").length;
    const placementRate = apps.length ? Math.round((placed / apps.length) * 100) : 0;
    const packages = apps
      .map((a) => {
        const job = a.jobId as unknown as { maxSalary?: number; company?: string };
        return job?.maxSalary ?? 0;
      })
      .filter(Boolean);
    const avgPackage = packages.length
      ? Math.round(packages.reduce((s, n) => s + n, 0) / packages.length)
      : 0;
    const companyMap = new Map<string, number>();
    for (const a of apps) {
      const job = a.jobId as unknown as { company?: string };
      if (!job?.company) continue;
      if (a.status === "shortlisted" || a.status === "interview") {
        companyMap.set(job.company, (companyMap.get(job.company) ?? 0) + 1);
      }
    }
    const topCompanies = [...companyMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }));

    const trend: { month: string; applications: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const count = apps.filter((a) => {
        const t = new Date(a.appliedAt).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      trend.push({ month: d.toISOString().slice(0, 7), applications: count });
    }

    return {
      totals: { students, recruiters, jobs, applications: apps.length },
      placementRate,
      avgPackage,
      topCompanies,
      trend,
      recentPlacements: apps
        .filter((a) => a.status === "shortlisted" || a.status === "interview")
        .slice(-8)
        .reverse(),
    };
  }
}
