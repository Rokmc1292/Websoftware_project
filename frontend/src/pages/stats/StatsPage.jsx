// StatsPage.jsx — 통계/분석 페이지
// 레이아웃: 왼쪽 달력 + 오른쪽 주간 그래프 (운동 볼륨 / 식단 칼로리 / 수면 시간)
// 달력에서 날짜를 클릭하면 그 날짜가 속한 주의 그래프를 오른쪽에 표시

import { useState, useEffect } from "react";
import "./StatsPage.css";
import { colors } from "../../styles/colors.js";
import { getMonthlyStats, getWeeklyStats } from "../../api/statsApi.js";


// ──────────────────────────────────────────────
// 유틸리티 함수
// ──────────────────────────────────────────────

// 특정 연도/월의 달력 셀 배열(42칸 = 6주)을 생성
// 이전 달·다음 달 날짜로 빈 칸을 채워 항상 7×6 그리드를 완성
function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month - 1, 1);  // 1일
  const lastDay  = new Date(year, month, 0);       // 마지막 날

  const startPad = firstDay.getDay(); // 1일이 무슨 요일인지 (0=일요일)
  const days = [];

  // 이전 달 날짜로 앞 빈 칸 채우기
  for (let i = startPad - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, -i), isCurrentMonth: false });
  }

  // 이번 달 날짜 추가
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month - 1, d), isCurrentMonth: true });
  }

  // 다음 달 날짜로 뒤 빈 칸 채우기 (42칸 완성)
  let nextDay = 1;
  while (days.length < 42) {
    days.push({ date: new Date(year, month, nextDay++), isCurrentMonth: false });
  }

  return days;
}

// Date 객체 → "YYYY-MM-DD" 문자열 변환
function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 주어진 날짜 문자열이 속한 주의 일요일~토요일 범위를 반환
// 달력에서 선택된 주를 하이라이트하고, API 호출 시 사용
function getWeekBounds(dateStr) {
  const d = new Date(dateStr + "T00:00:00"); // 타임존 오류 방지
  const dow = d.getDay(); // 0=일요일, 6=토요일
  const start = new Date(d);
  start.setDate(d.getDate() - dow);          // 해당 주 일요일
  const end = new Date(start);
  end.setDate(start.getDate() + 6);          // 해당 주 토요일
  return { start: formatDateStr(start), end: formatDateStr(end) };
}

// "2026-04-13" ~ "2026-04-19" 형태의 주간 범위 레이블 생성
function formatWeekRange(startStr, endStr) {
  const [sy, sm, sd] = startStr.split("-");
  const [, em, ed]   = endStr.split("-");
  if (sm === em) {
    return `${sy}년 ${sm}월 ${sd}일 ~ ${ed}일`;
  }
  return `${sy}년 ${sm}월 ${sd}일 ~ ${em}월 ${ed}일`;
}


