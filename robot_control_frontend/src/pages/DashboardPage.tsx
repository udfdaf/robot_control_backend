import { useEffect, useMemo, useRef, useState } from 'react';
import type { Robot, MyTelemetryResponse, Telemetry, TelemetryHistoryResponseCompat } from '../types';
import {
  createRobot,
  deleteRobot,
  getMyTelemetry,
  getTelemetryHistory,
  listRobots,
  postTelemetry,
} from '../api';

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function displayName(r: { id: string; name?: string }) {
  const n = (r.name ?? '').trim();
  if (n.length > 0) return n;
  return `Unnamed(${r.id.slice(0, 6)})`;
}

function clampBattery(v: number) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.floor(v);
}

function batteryColor(battery: number) {
  const b = clampBattery(battery);
  if (b >= 60) return '#16a34a';
  if (b >= 20) return '#ca8a04';
  return '#dc2626';
}

function robotColor(online: boolean, battery: number | null) {
  if (!online) return '#6b7280';
  if (battery === null) return '#2563eb';
  return batteryColor(battery);
}

/** history 응답이 {data}든 {rows}든 안전하게 Telemetry[]로 변환 */
function pickHistoryArray(res: TelemetryHistoryResponseCompat): Telemetry[] {
  if ('data' in res && Array.isArray(res.data)) return res.data;
  if ('rows' in res && Array.isArray(res.rows)) return res.rows;
  return [];
}

/** Robot.x/y는 optional이라 TS가 불평함 → 항상 number로 보정 */
type UiRobot = Omit<Robot, 'x' | 'y'> & { x: number; y: number };

