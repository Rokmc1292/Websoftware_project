// LoginPage.jsx — 로그인 페이지 컴포넌트
//
// 레이아웃: 화면을 좌우로 절반 분할
//   왼쪽 — 이미지 슬라이더 (3초마다 자동 전환)
//   오른쪽 — 소셜 로그인(카카오·구글·페이스북) + 이메일 로그인 폼

import { useState, useEffect } from 'react';
// useState  : 컴포넌트 안에서 변하는 값(상태)을 저장하고 관리하는 훅
// useEffect : 컴포넌트가 화면에 나타난 뒤 실행할 동작을 등록하는 훅
//             여기서는 3초마다 슬라이드를 바꾸는 타이머를 설정하는 데 사용

import { useNavigate, Link } from 'react-router-dom';
// useNavigate : 로그인 성공 후 다른 페이지로 이동시키는 훅
// Link        : <a> 태그처럼 동작하지만 페이지 새로고침 없이 SPA 방식으로 이동

import { login } from '../../api/authApi.js';
// login() : 이메일·비밀번호를 서버에 보내 JWT 토큰을 받아오는 함수
// ../../ : src/pages/auth/ 에서 두 단계 올라가면 src/api/ 가 나옴

import './LoginPage.css'; // 이 페이지 전용 스타일 (슬라이더·소셜 버튼·폼 레이아웃)


// ─────────────────────────────────────────────
// 슬라이드 이미지 데이터
// ─────────────────────────────────────────────
// 이미지 파일은 frontend/public/images/ 폴더에 넣어주세요
// (경로 앞의 '/'는 public 폴더 기준 절대경로 — Vite가 자동으로 처리)
const SLIDE_IMAGES = [
  {
    src: '/images/slide1.jpg',
    // 실제 이미지 경로 — public/images/slide1.jpg 파일을 여기에 연결

    alt: '운동하는 사람',
    // alt : 이미지 설명 텍스트 — 이미지 로드 실패 시 또는 스크린 리더가 읽음

    caption: '오늘의 땀이 내일의 결과가 됩니다',
    // 슬라이드 하단에 표시되는 한 줄 문구

    fallbackGradient: 'linear-gradient(160deg, #667eea 0%, #764ba2 100%)',
    // 이미지 파일이 없거나 로드 실패 시 대신 표시되는 CSS 그라디언트 배경
    // 앱 메인 색상(파랑-보라 계열)을 사용해 로고와 어울리도록
  },
  {
    src: '/images/slide2.jpg',
    alt: '건강한 식단',
    caption: '균형 잡힌 식단이 몸을 만듭니다',
    fallbackGradient: 'linear-gradient(160deg, #11998e 0%, #38ef7d 100%)',
    // 초록 계열 그라디언트 — 식단(채소·건강) 연상
  },
  {
    src: '/images/slide3.jpg',
    alt: '숙면하는 사람',
    caption: '충분한 수면이 회복의 시작입니다',
    fallbackGradient: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    // 진한 남색 계열 그라디언트 — 수면(밤) 연상
  },
];