// ──────────────────────────────────────────────
// BarChart 컴포넌트
// 7일치 값을 막대 그래프로 표시 (외부 라이브러리 없이 순수 CSS/HTML)
// ──────────────────────────────────────────────
// Props:
//   title       : 차트 제목 (예: "운동 볼륨")
//   icon        : 제목 앞 이모지
//   days        : 7개 day 객체 배열 ({ date, weekday, ... })
//   valueKey    : day 객체에서 꺼낼 데이터 키 (예: "workout_volume")
//   color       : 막대 색상 (hex 값)
//   unit        : 단위 레이블 (예: "kg", "kcal", "h")
//   formatValue : 값 → 표시 문자열 변환 함수 (예: v => `${v}h`)
//   todayStr    : "YYYY-MM-DD" 형태의 오늘 날짜 (오늘 막대 강조용)
function BarChart({ title, icon, days, valueKey, color, unit, formatValue, todayStr }) {
  const values = days.map(d => d[valueKey] || 0);
  const maxVal = Math.max(...values, 1); // 0 나눗셈 방지용 최솟값 1

  return (
    <div className="bar-chart">
      {/* 차트 헤더: 아이콘 + 제목 + 단위 */}
      <div className="bar-chart-header">
        <span className="bar-chart-icon">{icon}</span>
        <span className="bar-chart-title">{title}</span>
        {unit && <span className="bar-chart-unit">({unit})</span>}
      </div>

      {/* 막대 그래프 본체 — 7개 열 */}
      <div className="bar-chart-body">
        {days.map((day, i) => {
          const val     = values[i];
          const pct     = val > 0 ? Math.max((val / maxVal) * 100, 5) : 0; // 최소 5% 높이
          const isToday = day.date === todayStr;

          return (
            <div key={i} className={`bar-col${isToday ? " today-col" : ""}`}>
              {/* 막대 위 값 레이블 */}
              <div className="bar-value-label">
                {val > 0 ? formatValue(val) : ""}
              </div>

              {/* 막대 트랙 (회색 배경) + 컬러 채움 */}
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    height:     `${pct}%`,
                    background: val > 0 ? color : "transparent",
                  }}
                />
              </div>

              {/* 요일 레이블 (오늘은 색상 강조) */}
              <div className={`bar-day-label${isToday ? " today-label" : ""}`}>
                {day.weekday}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ──────────────────────────────────────────────
// WeeklyCharts 컴포넌트
// 주간 운동 볼륨 / 식단 칼로리 / 수면 시간 3개 차트를 한 번에 표시
// ──────────────────────────────────────────────
function WeeklyCharts({ weeklyData, loading, error, todayStr }) {

  // 로딩 중 스피너
  if (loading) {
    return (
      <div className="weekly-loading">
        <div className="spinner" />
        <p>데이터 불러오는 중...</p>
      </div>
    );
  }

  // 오류 메시지
  if (error) {
    return <div className="no-record-box">{error}</div>;
  }

  // 아직 날짜를 클릭하지 않았을 때 (초기 상태는 오늘 주로 바로 로드하므로 거의 노출 안 됨)
  if (!weeklyData) {
    return (
      <div className="weekly-empty">
        달력에서 날짜를 클릭하면<br />해당 주의 그래프가 표시됩니다
      </div>
    );
  }

  const { days, week_start, week_end } = weeklyData;

  // 이번 주에 데이터가 하나라도 있는지 확인 (전부 0이면 안내 문구 추가)
  const hasAnyData = days.some(
    d => d.workout_volume > 0 || d.diet_calories > 0 || d.sleep_hours > 0
  );

  return (
    <div>
      {/* 주간 범위 헤더 */}
      <div className="week-range-label">
        {formatWeekRange(week_start, week_end)}
      </div>

      {/* 데이터 없음 안내 */}
      {!hasAnyData && (
        <div className="no-record-box" style={{ marginBottom: 16 }}>
          이 주에는 기록된 데이터가 없습니다.
        </div>
      )}

      {/* 운동 볼륨 차트 — 중량(kg) × 횟수 합계 */}
      <BarChart
        title="운동 볼륨"
        icon="🏋️"
        days={days}
        valueKey="workout_volume"
        color="#3B82F6"
        unit="kg"
        formatValue={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))}
        todayStr={todayStr}
      />

      <div className="bar-chart-divider" />

      {/* 식단 칼로리 차트 */}
      <BarChart
        title="식단 칼로리"
        icon="🥗"
        days={days}
        valueKey="diet_calories"
        color="#10B981"
        unit="kcal"
        formatValue={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
        todayStr={todayStr}
      />

      <div className="bar-chart-divider" />

      {/* 수면 시간 차트 */}
      <BarChart
        title="수면 시간"
        icon="🌙"
        days={days}
        valueKey="sleep_hours"
        color="#8B5CF6"
        unit="h"
        formatValue={v => `${v}h`}
        todayStr={todayStr}
      />
    </div>
  );
}


// ──────────────────────────────────────────────
// StatsPage 컴포넌트 (메인 페이지)
// ──────────────────────────────────────────────
function StatsPage() {
  // ── 달력 상태 ──
  const [currentYear,  setCurrentYear]  = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [monthlyDots,  setMonthlyDots]  = useState({});

  // ── 선택된 날짜 (클릭한 날짜) — 초기값: 오늘 ──
  const [selectedDate, setSelectedDate] = useState(() => formatDateStr(new Date()));

  // ── 주간 그래프 상태 ──
  const [weeklyData,    setWeeklyData]    = useState(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [errorWeekly,   setErrorWeekly]   = useState(null);

  // 오늘 날짜 문자열 — 달력 "오늘" 표시 및 막대 강조에 사용
  const todayStr = formatDateStr(new Date());


  // ── 월 바뀔 때 점(dot) 데이터 로드 ──
  useEffect(() => {
    (async () => {
      try {
        const data = await getMonthlyStats(currentYear, currentMonth);
        setMonthlyDots(data.days || {});
      } catch {
        setMonthlyDots({});
      }
    })();
  }, [currentYear, currentMonth]);


  // ── selectedDate 바뀔 때 주간 데이터 로드 ──
  useEffect(() => {
    if (!selectedDate) return;

    let isActive = true;
    (async () => {
      setLoadingWeekly(true);
      setErrorWeekly(null);
      try {
        const data = await getWeeklyStats(selectedDate);
        if (isActive) setWeeklyData(data);
      } catch {
        if (isActive) setErrorWeekly("주간 데이터를 불러오지 못했습니다.");
      } finally {
        if (isActive) setLoadingWeekly(false);
      }
    })();

    return () => { isActive = false; };
  }, [selectedDate]);


  // ── 달력 이전/다음 달 이동 ──
  function goToPrevMonth() {
    if (currentMonth === 1) { setCurrentYear(y => y - 1); setCurrentMonth(12); }
    else                    { setCurrentMonth(m => m - 1); }
  }

  function goToNextMonth() {
    if (currentMonth === 12) { setCurrentYear(y => y + 1); setCurrentMonth(1); }
    else                     { setCurrentMonth(m => m + 1); }
  }

  // ── 날짜 클릭 — 해당 날짜를 선택하고 주간 그래프 업데이트 ──
  function handleDayClick(dateObj) {
    setSelectedDate(formatDateStr(dateObj));
  }


  // ── 달력 데이터 ──
  const calendarDays   = buildCalendarDays(currentYear, currentMonth);
  const weekdayLabels  = ["일", "월", "화", "수", "목", "금", "토"];

  // 선택된 날짜의 주 범위 (일요일~토요일) — 달력 셀 하이라이트용
  const weekBounds = selectedDate ? getWeekBounds(selectedDate) : null;


  // ── 페이지 렌더링 ──
  return (
    <div>

      {/* ── 페이지 헤더 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>
          통계/분석
        </h2>
        <span style={{
          background: colors.aiTagLight,
          color: colors.aiTag,
          borderRadius: 6,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 600,
        }}>
          ✦ AI 분석 포함
        </span>
      </div>


      {/* ── 2열 레이아웃: 왼쪽 달력 + 오른쪽 주간 그래프 ── */}
      <div className="stats-layout">

        {/* ════════════════════════════ 왼쪽: 달력 ════════════════════════════ */}
        <div className="stats-calendar-col">
          <div className="stats-calendar-card">

            {/* 달력 헤더: 이전달 버튼 / 연월 / 다음달 버튼 */}
            <div className="calendar-header">
              <button type="button" className="calendar-nav-btn" onClick={goToPrevMonth} aria-label="이전 달">‹</button>
              <span className="calendar-title">
                {currentYear}년 {String(currentMonth).padStart(2, "0")}월
              </span>
              <button type="button" className="calendar-nav-btn" onClick={goToNextMonth} aria-label="다음 달">›</button>
            </div>

            {/* 요일 헤더 행 */}
            <div className="calendar-weekdays">
              {weekdayLabels.map((label, idx) => (
                <div className="calendar-weekday" key={idx}>{label}</div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="calendar-grid">
              {calendarDays.map((dayObj, idx) => {
                const dateStr   = formatDateStr(dayObj.date);
                const dots      = monthlyDots[dateStr] || {};
                const dayOfWeek = dayObj.date.getDay();

                // 선택된 주에 속하는지 확인 (셀 하이라이트)
                const inWeek = weekBounds
                  && dateStr >= weekBounds.start
                  && dateStr <= weekBounds.end;

                // 셀 CSS 클래스 결정
                let cellClass = "calendar-day";
                if (!dayObj.isCurrentMonth)  cellClass += " other-month";
                if (dateStr === todayStr)    cellClass += " today";
                if (dateStr === selectedDate) cellClass += " selected";
                else if (inWeek && dayObj.isCurrentMonth) cellClass += " in-selected-week";
                if (dayOfWeek === 0)         cellClass += " sunday";
                if (dayOfWeek === 6)         cellClass += " saturday";

                return (
                  <div
                    className={cellClass}
                    key={idx}
                    onClick={() => handleDayClick(dayObj.date)}
                  >
                    {/* 날짜 숫자 */}
                    <span className="calendar-day-number">
                      {dayObj.date.getDate()}
                    </span>

                    {/* 기록 여부 점(dot) */}
                    <div className="calendar-dots">
                      {dots.workout && <span className="calendar-dot workout" />}
                      {dots.diet    && <span className="calendar-dot diet"    />}
                      {dots.sleep   && <span className="calendar-dot sleep"   />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 범례 */}
            <hr className="calendar-divider" />
            <div className="calendar-legend">
              <div className="legend-item"><span className="legend-dot workout" /><span>운동</span></div>
              <div className="legend-item"><span className="legend-dot diet"    /><span>식단</span></div>
              <div className="legend-item"><span className="legend-dot sleep"   /><span>수면</span></div>
            </div>

          </div>
        </div>
        {/* ── 왼쪽 끝 ── */}


        {/* ════════════════════════════ 오른쪽: 주간 그래프 ════════════════════════════ */}
        <div className="stats-weekly-col">
          <div className="stats-weekly-card">

            {/* 섹션 헤더 */}
            <div className="weekly-card-header">
              <span className="weekly-card-title">주간 활동 그래프</span>
              <span className="weekly-card-hint">달력에서 날짜를 클릭하면 해당 주 그래프가 표시됩니다</span>
            </div>

            {/* 그래프 영역 */}
            <WeeklyCharts
              weeklyData={weeklyData}
              loading={loadingWeekly}
              error={errorWeekly}
              todayStr={todayStr}
            />

          </div>
        </div>
        {/* ── 오른쪽 끝 ── */}

      </div>
    </div>
  );
}

export default StatsPage;
