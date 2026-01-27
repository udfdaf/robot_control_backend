# Part 03 – Database Integration & First Domain API

## 목표
- Docker로 구성한 PostgreSQL과 NestJS 서버 연동
- 환경변수 기반으로 데이터베이스 설정 분리
- 첫 도메인(robots) 기반 API 구현
- 요청 검증 및 API 문서화 적용

---

## 진행 내용
- ConfigModule을 이용한 `.env` 환경변수 설정 구성
- TypeORM을 이용한 PostgreSQL 연동
- robots 도메인 Entity 설계 및 테이블 생성
- Repository 기반 데이터 접근 구조 구현
- DTO 및 ValidationPipe를 통한 요청 데이터 검증
- Swagger를 이용한 robots API 문서화

---

## 문제 및 해결
- `.env` 파일 위치 오류로 인해 DB 접속 시 사용자 정보가 올바르게 로드되지 않는 문제 발생  
  → ConfigModule의 환경변수 로딩 경로를 명확히 지정하여 해결

- 요청 body가 없는 상태에서 API 호출 시 서버 오류(500) 발생  
  → DTO 기반 유효성 검증과 ValidationPipe 적용으로 잘못된 요청을 400 에러로 처리

- DTO 정의 이후에도 Swagger에 요청 스키마가 표시되지 않는 문제 발생  
  → `@ApiProperty`를 추가하여 Swagger 문서용 메타데이터를 명시적으로 정의

---

## 결과
- NestJS 서버와 PostgreSQL 데이터베이스 정상 연결
- robots 테이블 자동 생성 및 데이터 저장 확인
- POST `/robots` API 정상 동작
- 잘못된 요청에 대한 검증 및 에러 처리 적용
- Swagger를 통한 API 요청/응답 구조 확인 가능
