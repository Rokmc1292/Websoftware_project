// SignupPage.jsx — 회원가입 페이지 컴포넌트
// 새로운 사용자가 닉네임, 이메일, 비밀번호를 입력해 계정을 만드는 화면

import { useState } from 'react'; // useState : 컴포넌트 내부 상태를 관리하는 React 훅
import { useNavigate, Link } from 'react-router-dom'; // useNavigate : 페이지 이동 훅, Link : SPA 링크 컴포넌트
import { register } from '../api/authApi.js'; // 회원가입 API 통신 함수를 불러옴
import './AuthPage.css'; // 로그인·회원가입 페이지 공통 CSS 스타일

// SignupPage 컴포넌트 — 회원가입 화면 전체를 담당
function SignupPage() {
  // ─────────────────────────────────────────────
  // 상태(State) 변수 선언
  // ─────────────────────────────────────────────

  // formData : 입력 폼의 모든 필드 값을 하나의 객체로 관리
  const [formData, setFormData] = useState({
    username: '', // 닉네임 입력 필드의 현재 값
    email: '', // 이메일 입력 필드의 현재 값
    password: '', // 비밀번호 입력 필드의 현재 값
    confirmPassword: '', // 비밀번호 확인 입력 필드의 현재 값
  });

  // isLoading : API 요청 진행 중일 때 true — 버튼 비활성화로 중복 요청 방지
  const [isLoading, setIsLoading] = useState(false);

  // errorMessage : 유효성 검사 실패 또는 서버 에러 메시지를 저장
  const [errorMessage, setErrorMessage] = useState('');

  // successMessage : 회원가입 성공 시 보여줄 안내 메시지
  const [successMessage, setSuccessMessage] = useState('');

  // useNavigate() : 프로그래밍 방식으로 다른 페이지로 이동하는 함수를 반환
  const navigate = useNavigate();

  // ─────────────────────────────────────────────
  // 이벤트 핸들러 함수
  // ─────────────────────────────────────────────

  // handleChange : 입력 필드 값이 변경될 때마다 호출
  // 어떤 input이든 이 함수 하나로 처리 — input의 name 속성으로 구분
  const handleChange = (event) => {
    setFormData((prevData) => ({
      ...prevData, // 기존 필드 값을 그대로 복사
      [event.target.name]: event.target.value, // 바뀐 필드만 덮어씀
    }));
  };

  // validateForm : 폼 제출 전 클라이언트 측 유효성 검사 함수
  // 서버에 불필요한 요청을 보내기 전에 기본적인 오류를 미리 잡음
  // 문제가 없으면 true 반환, 문제가 있으면 에러 메시지를 설정하고 false 반환
  const validateForm = () => {
    // 닉네임 길이 검사 — 2자 미만이면 너무 짧음
    if (formData.username.trim().length < 2) {
      setErrorMessage('닉네임은 최소 2자 이상이어야 합니다.');
      return false; // 유효성 검사 실패
    }

    // 비밀번호 길이 검사 — 8자 미만이면 보안상 너무 짧음
    if (formData.password.length < 8) {
      setErrorMessage('비밀번호는 최소 8자 이상이어야 합니다.');
      return false;
    }

    // 비밀번호 일치 여부 검사 — 두 필드가 다르면 오타 가능성
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
      return false;
    }

    return true; // 모든 검사 통과 — 유효한 입력값
  };

  // handleSubmit : 폼 제출(회원가입 버튼 클릭 또는 Enter 키) 시 실행
  const handleSubmit = async (event) => {
    event.preventDefault(); // 브라우저 기본 동작(페이지 새로고침) 방지

    setErrorMessage(''); // 이전 에러 메시지 초기화
    setSuccessMessage(''); // 이전 성공 메시지 초기화

    // 유효성 검사 실패 시 함수 중단 — API 요청을 보내지 않음
    if (!validateForm()) return;

    setIsLoading(true); // 로딩 상태 시작

    try {
      // 서버로 보낼 데이터 구성 — confirmPassword는 서버에 불필요하므로 제외
      const requestData = {
        username: formData.username.trim(), // trim() : 앞뒤 공백 제거
        email: formData.email.trim(),
        password: formData.password,
      };

      // register() : authApi.js의 회원가입 API 함수 호출
      await register(requestData);

      // 회원가입 성공 — 사용자에게 성공 메시지 표시
      setSuccessMessage('회원가입이 완료되었습니다! 잠시 후 로그인 페이지로 이동합니다.');

      // 2초 후 로그인 페이지로 자동 이동
      // setTimeout : 지정한 시간(ms) 후에 콜백 함수를 실행
      setTimeout(() => {
        navigate('/login', { replace: true }); // 로그인 페이지로 이동 (회원가입 페이지는 히스토리에서 제거)
      }, 2000); // 2000ms = 2초
    } catch (error) {
      // 서버 에러 처리 — 이미 존재하는 이메일 등
      const message =
        error.response?.data?.message || '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false); // 로딩 상태 종료
    }
  };

  // ─────────────────────────────────────────────
  // JSX 반환 — 화면에 그려질 HTML 구조
  // ─────────────────────────────────────────────
  return (
    // page-wrapper : 화면 전체를 덮는 그라디언트 배경 (index.css 정의)
    <div className="page-wrapper">
      {/* auth-card : 흰 박스 카드 — 회원가입 폼을 담음 */}
      <div className="auth-card">

        {/* ── 헤더 영역 ── */}
        <div className="auth-header">
          <div className="auth-logo">💪</div> {/* 서비스 로고 이모지 */}
          <h1 className="auth-title">No Sweat, No Sweet</h1> {/* 서비스 이름 */}
          <p className="auth-subtitle">새 계정을 만들어 건강관리를 시작하세요</p> {/* 부제목 */}
        </div>

        {/* ── 회원가입 폼 ── */}
        <form className="auth-form" onSubmit={handleSubmit}>

          {/* 닉네임 입력 그룹 */}
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              닉네임
            </label>
            <input
              id="username"
              className="form-input"
              type="text" // 일반 텍스트 입력
              name="username" // handleChange에서 구분에 사용되는 식별자
              value={formData.username} // React가 이 값을 제어 — 상태와 input 값이 항상 동기화됨
              onChange={handleChange} // 입력 변경 시 handleChange 실행
              placeholder="예: 헬스왕태욱 (최소 2자)"
              required // 비어 있으면 폼 제출 불가
              autoComplete="username" // 브라우저 자동완성 힌트
            />
          </div>

          {/* 이메일 입력 그룹 */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              className="form-input"
              type="email" // 이메일 형식 자동 검증 — '@' 없으면 제출 불가
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@email.com"
              required
              autoComplete="email"
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
              type="password" // 입력 내용을 점(●)으로 숨김
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="최소 8자 이상 입력하세요"
              required
              autoComplete="new-password" // 새 비밀번호임을 브라우저에 알림 (자동완성 방지)
            />
          </div>

          {/* 비밀번호 확인 입력 그룹 */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              className="form-input"
              type="password"
              name="confirmPassword" // formData.confirmPassword와 연결
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호를 한 번 더 입력하세요"
              required
              autoComplete="new-password"
            />
          </div>

          {/* ── 에러 메시지 영역 ── */}
          {/* errorMessage 상태값이 있을 때만 빨간 경고 박스를 렌더링 */}
          {errorMessage && (
            <div className="error-box" role="alert">
              <span className="error-icon">⚠️</span>
              {errorMessage}
            </div>
          )}

          {/* ── 성공 메시지 영역 ── */}
          {/* 회원가입 성공 시 초록 안내 박스를 렌더링 */}
          {successMessage && (
            <div className="success-box" role="status">
              {/* role="status" : 스크린 리더가 상태 변경을 사용자에게 알리도록 */}
              <span className="success-icon">✅</span>
              {successMessage}
            </div>
          )}

          {/* ── 회원가입 제출 버튼 ── */}
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading || Boolean(successMessage)}
            // isLoading이면 요청 중 — 버튼 비활성화
            // successMessage가 있으면 이미 처리 완료 — 버튼 비활성화
          >
            {/* 로딩 중이면 '처리 중...', 아니면 '회원가입' 텍스트 표시 */}
            {isLoading ? '처리 중...' : '회원가입'}
          </button>

        </form>

        {/* ── 하단 링크 영역 ── */}
        <div className="auth-footer">
          <p className="auth-switch-text">
            이미 계정이 있으신가요?{' '}
            {/* {' '} : JSX에서 공백을 강제로 삽입하는 방법 */}
            <Link to="/login" className="auth-link">
              로그인
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default SignupPage; // App.jsx에서 import할 수 있도록 내보냄
