import type { NextRequest } from "next/server";

export function getBaseUrlFromRequest(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function getBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  const { headers } = await import("next/headers");
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
