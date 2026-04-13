-- =============================================================================
-- schema.sql — No Sweat, No Sweet 데이터베이스 전체 스키마
-- =============================================================================
-- 이 파일 하나로 프로젝트에 필요한 모든 테이블을 생성할 수 있음
-- 실행 방법: mysql -u root -p < database/schema.sql
--
-- 테이블 목록 (의존 관계 순서대로 작성 — 참조 대상 테이블이 먼저 나와야 함)
--   1. users              — 회원 정보
--   2. user_profiles      — 사용자 프로필(개인 맞춤 정보)
--   3. workout_sessions   — 운동 세션 (날짜·메모)
--   4. workout_sets       — 세션 내 개별 세트 (종목·중량·횟수)
--   5. diet_entries       — 식단 카드(제목·즐겨찾기)
--   6. diet_items         — 식단 카드 내 음식 item(칼로리·영양소)
--   7. sleep_records      — 수면 기록 (취침·기상·품질)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. 데이터베이스 생성 및 선택
-- -----------------------------------------------------------------------------

-- 데이터베이스가 없을 때만 생성 (이미 있으면 건너뜀 — 기존 데이터 보호)
CREATE DATABASE IF NOT EXISTS nsns_db
    CHARACTER SET utf8mb4 -- utf8mb4 : 한글 + 이모지까지 저장 가능한 인코딩 (utf8보다 완전함)
    COLLATE utf8mb4_unicode_ci;
-- ci(case insensitive) : 대소문자 구분 없이 정렬·비교

-- 이후 모든 SQL은 nsns_db 데이터베이스에 적용됨
USE nsns_db;

SET FOREIGN_KEY_CHECKS = 0;


-- -----------------------------------------------------------------------------
-- 1. users — 회원 정보 테이블
-- -----------------------------------------------------------------------------
-- 관계: workout_sessions, diet_entries, sleep_records 테이블이 이 테이블을 참조함
-- (부모 테이블 — 자식 테이블들보다 먼저 생성해야 함)

DROP TABLE IF EXISTS sleep_records;
DROP TABLE IF EXISTS diet_items;
DROP TABLE IF EXISTS diet_entries;
DROP TABLE IF EXISTS workout_sets;
DROP TABLE IF EXISTS workout_sessions;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;

