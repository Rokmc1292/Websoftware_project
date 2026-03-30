// WorkoutPage.jsx — 운동루틴 페이지의 최상위(메인) 컴포넌트
// /workout 경로로 접속하면 AppLayout 안의 <Outlet />에 이 컴포넌트가 렌더링됨
//
// 역할:
//   - 서버에서 운동 세션 목록을 불러와 상태(state)로 관리
//   - "새 운동 기록" 폼(SessionForm)의 표시/숨기기 제어
//   - 세션 목록을 카드(SessionCard)로 렌더링
//   - 세션 삭제·AI 분석 콜백 함수를 자식 컴포넌트에 전달

// useState  : 컴포넌트 안에서 변하는 값(상태)을 저장하고 관리하는 React 훅
// useEffect : 컴포넌트가 화면에 나타날 때(마운트) 또는 특정 값이 바뀔 때 코드를 실행하는 React 훅
import { useState, useEffect } from 'react';

// 공통 색상 상수 — 모든 스타일에서 이 객체의 값을 사용해 일관된 색상 유지
import { colors } from '../../styles/colors.js';

// getSessions  : 서버에서 운동 세션 목록을 가져오는 API 함수
// deleteSession: 특정 세션을 서버에서 삭제하는 API 함수
// analyzeSession: 특정 세션을 AI로 분석 요청하는 API 함수
import { getSessions, deleteSession, analyzeSession } from '../../api/workoutApi.js';

// SessionForm : 새 운동 기록을 입력하는 폼 컴포넌트 (같은 폴더에 위치)
import SessionForm from './SessionForm.jsx';

// SessionCard : 저장된 운동 세션 하나를 카드 형태로 보여주는 컴포넌트
import SessionCard from './SessionCard.jsx';


