// AppLayout.jsx

import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { colors } from '../styles/colors.js';
import AdSidebar from './AdSidebar.jsx';
import GymSidebar from './GymSidebar.jsx';
import Header from './Header.jsx';

function AppLayout() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const location = useLocation();

  const [themeMode, setThemeMode] = useState(
    localStorage.getItem('nsns_theme') || 'dark'
  );

  useEffect(() => {
    const handleThemeChanged = (event) => {
      setThemeMode(event.detail);
    };

    window.addEventListener('themeChanged', handleThemeChanged);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChanged);
    };
  }, []);

  const toggleSidebars = () => {
    setIsSidebarVisible((prev) => !prev);
  };

  // =========================
  // 페이지별 배경 이미지
  // =========================

  let backgroundImage = '/images/slide1.jpg';

  if (location.pathname.startsWith('/workout')) {
    backgroundImage = '/images/slide1.jpg';
  } else if (location.pathname.startsWith('/diet')) {
    backgroundImage = '/images/slide2.jpg';
  } else if (location.pathname.startsWith('/sleep')) {
    backgroundImage = '/images/slide3.jpg';
  } else if (location.pathname.startsWith('/stats')) {
    backgroundImage = '/images/slide4.png';
  }

  // =========================
  // 다크 / 라이트 오버레이
  // =========================

  const overlay =
    themeMode === 'dark'
      ? `
        linear-gradient(
          rgba(5, 10, 25, 0.78),
          rgba(5, 10, 25, 0.85)
        )
      `
      : `
        linear-gradient(
          rgba(255, 255, 255, 0.72),
          rgba(255, 255, 255, 0.82)
        )
      `;

  return (
    <div
      style={{
        fontFamily:
          "'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",

        minHeight: '100vh',
        color: colors.text,

        backgroundImage: `
          ${overlay},
          url(${backgroundImage})
        `,

        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',

        transition:
          'background-image 0.6s ease, background-color 0.6s ease',
      }}
    >
      <Header
        isSidebarVisible={isSidebarVisible}
        toggleSidebars={toggleSidebars}
      />

      <div
        className="app-layout-container"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '20px 24px 0 24px',
          gap: '24px',
        }}
      >
        {/* 광고 */}
        <div
          className="responsive-ad-wrapper"
          style={{
            width: '200px',
            minWidth: '200px',

            visibility: isSidebarVisible ? 'visible' : 'hidden',
            opacity: isSidebarVisible ? 1 : 0,

            transition:
              'opacity 0.25s ease, visibility 0.25s ease',
          }}
        >
          <AdSidebar />
        </div>

        {/* 메인 */}
        <main
          className="responsive-main-content"
          style={{
            flex: 1,
            minWidth: 0,
            maxWidth: 960,
          }}
        >
          <Outlet />
        </main>

        {/* 지도 */}
        <div
          className="responsive-gym-wrapper"
          style={{
            width: '260px',
            minWidth: '260px',

            visibility: isSidebarVisible ? 'visible' : 'hidden',
            opacity: isSidebarVisible ? 1 : 0,

            transition:
              'opacity 0.25s ease, visibility 0.25s ease',
          }}
        >
          <GymSidebar />
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {

          .app-layout-container {
            padding-top: 20px !important;
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