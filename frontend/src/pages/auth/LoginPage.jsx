// LoginPage.jsx — 로그인 페이지 컴포넌트
// 사용자가 이메일과 비밀번호를 입력해 로그인하는 화면

import { useState } from 'react'; // useState : 컴포넌트 내부에서 변하는 데이터를 관리하는 React 훅
import { useNavigate, Link } from 'react-router-dom'; // useNavigate : 다른 페이지로 이동시키는 훅, Link : 페이지 이동 링크 컴포넌트
import { login } from '../api/authApi.js'; // 로그인 API 통신 함수를 불러옴
import './AuthPage.css'; // 로그인·회원가입 페이지 공통 CSS 스타일

// LoginPage 컴포넌트 — 로그인 화면 전체를 담당
function LoginPage() {
  // ─────────────────────────────────────────────
  // 상태(State) 변수 선언
  // ─────────────────────────────────────────────

  // formData : 입력 폼의 값들을 하나의 객체로 관리
  // { email: '', password: '' } 형태로 시작하고, 사용자가 입력할 때마다 업데이트됨
  const [formData, setFormData] = useState({
    email: '', // 이메일 입력 필드의 현재 값
    password: '', // 비밀번호 입력 필드의 현재 값
  });

  // isLoading : API 요청 중일 때 true가 됨 — true이면 버튼을 비활성화해 중복 요청 방지
  const [isLoading, setIsLoading] = useState(false);

  // errorMessage : 로그인 실패 시 사용자에게 보여줄 에러 메시지 문자열
  const [errorMessage, setErrorMessage] = useState('');

  // useNavigate() : 프로그래밍 방식으로 페이지를 이동할 수 있는 함수를 반환
  const navigate = useNavigate();

  // ─────────────────────────────────────────────
  // 이벤트 핸들러 함수
  // ─────────────────────────────────────────────

  // handleChange : 입력 필드의 값이 바뀔 때마다 호출되는 함수
  // event.target.name : 변경된 input 요소의 name 속성 (예: 'email', 'password')
  // event.target.value : 현재 입력된 값
  const handleChange = (event) => {
    setFormData((prevData) => ({
      // 스프레드 연산자(...) : 기존 객체를 복사하고, 변경된 필드만 덮어씀
      // 예: email을 바꾸면 { email: '새값', password: '기존값' } 이 됨
      ...prevData,
      [event.target.name]: event.target.value, // [name]: value — 대괄호로 동적 키 사용
    }));
  };

  // handleSubmit : 폼이 제출될 때(로그인 버튼 클릭 또는 Enter 키) 호출되는 함수
  const handleSubmit = async (event) => {
    event.preventDefault(); // 기본 폼 제출 동작(페이지 새로고침) 방지

    setErrorMessage(''); // 이전 에러 메시지 초기화
    setIsLoading(true); // 로딩 상태 시작 — 버튼 비활성화

    try {
      // login() : authApi.js에서 가져온 로그인 API 함수
      // formData를 그대로 전달 — { email, password } 포함
      await login(formData);

      // 로그인 성공 시 운동루틴 페이지(첫 번째 탭)로 이동
      // replace: true — 로그인 페이지를 히스토리에서 제거 (뒤로가기로 돌아올 수 없도록)
      navigate('/workout', { replace: true });
    } catch (error) {
      // API 요청 실패 시 에러 처리
      // error.response?.data?.message : 서버가 보내준 에러 메시지 (없으면 기본 메시지 사용)
      const message =
        error.response?.data?.message || '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
      setErrorMessage(message); // 에러 메시지를 상태에 저장 → 화면에 표시됨
    } finally {
      // try/catch 결과에 상관없이 항상 실행되는 블록
      setIsLoading(false); // 로딩 상태 종료 — 버튼 다시 활성화
    }
  };

  // ─────────────────────────────────────────────
  // JSX 반환 — 화면에 그려질 HTML 구조
  // ─────────────────────────────────────────────
  return (
    // page-wrapper : 화면 전체를 덮는 그라디언트 배경 컨테이너 (index.css에 정의됨)
    <div className="page-wrapper">
      {/* auth-card : 흰 박스 카드 — 로그인 폼을 담음 */}
      <div className="auth-card">

        {/* ── 헤더 영역 ── */}
        <div className="auth-header">
          <div className="auth-logo">💪</div> {/* 서비스 로고 이모지 */}
          <h1 className="auth-title">No Sweat, No Sweet</h1> {/* 서비스 이름 */}
          <p className="auth-subtitle">건강관리 앱에 오신 걸 환영합니다</p> {/* 부제목 */}
        </div>

        {/* ── 로그인 폼 ── */}
        {/* onSubmit : 폼 제출 이벤트 → handleSubmit 함수 실행 */}
        <form className="auth-form" onSubmit={handleSubmit}>

          {/* 이메일 입력 그룹 */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              이메일
              {/* htmlFor : HTML의 for 속성 — label을 클릭하면 id="email"인 input이 포커스됨 */}
            </label>
            <input
              id="email" // label의 htmlFor와 연결
              className="form-input" // CSS 스타일 클래스
              type="email" // 이메일 형식 자동 검증 (예: @ 없으면 제출 안 됨)
              name="email" // handleChange에서 [event.target.name]으로 어떤 필드인지 구분
              value={formData.email} // 현재 상태값을 input에 연결 — React가 값을 제어함 (제어 컴포넌트)
              onChange={handleChange} // 키 입력마다 handleChange 실행
              placeholder="example@email.com" // 입력 전 안내 텍스트
              required // HTML5 필수 입력 검사 — 비어 있으면 제출 불가
              autoComplete="email" // 브라우저 자동완성 힌트 (저장된 이메일 추천)
            />
          </div>

          {/* 비밀번호 입력 그룹 */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              className="form-input"
              type="password" // 입력 내용을 점(●)으로 숨겨 비밀번호 노출 방지
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="current-password" // 브라우저 자동완성 힌트 (저장된 비밀번호 추천)
            />
          </div>

          {/* ── 에러 메시지 영역 ── */}
          {/* errorMessage가 빈 문자열('')이면 아무것도 렌더링하지 않음 */}
          {/* errorMessage가 있으면 빨간 경고 박스를 보여줌 */}
          {errorMessage && (
            <div className="error-box" role="alert">
              {/* role="alert" : 스크린 리더(시각 장애인 보조 도구)가 에러 메시지를 즉시 읽도록 */}
              <span className="error-icon">⚠️</span>
              {errorMessage} {/* 상태에 저장된 에러 메시지 텍스트 */}
            </div>
          )}

          {/* ── 로그인 제출 버튼 ── */}
          <button
            type="submit" // 폼의 onSubmit 이벤트를 발생시키는 버튼
            className="submit-btn" // CSS 스타일 클래스
            disabled={isLoading} // isLoading이 true이면 버튼 클릭 불가 — 중복 요청 방지
          >
            {/* 로딩 중이면 '로그인 중...' 표시, 아니면 '로그인' 표시 */}
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

        </form>

        {/* ── 하단 링크 영역 ── */}
        <div className="auth-footer">
          <p className="auth-switch-text">
            계정이 없으신가요?{' '}
            {/* Link : <a> 태그처럼 동작하지만 페이지 전체를 새로고침하지 않고 SPA 방식으로 이동 */}
            <Link to="/signup" className="auth-link">
              회원가입
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default LoginPage; // 다른 파일(App.jsx)에서 import할 수 있도록 내보냄
