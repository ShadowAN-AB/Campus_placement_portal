import { Module } from "@nestjs/common";
import { PlacecellAppModule } from "./apps/build-app.module";

/** Monolith composition used by e2e tests and `SERVICE=all`. */
@Module({
  imports: [PlacecellAppModule.forService("all")],
})
export class AppModule {}
