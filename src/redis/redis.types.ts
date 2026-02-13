export interface RedisClient {
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<'OK'>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
}
