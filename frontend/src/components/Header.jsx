// Header.jsx — 로그인 후 모든 페이지 상단에 고정으로 표시되는 헤더 바 컴포넌트
// 로고 / 탭 네비게이션 / 사용자 아바타(로그아웃) 세 영역으로 구성됨

import { useNavigate, useLocation } from 'react-router-dom';
// useNavigate  : 버튼 클릭 시 다른 경로로 이동시키는 함수를 반환하는 훅
// useLocation  : 현재 브라우저 URL 정보를 가져오는 훅 — 어떤 탭이 활성화됐는지 판단할 때 사용

import { colors } from '../styles/colors.js'; // 앱 전체 공통 색상 상수
import { logout } from '../api/authApi.js';   // 로그아웃 함수 — 토큰 삭제 후 로그인 페이지로 이동

// ─────────────────────────────────────────────
// 탭 정의
// ─────────────────────────────────────────────
// 각 탭이 클릭됐을 때 이동할 경로(path)와 화면에 표시할 이름(label)을 함께 관리
// 탭을 추가하거나 순서를 바꾸려면 이 배열만 수정하면 됨
const TABS = [
  { label: '운동루틴', path: '/workout' }, // 탭 1 — 운동 세션·세트 기록 페이지
  { label: '식단관리', path: '/diet' },    // 탭 2 — 식단 기록·AI 칼로리 분석 페이지
  { label: '수면관리', path: '/sleep' },   // 탭 3 — 취침·기상 시간·수면 품질 기록 페이지
  { label: '통계/분석', path: '/stats' },  // 탭 4 — 통합 통계·AI 종합 코칭 페이지
];