export default function DashboardPage() {
  const [robots, setRobots] = useState<UiRobot[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const selected = useMemo(
    () => robots.find((r) => r.id === selectedId),
    [robots, selectedId],
  );

  const [newName, setNewName] = useState('robot-1');
  const [newModel, setNewModel] = useState('model-a');

  const [battery, setBattery] = useState<number>(80);
  const [status, setStatus] = useState<string>('OK');

  const [lastTelemetry, setLastTelemetry] = useState<MyTelemetryResponse | null>(null);
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [error, setError] = useState<string>('');

  const [robotBatteryById, setRobotBatteryById] = useState<Record<string, number>>({});

  const pollTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const selectRobot = (id: string) => {
    setSelectedId(id);
    setError('');
    setLastTelemetry(null);
    setHistory([]);
  };

  const clearSelection = () => {
    setSelectedId('');
    setLastTelemetry(null);
    setHistory([]);
  };

  const refreshRobots = async () => {
    const list = await listRobots();

    setRobots((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));

      return list.map((item) => {
        const old = byId.get(item.id);

        // old가 있으면 old.x/y 유지, 없으면 기본값
        const x = old ? old.x : 120;
        const y = old ? old.y : 120;

        return {
          id: item.id,
          name: item.name,
          model: item.model,
          createdAt: item.createdAt,
          online: item.online,
          apiKey: old?.apiKey,
          x,
          y,
        };
      });
    });

    if (selectedId && !list.some((r) => r.id === selectedId)) {
      clearSelection();
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await refreshRobots();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    };

    run().catch(() => {});

    refreshTimer.current = window.setInterval(() => {
      refreshRobots().catch(() => {});
    }, 3000);

    return () => {
      if (refreshTimer.current) window.clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected?.apiKey) return;

    const apiKey = selected.apiKey;
    const robotId = selected.id;

    const poll = async () => {
      try {
        const me = await getMyTelemetry(apiKey);
        setLastTelemetry(me);

        const b = me.telemetry?.battery;
        if (typeof b === 'number') {
          setRobotBatteryById((prev) => ({ ...prev, [robotId]: clampBattery(b) }));
        }

        const hist = await getTelemetryHistory(apiKey, 1, 20);
        setHistory(pickHistoryArray(hist));
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    };

    poll().catch(() => {});

    pollTimer.current = window.setInterval(() => {
      poll().catch(() => {});
    }, 2000);

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
  }, [selected?.apiKey, selected?.id]);

  const onCreate = async () => {
    setError('');
    try {
      const res = await createRobot(newName, newModel);

      setRobots((prev) => [
        {
          id: res.id,
          name: res.name,
          model: res.model,
          apiKey: res.apiKey,
          online: false,
          x: 120,
          y: 120,
        },
        ...prev,
      ]);

      selectRobot(res.id);
      await refreshRobots();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  };

  const onDelete = async (id: string) => {
    setError('');
    try {
      await deleteRobot(id);

      setRobots((prev) => prev.filter((r) => r.id !== id));
      setRobotBatteryById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      if (selectedId === id) {
        clearSelection();
      }

      await refreshRobots();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  };

  const onSendTelemetry = async () => {
    if (!selected?.apiKey) {
      setError('선택한 로봇의 apiKey가 없습니다. (생성한 로봇을 선택해야 함)');
      return;
    }
    setError('');
    try {
      await postTelemetry(selected.apiKey, {
        battery,
        status,
        lat: selected.y,
        lng: selected.x,
      });

      setRobotBatteryById((prev) => ({ ...prev, [selected.id]: clampBattery(battery) }));

      await refreshRobots();

      const me = await getMyTelemetry(selected.apiKey);
      setLastTelemetry(me);

      const hist = await getTelemetryHistory(selected.apiKey, 1, 20);
      setHistory(pickHistoryArray(hist));
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  };

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selected) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(800, Math.round(e.clientX - rect.left)));
    const y = Math.max(0, Math.min(500, Math.round(e.clientY - rect.top)));

    setRobots((prev) => prev.map((r) => (r.id === selected.id ? { ...r, x, y } : r)));
  };

  return (
    <div>
      <h2>RoboOps Dashboard</h2>

      {error ? (
        <div style={{ padding: 10, border: '1px solid #999', marginBottom: 12 }}>
          <b>Error:</b> {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        {/* LEFT */}
        <div style={{ border: '1px solid #ccc', padding: 12 }}>
          <h3>로봇 생성</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="name" />
            <input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="model" />
            <button onClick={() => onCreate().catch(() => {})}>생성</button>
          </div>

          <hr />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>로봇 목록</h3>
            <button onClick={() => refreshRobots().catch(() => {})}>새로고침</button>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 8, maxHeight: 320, overflow: 'auto' }}>
            {robots.map((r) => {
              const isSel = r.id === selectedId;
              const lastB = typeof robotBatteryById[r.id] === 'number' ? robotBatteryById[r.id] : null;
              const badgeBg = robotColor(Boolean(r.online), lastB);
              const badgeText = '#fff';

              return (
                <div
                  key={r.id}
                  style={{
                    border: isSel ? '2px solid #000' : '1px solid #ccc',
                    padding: 10,
                    cursor: 'pointer',
                  }}
                  onClick={() => selectRobot(r.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div>
                        <b>{displayName(r)}</b> <span style={{ color: '#666' }}>({r.model})</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>id: {r.id}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        status: {r.online ? 'ONLINE' : 'OFFLINE'}
                        {lastB !== null ? ` / battery: ${lastB}%` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
                      <span
                        style={{
                          fontSize: 12,
                          padding: '3px 10px',
                          textAlign: 'center',
                          background: badgeBg,
                          color: badgeText,
                          borderRadius: 999,
                        }}
                      >
                        {r.online ? 'ONLINE' : 'OFFLINE'}
                      </span>

                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onDelete(r.id).catch(() => {});
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, color: '#444' }}>
                    pos: ({r.x}, {r.y}) / apiKey: {r.apiKey ? '있음' : '없음'}
                  </div>
                </div>
              );
            })}
          </div>

          <hr />

          <h3>Telemetry 송신</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <label>
              battery:
              <input type="number" value={battery} onChange={(e) => setBattery(Number(e.target.value))} />
            </label>

            <label>
              status:
              <input value={status} onChange={(e) => setStatus(e.target.value)} />
            </label>

            <button onClick={() => onSendTelemetry().catch(() => {})} disabled={!selected}>
              전송
            </button>

            <div style={{ fontSize: 12, color: '#555' }}>* MVP: (y, x)를 lat/lng로 임시 매핑</div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ border: '1px solid #ccc', padding: 12 }}>
            <h3>맵 (클릭하면 선택 로봇 이동)</h3>
            <div
              onClick={onMapClick}
              style={{
                width: 800,
                height: 500,
                border: '1px solid #999',
                position: 'relative',
                userSelect: 'none',
              }}
            >
              {robots.map((r) => {
                const lastB = typeof robotBatteryById[r.id] === 'number' ? robotBatteryById[r.id] : null;
                const color = robotColor(Boolean(r.online), lastB);

                return (
                  <div
                    key={r.id}
                    title={`${displayName(r)} (${r.x}, ${r.y}) ${r.online ? 'ONLINE' : 'OFFLINE'}${
                      lastB !== null ? ` ${lastB}%` : ''
                    }`}
                    style={{
                      position: 'absolute',
                      left: r.x - 8,
                      top: r.y - 8,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: color,
                      border: r.id === selectedId ? '3px solid #000' : '2px solid rgba(0,0,0,0.4)',
                    }}
                  />
                );
              })}
            </div>

            {selected ? (
              <div style={{ marginTop: 8 }}>
                선택: <b>{displayName(selected)}</b> / {selected.online ? 'ONLINE' : 'OFFLINE'}
                {typeof robotBatteryById[selected.id] === 'number'
                  ? ` / battery: ${robotBatteryById[selected.id]}%`
                  : ''}
              </div>
            ) : (
              <div style={{ marginTop: 8, color: '#666' }}>로봇을 선택해줘</div>
            )}
          </div>

          <div style={{ border: '1px solid #ccc', padding: 12 }}>
            <h3>현재 상태 (me/telemetry)</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(lastTelemetry, null, 2)}</pre>

            <h3>Telemetry History (최근 20)</h3>
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
              {history.length ? (
                history.map((h) => (
                  <div key={h.id ?? `${h.createdAt ?? ''}-${h.battery}-${h.status}`} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>{h.createdAt ?? ''}</div>
                    <div style={{ fontSize: 13 }}>
                      battery={h.battery} status={h.status} lat={h.lat} lng={h.lng}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#666' }}>기록 없음</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
