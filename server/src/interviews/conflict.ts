export function interviewWindowsOverlap(
  existingStart: Date,
  existingDurationMin: number,
  nextStart: Date,
  nextDurationMin: number,
  bufferMin = 30,
) {
  const a0 = existingStart.getTime() - bufferMin * 60000;
  const a1 = existingStart.getTime() + existingDurationMin * 60000 + bufferMin * 60000;
  const b0 = nextStart.getTime();
  const b1 = nextStart.getTime() + nextDurationMin * 60000;
  return a0 <= b1 && b0 <= a1;
}
