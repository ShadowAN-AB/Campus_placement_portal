import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { env } from "../infra/config/env";
import { StudentProfile, StudentProfileSchema } from "../catalog/schemas/profile.schema";
import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { JwtStrategy } from "./jwt.strategy";
import { LoginEvent, LoginEventSchema } from "./schemas/login-event.schema";
import { PasswordResetToken, PasswordResetTokenSchema } from "./schemas/password-reset.schema";
import { RefreshSession, RefreshSessionSchema } from "./schemas/refresh-session.schema";
import { User, UserSchema } from "./schemas/user.schema";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: { expiresIn: env.jwtAccessTtl as `${number}${"s" | "m" | "h" | "d"}` },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshSession.name, schema: RefreshSessionSchema },
      { name: LoginEvent.name, schema: LoginEventSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
    ]),
  ],
  controllers: [IdentityController],
  providers: [IdentityService, JwtStrategy],
  exports: [IdentityService, MongooseModule],
})
export class IdentityModule {}
