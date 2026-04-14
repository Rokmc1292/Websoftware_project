import { useNavigate } from 'react-router-dom';
import './IntroPage.css';

function IntroPage() {
  const navigate = useNavigate();
  const signupPath = '/login?mode=signup';

  const features = [
    {
      title: '운동 기록',
      desc: '루틴, 세트 수, 반복 횟수와 운동 강도를 기록하고 변화를 꾸준히 추적합니다.',
    },
    {
      title: '식단 관리',
      desc: '칼로리와 영양소를 기반으로 목표에 맞는 식단을 더 체계적으로 관리합니다.',
    },
    {
      title: '수면 분석',
      desc: '수면 시간과 회복 패턴을 분석해 하루 컨디션과 생활 흐름을 파악합니다.',
    },
  ];

  const coachItems = [
    {
      title: '목표 기반 피드백',
      desc: '감량, 증량, 유지 같은 목표에 따라 오늘 더 중요한 행동을 우선 제안합니다.',
    },
    {
      title: '통합 데이터 분석',
      desc: '운동, 식단, 수면을 따로 보지 않고 함께 분석해 더 정확한 조언을 제공합니다.',
    },
    {
      title: '개인화 루틴 추천',
      desc: '기록이 쌓일수록 사용자 패턴에 맞는 루틴과 실천 방향을 더 정교하게 맞춰줍니다.',
    },
  ];

  const stats = [
    { label: '운동 달성률', value: '76%' },
    { label: '오늘 식단', value: '1920 kcal' },
    { label: '평균 수면', value: '7.4 h' },
  ];

  return (
    <div className="intro-page">
      <header className="intro-header">
        <div className="intro-header-inner">
          <div className="intro-logo-box">
            <img src="/logo.png" alt="서비스 로고" className="intro-logo-img" />
            <div className="intro-logo-text-box">
              <span className="intro-logo-text">Hill</span>
              <span className="intro-logo-subtext">AI body care coach</span>
            </div>
          </div>

          <div className="intro-header-buttons">
            <button
              type="button"
              className="intro-header-login"
              onClick={() => navigate('/login')}
            >
              로그인
            </button>

            <button
              type="button"
              className="intro-header-signup"
              onClick={() => navigate(signupPath)}
            >
              회원가입
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="intro-hero-section">
          <div className="intro-hero-overlay">
            <div className="intro-hero-content">
              <h1 className="intro-hero-title">
                기록하고,
                <br />
                분석하고,
                <br />
                몸을 바꾸는 습관.
              </h1>

              <p className="intro-hero-subtitle">
                운동, 식단, 수면 데이터를 한 곳에 기록하고
                AI 코치의 분석으로 목표에 맞는 몸관리를 시작해보세요.
              </p>

              <div className="intro-hero-buttons">
                <button
                  type="button"
                  className="intro-primary-btn"
                  onClick={() => navigate(signupPath)}
                >
                  무료로 시작하기
                </button>

                <button
                  type="button"
                  className="intro-secondary-btn"
                  onClick={() => navigate('/login')}
                >
                  로그인
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="intro-section intro-section-dark">
          <div className="intro-container">
            <div className="intro-section-heading">
              <p className="intro-section-label">핵심 기능</p>
              <h2>건강 기록의 기본 데이터를 더 쉽게 관리합니다</h2>
              <p>
                복잡한 기록을 단순하게 정리하고, 사용자가 꾸준히 이어갈 수 있도록
                직관적인 흐름으로 구성했습니다.
              </p>
            </div>

            <div className="intro-feature-grid">
              {features.map((feature) => (
                <div key={feature.title} className="intro-feature-card">
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="intro-section intro-section-deep">
          <div className="intro-container">
            <div className="intro-two-column">
              <div className="intro-left-copy">
                <p className="intro-section-label">AI 코치</p>
                <h2>
                  단순 기록 앱이 아니라,
                  <br />
                  행동을 바꾸는 코치
                </h2>
                <p className="intro-paragraph">
                  하루 데이터를 저장하는 데서 끝나지 않고, 운동, 식단, 수면 간의
                  관계를 함께 분석해 오늘 무엇을 조절해야 할지 보여줍니다.
                </p>
              </div>

              <div className="intro-coach-list">
                {coachItems.map((item) => (
                  <div key={item.title} className="intro-coach-item">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="intro-section intro-section-dark">
          <div className="intro-container">
            <div className="intro-section-heading">
              <p className="intro-section-label">AI 리포트 미리보기</p>
              <h2>기록은 쌓이고, 인사이트는 더 선명해집니다</h2>
              <p>
                사용자의 현재 상태를 빠르게 파악할 수 있도록
                중요한 지표와 코치 피드백을 한눈에 보여줍니다.
              </p>
            </div>

            <div className="intro-report-card">
              <div className="intro-report-header">
                <div>
                  <p className="intro-report-label">오늘의 AI 코치 리포트</p>
                  <h3 className="intro-report-title">목표: 체지방 감량</h3>
                </div>

                <span className="intro-report-day">Day 18</span>
              </div>

              <div className="intro-report-stats">
                {stats.map((item) => (
                  <div key={item.label} className="intro-report-stat-box">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="intro-report-message">
                최근 수면 패턴이 안정적이라 회복 효율이 좋아졌어요.
                오늘은 단백질 섭취를 조금 늘리고 운동 강도는 현재 수준으로 유지하는 것이 좋습니다.
              </div>
            </div>
          </div>
        </section>

        <section className="intro-section intro-final-section">
          <div className="intro-container">
            <div className="intro-final-card">
              <p className="intro-final-label">지금 시작하기</p>

              <h2>
                당신의 기록을
                <br />
                더 똑똑한 몸관리로 연결하세요
              </h2>

              <p>
                운동, 식단, 수면을 기록하면 AI 코치가
                목표에 맞는 다음 행동을 제안합니다.
              </p>

              <div className="intro-final-buttons">
                <button
                  type="button"
                  className="intro-final-primary"
                  onClick={() => navigate(signupPath)}
                >
                  회원가입
                </button>

                <button
                  type="button"
                  className="intro-final-secondary"
                  onClick={() => navigate('/login')}
                >
                  로그인
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default IntroPage;