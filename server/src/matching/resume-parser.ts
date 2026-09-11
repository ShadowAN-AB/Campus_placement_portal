import mammoth from "mammoth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export async function extractText(buffer: Buffer, mimeType: string) {
  if (mimeType.includes("word") || mimeType.includes("docx")) {
    const res = await mammoth.extractRawText({ buffer });
    return res.value.replace(/\s+/g, " ").trim();
  }
  const pdf = await pdfParse(buffer);
  return (pdf.text ?? "").replace(/\s+/g, " ").trim();
}

const SKILL_BANK = [
  "javascript",
  "typescript",
  "python",
  "java",
  "react",
  "node",
  "nodejs",
  "express",
  "mongodb",
  "sql",
  "aws",
  "docker",
  "kubernetes",
  "redis",
  "kafka",
  "html",
  "css",
  "git",
  "c++",
  "go",
  "rust",
];

export function regexFallback(text: string) {
  const lower = text.toLowerCase();
  const skills = SKILL_BANK.filter((s) => lower.includes(s));
  const education: { degree?: string }[] = [];
  if (/b\.?tech|bachelor/i.test(text)) education.push({ degree: "B.Tech" });
  if (/m\.?tech|master/i.test(text)) education.push({ degree: "M.Tech" });
  const years = Number((text.match(/(\d+)\+?\s+years?/i) ?? [])[1] ?? 0);
  return {
    skills,
    education,
    projects: [],
    certifications: [] as string[],
    yearsOfExperience: years,
  };
}
