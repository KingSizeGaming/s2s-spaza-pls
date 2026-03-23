// Strips all non-digit characters from a WhatsApp/phone number string.
export function normalizeWaNumber(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

// Trims leading/trailing whitespace and collapses internal whitespace to single spaces.
export function normalizeMessage(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}
