// src/types.ts

export type Robot = {
  id: string;
  name?: string;
  model: string;
  createdAt?: string | Date;
  online: boolean;

  // frontend-only fields
  apiKey?: string;
  x?: number;
  y?: number;
};

export type Telemetry = {
  // history rows from DB usually have id + createdAt
  id?: string;
  robotId?: string;

  battery: number;
  status: string;
  lat?: number | null;
  lng?: number | null;

  createdAt?: string;
};

// ✅ 백엔드 RobotsController(myTelemetry) 응답에 맞춤
export type MyTelemetryResponse = {
  robotId: string;
  online: boolean;
  telemetry: Telemetry | null;
};

// ✅ history 응답은 service 구현에 따라 data/rows가 갈릴 수 있어서,
//    프론트 안정화 목적으로 "호환 타입"도 같이 제공
export type TelemetryHistoryMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TelemetryHistoryResponse = {
  data: Telemetry[];
  meta: TelemetryHistoryMeta;
};

// ✅ (호환) 백엔드가 rows로 내려줄 때도 안전하게 처리 가능
export type TelemetryHistoryResponseCompat =
  | TelemetryHistoryResponse
  | { rows: Telemetry[]; meta: TelemetryHistoryMeta };