// ─────────────────────────────────────────────
// 소셜 로그인 버튼 데이터
// ─────────────────────────────────────────────
// ※ 실제 소셜 로그인 연동은 백엔드 OAuth 설정이 필요합니다
//   Phase 1 에서는 UI만 구현하고, 이후 각 버튼에 OAuth URL을 연결하면 됩니다
//   카카오: https://developers.kakao.com
//   구글  : https://console.cloud.google.com
//   페이스북: https://developers.facebook.com
const SOCIAL_PROVIDERS = [
  {
    id: 'kakao',
    // id : 각 소셜 버튼을 구분하는 식별자 — CSS 클래스명에도 활용

    label: '카카오로 시작하기',
    // 버튼에 표시되는 텍스트

    className: 'social-btn kakao-btn',
    // LoginPage.css에 정의된 클래스 — 카카오 브랜드 색(노란색) 적용

    icon: (
      // 카카오 아이콘 — 카카오 공식 가이드라인의 말풍선 심볼을 SVG로 표현
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {/* 카카오 심볼: 타원형 말풍선 + 하단 꼬리 */}
        <ellipse cx="10" cy="9" rx="9" ry="7.5" fill="#191919" />
        {/* 하단 삼각형 꼬리 */}
        <path d="M6 14.5 Q10 17 14 14.5 L10 16.5 Z" fill="#191919" />
      </svg>
    ),

    onClick: () => {
      // 카카오 소셜 로그인 클릭 핸들러
      // TODO: 백엔드의 카카오 OAuth 시작 URL로 이동
      // 예: window.location.href = 'http://localhost:5000/api/auth/kakao';
      alert('카카오 로그인은 준비 중입니다.');
      // alert() : 임시 안내창 — 실제 구현 후 제거
    },
  },
  {
    id: 'google',
    label: 'Google로 시작하기',
    className: 'social-btn google-btn',
    icon: (
      // 구글 'G' 로고 — 구글 공식 브랜드 색상(빨강·파랑·초록·노랑) 사용
      <svg width="20" height="20" viewBox="0 0 20 20">
        {/* 구글 G 아이콘: 4가지 색 조각으로 이루어진 공식 심볼 */}
        <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.22c1.89-1.74 2.98-4.3 2.98-7.31Z" fill="#4285F4" />
        <path d="M10 20c2.7 0 4.96-.9 6.62-2.46l-3.22-2.5c-.9.6-2.04.96-3.4.96-2.6 0-4.8-1.76-5.6-4.12H1.08v2.58A10 10 0 0 0 10 20Z" fill="#34A853" />
        <path d="M4.4 11.88A6.03 6.03 0 0 1 4.08 10c0-.65.1-1.28.32-1.88V5.54H1.08A10 10 0 0 0 0 10c0 1.61.38 3.14 1.08 4.46l3.32-2.58Z" fill="#FBBC05" />
        <path d="M10 3.96c1.46 0 2.78.5 3.8 1.5l2.86-2.86A9.96 9.96 0 0 0 10 0 10 10 0 0 0 1.08 5.54L4.4 8.12C5.2 5.76 7.4 3.96 10 3.96Z" fill="#EA4335" />
      </svg>
    ),
    onClick: () => {
      // TODO: 백엔드의 구글 OAuth 시작 URL로 이동
      alert('Google 로그인은 준비 중입니다.');
    },
  },
  {
    id: 'facebook',
    label: 'Facebook으로 시작하기',
    className: 'social-btn facebook-btn',
    icon: (
      // 페이스북 'f' 로고 — 흰색 SVG (파란 배경 위에 표시)
      <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
        {/* 페이스북 f 심볼: 세로 막대 + 가로 획 */}
        <path d="M15 1.67H12.5C10.43 1.67 8.75 3.35 8.75 5.42V7.5H6.67V10.83H8.75V18.33H12.08V10.83H14.17L15 7.5H12.08V5.42C12.08 5.19 12.27 5 12.5 5H15V1.67Z" />
      </svg>
    ),
    onClick: () => {
      // TODO: 백엔드의 페이스북 OAuth 시작 URL로 이동
      alert('Facebook 로그인은 준비 중입니다.');
    },
  },
];


