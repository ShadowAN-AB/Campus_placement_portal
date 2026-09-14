import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { StudentProfile, StudentProfileSchema } from "../catalog/schemas/profile.schema";
import { AuthCoreModule } from "./auth-core.module";
import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { LoginEvent, LoginEventSchema } from "./schemas/login-event.schema";
import { PasswordResetToken, PasswordResetTokenSchema } from "./schemas/password-reset.schema";
import { RefreshSession, RefreshSessionSchema } from "./schemas/refresh-session.schema";
import { User, UserSchema } from "./schemas/user.schema";

@Module({
  imports: [
    AuthCoreModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshSession.name, schema: RefreshSessionSchema },
      { name: LoginEvent.name, schema: LoginEventSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: StudentProfile.name, schema: StudentProfileSchema },
    ]),
  ],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService, MongooseModule, AuthCoreModule],
})
export class IdentityModule {}
