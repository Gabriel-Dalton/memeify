export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function generateRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function safeRoomCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}
