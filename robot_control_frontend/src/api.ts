
import type {
  TelemetryHistoryResponseCompat,
  MyTelemetryResponse,
  Robot,
  Telemetry,
  TelemetryHistoryMeta,
} from './types';

const BASE = 'http://localhost:3000';

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && (data as { message?: unknown; error?: unknown }).message) ||
      (data && (data as { message?: unknown; error?: unknown }).error)
        ? String(
            (data as { message?: unknown; error?: unknown }).message ??
              (data as { message?: unknown; error?: unknown }).error,
          )
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

/** ============ Dashboard APIs ============ */

export async function listRobots(): Promise<
  Array<Pick<Robot, 'id' | 'name' | 'model' | 'createdAt' | 'online'>>
> {
  const res = await fetch(`${BASE}/robots`);
  return handleResponse(res);
}

export async function createRobot(
  name: string,
  model: string,
): Promise<{ id: string; name: string; model: string; apiKey: string }> {
  const res = await fetch(`${BASE}/robots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, model }),
  });
  return handleResponse(res);
}

export async function deleteRobot(
  id: string,
): Promise<{ deleted: boolean; robotId?: string; reason?: string }> {
  const res = await fetch(`${BASE}/robots/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function postTelemetry(
  apiKey: string,
  body: { battery: number; status: string; lat?: number; lng?: number },
): Promise<{ ok: boolean; robotId: string; ttl: number }> {
  const res = await fetch(`${BASE}/robots/telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function getMyTelemetry(apiKey: string): Promise<MyTelemetryResponse> {
  const res = await fetch(`${BASE}/robots/me/telemetry`, {
    headers: { 'x-api-key': apiKey },
  });
  return handleResponse(res);
}

// 중요: 백엔드가 {data, meta} 또는 {rows, meta} 둘 다 가능
// any 없이, Telemetry/Meta를 사용해 타입 고정
export async function getTelemetryHistory(
  apiKey: string,
  page = 1,
  limit = 20,
): Promise<TelemetryHistoryResponseCompat> {
  const res = await fetch(`${BASE}/robots/me/telemetry/history?page=${page}&limit=${limit}`, {
    headers: { 'x-api-key': apiKey },
  });

  const raw = await handleResponse<unknown>(res);

  // 런타임 가드로 안전하게 변환 (any 금지)
  const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

  const isMeta = (v: unknown): v is TelemetryHistoryMeta => {
    if (!isObj(v)) return false;
    return (
      typeof v.page === 'number' &&
      typeof v.limit === 'number' &&
      typeof v.total === 'number' &&
      typeof v.totalPages === 'number'
    );
  };

  const isTelemetryArray = (v: unknown): v is Telemetry[] =>
    Array.isArray(v) &&
    v.every((x) => isObj(x) && typeof x.battery === 'number' && typeof x.status === 'string');

  if (isObj(raw) && 'data' in raw && 'meta' in raw && isTelemetryArray(raw.data) && isMeta(raw.meta)) {
    return { data: raw.data, meta: raw.meta };
  }

  if (isObj(raw) && 'rows' in raw && 'meta' in raw && isTelemetryArray(raw.rows) && isMeta(raw.meta)) {
    return { rows: raw.rows, meta: raw.meta };
  }

  // 형태가 이상하면 빈 값으로라도 반환 (프론트는 안 죽게)
  return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
}

/** ============ Admin APIs ============ */

export type AdminTableResponse<T> = {
  rows: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export async function adminGetRobots(adminKey: string, page = 1, limit = 50) {
  const res = await fetch(`${BASE}/admin/db/robots?page=${page}&limit=${limit}`, {
    headers: { 'x-admin-key': adminKey },
  });
  return handleResponse(res) as Promise<
    AdminTableResponse<{ id: string; name: string; model: string; createdAt: string }>
  >;
}

export async function adminGetTelemetryHistory(adminKey: string, page = 1, limit = 50) {
  const res = await fetch(`${BASE}/admin/db/telemetry-history?page=${page}&limit=${limit}`, {
    headers: { 'x-admin-key': adminKey },
  });
  return handleResponse(res) as Promise<
    AdminTableResponse<{
      id: string;
      robotId: string;
      battery: number;
      status: string;
      lat: number | null;
      lng: number | null;
      createdAt: string;
    }>
  >;
}

export async function adminGetLogs(adminKey: string, limit = 200) {
  const res = await fetch(`${BASE}/admin/db/logs?limit=${limit}`, {
    headers: { 'x-admin-key': adminKey },
  });
  return handleResponse(res) as Promise<{
    lines: string[];
    meta: { file: string; exists: boolean; limit: number };
  }>;
}
