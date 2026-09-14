"use client";
import type { AttendanceLocation } from "./types";
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
export function locate(): Promise<AttendanceLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(
        new Error(
          "Location is unavailable on this device. Please see your instructor.",
        ),
      );
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: p.timestamp,
        }),
      () =>
        reject(
          new Error(
            "We couldn’t verify your location. Allow location access or see your instructor.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Please try again.";