CREATE TABLE users
(

    -- ── 기본 키 ──
    id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    -- INT UNSIGNED  : 양수 정수 (0 ~ 42억) — 사용자 수가 42억을 넘을 일은 없으므로 충분
    -- AUTO_INCREMENT: 새 행 삽입 시 자동으로 1씩 증가 (1, 2, 3, ...)
    -- NOT NULL      : 반드시 값이 있어야 함 (빈 값 허용 안 함)

    -- ── 사용자 정보 ──
    username      VARCHAR(50)       NOT NULL,
    -- VARCHAR(50)   : 최대 50자 가변 길이 문자열 — 실제 길이만큼만 저장 공간 사용

    email         VARCHAR(120)      NOT NULL,
    -- 이메일 최대 길이 120자 — RFC 5321 표준상 최대 256자이지만 현실적으로 120자면 충분

    password_hash VARCHAR(255)      NOT NULL,
    -- bcrypt 해시는 60자이지만 255자로 여유 있게 설정 — 향후 알고리즘 변경 대비

    -- ── 프로필 정보 (선택 입력 — 나중에 마이페이지에서 설정) ──
    age           TINYINT UNSIGNED                 DEFAULT NULL,
    -- TINYINT UNSIGNED: 0~255 정수 — 나이를 저장하기에 충분, DEFAULT NULL: 선택 입력이므로 초기엔 없음

    height_cm     DECIMAL(5, 2)                    DEFAULT NULL,
    -- DECIMAL(5, 2) : 소수점 2자리까지 저장 (예: 175.50 cm) — FLOAT보다 정밀도 높음

    weight_kg     DECIMAL(5, 2)                    DEFAULT NULL,
    -- 체중 (예: 68.30 kg)

    gender        ENUM ('male', 'female', 'other') DEFAULT NULL,
    -- ENUM : 정해진 값 중 하나만 저장 가능 — 잘못된 값 입력 방지

    -- ── 식단 목표치 (오늘의 영양 목표) ──
    goal_calories SMALLINT UNSIGNED NOT NULL       DEFAULT 2000,
    goal_protein  SMALLINT UNSIGNED NOT NULL       DEFAULT 100,
    goal_carbs    SMALLINT UNSIGNED NOT NULL       DEFAULT 300,
    goal_fat      SMALLINT UNSIGNED NOT NULL       DEFAULT 60,

    -- ── 타임스탬프 ──
    created_at    DATETIME          NOT NULL       DEFAULT CURRENT_TIMESTAMP,
    -- CURRENT_TIMESTAMP : 행이 삽입될 때 자동으로 현재 서버 시간 저장

    updated_at    DATETIME          NOT NULL       DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    -- ON UPDATE CURRENT_TIMESTAMP : 행이 수정될 때마다 자동으로 현재 시간으로 갱신

    -- ── 제약 조건 (Constraints) ──
    PRIMARY KEY (id),
    -- PRIMARY KEY : id를 기본 키로 지정 — 각 행을 고유하게 식별, 자동으로 인덱스 생성

    UNIQUE KEY uq_users_email (email)
    -- UNIQUE KEY  : email 중복 저장 불가 — 같은 이메일로 두 번 가입 방지
    -- 인덱스 이름 규칙: uq_테이블명_컬럼명 (uq = unique)

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


CREATE TABLE user_profiles
(
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT UNSIGNED NOT NULL,
    profile_note VARCHAR(150) NOT NULL DEFAULT '',
    height_cm    DECIMAL(5, 2) DEFAULT NULL,
    weight_kg    DECIMAL(5, 2) DEFAULT NULL,
    skeletal_muscle_kg DECIMAL(5, 2) DEFAULT NULL,
    body_fat_kg  DECIMAL(5, 2) DEFAULT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_user_profiles_user_id (user_id),

    CONSTRAINT fk_user_profile_user
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
-- InnoDB   : MySQL 기본 스토리지 엔진 — 트랜잭션(원자성 보장), 외래 키(FK) 지원
-- 트랜잭션 : 여러 SQL이 모두 성공하거나 모두 실패하게 묶는 기능 (은행 이체처럼)


-- -----------------------------------------------------------------------------
-- 2. workout_sessions — 운동 세션 테이블
-- -----------------------------------------------------------------------------
-- 운동한 날짜 하나를 "세션(session)"이라고 부름
-- 한 세션 안에 여러 종목(workout_sets)이 포함됨
-- 관계: users(1) ──< workout_sessions(多) ──< workout_sets(多)


CREATE TABLE workout_sessions
(

    -- ── 기본 키 ──
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- ── 외래 키 (Foreign Key) — 어떤 사용자의 세션인지 연결 ──
    user_id      INT UNSIGNED NOT NULL,
    -- users.id를 참조 — 이 값이 users 테이블에 없으면 삽입 불가 (무결성 보장)

    -- ── 세션 정보 ──
    session_date DATE         NOT NULL,
    -- DATE : 날짜만 저장 (YYYY-MM-DD 형식, 시간 없음) — 운동한 날짜

    title        VARCHAR(100)          DEFAULT NULL,
    -- 세션 제목 (예: '등·이두 데이 💪', '풀바디' 등) — 선택 입력

    memo         TEXT                  DEFAULT NULL,
    -- TEXT : 65,535자까지 저장 가능 — 운동 일지, 메모 자유 입력 공간

    duration_min SMALLINT UNSIGNED     DEFAULT NULL,
    -- SMALLINT : 0~65,535 정수 — 운동 총 소요 시간(분 단위), 65,535분이면 충분

    -- ── AI 분석 결과 저장 ──
    ai_feedback  TEXT                  DEFAULT NULL,
    -- Claude AI가 이 세션을 분석한 결과 텍스트를 저장
    -- 운동 기록 저장 시 Claude API를 호출하고 응답을 여기에 저장

    -- ── 타임스탬프 ──
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- ── 제약 조건 ──
    PRIMARY KEY (id),

    -- 외래 키 제약 조건 — users.id와 연결
    CONSTRAINT fk_ws_user
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE,
    -- ON DELETE CASCADE : users에서 사용자가 삭제되면 해당 사용자의 세션도 자동 삭제
    -- (고아 데이터 방지 — 주인 없는 운동 기록이 남지 않도록)

    -- 인덱스 — 특정 사용자의 특정 날짜 세션을 빠르게 조회하기 위함
    INDEX idx_ws_user_date (user_id, session_date)
    -- 복합 인덱스 : user_id + session_date 조합으로 검색 시 전체 테이블 스캔 없이 빠르게 찾음
    -- 예: "user_id=3 이고 session_date='2024-06-01'" 같은 쿼리가 빠름

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 3. workout_sets — 세트 기록 테이블
-- -----------------------------------------------------------------------------
-- 한 세션(workout_session) 안에서 종목별로 몇 세트를 했는지 기록
-- 예: "벤치프레스 1세트 60kg 10회", "벤치프레스 2세트 60kg 8회", "스쿼트 1세트 80kg 5회"

CREATE TABLE workout_sets
(

    -- ── 기본 키 ──
    id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,

    -- ── 외래 키 — 어떤 세션에 속한 세트인지 연결 ──
    session_id    INT UNSIGNED     NOT NULL,
    -- workout_sessions.id를 참조

    -- ── 세트 정보 ──
    exercise_name VARCHAR(100)     NOT NULL,
    -- 운동 종목 이름 (예: '벤치프레스', '데드리프트', '스쿼트')

    set_number    TINYINT UNSIGNED NOT NULL,
    -- 세트 번호 (1세트, 2세트, 3세트 ...) — TINYINT(0~255)면 충분

    weight_kg     DECIMAL(6, 2)             DEFAULT NULL,
    -- 중량 (예: 60.00 kg, 100.50 kg) — DECIMAL(6,2): 최대 9999.99 kg까지 표현
    -- 맨몸 운동(턱걸이 등)은 NULL로 처리

    reps          TINYINT UNSIGNED          DEFAULT NULL,
    -- 횟수 (반복 횟수) — TINYINT(0~255)면 충분

    duration_sec  SMALLINT UNSIGNED         DEFAULT NULL,
    -- 플랭크 등 시간 기반 운동의 초(second) 단위 지속 시간
    -- 중량·횟수 기반 운동이 아닌 경우 사용 (weight_kg, reps 대신)

    rest_sec      SMALLINT UNSIGNED         DEFAULT NULL,
    -- 이 세트 후 휴식 시간 (초 단위) — 기록 분석 시 활용 가능

    -- ── 타임스탬프 ──
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- ── 제약 조건 ──
    PRIMARY KEY (id),

    CONSTRAINT fk_wset_session
        FOREIGN KEY (session_id) REFERENCES workout_sessions (id)
            ON DELETE CASCADE,
    -- 세션 삭제 시 해당 세션의 모든 세트도 자동 삭제

    -- 세션 ID 인덱스 — "이 세션의 모든 세트 가져와" 쿼리를 빠르게 처리
    INDEX idx_wset_session (session_id),

    -- 세션 내 같은 종목의 세트 번호 조합은 고유해야 함
    -- 예: session_id=1의 벤치프레스 1세트는 딱 하나만 존재 가능
    UNIQUE KEY uq_wset_session_exercise_set (session_id, exercise_name, set_number)

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 4. diet_entries / diet_items — 식단 기록 테이블
-- -----------------------------------------------------------------------------
-- 프론트의 DietPage 구조(식단 카드 + 카드 내 음식 item 배열)를 그대로 저장
-- diet_entries(부모) 1:N diet_items(자식)


CREATE TABLE diet_entries
(

    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    title       VARCHAR(100) NOT NULL,
    recorded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_favorite TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_diet_entry_user
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE,

    INDEX idx_diet_entry_user_date (user_id, recorded_at),
    INDEX idx_diet_entry_user_favorite (user_id, is_favorite)

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


CREATE TABLE diet_items
(

    id         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    entry_id   INT UNSIGNED      NOT NULL,
    food_name  VARCHAR(150)      NOT NULL,
    calories   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    carbs_g    DECIMAL(6, 2)     NOT NULL DEFAULT 0.00,
    protein_g  DECIMAL(6, 2)     NOT NULL DEFAULT 0.00,
    fat_g      DECIMAL(6, 2)     NOT NULL DEFAULT 0.00,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_diet_item_entry
        FOREIGN KEY (entry_id) REFERENCES diet_entries (id)
            ON DELETE CASCADE,

    INDEX idx_diet_item_entry (entry_id),
    INDEX idx_diet_item_entry_order (entry_id, sort_order)

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 5. sleep_records — 수면 기록 테이블
-- -----------------------------------------------------------------------------
-- 하루에 하나의 수면 기록 (취침 시간, 기상 시간, 수면 품질 점수)


CREATE TABLE sleep_records
(

    -- ── 기본 키 ──
    id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- ── 외래 키 — 어떤 사용자의 수면 기록인지 연결 ──
    user_id            INT UNSIGNED NOT NULL,

    -- ── 수면 날짜 ──
    sleep_date         DATE         NOT NULL,
    -- 잠든 날짜 (YYYY-MM-DD) — 기상일이 아닌 취침일 기준

    -- ── 수면 시간 ──
    bedtime            TIME                  DEFAULT NULL,
    -- 취침 시간 (HH:MM:SS 형식, 예: '23:30:00')
    -- TIME 타입 : -838:59:59 ~ 838:59:59 범위 지원 — 자정 넘어도 OK

    wake_time          TIME                  DEFAULT NULL,
    -- 기상 시간 (예: '07:00:00')

    sleep_duration_min SMALLINT UNSIGNED     DEFAULT NULL,
    -- 실제 수면 시간 (분 단위) — bedtime과 wake_time으로 계산하거나 직접 입력
    -- SMALLINT(0~65,535): 65,535분 = 약 45일치 수면 — 충분

    -- ── 수면 품질 ──
    quality_score      TINYINT UNSIGNED      DEFAULT NULL,
    -- 수면 품질 점수 (1~10) — 사용자가 슬라이더로 입력
    -- TINYINT(0~255) : 1~10 저장에 충분

    -- ── 메모 ──
    memo               VARCHAR(300)          DEFAULT NULL,
    -- 수면 관련 메모 (예: '카페인 늦게 먹음', '꿈을 많이 꿈')
    -- TEXT 대신 VARCHAR(300) — 짧은 메모이므로 공간 절약

    -- ── 타임스탬프 ──
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- ── 제약 조건 ──
    PRIMARY KEY (id),

    CONSTRAINT fk_sleep_user
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE,

    -- 같은 사용자, 같은 날짜에 수면 기록은 하나만 존재해야 함
    UNIQUE KEY uq_sleep_user_date (user_id, sleep_date),
    -- 중복 기록 방지 — 하루에 두 번 잠든 경우는 memo에 기록하는 정책

    -- 특정 사용자의 최근 수면 기록 조회를 빠르게 하기 위한 인덱스
    INDEX idx_sleep_user_date (user_id, sleep_date)

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- =============================================================================
-- 테이블 간 관계 요약 (Entity-Relationship 개요)
-- =============================================================================
--
--  users (1)
--   │
--   ├──< workout_sessions (多)  : 한 사용자가 여러 번 운동 가능
--   │         │
--   │         └──< workout_sets (多)  : 한 세션에 여러 종목·세트 기록
--   │
--   ├──< diet_entries (多)       : 한 사용자가 여러 식단 카드 보유
--   │         │
--   │         └──< diet_items (多) : 한 식단 카드에 여러 음식 item 보유
--   │
--   └──< sleep_records (多)      : 한 사용자가 여러 날의 수면 기록 보유
--                                  (단, 하루에 1개 — UNIQUE 제약)
--
-- 모든 자식 테이블은 ON DELETE CASCADE 설정
-- → 사용자 계정 삭제 시 관련된 모든 데이터 자동 삭제
-- =============================================================================


-- =============================================================================
-- 초기 실행 확인 (주석 해제 후 실행)
-- =============================================================================
-- SHOW TABLES;                         -- 생성된 테이블 목록 확인
-- DESCRIBE users;                      -- users 컬럼 구조 확인
-- DESCRIBE user_profiles;
-- DESCRIBE workout_sessions;
-- DESCRIBE workout_sets;
-- DESCRIBE diet_entries;
-- DESCRIBE diet_items;
-- DESCRIBE sleep_records;
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 1;

