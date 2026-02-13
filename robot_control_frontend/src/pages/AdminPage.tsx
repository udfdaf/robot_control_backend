import { useMemo, useState } from 'react';
import { adminGetLogs, adminGetRobots, adminGetTelemetryHistory } from '../api';

type AdminMeta = { page?: number; limit?: number; total?: number; totalPages?: number };

type LogLevel = 'ALL' | 'info' | 'warn' | 'error' | 'debug';
type Domain = 'ALL' | 'robots' | 'telemetry' | 'consumer' | 'mq' | 'admin' | 'app';

type LogItem = {
  raw: string;
  timestamp?: string;
  level?: string;
  context?: string;
  event?: string;
  message?: string;
};

function parseLogLine(line: string): LogItem {
  const trimmed = line.trim();
  if (!trimmed) return { raw: line };

  // JSON 라인 파싱 시도
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      return {
        raw: line,
        timestamp: typeof obj.timestamp === 'string' ? obj.timestamp : undefined,
        level: typeof obj.level === 'string' ? obj.level : undefined,
        context: typeof obj.context === 'string' ? obj.context : undefined,
        event: typeof obj.event === 'string' ? obj.event : undefined,
        message: typeof obj.message === 'string' ? obj.message : undefined,
      };
    } catch {
      return { raw: line };
    }
  }

  return { raw: line };
}

function formatLog(item: LogItem): string {
  const t = item.timestamp ?? '';
  const lv = item.level ?? '';
  const ev = item.event ?? '';
  const ctx = item.context ?? '';
  const msg = item.message ?? item.raw;
  return `${t} ${lv} ${ev} ${ctx} ${msg}`.replace(/\s+/g, ' ').trim();
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [robots, setRobots] = useState<Array<{ id: string; name: string; model: string; createdAt: string }>>([]);
  const [robotsMeta, setRobotsMeta] = useState<AdminMeta>({ page: 1, limit: 50 });

  const [history, setHistory] = useState<
    Array<{
      id: string;
      robotId: string;
      battery: number;
      status: string;
      lat: number | null;
      lng: number | null;
      createdAt: string;
    }>
  >([]);
  const [historyMeta, setHistoryMeta] = useState<AdminMeta>({ page: 1, limit: 50 });

  const [logs, setLogs] = useState<string[]>([]);
  const [logLimit, setLogLimit] = useState<number>(300);

  const [level, setLevel] = useState<LogLevel>('ALL');
  const [domain, setDomain] = useState<Domain>('ALL');
  const [search, setSearch] = useState<string>('');

  const loadAll = async () => {
    setError('');
    if (!adminKey.trim()) {
      setError('x-admin-key를 입력하세요.');
      return;
    }

    try {
      const r = await adminGetRobots(adminKey, robotsMeta.page ?? 1, robotsMeta.limit ?? 50);
      setRobots(r.rows);
      setRobotsMeta(r.meta);

      const h = await adminGetTelemetryHistory(adminKey, historyMeta.page ?? 1, historyMeta.limit ?? 50);
      setHistory(h.rows);
      setHistoryMeta(h.meta);

      const l = await adminGetLogs(adminKey, logLimit);
      setLogs(l.lines);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const parsedLogs = useMemo(() => logs.map(parseLogLine), [logs]);

  const filteredLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return parsedLogs.filter((it) => {
      // level 필터
      if (level !== 'ALL') {
        const lv = (it.level ?? '').toLowerCase();
        if (lv !== level) return false;
      }

      // domain 필터 (event prefix 기반)
      if (domain !== 'ALL') {
        const ev = (it.event ?? '').toLowerCase();
        if (!ev.startsWith(domain)) return false;
      }

      // search (event/message/context/raw 통합 검색)
      if (needle.length > 0) {
        const hay = formatLog(it).toLowerCase();
        if (!hay.includes(needle)) return false;
      }

      return true;
    });
  }, [parsedLogs, level, domain, search]);

  return (
    <div>
      <h2>Admin</h2>

      {error ? (
        <div style={{ padding: 10, border: '1px solid #999', marginBottom: 12 }}>
          <b>Error:</b> {error}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="x-admin-key"
          style={{ width: 320 }}
        />
        <button onClick={() => loadAll().catch(() => {})}>불러오기</button>

        <span style={{ marginLeft: 12, fontSize: 12, color: '#666' }}>(백엔드: /admin/db/*)</span>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* ROBOTS */}
        <div style={{ border: '1px solid #ccc', padding: 12 }}>
          <h3>robots</h3>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            page={robotsMeta.page} / total={robotsMeta.total} / limit={robotsMeta.limit}
          </div>

          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['id', 'name', 'model', 'createdAt'].map((k) => (
                    <th key={k} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 6 }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {robots.map((r) => (
                  <tr key={r.id}>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{r.id}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{r.name}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{r.model}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{String(r.createdAt ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TELEMETRY HISTORY */}
        <div style={{ border: '1px solid #ccc', padding: 12 }}>
          <h3>telemetry_history</h3>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            page={historyMeta.page} / total={historyMeta.total} / limit={historyMeta.limit}
          </div>

          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['id', 'robotId', 'battery', 'status', 'lat', 'lng', 'createdAt'].map((k) => (
                    <th key={k} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 6 }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{h.id}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{h.robotId}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{h.battery}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{h.status}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{String(h.lat ?? '')}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{String(h.lng ?? '')}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{String(h.createdAt ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOG VIEWER */}
        <div style={{ border: '1px solid #ccc', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>logs</h3>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                value={logLimit}
                onChange={(e) => setLogLimit(Number(e.target.value))}
                style={{ width: 100 }}
              />
              <button
                onClick={async () => {
                  setError('');
                  try {
                    const l = await adminGetLogs(adminKey, logLimit);
                    setLogs(l.lines);
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                }}
              >
                로그 새로고침
              </button>
            </div>
          </div>

          {/* FILTER BAR */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {(['ALL', 'info', 'warn', 'error', 'debug'] as LogLevel[]).map((lv) => (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                style={{
                  border: '1px solid #999',
                  padding: '4px 10px',
                  fontWeight: level === lv ? 700 : 400,
                }}
              >
                {lv.toUpperCase()}
              </button>
            ))}

            <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
              {(['ALL', 'robots', 'telemetry', 'consumer', 'mq', 'admin', 'app'] as Domain[]).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search (event/message/context)..."
              style={{ width: 320 }}
            />

            <div style={{ fontSize: 12, color: '#666' }}>
              showing {filteredLogs.length} / {logs.length}
            </div>
          </div>

          <pre
            style={{
              marginTop: 10,
              background: '#000',
              color: '#0f0',
              padding: 12,
              height: 320,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontSize: 12,
            }}
          >
            {filteredLogs.map((it) => formatLog(it)).join('\n')}
          </pre>
        </div>
      </div>
    </div>
  );
}
