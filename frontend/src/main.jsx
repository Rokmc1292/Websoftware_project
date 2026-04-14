// main.jsx — React 앱의 진입점(시작 파일)
// 브라우저가 index.html을 열면 가장 먼저 이 파일이 실행됨

import React from 'react'; // React 라이브러리 — JSX 문법을 사용하기 위해 반드시 임포트해야 함
import ReactDOM from 'react-dom/client'; // ReactDOM — React 컴포넌트를 실제 HTML DOM에 연결해주는 라이브러리
import App from './App.jsx'; // 최상위 컴포넌트(App)를 불러옴 — 모든 페이지와 라우팅이 여기서 시작됨
import './index.css'; // 전역 CSS 스타일 파일 불러오기 — 앱 전체에 적용되는 기본 스타일

const THEME_STORAGE_KEY = 'nsns_theme';
const initialTheme = localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', initialTheme);

// document.getElementById('root') : index.html에 있는 <div id="root"> 요소를 찾음
// .createRoot() : 그 요소를 React 앱이 그려질 "루트(root)" 컨테이너로 만듦
// React 18 이상에서는 createRoot() 방식을 사용해야 함
const root = ReactDOM.createRoot(document.getElementById('root'));

// root.render() : App 컴포넌트를 루트 컨테이너에 실제로 그려줌(렌더링)
root.render(
  // React.StrictMode : 개발 환경에서만 동작하는 경고 도우미
  // 잠재적인 문제(구식 API 사용, 부작용 등)를 콘솔에 미리 알려줌
  <React.StrictMode>
    <App /> {/* 앱의 최상위 컴포넌트 — 모든 페이지가 이 안에 포함됨 */}
  </React.StrictMode>
);