// useState : 컴포넌트 내부에서 변하는 값(상태)을 관리하는 React 훅
// useEffect : 컴포넌트가 화면에 그려진 후 실행할 작업(API 호출 등)을 등록하는 React 훅
// React 17+ 부터 JSX 사용에 React 자체를 import할 필요가 없어졌으므로 훅만 가져옵니다
import { useState, useEffect } from "react";

// 캘린더 페이지 전용 CSS 스타일 파일을 불러옵니다
import "./StatsPage.css";

// 앱 전체에서 공통으로 사용하는 색상 변수를 불러옵니다
// colors.js는 named export(이름 있는 내보내기)를 사용하므로 중괄호 {}로 불러와야 합니다
import { colors } from "../../styles/colors.js";

// 통계 관련 API 함수들을 불러옵니다
// getMonthlyStats: 월별 점(dot) 데이터를 가져오는 함수
// getDailyStats: 날짜별 상세 기록을 가져오는 함수
import { getMonthlyStats, getDailyStats } from "../../api/statsApi.js";

// ──────────────────────────────────────────────
// 유틸리티 함수들 (날짜 계산에 사용)
// ──────────────────────────────────────────────

// 특정 연도/월의 달력 셀 배열을 만들어 반환하는 함수
// 앞뒤로 이전달·다음달 날짜도 포함해서 7×6 = 42칸을 채웁니다
function buildCalendarDays(year, month) {
  // month는 1~12 기준이므로, Date 객체를 위해 0~11로 변환합니다
  const firstDay = new Date(year, month - 1, 1); // 해당 월 1일
  const lastDay = new Date(year, month, 0);       // 해당 월 마지막 날

  // 달력 첫 번째 칸은 항상 일요일(0)이어야 하므로, 앞에 채울 이전 달 날짜 수를 계산합니다
  const startPad = firstDay.getDay(); // 0(일)~6(토)

  // 달력 배열에 넣을 셀 목록
  const days = [];

  // 이전 달 날짜들로 빈 칸을 채웁니다
  for (let i = startPad - 1; i >= 0; i--) {
    // 이전 달의 마지막 날부터 역순으로 넣습니다
    const d = new Date(year, month - 1, -i);
    days.push({ date: d, isCurrentMonth: false });
  }

  // 이번 달 날짜들을 순서대로 넣습니다
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month - 1, d);
    days.push({ date, isCurrentMonth: true });
  }

  // 42칸(6주)이 될 때까지 다음 달 날짜로 채웁니다
  let nextDay = 1;
  while (days.length < 42) {
    const date = new Date(year, month, nextDay++); // month가 이미 다음 달 인덱스
    days.push({ date, isCurrentMonth: false });
  }

  return days; // 완성된 42칸 배열 반환
}

// Date 객체를 "YYYY-MM-DD" 형식의 문자열로 변환하는 함수
function formatDateStr(date) {
  const y = date.getFullYear();                            // 연도
  const m = String(date.getMonth() + 1).padStart(2, "0"); // 월 (두 자리)
  const d = String(date.getDate()).padStart(2, "0");       // 일 (두 자리)
  return `${y}-${m}-${d}`; // 예: "2026-04-07"
}