// ─────────────────────────────────────────────
// LoginPage 컴포넌트
// ─────────────────────────────────────────────
function LoginPage() {

  // ── 상태 변수 선언 ──────────────────────────

  const [currentSlide, setCurrentSlide] = useState(0);
  // currentSlide : 현재 화면에 표시 중인 슬라이드 번호 (0부터 시작)
  // 0 = 첫 번째 슬라이드, 1 = 두 번째, 2 = 세 번째

  const [formData, setFormData] = useState({ email: '', password: '' });
  // formData : 이메일·비밀번호 입력값을 하나의 객체로 관리
  // 초기값은 둘 다 빈 문자열

  const [isLoading, setIsLoading] = useState(false);
  // isLoading : 서버에 로그인 요청을 보낸 후 응답을 기다리는 동안 true
  // true이면 버튼을 비활성화해 같은 요청이 여러 번 전송되는 것을 막음

  const [errorMessage, setErrorMessage] = useState('');
  // errorMessage : 로그인 실패 시 화면에 표시할 에러 텍스트
  // 빈 문자열('')이면 에러 박스를 숨김

  const navigate = useNavigate();
  // navigate() : 로그인 성공 후 다른 페이지로 이동할 때 사용

  // ── 슬라이드 자동 전환 타이머 ────────────────

  useEffect(() => {
    // useEffect : 컴포넌트가 화면에 나타난 뒤(마운트 후) 실행되는 부분
    // 두 번째 인자 [] : 빈 배열 = 처음 마운트될 때 한 번만 실행

    const timer = setInterval(() => {
      // setInterval : 지정한 시간(ms)마다 콜백 함수를 반복 실행하는 브라우저 내장 함수
      // 반환값(timer)은 나중에 clearInterval로 타이머를 멈출 때 필요

      setCurrentSlide((prev) => (prev + 1) % SLIDE_IMAGES.length);
      // prev : 이전 슬라이드 번호
      // (prev + 1) % SLIDE_IMAGES.length : 순환 로직
      //   SLIDE_IMAGES.length = 3 이라면
      //   0 → 1 → 2 → 0 → 1 → 2 → ... 으로 무한 반복
    }, 3000);
    // 3000 = 3000ms = 3초마다 실행

    // cleanup(정리) 함수 반환 — 컴포넌트가 화면에서 사라질 때 자동으로 실행됨
    // clearInterval(timer) : 타이머를 멈춤
    // 이를 하지 않으면 페이지를 이동한 뒤에도 타이머가 계속 실행되어 메모리 누수 발생
    return () => clearInterval(timer);
  }, []);
  // 의존성 배열이 []이므로 마운트 시 한 번만 타이머를 등록하고,
  // 언마운트 시 한 번만 정리함

  // ── 이벤트 핸들러 ──────────────────────────

  const handleChange = (event) => {
    // 이메일·비밀번호 입력 필드의 값이 바뀔 때마다 호출
    setFormData((prev) => ({
      ...prev, // 기존 필드 값을 그대로 유지
      [event.target.name]: event.target.value,
      // [event.target.name] : 변경된 input의 name 속성값을 키로 사용
      // 예: name="email"이면 formData.email을 업데이트
    }));
  };

  const handleSubmit = async (event) => {
    // 이메일 로그인 폼이 제출될 때(버튼 클릭 또는 Enter 키) 호출
    event.preventDefault();
    // 기본 폼 제출 동작(페이지 새로고침)을 막음

    setErrorMessage(''); // 이전 에러 메시지 초기화
    setIsLoading(true);  // 로딩 시작

    try {
      await login(formData);
      // login() : authApi.js에서 가져온 함수
      // 서버에 { email, password }를 보내고 성공하면 JWT 토큰을 localStorage에 저장

      navigate('/workout', { replace: true });
      // 로그인 성공 → 운동루틴 페이지로 이동
      // replace: true : 로그인 페이지를 히스토리에서 제거 (뒤로가기로 돌아올 수 없음)
    } catch (error) {
      const message =
        error.response?.data?.message || '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
      // error.response?.data?.message : 서버가 반환한 에러 메시지
      // ?. : Optional Chaining — 중간에 undefined가 있어도 에러 없이 undefined 반환
      setErrorMessage(message);
    } finally {
      setIsLoading(false); // 성공·실패 모두 로딩 종료
    }
  };

  const handleDotClick = (index) => {
    // 슬라이드 인디케이터 점을 클릭했을 때 해당 슬라이드로 즉시 이동
    setCurrentSlide(index);
    // 클릭 후에도 타이머는 계속 실행 중이지만, 다음 3초 후 다시 자동 전환됨
  };

  // ── JSX 반환 ───────────────────────────────

  return (
    // 전체 페이지 — 좌우 분할 레이아웃
    <div className="login-page">

      {/* ════════════════════════════════════
          왼쪽 패널: 이미지 슬라이더
          ════════════════════════════════════ */}
      <div className="login-slider-panel">

        {/* 슬라이드 목록 — SLIDE_IMAGES 배열을 순회해 각 슬라이드를 렌더링 */}
        {SLIDE_IMAGES.map((slide, index) => (
          <div
            key={index}
            // key : React가 목록 업데이트 시 어떤 요소가 바뀌었는지 추적하는 고유 식별자

            className={`slide-item ${index === currentSlide ? 'slide-active' : ''}`}
            // 현재 슬라이드 번호(currentSlide)와 같은 인덱스에만 'slide-active' 클래스 추가
            // slide-active 클래스: CSS에서 opacity: 1 로 설정 → 화면에 보임
            // 나머지: opacity: 0 → 숨겨짐 (하지만 DOM에는 존재)

            style={{ background: slide.fallbackGradient }}
            // 이미지가 없거나 로드 실패 시 표시될 그라디언트 배경
            // 이미지가 정상 로드되면 이 배경은 이미지에 가려짐
          >
            {/* 슬라이드 이미지 */}
            <img
              src={slide.src}
              // src : 이미지 파일 경로 — public/images/ 폴더에 파일을 넣어야 표시됨

              alt={slide.alt}
              // alt : 이미지 설명 — 시각 장애인 스크린 리더가 읽음

              className="slide-img"
              // CSS: object-fit: cover 로 비율 유지하며 영역 꽉 채움

              onError={(e) => { e.target.style.display = 'none'; }}
              // onError : 이미지 로드 실패 시 호출되는 이벤트 핸들러
              // 이미지를 숨기면 부모의 fallbackGradient 배경이 보임
            />

            {/* 이미지 위 반투명 오버레이 + 캡션 */}
            <div className="slide-overlay">
              {/* 현재 슬라이드 순번 표시 (예: "01 / 03") */}
              <div className="slide-counter">
                {String(index + 1).padStart(2, '0')} / {String(SLIDE_IMAGES.length).padStart(2, '0')}
                {/* padStart(2, '0') : 한 자리 숫자를 두 자리로 — 1 → "01", 2 → "02" */}
              </div>

              {/* 슬라이드 설명 문구 */}
              <p className="slide-caption">{slide.caption}</p>
            </div>

          </div>
        ))}

        {/* 슬라이드 인디케이터 점 — 현재 슬라이드를 표시하고 클릭으로 이동 가능 */}
        <div className="slide-dots">
          {SLIDE_IMAGES.map((_, index) => (
            // _ : 배열 요소가 필요 없을 때 관례적으로 사용하는 변수명 (무시)
            <button
              key={index}
              className={`slide-dot ${index === currentSlide ? 'dot-active' : ''}`}
              // 현재 슬라이드의 점에만 dot-active 클래스 → CSS에서 더 크고 흰색으로 표시

              onClick={() => handleDotClick(index)}
              // 점 클릭 시 해당 슬라이드로 바로 이동

              aria-label={`슬라이드 ${index + 1}번으로 이동`}
              // aria-label : 스크린 리더에게 버튼의 역할을 설명하는 접근성 속성
            />
          ))}
        </div>

      </div>
      {/* 왼쪽 패널 끝 */}


      {/* ════════════════════════════════════
          오른쪽 패널: 로그인 폼
          ════════════════════════════════════ */}
      <div className="login-form-panel">
        <div className="login-form-box">

          {/* ── 헤더: 로고 · 제목 · 부제목 ── */}
          <div className="login-logo">💪 No Sweat,No Sweet</div>
          {/* 헤더 바의 로고와 동일한 텍스트·색상 — 브랜드 일관성 */}

          <h1 className="login-title">다시 오신 것을<br />환영합니다 👋</h1>
          {/* <br /> : 줄 바꿈 — "환영합니다"가 다음 줄에 표시됨 */}

          <p className="login-subtitle">계정에 로그인해 건강 기록을 확인하세요</p>

          {/* ── 소셜 로그인 버튼 ── */}
          <div className="social-login-group">
            {SOCIAL_PROVIDERS.map((provider) => (
              // SOCIAL_PROVIDERS 배열을 순회해 소셜 버튼 3개를 렌더링
              <button
                key={provider.id}
                // key : React 목록 렌더링 최적화를 위한 고유 식별자

                className={provider.className}
                // LoginPage.css에 정의된 클래스 — 각 브랜드 색상 적용

                onClick={provider.onClick}
                // 버튼별로 정의된 클릭 핸들러 실행 (현재: 준비 중 알림)

                type="button"
                // type="button" : 이 버튼이 form 안에 있어도 폼을 제출하지 않음
                // (기본값은 type="submit" 이므로 명시적으로 지정)
              >
                <span className="social-icon">
                  {provider.icon}
                  {/* SVG 아이콘 — 각 소셜 플랫폼의 공식 브랜드 심볼 */}
                </span>
                {provider.label}
                {/* 버튼 텍스트 (예: "카카오로 시작하기") */}
              </button>
            ))}
          </div>

          {/* ── 구분선 ── */}
          <div className="login-divider">
            <span>또는 이메일로 로그인</span>
            {/* ::before, ::after 가상 요소(CSS)가 양쪽에 가로 줄을 그림 */}
          </div>

          {/* ── 이메일·비밀번호 폼 ── */}
          <form className="login-form" onSubmit={handleSubmit}>
            {/* onSubmit : 제출 버튼 클릭 또는 Enter 키 → handleSubmit 실행 */}

            {/* 이메일 입력 */}
            <div className="login-form-group">
              <label className="login-form-label" htmlFor="login-email">
                이메일
                {/* htmlFor="login-email" : 라벨 클릭 시 id="login-email"인 input에 포커스 */}
              </label>
              <input
                id="login-email"
                className="login-form-input"
                type="email"
                // type="email" : 브라우저가 이메일 형식(@포함)을 자동으로 검증

                name="email"
                // handleChange에서 [event.target.name]으로 어떤 필드인지 구분

                value={formData.email}
                // React가 이 input의 값을 직접 제어 (제어 컴포넌트 패턴)

                onChange={handleChange}
                placeholder="example@email.com"
                required
                // required : 비어 있으면 제출 불가 (HTML5 유효성 검사)

                autoComplete="email"
                // 브라우저 자동완성 — 저장된 이메일 목록을 드롭다운으로 제안
              />
            </div>

            {/* 비밀번호 입력 */}
            <div className="login-form-group">
              <label className="login-form-label" htmlFor="login-password">
                비밀번호
              </label>
              <input
                id="login-password"
                className="login-form-input"
                type="password"
                // type="password" : 입력 내용을 점(●●●)으로 숨김

                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
                // 저장된 비밀번호를 브라우저가 자동 입력하도록 힌트 제공
              />
            </div>

            {/* 에러 메시지 박스 — errorMessage가 있을 때만 렌더링 */}
            {errorMessage && (
              <div className="login-error-box" role="alert">
                {/* role="alert" : 스크린 리더가 에러 메시지를 즉시 읽어줌 */}
                <span className="login-error-icon">⚠️</span>
                {errorMessage}
              </div>
            )}

            {/* 로그인 제출 버튼 */}
            <button
              type="submit"
              // type="submit" : 클릭 시 form의 onSubmit 이벤트 발생

              className="login-submit-btn"
              disabled={isLoading}
              // disabled : true이면 버튼 클릭 불가 + CSS에서 흐릿하게 표시
            >
              {isLoading ? '로그인 중...' : '로그인'}
              {/* isLoading 상태에 따라 텍스트를 동적으로 변경 */}
            </button>

          </form>

          {/* ── 하단 회원가입 링크 ── */}
          <div className="login-footer">
            <p className="login-switch-text">
              아직 계정이 없으신가요?{' '}
              {/* {' '} : JSX에서 공백 문자를 강제로 삽입하는 방법 */}
              <Link to="/signup" className="login-link">
                {/* Link : 페이지 새로고침 없이 /signup 경로로 이동 */}
                회원가입
              </Link>
            </p>
          </div>

        </div>
        {/* login-form-box 끝 */}
      </div>
      {/* 오른쪽 패널 끝 */}

    </div>
    // login-page 끝
  );
}

export default LoginPage; // App.jsx에서 import해 /login 라우트에 연결
