import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { env } from "../infra/config/env";
import { AuthUser, Role } from "../common/types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.jwtSecret,
    });
  }

  validate(payload: { sub: string; email: string; role: Role }): AuthUser {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