// ──────────────────────────────────────────────
// DayDetailModal 컴포넌트
// 날짜를 클릭했을 때 나타나는 상세 정보 모달창입니다
// ──────────────────────────────────────────────
function DayDetailModal({ dateStr, onClose }) {
  // 상세 데이터를 저장하는 상태 변수 (처음에는 null)
  const [detail, setDetail] = useState(null);

  // 데이터를 불러오는 중인지 여부를 나타내는 상태 변수
  const [loading, setLoading] = useState(true);

  // 오류 메시지를 저장하는 상태 변수
  const [error, setError] = useState(null);

  // dateStr이 바뀔 때마다(날짜가 바뀔 때마다) API를 다시 호출합니다
  useEffect(() => {
    // 함수 내부에서 비동기 처리를 하기 위해 즉시 실행 함수(async IIFE)를 사용합니다
    (async () => {
      // 데이터 로드 시작: 로딩 상태 켜기, 오류/데이터 초기화
      setLoading(true);
      setError(null);
      setDetail(null);

      try {
        // API에서 해당 날짜의 상세 통계를 가져옵니다
        const data = await getDailyStats(dateStr);
        // 가져온 데이터를 상태에 저장합니다
        setDetail(data);
      } catch (e) {
        // 오류가 발생하면 오류 메시지를 저장합니다
        setError("데이터를 불러오지 못했습니다.");
      } finally {
        // 성공/실패 상관없이 로딩 상태를 종료합니다
        setLoading(false);
      }
    })();
  }, [dateStr]); // dateStr이 변경될 때만 실행합니다

  // 모달 바깥(오버레이)을 클릭하면 모달을 닫습니다
  function handleOverlayClick(e) {
    // 오버레이 자체(배경)를 클릭했을 때만 닫기 (모달 내부 클릭은 제외)
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // 날짜 문자열("2026-04-07")을 사람이 읽기 좋은 형태로 변환합니다
  function formatDisplayDate(str) {
    const [y, m, d] = str.split("-"); // "-"로 분리
    return `${y}년 ${m}월 ${d}일`;   // 예: "2026년 04월 07일"
  }

  // ── 모달 내부 렌더링 ──
  return (
    // 어두운 반투명 배경(오버레이) - 클릭 시 모달 닫기
    <div className="modal-overlay" onClick={handleOverlayClick}>
      {/* 실제 모달 박스 */}
      <div className="modal-box">

        {/* 모달 상단 헤더: 날짜 제목 + 닫기 버튼 */}
        <div className="modal-header">
          <span className="modal-date-title">{formatDisplayDate(dateStr)}</span>
          {/* X 버튼을 누르면 모달을 닫습니다 */}
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* 모달 본문 */}
        <div className="modal-body">

          {/* 데이터 로딩 중일 때 스피너를 표시합니다 */}
          {loading && (
            <div className="modal-loading">
              <div className="spinner" />
            </div>
          )}

          {/* 오류가 발생했을 때 오류 메시지를 표시합니다 */}
          {error && (
            <div className="no-record-box">{error}</div>
          )}

          {/* 데이터 로드가 완료되었을 때 상세 내용을 표시합니다 */}
          {/* 서버 응답 형태: { success, date, workout: [...], diet: [...], sleep: {...} | null } */}
          {!loading && !error && detail && (
            <>
              {/* ── 운동 섹션 ── */}
              {/* detail.workout : WorkoutSession 배열 (sets 배열 포함) */}
              <WorkoutSection sessions={detail.workout} />

              {/* 섹션 구분선 */}
              <div className="calendar-divider" />

              {/* ── 식단 섹션 ── */}
              {/* detail.diet : DietEntry 배열 (items 배열 포함) */}
              <DietSection entries={detail.diet} />

              {/* 섹션 구분선 */}
              <div className="calendar-divider" />

              {/* ── 수면 섹션 ── */}
              {/* detail.sleep : SleepRecord 객체 또는 null */}
              <SleepSection sleep={detail.sleep} />
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// WorkoutSection 컴포넌트
// 모달 내 운동 기록 섹션을 렌더링합니다
// ──────────────────────────────────────────────
// sessions : WorkoutSession 배열 (서버 API의 detail.workout)
// 각 세션 구조: { id, title, duration_min, sets: [ { exercise_name, set_number, weight_kg, reps }, ... ] }
function WorkoutSection({ sessions }) {
  return (
    // 섹션 전체 컨테이너
    <div className="modal-section">

      {/* 섹션 제목 행: 아이콘 + 텍스트 */}
      <div className="section-title-row">
        <span className="section-icon workout-icon">🏋️</span>
        <span className="section-title-text">운동</span>
      </div>

      {/* 운동 기록이 없으면 "기록 없음" 안내 박스를 표시합니다 */}
      {(!sessions || sessions.length === 0) ? (
        <div className="no-record-box">기록 없음</div>
      ) : (
        // 운동 세션 목록을 순서대로 렌더링합니다
        sessions.map((session, idx) => (
          // 개별 운동 세션 카드 (key는 React 렌더링 최적화를 위해 필요)
          // session.id가 있으면 key로 사용하고, 없으면 배열 인덱스 사용
          <div className="workout-session-card" key={session.id ?? idx}>

            {/* 세션 제목: 서버에서 title 필드로 전달됨 */}
            <div className="workout-session-title">
              {session.title || `세션 ${idx + 1}`}
            </div>

            {/* 세션 메타 정보: 총 세트 수 / 운동 시간(있을 경우) */}
            <div className="workout-session-meta">
              총 {session.sets ? session.sets.length : 0}세트
              {session.duration_min ? ` · ${session.duration_min}분` : ""}
            </div>

            {/* 개별 세트 목록 */}
            <div className="workout-sets-list">
              {session.sets && session.sets.map((set, sIdx) => (
                // 각 세트 행: 세트 번호 배지 + 종목명 + 중량/반복 정보
                // set 구조: { exercise_name, set_number, weight_kg, reps }
                <div className="workout-set-row" key={set.id ?? sIdx}>
                  {/* 세트 번호 배지 (서버에서 set_number 필드로 전달됨) */}
                  <span className="set-badge">SET {set.set_number ?? sIdx + 1}</span>
                  {/* 종목 이름 (exercise_name 필드) */}
                  <span style={{ fontWeight: 600, flex: 1 }}>{set.exercise_name}</span>
                  {/* 중량(weight_kg)과 반복 횟수(reps) 표시 */}
                  <span>{set.weight_kg ?? "-"}kg × {set.reps ?? "-"}회</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// DietSection 컴포넌트
// 모달 내 식단 기록 섹션을 렌더링합니다
// ──────────────────────────────────────────────
// entries : DietEntry 배열 (서버 API의 detail.diet)
// 각 항목 구조: { id, title, calories, protein, carbs, fat, items: [{ name, calories }] }
function DietSection({ entries }) {
  // 모든 식단의 합계 영양소를 계산합니다
  // Array.reduce() : 배열을 순회하며 누적값을 계산하는 함수
  // entries가 없거나 비어 있으면 null 반환
  const totals = (entries && entries.length > 0)
    ? entries.reduce(
        (acc, entry) => {
          // 각 식단 항목의 영양소를 acc(누적 합계)에 더합니다
          // entry.calories : DietEntry.to_dict()에서 totals()를 통해 계산된 합계 칼로리
          acc.calories += entry.calories || 0; // 총 칼로리
          acc.carbs    += entry.carbs    || 0; // 탄수화물(g)
          acc.protein  += entry.protein  || 0; // 단백질(g)
          acc.fat      += entry.fat      || 0; // 지방(g)
          return acc; // 누적 결과 반환 (다음 반복에서 acc로 사용됨)
        },
        { calories: 0, carbs: 0, protein: 0, fat: 0 } // 초기값: 모두 0
      )
    : null; // 식단 기록이 없으면 null

  return (
    // 섹션 전체 컨테이너
    <div className="modal-section">

      {/* 섹션 제목 행: 아이콘 + 텍스트 */}
      <div className="section-title-row">
        <span className="section-icon diet-icon">🥗</span>
        <span className="section-title-text">식단</span>
      </div>

      {/* 식단 기록이 없으면 "기록 없음" 안내 박스를 표시합니다 */}
      {(!entries || entries.length === 0) ? (
        <div className="no-record-box">기록 없음</div>
      ) : (
        <>
          {/* 식단 항목 목록을 순서대로 렌더링합니다 */}
          {entries.map((entry, idx) => (
            // 개별 식단 카드 (entry.id 우선, 없으면 인덱스)
            <div className="diet-entry-card" key={entry.id ?? idx}>

              {/* 식단 카드 헤더: 식사명(title) + 총 칼로리 */}
              {/* entry.title : DietEntry의 title 필드 (예: "아침 식사", "점심") */}
              <div className="diet-entry-header">
                <span className="diet-entry-title">
                  {entry.title || `식단 ${idx + 1}`}
                </span>
                {/* entry.calories : totals()가 계산한 합계 칼로리 */}
                <span className="diet-entry-calories">
                  {entry.calories ?? "-"} kcal
                </span>
              </div>

              {/* 영양소 요약 한 줄 (단백질/탄수화물/지방) */}
              <div className="diet-macros">
                단백질 {entry.protein ?? 0}g · 탄수화물 {entry.carbs ?? 0}g · 지방 {entry.fat ?? 0}g
              </div>

              {/* 식단에 포함된 음식 아이템 목록 */}
              {/* entry.items : DietItem 배열 (각 항목: { name, calories, protein, carbs, fat }) */}
              <div className="diet-items-list">
                {entry.items && entry.items.map((item, iIdx) => (
                  // 각 음식 아이템 행: 음식명 + 칼로리
                  <div className="diet-item-row" key={item.id ?? iIdx}>
                    <span className="diet-item-name">{item.name}</span>
                    <span className="diet-item-cal">{item.calories ?? "-"} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 하루 전체 합계 영양소 정보를 표시합니다 */}
          {totals && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, fontSize: 12, color: '#166534' }}>
              {/* 하루 합계 칼로리 및 영양소 표시 */}
              하루 합계: {totals.calories} kcal · 단백질 {Math.round(totals.protein)}g · 탄수화물 {Math.round(totals.carbs)}g · 지방 {Math.round(totals.fat)}g
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// SleepSection 컴포넌트
// 모달 내 수면 기록 섹션을 렌더링합니다
// ──────────────────────────────────────────────
function SleepSection({ sleep }) {
  return (
    // 섹션 전체 컨테이너
    <div className="modal-section">

      {/* 섹션 제목 행: 아이콘 + 텍스트 */}
      <div className="section-title-row">
        <span className="section-icon sleep-icon">🌙</span>
        <span className="section-title-text">수면</span>
      </div>

      {/* 수면 기록이 없으면 "기록 없음" 안내 박스를 표시합니다 */}
      {/* sleep이 null이면 해당 날짜에 수면 기록이 없다는 의미 */}
      {!sleep ? (
        <div className="no-record-box">기록 없음</div>
      ) : (
        // 수면 기록 카드
        // sleep 구조: { sleepHours, satisfaction, bedHour, bedMinute, wakeHour, wakeMinute, memo, sleepQuality }
        <div className="sleep-record-card">

          {/* 수면 통계 그리드: 수면시간/만족도/취침/기상 */}
          <div className="sleep-stats-grid">

            {/* 총 수면 시간: sleepHours 필드 (소수점 1자리, 예: 7.5시간) */}
            <div className="sleep-stat-item">
              <span className="sleep-stat-label">수면시간</span>
              <span className="sleep-stat-value">
                {sleep.sleepHours != null ? `${sleep.sleepHours}시간` : "-"}
              </span>
            </div>

            {/* 수면 만족도: satisfaction 필드 (0~100 점수) */}
            <div className="sleep-stat-item">
              <span className="sleep-stat-label">만족도</span>
              <span className="sleep-stat-value">
                {sleep.satisfaction != null ? `${sleep.satisfaction}점` : "-"}
              </span>
            </div>

            {/* 취침 시간: bedHour + bedMinute 필드를 조합하여 "HH:MM" 형태로 표시 */}
            {/* String().padStart(2, "0") : 한 자리 숫자를 두 자리로 채워줌 (예: 9 → "09") */}
            <div className="sleep-stat-item">
              <span className="sleep-stat-label">취침</span>
              <span className="sleep-stat-value">
                {sleep.bedHour != null
                  ? `${String(sleep.bedHour).padStart(2, "0")}:${String(sleep.bedMinute).padStart(2, "0")}`
                  : "-"}
              </span>
            </div>

            {/* 기상 시간: wakeHour + wakeMinute 필드를 조합하여 "HH:MM" 형태로 표시 */}
            <div className="sleep-stat-item">
              <span className="sleep-stat-label">기상</span>
              <span className="sleep-stat-value">
                {sleep.wakeHour != null
                  ? `${String(sleep.wakeHour).padStart(2, "0")}:${String(sleep.wakeMinute).padStart(2, "0")}`
                  : "-"}
              </span>
            </div>
          </div>

          {/* 수면 메모가 있으면 표시합니다 */}
          {sleep.memo && (
            <div className="sleep-memo">{sleep.memo}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// StatsPage 컴포넌트 (메인 페이지)
// 캘린더 형식으로 월별 통계를 보여주는 페이지입니다
// ──────────────────────────────────────────────
function StatsPage() {
  // 현재 표시 중인 연도 상태 (초기값: 오늘 연도)
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  // 현재 표시 중인 월 상태 (초기값: 오늘 월, 1~12 기준)
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);

  // 월별 점(dot) 데이터를 저장하는 상태
  // 형태 예시: { "2026-04-07": { workout: true, diet: true, sleep: false }, ... }
  const [monthlyDots, setMonthlyDots] = useState({});

  // 클릭한 날짜 문자열(YYYY-MM-DD)을 저장하는 상태 (null이면 모달 닫힘)
  const [selectedDate, setSelectedDate] = useState(null);

  // 오늘 날짜를 문자열로 저장해 두어 달력에서 "오늘" 표시에 사용합니다
  const todayStr = formatDateStr(new Date());

  // currentYear 또는 currentMonth가 바뀔 때마다 월별 통계 API를 호출합니다
  useEffect(() => {
    // 비동기 함수를 즉시 실행하는 패턴
    (async () => {
      try {
        // API에서 해당 연도/월의 점(dot) 데이터를 가져옵니다
        const data = await getMonthlyStats(currentYear, currentMonth);
        // 서버 응답 형태: { success, year, month, days: { "YYYY-MM-DD": { workout, diet, sleep } } }
        // data.days 가 날짜별 점(dot) 정보를 담고 있습니다
        setMonthlyDots(data.days || {});
      } catch (e) {
        // 오류 발생 시 빈 객체로 초기화합니다 (점이 표시되지 않음)
        setMonthlyDots({});
      }
    })();
  }, [currentYear, currentMonth]); // 연도나 월이 바뀔 때만 실행합니다

  // 이전 달로 이동하는 함수
  function goToPrevMonth() {
    if (currentMonth === 1) {
      // 1월에서 이전으로 가면 작년 12월로 이동합니다
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      // 그 외에는 월을 1 감소시킵니다
      setCurrentMonth((m) => m - 1);
    }
  }

  // 다음 달로 이동하는 함수
  function goToNextMonth() {
    if (currentMonth === 12) {
      // 12월에서 다음으로 가면 내년 1월로 이동합니다
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      // 그 외에는 월을 1 증가시킵니다
      setCurrentMonth((m) => m + 1);
    }
  }

  // 날짜 셀을 클릭하면 해당 날짜를 selectedDate에 저장하여 모달을 엽니다
  function handleDayClick(dateObj) {
    setSelectedDate(formatDateStr(dateObj));
  }

  // 모달을 닫을 때 selectedDate를 null로 초기화합니다
  function handleModalClose() {
    setSelectedDate(null);
  }

  // 현재 연도/월에 해당하는 달력 셀 배열을 생성합니다
  const calendarDays = buildCalendarDays(currentYear, currentMonth);

  // 요일 헤더에 표시할 레이블 배열 (일요일부터 토요일 순서)
  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  // ── 페이지 렌더링 ──
  return (
    // 페이지 전체를 감싸는 div
    <div>

      {/* ── 페이지 헤더 ── */}
      {/* colors 객체를 사용해 일관된 색상 스타일을 적용합니다 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {/* 페이지 제목 */}
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>
          통계/분석
        </h2>
        {/* AI 분석 포함 태그 배지 */}
        <span style={{
          background: colors.aiTagLight, // 연한 보라 배경
          color: colors.aiTag,           // 진한 보라 글씨
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 600,
        }}>
          ✦ AI 분석 포함
        </span>
      </div>

    {/* ── 캘린더 카드 시작 ── */}
    {/* 캘린더 카드 전체를 감싸는 컨테이너 */}
    <div className="stats-calendar-card">

      {/* ── 캘린더 헤더: 이전달 버튼 / 연월 표시 / 다음달 버튼 ── */}
      <div className="calendar-header">
        {/* 이전 달로 이동하는 버튼 */}
        <button className="calendar-nav-btn" onClick={goToPrevMonth}>‹</button>

        {/* 현재 연도와 월을 "YYYY년 MM월" 형태로 표시합니다 */}
        <span className="calendar-title">
          {currentYear}년 {String(currentMonth).padStart(2, "0")}월
        </span>

        {/* 다음 달로 이동하는 버튼 */}
        <button className="calendar-nav-btn" onClick={goToNextMonth}>›</button>
      </div>

      {/* ── 요일 헤더 행: 일~토 ── */}
      <div className="calendar-weekdays">
        {weekdayLabels.map((label, idx) => (
          // 각 요일 레이블 셀 (key는 인덱스 사용)
          <div className="calendar-weekday" key={idx}>
            {label}
          </div>
        ))}
      </div>

      {/* ── 달력 날짜 그리드 ── */}
      <div className="calendar-grid">
        {calendarDays.map((dayObj, idx) => {
          // 각 날짜 셀의 날짜 문자열 (YYYY-MM-DD 형식)
          const dateStr = formatDateStr(dayObj.date);

          // 이 날짜에 해당하는 점(dot) 데이터 (없으면 빈 객체)
          const dots = monthlyDots[dateStr] || {};

          // 요일 인덱스 (0=일요일, 6=토요일)
          const dayOfWeek = dayObj.date.getDay();

          // 날짜 셀에 적용할 CSS 클래스를 동적으로 결정합니다
          let cellClass = "calendar-day";
          if (!dayObj.isCurrentMonth) cellClass += " other-month"; // 이번 달이 아닌 날짜
          if (dateStr === todayStr)     cellClass += " today";      // 오늘 날짜
          if (dateStr === selectedDate) cellClass += " selected";   // 선택된 날짜
          if (dayOfWeek === 0)          cellClass += " sunday";     // 일요일
          if (dayOfWeek === 6)          cellClass += " saturday";   // 토요일

          return (
            // 날짜 셀 - 클릭 시 모달 오픈
            <div
              className={cellClass}
              key={idx}
              onClick={() => handleDayClick(dayObj.date)}
            >
              {/* 날짜 숫자 표시 */}
              <span className="calendar-day-number">
                {dayObj.date.getDate()}
              </span>

              {/* 기록 여부를 색깔 점(dot)으로 표시하는 영역 */}
              <div className="calendar-dots">
                {/* 운동 기록이 있으면 파란 점을 표시합니다 */}
                {dots.workout && (
                  <span className="calendar-dot workout" />
                )}
                {/* 식단 기록이 있으면 초록 점을 표시합니다 */}
                {dots.diet && (
                  <span className="calendar-dot diet" />
                )}
                {/* 수면 기록이 있으면 보라 점을 표시합니다 */}
                {dots.sleep && (
                  <span className="calendar-dot sleep" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 범례(legend): 점 색상 안내 ── */}
      {/* 각 점의 색상이 무슨 기록을 의미하는지 안내하는 영역 */}
      <hr className="calendar-divider" />
      <div className="calendar-legend">
        {/* 운동 점 색상 안내 — "legend-dot workout" : 파란색 */}
        <div className="legend-item">
          <span className="legend-dot workout" />
          <span>운동</span>
        </div>
        {/* 식단 점 색상 안내 — "legend-dot diet" : 초록색 */}
        <div className="legend-item">
          <span className="legend-dot diet" />
          <span>식단</span>
        </div>
        {/* 수면 점 색상 안내 — "legend-dot sleep" : 보라색 */}
        <div className="legend-item">
          <span className="legend-dot sleep" />
          <span>수면</span>
        </div>
      </div>

      {/* ── 날짜가 선택되었을 때 상세 모달을 렌더링합니다 ── */}
      {/* selectedDate가 null이 아닐 때만 모달이 화면에 나타납니다 */}
      {selectedDate && (
        <DayDetailModal
          dateStr={selectedDate}     // 선택된 날짜 문자열 전달 (예: "2026-04-07")
          onClose={handleModalClose} // 닫기 핸들러 전달 — 모달의 닫기 버튼/배경 클릭 시 호출
        />
      )}
    </div> {/* stats-calendar-card 닫기 */}
    </div>  
  );
}

// 이 컴포넌트를 다른 파일에서 사용할 수 있도록 내보냅니다
export default StatsPage;