// Header 컴포넌트 — 헤더 바 전체를 담당하는 함수형 컴포넌트
function Header() {
  // navigate : 특정 경로로 이동시키는 함수
  const navigate = useNavigate();

  // location : 현재 URL 정보 객체 — location.pathname으로 현재 경로를 알 수 있음
  // 예: /workout 페이지라면 location.pathname === '/workout'
  const location = useLocation();

  // ─────────────────────────────────────────────
  // 이벤트 핸들러
  // ─────────────────────────────────────────────

  // handleLogoClick : 로고 클릭 시 첫 번째 탭(운동루틴)으로 이동
  const handleLogoClick = () => {
    navigate('/workout'); // 로고를 누르면 홈(운동루틴 페이지)으로 이동
  };

  // handleLogout : 아바타 클릭 시 로그아웃 처리
  const handleLogout = () => {
    // logout() : authApi.js에서 가져온 함수
    // localStorage에서 JWT 토큰을 삭제하고 window.location.href로 /login 이동
    logout();
  };

  // ─────────────────────────────────────────────
  // JSX 반환 — 헤더 바의 HTML 구조
  // ─────────────────────────────────────────────
  return (
    // 헤더 전체 감싸는 컨테이너
    // position: sticky + top: 0 으로 스크롤해도 화면 상단에 고정됨
    <header
      style={{
        background: colors.card,                          // 흰 배경
        borderBottom: `1px solid ${colors.border}`,       // 하단에 연한 회색 구분선
        padding: '0 24px',                                // 좌우 여백 24px
        position: 'sticky',                               // 스크롤 시 상단에 고정
        top: 0,                                           // 화면 맨 위에 붙어 있음
        zIndex: 100,                                      // 다른 요소들보다 위에 표시 (z축 순서)
      }}
    >
      {/* 헤더 내용 영역 — 최대 너비 960px, 가운데 정렬, 세로 중앙 정렬 */}
      <div
        style={{
          maxWidth: 960,          // 너무 넓어지지 않도록 최대 너비 제한
          margin: '0 auto',       // 좌우 auto 마진으로 가운데 정렬
          display: 'flex',        // 자식 요소(로고·탭·아바타)를 가로로 나란히 배치
          alignItems: 'center',   // 세로 방향 가운데 정렬
          justifyContent: 'space-between', // 세 영역을 양 끝·가운데에 균등 배치
          height: 56,             // 헤더 높이 56px
        }}
      >

        {/* ── 왼쪽: 로고 ── */}
        <div
          onClick={handleLogoClick} // 클릭 시 운동루틴 페이지로 이동
          style={{
            display: 'flex',          // 이미지와 텍스트를 가로로 나란히 배치
            alignItems: 'center',     // 이미지와 텍스트를 세로 중앙 정렬
            gap: 8,                   // 이미지와 텍스트 사이 간격 8px
            cursor: 'pointer',        // 마우스를 올리면 손가락 커서 — 클릭 가능함을 표시
            userSelect: 'none',       // 더블클릭 시 텍스트가 선택되지 않도록
          }}
        >
          {/* 로고 이미지 — public/logo.png 파일을 직접 교체하면 됩니다
              파일이 없으면 이미지 영역이 비어 보이므로, 반드시 logo.png를 넣어주세요
              권장 크기: 가로 64px × 세로 64px 이상, PNG(투명 배경) 형식 */}
          <img
            src="/logo.png"
            // /logo.png : public 폴더 기준 절대경로 — frontend/public/logo.png 파일을 참조
            alt="hill 로고"
            // alt : 이미지 로드 실패 시 표시되는 대체 텍스트 & 스크린 리더용 설명
            style={{
              width: 32,          // 헤더 높이(56px)에 맞춘 로고 이미지 너비
              height: 32,         // 정방형 — 이미지 비율과 상관없이 32×32 박스에 맞춤
              objectFit: 'contain', // contain : 비율을 유지하며 박스 안에 맞춤 (잘리지 않음)
              borderRadius: 6,    // 모서리를 약간 둥글게 — 로고 느낌
            }}
          />

          {/* 서비스 이름 텍스트 */}
          <span
            style={{
              fontWeight: 800,         // 매우 굵게 (ExtraBold) — 로고 느낌
              fontSize: 18,            // 18px
              color: colors.primary,   // 주요 파랑-보라 색 — colors.js의 primary 값
              letterSpacing: '-0.5px', // 자간 약간 좁게 — 짧은 이름을 더 임팩트 있게
            }}
          >
            
            {/* 서비스 이름 "hill" — 소문자 그대로 사용 (브랜드 스타일) */}
          </span>
        </div>

        {/* ── 가운데: 탭 네비게이션 ── */}
        <nav
          style={{
            display: 'flex', // 탭 버튼들을 가로로 나란히 배치
            gap: 4,           // 탭 버튼 사이 간격 4px
          }}
        >
          {/* TABS 배열을 순회해 탭 버튼을 하나씩 생성 */}
          {TABS.map((tab) => {
            // 현재 URL 경로가 이 탭의 경로와 같으면 활성(active) 상태
            // 예: 지금 /diet 페이지라면 '식단관리' 탭만 isActive === true
            const isActive = location.pathname === tab.path;

            return (
              <button
                key={tab.path} // React가 목록을 효율적으로 업데이트하기 위한 고유 키
                onClick={() => navigate(tab.path)} // 클릭 시 해당 경로로 이동
                style={{
                  padding: '8px 16px',   // 위아래 8px, 좌우 16px 여백 — 클릭 영역 확보
                  border: 'none',         // 기본 버튼 테두리 제거
                  borderRadius: 8,        // 모서리 둥글게
                  cursor: 'pointer',      // 손가락 커서
                  fontSize: 13,           // 13px
                  fontWeight: 600,        // 세미볼드
                  // 활성 탭: 파란 배경 + 흰 글씨 / 비활성 탭: 투명 배경 + 회색 글씨
                  background: isActive ? colors.primary : 'transparent',
                  color: isActive ? '#ffffff' : colors.sub,
                  transition: 'all 0.15s ease', // 색 변화가 0.15초 동안 부드럽게 전환
                }}
              >
                {tab.label} {/* 탭 이름 (운동루틴, 식단관리, 수면관리, 통계/분석) */}
              </button>
            );
          })}
        </nav>

        {/* ── 오른쪽: 사용자 아바타 (로그아웃 버튼 역할) ── */}
        <div
          onClick={handleLogout} // 클릭 시 로그아웃
          title="로그아웃"        // 마우스를 올리면 나타나는 툴팁 텍스트
          style={{
            width: 34,                          // 원형 아바타 너비
            height: 34,                         // 원형 아바타 높이
            background: colors.primaryLight,    // 연한 파랑-보라 배경
            borderRadius: '50%',                // 50% = 완전한 원
            display: 'flex',                    // 아이콘을 정중앙에 배치하기 위해 Flexbox 사용
            alignItems: 'center',               // 세로 중앙
            justifyContent: 'center',           // 가로 중앙
            fontSize: 16,                       // 아이콘 크기
            cursor: 'pointer',                  // 손가락 커서 — 클릭 가능함을 표시
            userSelect: 'none',                 // 클릭 시 텍스트 선택 방지
            transition: 'opacity 0.15s ease',   // hover 시 투명도 변화 부드럽게
          }}
          // 마우스를 올렸을 때 약간 흐리게 — 클릭 가능함을 시각적으로 강조
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          👤 {/* 기본 사용자 아이콘 — 나중에 프로필 사진으로 교체 가능 */}
        </div>

      </div>
    </header>
  );
}

export default Header; // App.jsx·AppLayout.jsx 등에서 import할 수 있도록 내보냄