// WorkoutPage 컴포넌트 — 운동루틴 페이지 전체를 담당
function WorkoutPage() {

    // ─────────────────────────────────────────────
    // 상태(State) 선언
    // ─────────────────────────────────────────────

    // sessions : 서버에서 불러온 운동 세션 목록 (배열)
    // 초기값은 빈 배열 [] — 아직 서버에서 데이터를 받기 전 상태
    const [sessions, setSessions] = useState([]);

    // showForm : 새 운동 기록 입력 폼을 화면에 보여줄지 여부 (true=보임, false=숨김)
    // 초기값 false — 페이지 처음 열 때 폼은 숨겨진 상태
    const [showForm, setShowForm] = useState(false);

    // loading : 서버에서 세션 목록을 불러오는 중인지 여부 (true=로딩 중)
    // 초기값 true — 페이지 열자마자 데이터를 불러오므로 처음엔 로딩 상태
    const [loading, setLoading] = useState(true);

    // errorMsg : 세션 목록 로드 실패 시 표시할 오류 메시지 (없으면 null)
    const [errorMsg, setErrorMsg] = useState(null);

    // analyzingId : 현재 AI 분석 중인 세션의 ID (분석 중이 아니면 null)
    // 분석 버튼에 로딩 표시를 해주기 위해 사용
    const [analyzingId, setAnalyzingId] = useState(null);


    // ─────────────────────────────────────────────
    // 데이터 로딩 — 컴포넌트가 처음 화면에 나타날 때 실행
    // ─────────────────────────────────────────────

    // useEffect(함수, []) : 두 번째 인자가 빈 배열 [] 이면 컴포넌트 마운트 시 딱 한 번만 실행
    // 컴포넌트가 처음 렌더링될 때 서버에서 세션 목록을 불러옴
    useEffect(() => {
        fetchSessions(); // 세션 목록 조회 함수 호출
    }, []); // 빈 배열 → 마운트(처음 나타날 때) 한 번만 실행


    // ─────────────────────────────────────────────
    // 함수 정의
    // ─────────────────────────────────────────────

    // fetchSessions : 서버에서 운동 세션 목록을 불러와 sessions 상태에 저장
    // async : 이 함수 안에서 await를 사용할 수 있도록 선언
    const fetchSessions = async () => {
        try {
            setLoading(true);  // 로딩 시작 — 화면에 "불러오는 중..." 표시
            setErrorMsg(null); // 이전 오류 메시지 초기화

            // getSessions() : workoutApi.js의 API 함수 — GET /api/workout/sessions 요청
            // await : 서버 응답이 올 때까지 기다림
            const data = await getSessions();

            // data.sessions : 서버가 반환한 세션 배열
            // setSessions() : sessions 상태를 업데이트 → React가 화면을 다시 그림(리렌더링)
            setSessions(data.sessions);

        } catch (error) {
            // 서버 요청 실패 시 (네트워크 오류, 로그인 만료 등)
            setErrorMsg('운동 기록을 불러오지 못했습니다. 다시 시도해주세요.');
            console.error('세션 목록 로드 오류:', error); // 개발자 콘솔에 오류 출력

        } finally {
            // try·catch 결과에 관계없이 항상 실행 — 로딩 종료
            setLoading(false);
        }
    };


    // handleSessionCreated : 새 세션이 성공적으로 저장됐을 때 호출되는 콜백 함수
    // SessionForm 컴포넌트에서 저장 완료 후 이 함수를 호출함
    // newSession : 서버에서 반환된 새 세션 객체
    const handleSessionCreated = (newSession) => {
        // 새 세션을 기존 목록의 맨 앞에 추가 (최신순 유지)
        // 스프레드 연산자(...) : 기존 배열을 풀어서 새 배열 생성
        // [newSession, ...sessions] = [새 세션, 기존세션1, 기존세션2, ...]
        setSessions([newSession, ...sessions]);

        // 새 세션 저장 후 폼을 자동으로 닫음
        setShowForm(false);
    };


    // handleDeleteSession : 특정 세션을 삭제하는 함수
    // SessionCard 컴포넌트의 삭제 버튼에서 이 함수를 호출함
    // sessionId : 삭제할 세션의 고유 ID (숫자)
    const handleDeleteSession = async (sessionId) => {
        // window.confirm() : 브라우저 기본 확인 팝업 — 사용자가 "확인"을 누르면 true 반환
        if (!window.confirm('이 운동 기록을 삭제하시겠습니까?')) {
            return; // "취소"를 누르면 함수 종료 — 삭제하지 않음
        }

        try {
            // deleteSession() : DELETE /api/workout/sessions/:id 요청
            await deleteSession(sessionId);

            // 삭제 성공 시 sessions 배열에서 해당 세션을 제거
            // filter() : 조건이 true인 요소만 남긴 새 배열 생성
            // s.id !== sessionId : 삭제된 세션(ID가 일치하는 것)을 제외
            setSessions(sessions.filter(s => s.id !== sessionId));

        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.'); // 실패 시 알림
            console.error('세션 삭제 오류:', error);
        }
    };


    // handleAnalyzeSession : 특정 세션의 AI 분석을 요청하는 함수
    // SessionCard 컴포넌트의 "AI 분석" 버튼에서 이 함수를 호출함
    // sessionId : 분석할 세션의 고유 ID (숫자)
    const handleAnalyzeSession = async (sessionId) => {
        setAnalyzingId(sessionId); // 분석 중인 세션 ID 기록 → 해당 버튼에 로딩 표시

        try {
            // analyzeSession() : POST /api/workout/sessions/:id/analyze 요청
            // Claude AI 분석 결과를 서버에서 받아옴
            const data = await analyzeSession(sessionId);

            // 분석 결과를 해당 세션의 ai_feedback에 업데이트
            // map() : 배열의 각 요소를 변환해 새 배열 생성
            // 분석 대상 세션만 ai_feedback을 업데이트하고 나머지는 그대로 유지
            setSessions(sessions.map(s =>
                s.id === sessionId                           // 분석 대상 세션인지 확인
                    ? { ...s, ai_feedback: data.ai_feedback } // 맞으면 ai_feedback 업데이트
                    : s                                       // 아니면 기존 세션 그대로
            ));

        } catch (error) {
            alert('AI 분석 중 오류가 발생했습니다.');
            console.error('AI 분석 오류:', error);

        } finally {
            setAnalyzingId(null); // 분석 완료 — 로딩 표시 제거
        }
    };


    // ─────────────────────────────────────────────
    // JSX 렌더링 — 화면에 그려질 내용
    // ─────────────────────────────────────────────

    return (
        // 페이지 콘텐츠 최외곽 컨테이너
        <div>

            {/* ── 페이지 헤더 영역 ── */}
            <div
                style={{
                    display: 'flex',         // 제목·배지·버튼을 가로로 나란히 배치
                    alignItems: 'center',    // 세로 중앙 정렬
                    gap: 10,                 // 요소 사이 간격 10px
                    marginBottom: 20,        // 아래 콘텐츠와의 간격
                }}
            >
                {/* 페이지 제목 */}
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>
                    운동루틴
                </h2>

                {/* AI 분석 포함 배지 — AI 기능이 있다는 것을 시각적으로 표시 */}
                <span
                    style={{
                        background: colors.aiTagLight, // 연한 보라 배경
                        color: colors.aiTag,           // 보라 글씨
                        borderRadius: 6,               // 모서리 둥글게
                        padding: '2px 8px',            // 위아래 2px, 좌우 8px 여백
                        fontSize: 11,
                        fontWeight: 600,
                    }}
                >
                    ✦ AI 분석 포함
                </span>

                {/* 오른쪽으로 밀어주는 빈 공간 — flexbox에서 나머지 공간을 차지 */}
                <div style={{ flex: 1 }} />

                {/* "새 운동 기록" 버튼 — 클릭하면 폼 표시/숨기기 토글 */}
                <button
                    onClick={() => setShowForm(!showForm)} // !showForm : true↔false 전환
                    style={{
                        background: showForm ? colors.border : colors.primary, // 폼 열림 시 회색, 닫힘 시 파랑
                        color: showForm ? colors.sub : '#fff',                 // 폼 열림 시 회색 글씨, 닫힘 시 흰 글씨
                        border: 'none',         // 기본 테두리 제거
                        borderRadius: 8,        // 모서리 둥글게
                        padding: '8px 16px',    // 버튼 내부 여백
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',      // 마우스 커서를 손가락 모양으로 변경
                    }}
                >
                    {/* 폼이 열려있으면 "닫기", 닫혀있으면 "+ 새 운동 기록" */}
                    {showForm ? '닫기' : '+ 새 운동 기록'}
                </button>
            </div>


            {/* ── 새 운동 기록 입력 폼 ── */}
            {/* showForm이 true일 때만 렌더링 (조건부 렌더링) */}
            {/* && 연산자 : 왼쪽이 true면 오른쪽 JSX를 렌더링, false면 아무것도 렌더링 안 함 */}
            {showForm && (
                <SessionForm
                    onSessionCreated={handleSessionCreated} // 저장 완료 시 호출할 콜백 함수 전달
                />
            )}


            {/* ── 세션 목록 영역 ── */}

            {/* 로딩 중일 때 표시 */}
            {loading && (
                <div
                    style={{
                        textAlign: 'center',  // 텍스트 가운데 정렬
                        padding: '48px 0',    // 위아래 여백
                        color: colors.sub,    // 보조 텍스트 색
                        fontSize: 14,
                    }}
                >
                    불러오는 중...
                </div>
            )}

            {/* 오류 발생 시 메시지 표시 */}
            {/* !loading : 로딩이 끝났을 때만 오류 표시 */}
            {!loading && errorMsg && (
                <div
                    style={{
                        background: '#FEF2F2',           // 연한 빨간 배경
                        border: `1px solid ${colors.danger}`, // 빨간 테두리
                        borderRadius: 8,
                        padding: '12px 16px',
                        color: colors.danger,            // 빨간 글씨
                        fontSize: 14,
                        marginBottom: 16,
                    }}
                >
                    {errorMsg} {/* 오류 메시지 텍스트 */}
                </div>
            )}

            {/* 로딩 완료 + 오류 없음 + 세션이 없을 때 — 빈 상태 안내 카드 */}
            {!loading && !errorMsg && sessions.length === 0 && (
                <div
                    style={{
                        background: colors.card,             // 흰 카드 배경
                        border: `1px solid ${colors.border}`, // 연한 회색 테두리
                        borderRadius: 12,                    // 모서리 둥글게
                        padding: '48px 24px',                // 넉넉한 안쪽 여백
                        textAlign: 'center',                 // 내용 가운데 정렬
                    }}
                >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>💪</div>
                    <h3 style={{ margin: '0 0 8px', color: colors.text }}>
                        아직 운동 기록이 없습니다
                    </h3>
                    <p style={{ margin: 0, color: colors.sub, fontSize: 14, lineHeight: 1.6 }}>
                        위의 <strong>"+ 새 운동 기록"</strong> 버튼을 눌러<br />
                        오늘의 운동을 기록해보세요!
                    </p>
                </div>
            )}

            {/* 세션 카드 목록 — 세션이 있을 때만 렌더링 */}
            {/* sessions.length > 0 : 배열에 요소가 하나 이상 있을 때 true */}
            {!loading && sessions.length > 0 && (
                // 세션 카드들을 세로로 쌓는 컨테이너
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* sessions 배열의 각 요소를 SessionCard로 변환해 렌더링 */}
                    {/* map() : 배열을 JSX 요소 배열로 변환하는 React의 핵심 패턴 */}
                    {sessions.map(session => (
                        <SessionCard
                            key={session.id}           // React 렌더링 최적화를 위한 고유 키
                            session={session}          // 세션 데이터 전달 (props)
                            onDelete={handleDeleteSession}   // 삭제 콜백 전달
                            onAnalyze={handleAnalyzeSession} // AI 분석 콜백 전달
                            isAnalyzing={analyzingId === session.id} // 이 세션이 분석 중인지 여부
                        />
                    ))}
                </div>
            )}

        </div>
    );
}

export default WorkoutPage; // App.jsx의 라우팅에서 import해 /workout 경로에 렌더링
