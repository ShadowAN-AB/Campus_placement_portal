import "reflect-metadata";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "./infra/config/env";
import { User, UserSchema } from "./identity/schemas/user.schema";
import { StudentProfile, StudentProfileSchema } from "./catalog/schemas/profile.schema";
import { Job, JobSchema } from "./catalog/schemas/job.schema";
import { Application, ApplicationSchema } from "./applications/schemas/application.schema";
import { MatchScore, MatchScoreSchema } from "./applications/schemas/match-score.schema";

async function seed() {
  await mongoose.connect(env.mongodbUri);
  const UserModel = mongoose.model(User.name, UserSchema);
  const ProfileModel = mongoose.model(StudentProfile.name, StudentProfileSchema);
  const JobModel = mongoose.model(Job.name, JobSchema);
  const AppModel = mongoose.model(Application.name, ApplicationSchema);
  const ScoreModel = mongoose.model(MatchScore.name, MatchScoreSchema);

  await Promise.all([
    UserModel.deleteMany({}),
    ProfileModel.deleteMany({}),
    JobModel.deleteMany({}),
    AppModel.deleteMany({}),
    ScoreModel.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("Password@123", 10);
  const [student, recruiter, admin] = await UserModel.create([
    { name: "Ada Student", email: "student1@spp.dev", passwordHash, role: "student" },
    { name: "Riya Recruiter", email: "recruiter@spp.dev", passwordHash, role: "recruiter" },
    { name: "PlaceCell Admin", email: "admin@spp.dev", passwordHash, role: "admin" },
  ]);

  await ProfileModel.create({
    userId: student._id,
    skills: ["javascript", "typescript", "react", "node"],
    bio: "CS student focused on full-stack systems.",
    expectedSalary: 1200000,
    yearsOfExperience: 1,
    prefJobTitles: ["SDE", "Backend Engineer"],
  });

  await JobModel.create([
    {
      title: "Backend Engineer",
      company: "Nimbus",
      description: "Build APIs, queues, and caches for a campus platform.",
      requiredSkills: ["node", "typescript", "mongodb", "redis"],
      minExperience: 0,
      minSalary: 800000,
      maxSalary: 1600000,
      approved: true,
      status: "active",
      postedBy: recruiter._id,
    },
    {
      title: "Frontend Engineer",
      company: "Nimbus",
      description: "React dashboards for students and recruiters.",
      requiredSkills: ["react", "typescript", "css"],
      minExperience: 0,
      minSalary: 700000,
      maxSalary: 1400000,
      approved: true,
      status: "active",
      postedBy: recruiter._id,
    },
    {
      title: "Pending Campus Drive",
      company: "Orchid Labs",
      description: "Awaiting placement-cell approval.",
      requiredSkills: ["python", "sql"],
      minExperience: 0,
      minSalary: 600000,
      maxSalary: 1000000,
      approved: false,
      status: "active",
      postedBy: recruiter._id,
    },
  ]);

  console.log("Seeded users:");
  console.log("  student1@spp.dev / Password@123");
  console.log("  recruiter@spp.dev / Password@123");
  console.log("  admin@spp.dev / Password@123");
  console.log(`  admin id ${admin._id}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
