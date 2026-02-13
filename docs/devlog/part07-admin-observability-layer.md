# Part 07 – 관제 UI & Admin Dashboard 구현

## 목표
- 로봇 관제 시스템을 UI에서 직접 확인 가능하도록 구성
- Telemetry 파이프라인(Redis → MQ → Consumer → DB) 시각적 검증
- 운영 관점의 Admin 페이지 구현

---

## 진행 내용

### 1. Frontend 구성
- Vite + React + TypeScript 기반 프로젝트 생성
- React Router 적용
  - `/` → Dashboard
  - `/admin` → AdminPage

---

### 2. Dashboard 기능 구현

- 로봇 생성 / 삭제
- 로봇 목록 조회 (`GET /robots`)
- Redis TTL 기반 online / offline 상태 표시
- 배터리 상태 색상 구분 UI 적용
- 맵 클릭 기반 위치 시뮬레이션 (x/y → lat/lng 매핑)
- Telemetry 송신 (`POST /robots/telemetry`)
- Latest Telemetry 조회 (`GET /robots/me/telemetry`)
- Telemetry History 조회 (`GET /robots/me/telemetry/history`)

Polling 방식으로 주기적 상태 갱신을 구현하여
실시간 관제 느낌을 구성하였다.

---

### 3. Admin Dashboard 구현

운영 확인을 위한 관리자 전용 페이지 구성.

- `/admin/db/robots` 조회
- `/admin/db/telemetry-history` 조회 (pagination 포함)
- `/admin/db/logs` tail 조회

로그 기능:
- level 기반 필터 (info / warn / error / debug)
- event prefix(domain) 기반 필터 (robots / telemetry / consumer 등)
- 텍스트 검색 기능

구조화(JSON) 로그를 파싱하여 가독성 있게 출력하도록 구성하였다.

---

## 문제 및 해결

- Dashboard polling으로 인해 `robots.list` 로그 과다 발생  
  → 로그 레벨을 `debug`로 하향 조정

- 문자열 기반 `[EVENT]` 로그의 가독성 문제  
  → `event` 필드 기반 구조화 로그로 변경

- Admin 로그 필터의 실효성 부족  
  → DROP/RETRY 문자열 필터 제거  
  → level + event prefix 기반 필터 구조로 개선

---

## 결과

- Dashboard에서 로봇 생성/삭제/상태 변경 흐름 검증 완료
- Telemetry 송신 → MQ publish → Consumer → DB 저장 흐름 확인
- Admin에서 DB 상태 및 로그 실시간 확인 가능
- Redis → MQ → Consumer → PostgreSQL 비동기 처리 파이프라인 UI 검증 완료
- Docker 기반 전체 시스템 정상 기동 확인
