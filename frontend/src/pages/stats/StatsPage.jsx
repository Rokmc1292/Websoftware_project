// StatsPage.jsx — 통계·AI 종합 분석 페이지 (Phase 5에서 본격 구현 예정)
// /stats 경로에서 AppLayout 안의 <Outlet />에 렌더링됨

import { colors } from '../../styles/colors.js'; // 공통 색상 상수

// StatsPage 컴포넌트 — 통계·AI 종합 분석 화면 전체를 담당
function StatsPage() {
  return (
    <div>

      {/* ── 페이지 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>
          통계/분석
        </h2>
        <span
          style={{
            background: colors.aiTagLight,
            color: colors.aiTag,
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          ✦ AI 분석 포함
        </span>
      </div>

      {/* ── 준비 중 안내 카드 ── */}
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h3 style={{ margin: '0 0 8px', color: colors.text }}>통계 &amp; AI 종합 분석</h3>
        {/* &amp; : JSX에서 & 기호를 안전하게 출력하는 방법 (HTML 엔티티) */}
        <p style={{ margin: 0, color: colors.sub, fontSize: 14, lineHeight: 1.6 }}>
          Phase 5에서 구현 예정입니다.<br />
          {/* 운동·식단·수면 3가지 데이터를 Claude AI에 전달해 상관관계 분석 코칭을 받는 기능 */}
          운동·식단·수면 통합 차트 · 월간 달력 · Claude AI 종합 코칭 기능이 들어올 예정입니다.
        </p>
      </div>

    </div>
  );
}

export default StatsPage;
