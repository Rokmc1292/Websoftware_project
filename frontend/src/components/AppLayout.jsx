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
// Outlet : 중첩 라우팅에서 자식 라우트 컴포넌트를 렌더링하는 자리표시자(placeholder)
// <Outlet />이 있는 위치에 현재 URL과 일치하는 자식 컴포넌트가 그려짐

import Header from './Header.jsx';         // 헤더 바 컴포넌트 — 로고·탭·아바타 포함
import { colors } from '../styles/colors.js'; // 앱 전체 공통 색상 상수

// AppLayout 컴포넌트 — 헤더 + 페이지 콘텐츠 영역으로 구성된 전체 레이아웃
function AppLayout() {
  return (
    // 페이지 전체를 감싸는 최외곽 컨테이너
    <div
      style={{
        fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        // 폰트 우선순위: 영문→한글 순으로 폰트를 탐색 — 없으면 다음 폰트 사용
        background: colors.bg,  // 앱 전체 배경색 — 연한 회색 (#F5F6FA)
        minHeight: '100vh',      // 최소 높이를 화면 전체 높이로 설정 — 내용이 적어도 배경이 꽉 참
        color: colors.text,      // 기본 글자색 설정 — 하위 모든 요소에 상속됨
      }}
    >
      {/* ── 헤더 ── */}
      {/* Header 컴포넌트: 모든 기능 페이지에서 항상 같은 헤더를 보여줌 */}
      <Header />

      {/* ── 콘텐츠 영역 ── */}
      {/* 현재 URL에 맞는 페이지 컴포넌트가 <Outlet />에 렌더링됨 */}
      {/* 예: /workout → WorkoutPage, /diet → DietPage, /stats → StatsPage */}
      <main
        style={{
          maxWidth: 960,    // 너무 넓어지지 않도록 최대 너비 960px 제한
          margin: '0 auto', // 좌우 auto 마진으로 콘텐츠를 가운데 정렬
          padding: '24px',  // 콘텐츠 사방에 24px 여백 — 헤더·화면 끝에 붙지 않도록
        }}
      >
        <Outlet />
        {/* Outlet 위치에 자식 라우트 컴포넌트가 렌더링됨 */}
        {/* App.jsx에서 이 레이아웃 안에 등록된 라우트 목록: */}
        {/* /workout → WorkoutPage */}
        {/* /diet    → DietPage    */}
        {/* /sleep   → SleepPage   */}
        {/* /stats   → StatsPage   */}
      </main>

    </div>
  );
}

export default AppLayout; // App.jsx에서 import해 중첩 라우팅에 사용
