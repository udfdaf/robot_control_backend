# Part 02 – Docker 기반 개발 인프라 구성

## 목표
- 로컬 개발 환경에서 백엔드 인프라(PostgreSQL, Redis, RabbitMQ)를
  Docker를 통해 통합 구성

## 진행 내용
- Docker Desktop(WSL2 기반) 설치 및 설정
- docker-compose를 이용한 인프라 구성 파일 작성
- PostgreSQL, Redis, RabbitMQ 컨테이너 실행
- 각 서비스 포트 및 상태 확인
- RabbitMQ 관리 콘솔 접근 확인

## 문제 및 해결
- docker compose 실행 시 Docker 엔진(daemon) 미실행으로 연결 실패
  - Docker Desktop 실행 및 엔진 활성화 후 재시도하여 해결
- docker-compose.yml의 version 필드 관련 경고 발생
  - 최신 Docker Compose에서는 version 필드가 무시됨을 확인하고 제거

## 결과
- docker compose up 한 번으로 개발 인프라 환경 재현 가능
- 로컬 환경에서 서버 실행과 분리된 인프라 구성 완료
- 이후 백엔드 코드에서 DB/캐시/메시지 큐 연동 준비 완료
