import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const e2eEnabled = Boolean(process.env.E2E_MONGODB_URI) || process.platform === "linux";

describe.skipIf(!e2eEnabled)("PlaceCell API", () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  let studentToken = "";
  let recruiterToken = "";
  let adminToken = "";
  let jobId = "";
  let appId = "";

  beforeAll(async () => {
    if (process.env.E2E_MONGODB_URI) {
      process.env.MONGODB_URI = process.env.E2E_MONGODB_URI;
    } else {
      mongo = await MongoMemoryServer.create();
      process.env.MONGODB_URI = mongo.getUri();
    }
    const { Test } = await import("@nestjs/testing");
    const { AppModule } = await import("../src/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  it("signs up roles and requires admin code", async () => {
    studentToken = (
      await request(app.getHttpServer())
        .post("/v1/auth/signup")
        .send({ name: "Stu", email: "stu@test.dev", password: "Password@123", role: "student" })
        .expect(201)
    ).body.accessToken;

    recruiterToken = (
      await request(app.getHttpServer())
        .post("/v1/auth/signup")
        .send({ name: "Rec", email: "rec@test.dev", password: "Password@123", role: "recruiter" })
        .expect(201)
    ).body.accessToken;

    await request(app.getHttpServer())
      .post("/v1/auth/signup")
      .send({ name: "Adm", email: "adm@test.dev", password: "Password@123", role: "admin" })
      .expect(403);

    adminToken = (
      await request(app.getHttpServer())
        .post("/v1/auth/signup")
        .send({
          name: "Adm",
          email: "adm@test.dev",
          password: "Password@123",
          role: "admin",
          adminCode: "admin-test-code",
        })
        .expect(201)
    ).body.accessToken;
  });

  it("rejects duplicate email", async () => {
    await request(app.getHttpServer())
      .post("/v1/auth/signup")
      .send({ name: "Stu", email: "stu@test.dev", password: "Password@123", role: "student" })
      .expect(409);
  });

  it("hides unapproved jobs, then apply is idempotent", async () => {
    const created = await request(app.getHttpServer())
      .post("/v1/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        title: "SDE",
        company: "Acme",
        description: "Build things",
        requiredSkills: ["node", "typescript"],
        minExperience: 0,
        minSalary: 100,
        maxSalary: 200,
      })
      .expect(201);
    const pendingId = created.body._id;

    const hidden = await request(app.getHttpServer())
      .get("/v1/jobs")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);
    expect(hidden.body.items.find((j: { _id: string }) => j._id === pendingId)).toBeUndefined();

    await request(app.getHttpServer())
      .post(`/v1/admin/jobs/${pendingId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(201);
    jobId = pendingId;

    const apply = await request(app.getHttpServer())
      .post("/v1/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .set("Idempotency-Key", "apply-1")
      .send({ jobId })
      .expect(201);
    appId = apply.body._id;
    expect(apply.body.matchScore).toBeGreaterThanOrEqual(0);

    const replay = await request(app.getHttpServer())
      .post("/v1/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .set("Idempotency-Key", "apply-1")
      .send({ jobId })
      .expect(201);
    expect(replay.body.replayed).toBe(true);

    await request(app.getHttpServer())
      .post("/v1/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .set("Idempotency-Key", "apply-2")
      .send({ jobId })
      .expect(409);
  });

  it("rejects overlapping interviews", async () => {
    const when = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await request(app.getHttpServer())
      .post("/v1/interviews")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({ applicationId: appId, scheduledAt: when, durationMinutes: 30 })
      .expect(201);

    const near = new Date(new Date(when).getTime() + 10 * 60000).toISOString();
    await request(app.getHttpServer())
      .post("/v1/interviews")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({ applicationId: appId, scheduledAt: near, durationMinutes: 30 })
      .expect((res) => {
        expect([400, 409]).toContain(res.status);
      });
  });
});
