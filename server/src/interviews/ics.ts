export function buildIcs(input: {
  id: string;
  title: string;
  start: Date;
  durationMinutes: number;
  description?: string;
  location?: string;
}) {
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const end = new Date(input.start.getTime() + input.durationMinutes * 60000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlaceCell//Placement//EN",
    "BEGIN:VEVENT",
    `UID:${input.id}@placecell.dev`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(input.start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${input.title}`,
    `DESCRIPTION:${(input.description ?? "").replace(/\n/g, "\\n")}`,
    `LOCATION:${input.location ?? ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
