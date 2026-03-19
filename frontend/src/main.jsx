// react의 시작파일(브라우저가 index.html을 열면 가장 먼저 이 파일 실행)
import React from 'react';
import ReactDOM from 'react-dom/client'; // react 컴포넌트를 실제 html dom에 연결해주는 라이브러리
import App from './App.jsx';
import './index.css';

// document.getElementById('root') 이걸로 index.html에 있는거 가져와서 react앱이 그려질 루트 컨테이너로 만든다는 뜻
const root = ReactDOM.createRoot(document.getElementById('root'));
// 위에서 가져온거를 실제로 렌더링 컴그시간에 배운거랑 비슷함
// React.StricMode는 문제 생겼을때 콘솔에 출력하는 모드
root.render(
  <React.StrictMode>
    <App/>{/*모든 페이지가 이 안에 포함됨 */}
  </React.StrictMode>
)

