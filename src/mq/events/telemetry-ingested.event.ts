export type TelemetryIngestedEvent = {
  robotId: string;
  battery: number;
  status: string;
  lat?: number;
  lng?: number;
  timestamp: string;
};
