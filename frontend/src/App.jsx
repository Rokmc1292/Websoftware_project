// App.jsx — React 앱의 최상위 컴포넌트
// URL 경로에 따라 어떤 페이지·레이아웃을 보여줄지 결정하는 라우팅 설정 파일
//
// ── 페이지 접근 흐름 ──
//   /login, /signup      → 헤더 없음 (로그인·회원가입 전용 화면)
//   /workout, /diet 등   → AppLayout(헤더 포함) 안에서 렌더링
//
// ── 폴더 구조 ──
//   pages/
//   ├── auth/       LoginPage, SignupPage
//   ├── workout/    WorkoutPage
//   ├── diet/       DietPage
//   ├── sleep/      SleepPage
//   └── stats/      StatsPage

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
// BrowserRouter : HTML5 History API 기반 라우터 — URL이 바뀌어도 페이지 새로고침 없이 동작
// Routes       : 여러 Route를 감싸는 컨테이너, 현재 URL과 일치하는 첫 번째 Route만 렌더링
// Route        : path(URL 경로)와 element(보여줄 컴포넌트)를 연결하는 규칙
// Navigate     : 특정 경로로 자동 리다이렉트하는 컴포넌트

// ── 레이아웃 컴포넌트 ──
import AppLayout from './components/AppLayout.jsx';
// AppLayout : 헤더 + Outlet(페이지 콘텐츠)으로 구성된 레이아웃
// 로그인 후 모든 기능 페이지를 감싸는 공통 틀

// ── 인증 페이지 (헤더 없음) ──
import LoginPage from './pages/auth/LoginPage.jsx'; // /login  → 로그인 화면
import SignupPage from './pages/auth/SignupPage.jsx'; // /signup → 회원가입 화면


// ── 기능 페이지 (AppLayout 안에서 렌더링됨) ──
import DietPage from './pages/diet/DietPage.jsx'; // /diet    → 식단관리
import SleepPage from './pages/sleep/SleepPage.jsx'; // /sleep   → 수면관리
import StatsPage from './pages/stats/StatsPage.jsx'; // /stats   → 통계·분석
import WorkoutPage from './pages/workout/WorkoutPage.jsx'; // /workout → 운동루틴

import IntroPage from './pages/intro/IntroPage.jsx'; // 인트로 화면

function App() {
  return (
    // BrowserRouter : 앱 전체를 감싸야 함, 내부 어디서든 useNavigate·useLocation 사용 가능
    <BrowserRouter>
      {/* Routes : URL이 바뀔 때마다 아래 Route 목록 중 일치하는 것을 찾아 렌더링 */}
      <Routes>
        <Route path="/" element={<IntroPage />} />

        {/* ── 인증 페이지 — 헤더 없이 단독 렌더링 ── */}
        <Route path="/login"  element={<LoginPage />}  />
        <Route path="/signup" element={<SignupPage />} />

        {/* ── 기능 페이지 — AppLayout으로 감싸 헤더 포함 ── */}
        {/* element에 레이아웃만 지정하고, 자식 Route들을 중첩시키는 패턴 */}
        {/* AppLayout 안의 <Outlet />에 자식 컴포넌트가 삽입됨 */}
        <Route element={<AppLayout />}>

          {/* /workout 접속 시 → AppLayout(헤더) + WorkoutPage 렌더링 */}
          <Route path="/workout" element={<WorkoutPage />} />

          {/* /diet 접속 시 → AppLayout(헤더) + DietPage 렌더링 */}
          <Route path="/diet"    element={<DietPage />}    />

          {/* /sleep 접속 시 → AppLayout(헤더) + SleepPage 렌더링 */}
          <Route path="/sleep"   element={<SleepPage />}   />

          {/* /stats 접속 시 → AppLayout(헤더) + StatsPage 렌더링 */}
          <Route path="/stats"   element={<StatsPage />}   />

        </Route>

        {/* ── 존재하지 않는 경로 ── */}
        {/* 위에서 일치하는 경로가 없을 때 실행되는 와일드카드 — 로그인 페이지로 이동 */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App; // main.jsx에서 import할 수 있도록 내보냄
