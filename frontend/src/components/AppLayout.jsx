// AppLayout.jsx — 로그인 후 모든 기능 페이지에 공통으로 적용되는 레이아웃 컴포넌트
//
// 역할: 헤더(Header)를 화면 상단에 고정하고, 좌측에는 광고, 우측에는 주변 헬스장 지도를 배치
//      헤더의 토글 버튼을 누르면 사이드바가 제자리에서 완전히 투명해짐 (Invisible)
//      [간격 패치] 헤더와 메인 콘텐츠 영역(app-layout-container) 사이의 간격을 넉넉하게 벌림

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import AdSidebar from './AdSidebar.jsx';
import GymSidebar from './GymSidebar.jsx';
import { colors } from '../styles/colors.js';

function AppLayout() {
  // 광고와 지도를 동시에 Invisible 상태로 만들 일괄 통제 상태
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebars = () => {
    setIsSidebarVisible((prev) => !prev);
  };

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        background: colors.bg,
        minHeight: '100vh',
        color: colors.text,
      }}
    >
      {/* Header에 현재 사이드바 시각화 상태와 토글 함수를 props로 전달 */}
      <Header isSidebarVisible={isSidebarVisible} toggleSidebars={toggleSidebars} />

      {/* 좌측 광고 + 중앙 콘텐츠 + 우측 헬스장 지도를 가로로 배치하는 메인 컨테이너 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '20px 24px 0 24px',
          gap: '24px', // 레이아웃 간격 고정 (버튼을 눌러도 줄어들거나 빠지지 않음)
        }}
        className="app-layout-container"
      >
        {/* 왼쪽 광고 사이드바 Wrapper (너비 고정, 제자리에서 투명도만 조절) */}
        <div
          style={{
            width: '200px', // AdSidebar 기본 너비 고정
            minWidth: '200px',
            visibility: isSidebarVisible ? 'visible' : 'hidden', // 숨김 처리 시 마우스 클릭 등 상호작용 차단
            opacity: isSidebarVisible ? 1 : 0, // 제자리에서 완전히 투명해지도록 설정
            transition: 'opacity 0.25s ease, visibility 0.25s ease', // 투명도만 부드럽게 전환
          }}
          className="responsive-ad-wrapper"
        >
          <AdSidebar />
        </div>

        {/* 메인 콘텐츠 (최대 너비를 960px로 항상 유지하여 가로로 늘어나지 않도록 고정) */}
        <main
          style={{
            flex: 1,
            minWidth: 0, // flex 자식이 넘치지 않도록 방지
            maxWidth: 960, // 항상 960px 고정으로 양옆 사이드바 공간을 유지함
          }}
          className="responsive-main-content"
        >
          <Outlet />
        </main>

        {/* 오른쪽 헬스장 지도 사이드바 Wrapper (너비 고정, 제자리에서 투명도만 조절) */}
        <div
          style={{
            width: '260px', // GymSidebar 기본 너비 고정
            minWidth: '260px',
            visibility: isSidebarVisible ? 'visible' : 'hidden',
            opacity: isSidebarVisible ? 1 : 0,
            transition: 'opacity 0.25s ease, visibility 0.25s ease',
          }}
          className="responsive-gym-wrapper"
        >
          <GymSidebar />
        </div>
      </div>

      {/* 반응형 미디어 쿼리: 창 크기가 1200px 이하로 좁아질 때는 기존처럼 화면 확보를 위해 가려짐 */}
      <style>{`
        @media (max-width: 1200px) {
          .app-layout-container {
            padding-top: 20px !important; /* 화면이 좁아질 때는 상단 여백을 살짝 줄여 밸런스를 맞춥니다 */
            gap: 0px !important;
          }
          .responsive-ad-wrapper {
            width: 0px !important;
            min-width: 0px !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
          .responsive-gym-wrapper {
            width: 0px !important;
            min-width: 0px !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
          .responsive-main-content {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AppLayout;