import type { RetireBlockerIds } from "../types/equipment";

export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: RetireBlockerIds | null;
  data?: unknown;
};

export type RequestError = Error & {
  code?: string;
  details?: RetireBlockerIds | null;
};

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "content-type": "application/json", "x-demo-role": "LabManager", ...(options.headers || {}) }
  });
  const payload: ApiErrorBody = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message ?? "请求失败") as RequestError;
    error.code = payload.code;
    error.details = payload.details ?? null;
    throw error;
  }
  return payload.data as T;
}
