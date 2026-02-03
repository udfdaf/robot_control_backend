# Part 06 – RabbitMQ Consumer & Telemetry 비동기 영속 처리

## 목표
- RabbitMQ Consumer 구현
- Telemetry 이벤트 비동기 처리 구조 구성
- Telemetry 이력 데이터 영속 저장

---

## 진행 내용
- RabbitMQ Consumer 모듈 및 서비스 구현
- `telemetry.ingested` 이벤트 consume 처리
- Consumer 초기화 시 exchange / queue / binding 설정
- TelemetryHistory 엔티티 설계 및 TypeORM 연동
- Consumer를 통해 Telemetry 데이터 PostgreSQL 저장
- Docker 환경에서 Consumer 정상 기동 확인

---

## 문제 및 해결
- Consumer 코드가 실행되지 않는 문제 발생  
  → docker-compose volume 설정으로 인해 dist 빌드 산출물이 런타임에 덮여 발생  
  → prod 모드에서 volume 제거, dist 기준 실행으로 통일

- Consumer가 메시지를 수신하지만 payload 검증 실패  
  → Producer / Consumer 간 Telemetry 이벤트 구조 불일치가 원인  
  → 이벤트 엔벨로프(eventType, telemetry, receivedAt) 기준으로 구조 통일

- RabbitMQ Queued messages가 증가하지 않는 현상  
  → Consumer가 정상 동작하며 즉시 ack 처리되는 상태로 확인  
  → Message rates 기준으로 소비 여부 판단

- Consumer 처리 실패 시 메시지 처리 기준이 모호함  
  → payload 구조 오류는 재시도 의미 없음으로 판단하여 drop 처리  
  → MQ 레벨에서 ack / nack 처리 기준 정리

---

## 결과
- RabbitMQ Consumer 정상 기동
- Telemetry 이벤트 consume 및 PostgreSQL 영속 저장 성공
- TelemetryHistory 테이블에 실제 데이터 저장 확인
- MQ 기반 Telemetry 비동기 처리 파이프라인 완성
