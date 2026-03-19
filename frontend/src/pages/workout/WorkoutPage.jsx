// WorkoutPage.jsx — 운동루틴 기록 페이지 (Phase 2에서 본격 구현 예정)
// /workout 경로에서 AppLayout 안의 <Outlet />에 렌더링됨

import { colors } from '../../styles/colors.js'; // 공통 색상 상수 (../../ : 두 단계 상위 폴더)

// WorkoutPage 컴포넌트 — 운동루틴 화면 전체를 담당
function WorkoutPage() {
  return (
    // 페이지 콘텐츠 최외곽 컨테이너
    <div>

      {/* ── 페이지 헤더 ── */}
      <div
        style={{
          display: 'flex',          // 제목과 배지를 가로로 나란히 배치
          alignItems: 'center',     // 세로 중앙 정렬
          gap: 10,                  // 요소 사이 간격
          marginBottom: 16,         // 아래 콘텐츠와의 간격
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>
          운동루틴 {/* 페이지 제목 */}
        </h2>
        {/* AI 분석 포함 배지 */}
        <span
          style={{
            background: colors.aiTagLight, // 연한 보라 배경
            color: colors.aiTag,            // 보라 글씨
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          ✦ AI 분석 포함 {/* ✦ : AI 기능을 나타내는 아이콘 */}
        </span>
      </div>

      {/* ── 준비 중 안내 카드 ── */}
      <div
        style={{
          background: colors.card,           // 흰 카드 배경
          border: `1px solid ${colors.border}`, // 연한 회색 테두리
          borderRadius: 12,                  // 모서리 둥글게
          padding: '48px 24px',              // 넉넉한 안쪽 여백
          textAlign: 'center',               // 텍스트 가운데 정렬
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>💪</div> {/* 큰 이모지 아이콘 */}
        <h3 style={{ margin: '0 0 8px', color: colors.text }}>운동루틴 기록</h3>
        <p style={{ margin: 0, color: colors.sub, fontSize: 14, lineHeight: 1.6 }}>
          Phase 2에서 구현 예정입니다.<br />
          {/* <br /> : 줄 바꿈 */}
          운동 세션 기록 · 세트/중량/횟수 입력 · AI 루틴 분석 기능이 들어올 예정입니다.
        </p>
      </div>

    </div>
  );
}

export default WorkoutPage; // App.jsx의 라우팅에서 import해 사용
