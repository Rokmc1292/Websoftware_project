import {useNavigate,useLocation} from 'react-router-dom';
import {colors} from '../styles/colors.js';
import {logout} from '../api/authApi.js';

const TABS = [
  {label:'운동루틴', path:'workout'},
  {label:'식단관리', path:'/diet'},
  {label:'수면관리', path:'/sleep'},
  {label:'통계/분석', path:'/stats'},
];

function Header(){
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogoClick = () =>{navigate('workout');};
  const handleLogout = () =>{logout();};
  return (
    <header
      style={{
        background: colors.card,                          // 흰 배경
        borderBottom: `1px solid ${colors.border}`,       // 하단에 연한 회색 구분선
        padding: '0 24px',                                // 좌우 여백 24px
        position: 'sticky',                               // 스크롤 시 상단에 고정
        top: 0,                                           // 화면 맨 위에 붙어 있음
        zIndex: 100,                                      // 다른 요소들보다 위에 표시 (z축 순서)
      }}
    >

      <div
        style={{
          maxWidth: 960,          // 너무 넓어지지 않도록 최대 너비 제한
          margin: '0 auto',       // 좌우 auto 마진으로 가운데 정렬
          display: 'flex',        // 자식 요소(로고·탭·아바타)를 가로로 나란히 배치
          alignItems: 'center',   // 세로 방향 가운데 정렬
          justifyContent: 'space-between', // 세 영역을 양 끝·가운데에 균등 배치
          height: 56,             // 헤더 높이 56px
        }}
      >

        {/* ── 왼쪽: 로고 ── */}
        <div
          onClick={handleLogoClick} // 클릭 시 운동루틴 페이지로 이동
          style={{
            fontWeight: 800,          // 매우 굵게 (ExtraBold)
            fontSize: 18,             // 18px
            color: colors.primary,    // 주요 파랑-보라 색
            cursor: 'pointer',        // 마우스를 올리면 손가락 커서 — 클릭 가능함을 표시
            userSelect: 'none',       // 더블클릭 시 텍스트가 선택되지 않도록
            letterSpacing: '-0.3px',  // 자간 약간 좁게 — 로고 느낌
          }}
        >
          ⚡ No Sweat,No Sweet 
        </div>

        {/* ── 가운데: 탭 네비게이션 ── */}
        <nav
          style={{
            display: 'flex', // 탭 버튼들을 가로로 나란히 배치
            gap: 4,           // 탭 버튼 사이 간격 4px
          }}
        >
          {/* TABS 배열을 순회해 탭 버튼을 하나씩 생성 */}
          {TABS.map((tab) => {
            // 현재 URL 경로가 이 탭의 경로와 같으면 활성(active) 상태
            // 예: 지금 /diet 페이지라면 '식단관리' 탭만 isActive === true
            const isActive = location.pathname === tab.path;

            return (
              <button
                key={tab.path} // React가 목록을 효율적으로 업데이트하기 위한 고유 키
                onClick={() => navigate(tab.path)} // 클릭 시 해당 경로로 이동
                style={{
                  padding: '8px 16px',   // 위아래 8px, 좌우 16px 여백 — 클릭 영역 확보
                  border: 'none',         // 기본 버튼 테두리 제거
                  borderRadius: 8,        // 모서리 둥글게
                  cursor: 'pointer',      // 손가락 커서
                  fontSize: 13,           // 13px
                  fontWeight: 600,        // 세미볼드
                  // 활성 탭: 파란 배경 + 흰 글씨 / 비활성 탭: 투명 배경 + 회색 글씨
                  background: isActive ? colors.primary : 'transparent',
                  color: isActive ? '#ffffff' : colors.sub,
                  transition: 'all 0.15s ease', // 색 변화가 0.15초 동안 부드럽게 전환
                }}
              >
                {tab.label} {/* 탭 이름 (운동루틴, 식단관리, 수면관리, 통계/분석) */}
              </button>
            );
          })}
        </nav>

        {/* ── 오른쪽: 사용자 아바타 (로그아웃 버튼 역할) ── */}
        <div
          onClick={handleLogout} // 클릭 시 로그아웃
          title="로그아웃"        // 마우스를 올리면 나타나는 툴팁 텍스트
          style={{
            width: 34,                          // 원형 아바타 너비
            height: 34,                         // 원형 아바타 높이
            background: colors.primaryLight,    // 연한 파랑-보라 배경
            borderRadius: '50%',                // 50% = 완전한 원
            display: 'flex',                    // 아이콘을 정중앙에 배치하기 위해 Flexbox 사용
            alignItems: 'center',               // 세로 중앙
            justifyContent: 'center',           // 가로 중앙
            fontSize: 16,                       // 아이콘 크기
            cursor: 'pointer',                  // 손가락 커서 — 클릭 가능함을 표시
            userSelect: 'none',                 // 클릭 시 텍스트 선택 방지
            transition: 'opacity 0.15s ease',   // hover 시 투명도 변화 부드럽게
          }}
          // 마우스를 올렸을 때 약간 흐리게 — 클릭 가능함을 시각적으로 강조
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          👤 {/* 기본 사용자 아이콘 — 나중에 프로필 사진으로 교체 가능 */}
        </div>

      </div>
    </header>
  );

}

export default Header;