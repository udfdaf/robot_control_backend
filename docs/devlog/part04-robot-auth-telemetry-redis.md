# Part 04 – Robot API Key Auth & Telemetry Cache (Redis)

## 목표
- 로봇 단위 인증(API Key) 구조 설계 및 적용
- 인증된 로봇의 Telemetry 수집 API 구현
- Redis를 활용한 로봇 실시간 상태 캐시 구성
- Swagger 기반 인증 포함 API 테스트 환경 구축

---

## 진행 내용
- 로봇 생성 시 API Key 발급 및 해시값 저장 구조 구현
- `x-api-key` 기반 로봇 인증 Guard 구현
- 인증 성공 시 요청 객체에 로봇 정보 주입
- Telemetry DTO 설계 및 요청 데이터 검증 적용
- Redis에 로봇의 마지막 Telemetry 상태 저장 (TTL 적용)
- 인증된 로봇 본인의 Telemetry 조회 API 구현
- Swagger에 인증 헤더(`x-api-key`) 명시

---

## 문제 및 해결
- Redis client 타입을 ESLint가 정상적으로 해석하지 못해
  `no-unsafe-member-access` 오류 다수 발생  
  → 프로젝트에서 사용하는 Redis 메서드만 정의한
  전용 인터페이스를 만들어 타입을 명확히 지정

- Swagger에서 인증 헤더 입력 칸이 보이지 않는 문제 발생  
  → `@ApiHeader`를 사용해 `x-api-key` 헤더를 명시적으로 정의

---

## 결과
- 로봇 단위 API Key 인증 구조 완성
- Telemetry 수집 및 Redis 캐시 저장 정상 동작
- TTL 기반으로 로봇 online/offline 판단 가능
- Swagger를 통한 인증 포함 API 테스트 가능
