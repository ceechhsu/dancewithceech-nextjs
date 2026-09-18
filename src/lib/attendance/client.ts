"use client";
export class AttendanceApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function attendanceApi<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/attendance/${path}`, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw new AttendanceApiError(
      result.error || "Unable to complete this request.",
      response.status,
    );
  return result as T;
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Please try again.";
