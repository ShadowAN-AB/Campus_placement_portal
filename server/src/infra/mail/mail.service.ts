import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import { env } from "../config/env";

export type MailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transport = env.smtp
    ? nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });

  async send(payload: MailPayload) {
    const info = await this.transport.sendMail({
      from: env.mailFrom,
      ...payload,
    });
    if (!env.smtp) this.log.log(`mail stdout: ${JSON.stringify(info)}`);
    return info;
  }
}
