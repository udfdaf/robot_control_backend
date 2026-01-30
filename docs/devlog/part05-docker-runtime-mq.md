# Part 05 – Docker Runtime 연동 & MQ Telemetry 이벤트 발행

## 목표
- Backend 서버를 Docker Compose 환경에서 실행
- PostgreSQL, Redis, RabbitMQ와 컨테이너 네트워크로 연동
- Telemetry 수집 시 MQ 이벤트 발행 구조 추가

---

## 진행 내용
- Backend Dockerfile 작성 및 docker-compose 서비스로 추가
- Docker 네트워크 기반 서비스 간 통신 구조 적용
- 환경변수 기준 DB / Redis / RabbitMQ 설정 정리
- RabbitMQ 연동을 위한 MQ 모듈 구현
- Telemetry 수집 시 Redis 저장 후 MQ publish 처리
- Docker 환경에서 전체 서비스 기동 및 API 동작 확인

---

## 문제 및 해결
- Docker 컨테이너 내부에서 localhost로 외부 서비스 접근 불가  
  → 서비스 이름(postgres, redis, rabbitmq)을 호스트로 사용하도록 수정

- RabbitMQ 환경변수 누락으로 서버 기동 실패  
  → .env 및 docker-compose 환경변수 설정 재정비

- Backend가 DB보다 먼저 실행되어 초기 연결 실패  
  → TypeORM 재시도 로직으로 안정화

---

## 결과
- docker compose up 한 번으로 전체 시스템 실행 가능
- Backend ↔ DB / Redis / RabbitMQ 정상 연동
- Telemetry 수집 시 MQ 이벤트 발행 확인
- Docker 기준 개발 환경 완성

---

## 다음 계획
- RabbitMQ Consumer 구현
- Telemetry 비동기 처리 및 영속 저장 구조 추가
