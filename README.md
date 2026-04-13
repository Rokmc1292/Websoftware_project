# No Sweat, No Sweet (NSNS)

운동 · 식단 · 수면을 한 곳에서 기록하고, AI 코칭까지 받는 웹 서비스입니다.

- Frontend: React + Vite + React Router
- Backend: Flask + SQLAlchemy + JWT
- AI: Claude(운동/수면), Gemini(식단 이미지/코치)

## 목차

- [1. 프로젝트 개요](#1-프로젝트-개요)
- [2. 기획서](#2-기획서)
- [3. 기술 스택](#3-기술-스택)
- [4. 아키텍처](#4-아키텍처)
- [5. 폴더 구조](#5-폴더-구조)
- [6. 기능 설명](#6-기능-설명)
- [7. API 명세서](#7-api-명세서)
- [8. 데이터베이스 명세](#8-데이터베이스-명세)
- [9. 실행 방법](#9-실행-방법)
- [10. 환경 변수](#10-환경-변수)
- [11. 트러블슈팅](#11-트러블슈팅)
- [12. 향후 개선 아이디어](#12-향후-개선-아이디어)

---

## 1. 프로젝트 개요

NSNS는 사용자의 **운동 루틴**, **식단 기록**, **수면 데이터**를 통합 관리하는 건강관리 서비스입니다.

핵심 가치:
- 기록의 일관성: 날짜별 운동/식단/수면을 빠르게 저장
- 피드백의 실용성: AI 코치가 요약 + 실행 가능한 조언 제공
- 개인화: 마이페이지의 신체/메모 정보를 코칭에 반영

현재 구현 상태 요약:
- 인증(회원가입/로그인/JWT)
- 운동 세션 CRUD + AI 운동 분석
- 식단 카드/아이템 CRUD + 즐겨찾기 + 이미지 분석 + AI 식단 코치
- 수면 기록 저장/조회 + AI 수면 코치
- 마이페이지(프로필/비밀번호 변경/계정 삭제)
- 통계 페이지는 안내용 Placeholder

---

## 2. 기획서

### 2.1 문제 정의
- 운동/식단/수면이 서로 다른 앱에 흩어져 추적이 어렵다.
- 기록은 해도 해석(어떻게 개선할지)이 어렵다.

### 2.2 목표
- 하나의 서비스에서 3개 도메인(운동/식단/수면)을 통합 기록
- AI 코치를 통해 당일 상태 기반 조언 제공
- 사용자 프로필 기반 맞춤 피드백 제공

### 2.3 타겟 사용자
- 자기관리 루틴을 만들고 싶은 대학생/직장인
- 운동 기록은 있지만 식단/수면까지 연결해 보고 싶은 사용자

### 2.4 사용자 스토리 (MVP)
- 회원으로서, 로그인 후 내 기록만 보고 수정/삭제하고 싶다.
- 운동 사용자로서, 세션과 세트를 저장하고 AI 총평을 받고 싶다.
- 식단 사용자로서, 음식 사진에서 영양 추정을 받고 저장하고 싶다.
- 수면 사용자로서, 취침/기상/메모를 저장하고 오늘 컨디션 코칭을 받고 싶다.
- 사용자로서, 내 프로필(키/체중/체성분/메모)을 업데이트하고 코칭 품질을 높이고 싶다.

### 2.5 범위
- In scope: 웹 프론트/백엔드, JWT 인증, 기록 CRUD, AI 코치
- Out of scope(현재): 통계 페이지 본 구현, 웨어러블 실연동, 완전한 운영 배포 파이프라인

### 2.6 정책/주의 사항
- 일부 AI 기능은 API 키 미설정 시 fallback 안내 메시지를 반환합니다.

### 2.7 Planning/Spec 작성 원칙
- 레이어 1(기획): 사용자 스토리, 목표, 완료 기준(왜/무엇)
- 레이어 2(명세): API/데이터 계약, 예시 payload, 에러/제약(어떻게)
- 운영 원칙: 기능 단위로 1 -> 2 순서로 읽히게 구성하고, 구현 변경 시 두 레이어를 함께 갱신

---

## 3. 기술 스택

### Frontend
- React 18
- Vite 5
- react-router-dom 6
- axios

### Backend
- Flask 3
- Flask-SQLAlchemy
- Flask-JWT-Extended
- Flask-Migrate
- Flask-CORS

### AI/External
- Anthropic SDK (`anthropic`) - 운동/수면 코칭
- Google Generative AI SDK (`google-generativeai`) - 식단 이미지/코칭

### Database
- 기본 개발 DB: SQLite (`sqlite:///sleep_app.db`)
- 제공 스키마: MySQL용 `database/schema.sql`

---

## 4. 아키텍처

- 프론트(`frontend`)는 Vite dev server(기본 5173)에서 실행
- 백엔드(`backend`)는 Flask(기본 5000)에서 실행
- Vite 프록시: `/api` -> `http://localhost:5000`
- 인증 방식: JWT Bearer 토큰 (`Authorization: Bearer <token>`)

흐름:
1. 로그인 성공 시 access token을 localStorage 저장
2. axios 인터셉터가 모든 API 요청에 토큰 자동 첨부
3. 백엔드에서 `@jwt_required()`로 보호된 엔드포인트 검증

---

## 5. 폴더 구조

```text
backend/
  app/
    models/      # ORM 모델 (user, profile, workout, diet, sleep_record)
    routes/      # 도메인별 API (auth, profile, workout, diet, sleep)
    services/    # AI 코치/이미지 분석 서비스
  run.py         # Flask 실행 진입점

database/
  schema.sql     # MySQL 전체 스키마

frontend/
  src/
    api/         # 백엔드 호출 함수
    pages/       # 화면 (auth, workout, diet, sleep, mypage, stats)
    components/  # 공통 컴포넌트 (Header, AppLayout)
```

---

## 6. 기능 설명

### 6.1 인증
- 회원가입/로그인
- JWT 기반 인증
- 비밀번호 변경
- 인증 실패(401) 시 로그인 페이지(로그인 시 제외)로 리다이렉트

### 6.2 운동관리
- 운동 세션 생성/조회/삭제
- 세션 내부 종목/세트(중량·횟수·시간·휴식) 저장
- 세션 단위 AI 분석(총평/개선점/다음 조언)

### 6.3 식단관리
- 식단 카드 + 음식 item 저장/수정/삭제
- 즐겨찾기 토글 및 즐겨찾기 기반 재사용
- 오늘의 영양 목표 설정(칼로리/단백질/탄수/지방)
- 음식 사진 업로드 후 AI 영양 추정(JSON 파싱)
- AI 식단 코치 피드백 (프로필 정보 반영)

### 6.4 수면관리
- 날짜별 수면 기록 저장/조회
- 수면시간, 만족도, 메모, 기상 미션률 기반 분석
- 레이더/주간 그래프 UI
- AI 수면 코치(운동 강도/추천·회피 운동/실천 항목 제안)

### 6.5 마이페이지
- 닉네임 변경
- 비밀번호 변경
- 개인 맞춤 정보 업데이트
  - `profile_note`, `height_cm`, `weight_kg`, `skeletal_muscle_kg`, `body_fat_kg`
- 계정 삭제(2단계 확인)

### 6.6 통계/분석
- 현재는 Placeholder UI
- 통합 차트/월간 분석/종합 코칭 기능은 확장 예정

---

## 7. API 명세서

기본 Base URL:
- 개발: `http://localhost:5000/api`

공통 인증 헤더:
```http
Authorization: Bearer <access_token>
```

### 7.1 Auth API (`/api/auth`)

| Method | Path | Auth | 설명 |
|---|---|---|---|
| POST | `/auth/register` | X | 회원가입 |
| POST | `/auth/login` | X | 로그인, access_token 발급 |
| GET | `/auth/health` | X | 헬스체크 |
| PUT | `/auth/password` | O | 비밀번호 변경 |

요청 예시 - 회원가입:
```json
{
  "username": "tester",
  "email": "test@example.com",
  "password": "password123"
}
```

로그인 응답 예시:
```json
{
  "access_token": "<jwt>",
  "user": {
    "id": 1,
    "username": "tester",
    "email": "test@example.com"
  }
}
```

### 7.2 Profile API (`/api/profile`)

| Method | Path | Auth | 설명 |
|---|---|---|---|
| GET | `/profile/me` | O | 내 프로필 조회 |
| PUT | `/profile/me` | O | 내 프로필 수정 |
| DELETE | `/profile/me` | O | 계정 삭제 |

요청 예시 - 프로필 수정:
```json
{
  "username": "new_name",
  "profile_note": "저녁은 가볍게",
  "height_cm": 172.5,
  "weight_kg": 68.2,
  "skeletal_muscle_kg": 29.4,
  "body_fat_kg": 12.8
}
```

### 7.3 Workout API (`/api/workout`)

| Method | Path | Auth | 설명 |
|---|---|---|---|
| GET | `/workout/sessions` | O | 내 운동 세션 목록 |
| POST | `/workout/sessions` | O | 운동 세션 생성 |
| GET | `/workout/sessions/{id}` | O | 운동 세션 상세 |
| DELETE | `/workout/sessions/{id}` | O | 운동 세션 삭제 |
| POST | `/workout/sessions/{id}/analyze` | O | AI 운동 분석 |

요청 예시 - 세션 생성:
```json
{
  "session_date": "2026-04-14",
  "title": "등/이두",
  "memo": "컨디션 양호",
  "duration_min": 60,
  "exercises": [
    {
      "name": "랫풀다운",
      "sets": [
        {"weight_kg": 40, "reps": 12},
        {"weight_kg": 45, "reps": 10}
      ]
    }
  ]
}
```

### 7.4 Diet API (`/api/diet`)

| Method | Path | Auth | 설명 |
|---|---|---|---|
| GET | `/diet/entries` | O | 식단 목록 조회 (`date`, `all` 쿼리 지원) |
| POST | `/diet/entries` | O | 식단 생성 |
| PUT | `/diet/entries/{entry_id}` | O | 식단 수정 |
| DELETE | `/diet/entries/{entry_id}` | O | 식단 삭제 |
| PATCH | `/diet/entries/{entry_id}/favorite` | O | 즐겨찾기 변경 |
| PATCH | `/diet/goals` | O | 영양 목표 변경 |
| POST | `/diet/ai/analyze-image` | O | 음식 이미지 AI 분석 |
| POST | `/diet/ai/coach` | O | 식단 AI 코치 |

요청 예시 - 식단 생성:
```json
{
  "title": "2026-04-14 아침",
  "recorded_date": "2026-04-14",
  "items": [
    {"name": "닭가슴살", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6},
    {"name": "고구마", "calories": 130, "protein": 2, "carbs": 31, "fat": 0.2}
  ]
}
```

요청 예시 - 식단 AI 코치:
```json
{
  "selected_date": "2026-04-14",
  "profile_note": "저염 식단 선호",
  "height_cm": 172.5,
  "weight_kg": 68.2,
  "skeletal_muscle_kg": 29.4,
  "body_fat_kg": 12.8,
  "goals": {"calories": 2000, "protein": 100, "carbs": 300, "fat": 60},
  "totals": {"calories": 1500, "protein": 90, "carbs": 170, "fat": 45},
  "entries": []
}
```

### 7.5 Sleep API (`/api`)

> 인증 적용은 예정입니다.

| Method | Path | Auth | 설명 |
|---|---|---|---|
| GET | `/sleep-records` | 예정 | 수면 기록 전체 조회 |
| GET | `/sleep-records/{record_date}` | 예정 | 날짜별 수면 기록 조회 |
| POST | `/sleep-records` | 예정 | 수면 기록 저장/업데이트 |
| POST | `/sleep-coach` | 예정 | 수면 AI 코치 |

요청 예시 - 수면 기록 저장:
```json
{
  "date": "2026-04-14",
  "bedHour": 23,
  "bedMinute": 30,
  "wakeHour": 7,
  "wakeMinute": 10,
  "sleepHours": 7.7,
  "satisfaction": 4.0,
  "memo": "중간에 한 번 깸",
  "sleepQuality": 81,
  "freshness": 75,
  "growth": 70,
  "missionRate": 60,
  "goals": [{"text": "물마시기", "done": true}]
}
```

---

## 8. 데이터베이스 명세

### 8.1 핵심 테이블
- `users`
- `user_profiles`
- `workout_sessions`
- `workout_sets`
- `diet_entries`
- `diet_items`
- `sleep_records`

### 8.2 관계 요약
- `users` 1:N `workout_sessions`
- `workout_sessions` 1:N `workout_sets`
- `users` 1:N `diet_entries`
- `diet_entries` 1:N `diet_items`
- `users` 1:1 `user_profiles`
- `sleep_records` 인증/사용자 스코프 적용은 예정

### 8.3 스키마 파일
- MySQL 전체 스키마: `database/schema.sql`
- 파일 내 `DROP TABLE IF EXISTS` 포함 -> 재실행 시 데이터 유실 가능

---

## 9. 실행 방법

### 9.1 사전 준비
- Python 3.10+
- Node.js 18+
- (선택) MySQL 8+

### 9.2 Backend 실행

```bat
cd /d D:\IdeaProjects\Websoftware_project\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

백엔드 기본 주소: `http://localhost:5000`

### 9.3 Frontend 실행

```bat
cd /d D:\IdeaProjects\Websoftware_project\frontend
npm install
npm run dev
```

프론트 기본 주소: `http://localhost:5173`

### 9.4 MySQL 스키마 적용 (선택)

`database/schema.sql`은 MySQL 전용입니다.

```bat
cd /d D:\IdeaProjects\Websoftware_project
mysql -u root -p < database\schema.sql
mysql -u root -p -e "USE nsns_db; SHOW TABLES;"
```

> 기본 설정은 SQLite이므로, MySQL을 쓰려면 `DATABASE_URL` 설정이 필요합니다.

---

## 10. 환경 변수

아래 키들은 `backend/.env`에서 관리합니다.

| 변수명 | 필수 | 기본값/예시 | 설명 |
|---|---|---|---|
| `SECRET_KEY` | 권장 | `dev-secret-key-change-in-production` | Flask 시크릿 |
| `JWT_SECRET_KEY` | 권장 | `jwt-secret-key-change-in-production` | JWT 서명 키 |
| `DATABASE_URL` | 선택 | `sqlite:///sleep_app.db` | SQLAlchemy DB URL |
| `ANTHROPIC_API_KEY` | AI 사용 시 필수 | - | Claude API 키 |
| `ANTHROPIC_MODEL` | 선택 | `claude-3-5-sonnet-20241022` | 수면 코치 모델 |
| `GOOGLE_AI_API_KEY` | 식단 AI 사용 시 필수 | - | Gemini API 키 |
| `GOOGLE_AI_IMAGE_MODEL` | 선택 | `gemini-2.5-flash` | 식단 이미지 분석 모델 |
| `GOOGLE_AI_COACH_MODEL` | 선택 | `gemini-2.5-flash` | 식단 코치 모델 |

최소값 기준 `backend/.env.example` 예시:

```env
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me-too
DATABASE_URL=sqlite:///sleep_app.db

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

GOOGLE_AI_API_KEY=
GOOGLE_AI_IMAGE_MODEL=gemini-2.5-flash
GOOGLE_AI_COACH_MODEL=gemini-2.5-flash
```

실사용 키는 저장소에 커밋하지 말고, 로컬 `backend/.env`에서만 관리하세요.

---

## 11. 트러블슈팅

### 11.1 401 Unauthorized 반복
- 원인: 만료/무효 토큰
- 조치: 브라우저 localStorage의 `access_token` 제거 후 재로그인

### 11.2 식단 이미지/코치 AI 실패
- 원인: `GOOGLE_AI_API_KEY` 미설정 또는 모델명 오타
- 조치: `.env` 확인 후 서버 재시작

### 11.3 수면 AI 실패
- 원인: `ANTHROPIC_API_KEY` 미설정
- 조치: 키 설정 후 재시작

### 11.4 프론트에서 API 호출 실패(CORS/연결)
- Vite가 `5173`, Flask가 `5000`에서 실행 중인지 확인
- `frontend/vite.config.js` 프록시 설정(`/api`) 확인

### 11.5 `schema.sql` 실행 후 앱 모델과 차이
- 현재 프로젝트는 SQLite 기본 + SQLAlchemy `create_all()`도 사용
- MySQL 스키마 사용 시 마이그레이션/모델 정합성 점검 필요

---

## 12. 향후 개선 아이디어

- 통계/분석 페이지 본 구현 (월간 추이, 상관관계 시각화, 통합 코칭)
- 수면 도메인 사용자 스코프(JWT/FK) 완전 적용
- 인트로페이지 추가

---

### 참고 경로
- 백엔드 엔트리: `backend/run.py`
- 앱 팩토리: `backend/app/__init__.py`
- 설정: `backend/app/config.py`
- DB 스키마: `database/schema.sql`
- 프론트 라우팅: `frontend/src/App.jsx`


