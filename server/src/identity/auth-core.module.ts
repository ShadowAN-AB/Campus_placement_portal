import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { env } from "../infra/config/env";
import { JwtStrategy } from "./jwt.strategy";

/** JWT verify only — imported by every HTTP service so auth works if identity is still up or a token is already valid. */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: { expiresIn: env.jwtAccessTtl as `${number}${"s" | "m" | "h" | "d"}` },
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthCoreModule {}
