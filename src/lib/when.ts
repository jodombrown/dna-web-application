// Dates the way the system writes them (Strand content fundamentals): "Thu 16 Oct, 19:00".
// Notification times shorten to "Today, 10:12" and "Yesterday, 18:40" inside the last two days.
import { format, isToday, isYesterday } from "date-fns";

export function whenLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "EEE d MMM, HH:mm");
}

export function timeLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return "Today, " + format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday, " + format(d, "HH:mm");
  return format(d, "EEE d MMM");
}
