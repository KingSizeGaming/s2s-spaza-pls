export function normalizeWaNumber(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

export function normalizeMessage(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}
