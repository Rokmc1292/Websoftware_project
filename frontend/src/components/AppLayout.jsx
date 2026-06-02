// AppLayout.jsx — 로그인 후 모든 기능 페이지에 공통으로 적용되는 레이아웃 컴포넌트
//
// 역할: 헤더(Header)를 화면 상단에 고정하고, 그 아래에 현재 페이지 내용을 렌더링
//
// React Router의 "중첩 라우팅(Nested Routing)" 패턴을 사용:
//   App.jsx에서 <Route element={<AppLayout />}> 로 감싸면
//   그 안의 자식 라우트들이 <Outlet /> 자리에 렌더링됨
//
// 구조:
//   <AppLayout>
//     ├── <Header />    ← 항상 화면 상단에 고정
//     └── <Outlet />    ← /workout, /diet, /sleep, /stats 중 현재 경로의 컴포넌트가 여기에 들어옴

import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import AdSidebar from './AdSidebar.jsx';
import { colors } from '../styles/colors.js';

function AppLayout() {
  return (
    <div
      style={{
        fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        background: colors.bg,
        minHeight: '100vh',
        color: colors.text,
      }}
    >
      <Header />

      {/* 광고 사이드바 + 콘텐츠를 가로로 배치 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          maxWidth: '1280px', // 사이드바(180px) + gap + 콘텐츠(960px) + 여유
          margin: '0 auto',
          padding: '0 24px',
          gap: '24px',
        }}
      >
        {/* 왼쪽 광고 사이드바 — 1100px 이하 화면에서는 CSS로 숨김 */}
        <AdSidebar />

        {/* 메인 콘텐츠 */}
        <main
          style={{
            flex: 1,
            minWidth: 0,      // flex 자식이 넘치지 않도록
            maxWidth: 960,
            padding: '24px 0',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout; // App.jsx에서 import해 중첩 라우팅에 사용
