// SleepPage.jsx — 수면관리 페이지 (Phase 4에서 본격 구현 예정)
// /sleep 경로에서 AppLayout 안의 <Outlet />에 렌더링됨

import { colors } from '../../styles/colors.js'; // 공통 색상 상수

// SleepPage 컴포넌트 — 수면관리 화면 전체를 담당
function SleepPage() {
  return (
    <div>

      {/* ── 페이지 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>
          수면관리
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>😴</div>
        <h3 style={{ margin: '0 0 8px', color: colors.text }}>수면 기록</h3>
        <p style={{ margin: 0, color: colors.sub, fontSize: 14, lineHeight: 1.6 }}>
          Phase 4에서 구현 예정입니다.<br />
          {/* 취침·기상 시간 입력, 수면 품질 슬라이더, 주간 수면 통계 차트가 들어올 예정 */}
          취침·기상 시간 입력 · 수면 품질 슬라이더 · 주간 수면 통계 기능이 들어올 예정입니다.
        </p>
      </div>

    </div>
  );
}

export default SleepPage;
