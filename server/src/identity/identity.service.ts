import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import { Model, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { Response } from "express";
import { env } from "../infra/config/env";
import { MailService } from "../infra/mail/mail.service";
import { User, UserDocument } from "./schemas/user.schema";
import { RefreshSession, RefreshSessionDocument } from "./schemas/refresh-session.schema";
import { LoginEvent, LoginEventDocument } from "./schemas/login-event.schema";
import { PasswordResetToken, PasswordResetTokenDocument } from "./schemas/password-reset.schema";
import { StudentProfile, StudentProfileDocument } from "../catalog/schemas/profile.schema";
import { ForgotPasswordDto, LoginDto, ResetPasswordDto, SignupDto } from "./dto/auth.dto";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

@Injectable()
export class IdentityService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(RefreshSession.name) private readonly sessions: Model<RefreshSessionDocument>,
    @InjectModel(LoginEvent.name) private readonly logins: Model<LoginEventDocument>,
    @InjectModel(PasswordResetToken.name) private readonly resets: Model<PasswordResetTokenDocument>,
    @InjectModel(StudentProfile.name) private readonly profiles: Model<StudentProfileDocument>,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async signup(dto: SignupDto, res: Response, meta: { ip?: string; userAgent?: string }) {
    if (dto.role === "admin" && dto.adminCode !== env.adminSignupCode) {
      throw new ForbiddenException("Invalid admin signup code");
    }
    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({ email });
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({ name: dto.name, email, passwordHash, role: dto.role });
    if (dto.role === "student") {
      await this.profiles.create({ userId: user._id, skills: [], bio: "" });
    }
    return this.issueAuth(user, res, meta);
  }

  async login(dto: LoginDto, res: Response, meta: { ip?: string; userAgent?: string }) {
    const user = await this.users.findOne({ email: dto.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.issueAuth(user, res, meta);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId).lean();
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  async refresh(rawToken: string | undefined, res: Response) {
    if (!rawToken) throw new UnauthorizedException("Missing refresh token");
    const tokenHash = sha256(rawToken);
    const session = await this.sessions.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!session) throw new UnauthorizedException("Invalid refresh token");
    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedException();
    session.revokedAt = new Date();
    await session.save();
    return this.issueAuth(user, res, {});
  }

  async logout(rawToken: string | undefined, res: Response) {
    if (rawToken) {
      await this.sessions.updateOne({ tokenHash: sha256(rawToken) }, { $set: { revokedAt: new Date() } });
    }
    res.clearCookie("refresh_token", { path: "/v1/auth" });
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.users.findOne({ email: dto.email.toLowerCase() });
    if (user) {
      const token = randomBytes(32).toString("hex");
      await this.resets.create({
        userId: user._id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await this.mail
        .send({
          to: user.email,
          subject: "Reset your PlaceCell password",
          html: `<p>Reset your password: ${env.appUrl}/reset-password?token=${token}</p>`,
          text: `${env.appUrl}/reset-password?token=${token}`,
        })
        .catch(() => undefined);
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rec = await this.resets.findOne({
      tokenHash: sha256(dto.token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!rec) throw new UnauthorizedException("Invalid or expired token");
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.updateOne({ _id: rec.userId }, { $set: { passwordHash } });
    rec.usedAt = new Date();
    await rec.save();
    await this.sessions.updateMany({ userId: rec.userId }, { $set: { revokedAt: new Date() } });
    return { ok: true };
  }

  private async issueAuth(
    user: UserDocument | { _id: Types.ObjectId; name: string; email: string; role: User["role"] },
    res: Response,
    meta: { ip?: string; userAgent?: string },
  ) {
    const accessToken = await this.jwt.signAsync({
      sub: String(user._id),
      email: user.email,
      role: user.role,
    });
    const refresh = randomBytes(32).toString("hex");
    await this.sessions.create({
      userId: user._id,
      tokenHash: sha256(refresh),
      expiresAt: new Date(Date.now() + env.jwtRefreshTtlDays * 86400000),
    });
    if ("passwordHash" in user) {
      await this.logins.create({
        userId: user._id,
        email: user.email,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }
    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      secure: env.isProd,
      sameSite: "lax",
      maxAge: env.jwtRefreshTtlDays * 86400000,
      path: "/v1/auth",
    });
    return { accessToken, user: this.publicUser(user) };
  }

  private publicUser(user: { _id: unknown; name: string; email: string; role: User["role"] }) {
    return { id: String(user._id), name: user.name, email: user.email, role: user.role };
  }
}
