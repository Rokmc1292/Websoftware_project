// WorkoutPage.jsx — 운동루틴 페이지의 최상위(메인) 컴포넌트
// /workout 경로로 접속하면 AppLayout 안의 <Outlet />에 이 컴포넌트가 렌더링됨
//
// 역할:
//   - 서버에서 운동 세션 목록 로드 (페이지네이션·검색·필터 지원)
//   - 새 운동 기록 폼 / 수정 폼 표시·숨기기 제어
//   - 세션 목록을 카드로 렌더링
//   - 즐겨찾기 목록 패널 (루틴 불러오기)
//   - 삭제·AI 분석·즐겨찾기 토글·수정 콜백 관리

import { useState, useEffect } from 'react';
import { colors } from '../../styles/colors.js';
import {
    getSessions,
    deleteSession,
    analyzeSession,
    toggleFavorite,
    getFavorites,
} from '../../api/workoutApi.js';
import SessionForm from './SessionForm.jsx';
import SessionCard from './SessionCard.jsx';


// 페이지 당 세션 수
const PER_PAGE = 10;

// 운동 부위 필터 선택지
const MUSCLE_GROUP_OPTIONS = ['전체', '가슴', '등', '하체', '어깨', '팔', '코어', '유산소', '기타'];


// WorkoutPage 컴포넌트
function WorkoutPage() {

    // ─────────────────────────────────────────────
    // 상태(State) 선언
    // ─────────────────────────────────────────────

    // sessions : 서버에서 불러온 운동 세션 목록
    const [sessions, setSessions] = useState([]);

    // showForm : 새 운동 기록 입력 폼 표시 여부
    const [showForm, setShowForm] = useState(false);

    // editingSession : 수정 중인 세션 객체 (null이면 수정 모드 아님)
    const [editingSession, setEditingSession] = useState(null);

    // loading : 세션 목록 로드 중 여부
    const [loading, setLoading] = useState(true);

    // errorMsg : 로드 실패 시 오류 메시지
    const [errorMsg, setErrorMsg] = useState(null);

    // analyzingId : 현재 AI 분석 중인 세션 ID
    const [analyzingId, setAnalyzingId] = useState(null);

    // ── 검색·필터 상태 ──

    // searchQuery : 텍스트 검색어 (세션 제목·메모·종목명)
    const [searchQuery, setSearchQuery] = useState('');

    // filterMuscle : 운동 부위 필터 ('전체' 이면 전체 표시)
    const [filterMuscle, setFilterMuscle] = useState('전체');

    // filterMonth : 월별 필터 ('YYYY-MM' 형식, 빈 문자열이면 전체)
    const [filterMonth, setFilterMonth] = useState('');

    // ── 페이지네이션 상태 ──

    // currentPage : 현재 페이지 번호 (1부터 시작)
    const [currentPage, setCurrentPage] = useState(1);

    // ── 즐겨찾기 패널 상태 ──

    // showFavorites : 즐겨찾기 목록 패널 표시 여부
    const [showFavorites, setShowFavorites] = useState(false);

    // favorites : 즐겨찾기 세션 목록
    const [favorites, setFavorites] = useState([]);

    // loadingFavorites : 즐겨찾기 로드 중 여부
    const [loadingFavorites, setLoadingFavorites] = useState(false);

    // ── 루틴 불러오기 상태 ──

    // templateSession : 즐겨찾기에서 불러온 세션 (종목·세트 구조를 새 폼에 복사하는 용도)
    // null이면 일반 새 세션 입력 모드, 값이 있으면 루틴 불러오기 모드
    const [templateSession, setTemplateSession] = useState(null);


    // ─────────────────────────────────────────────
    // 마운트 시 세션 목록 로드
    // ─────────────────────────────────────────────

    useEffect(() => {
        fetchSessions();
    }, []); // 빈 배열 → 마운트 1회만 실행


    // ─────────────────────────────────────────────
    // 함수 정의
    // ─────────────────────────────────────────────

    // fetchSessions : 서버에서 세션 목록을 불러와 sessions 상태에 저장
    const fetchSessions = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const data = await getSessions();
            setSessions(data.sessions);
        } catch (error) {
            setErrorMsg('운동 기록을 불러오지 못했습니다. 다시 시도해주세요.');
            console.error('세션 목록 로드 오류:', error);
        } finally {
            setLoading(false);
        }
    };


    // handleSessionCreated : 새 세션 저장 완료 시 목록 맨 앞에 추가
    const handleSessionCreated = (newSession) => {
        setSessions([newSession, ...sessions]);
        setShowForm(false); // 폼 닫기
    };


    // handleSessionUpdated : 세션 수정 완료 시 해당 항목 업데이트
    const handleSessionUpdated = (updatedSession) => {
        setSessions(sessions.map(s =>
            s.id === updatedSession.id ? updatedSession : s
        ));
        setEditingSession(null); // 수정 모드 종료
    };


    // handleCancelEdit : 수정 취소
    const handleCancelEdit = () => setEditingSession(null);


    // handleDeleteSession : 세션 삭제
    const handleDeleteSession = async (sessionId) => {
        if (!window.confirm('이 운동 기록을 삭제하시겠습니까?')) return;
        try {
            await deleteSession(sessionId);
            setSessions(sessions.filter(s => s.id !== sessionId));
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
            console.error('세션 삭제 오류:', error);
        }
    };


    // handleAnalyzeSession : AI 분석 요청
    const handleAnalyzeSession = async (sessionId) => {
        setAnalyzingId(sessionId);
        try {
            const data = await analyzeSession(sessionId);
            setSessions(sessions.map(s =>
                s.id === sessionId ? { ...s, ai_feedback: data.ai_feedback } : s
            ));
        } catch (error) {
            alert('AI 분석 중 오류가 발생했습니다.');
            console.error('AI 분석 오류:', error);
        } finally {
            setAnalyzingId(null);
        }
    };


    // handleToggleFavorite : 즐겨찾기 토글
    // 서버에 요청 후 로컬 sessions 상태의 is_favorite도 업데이트
    const handleToggleFavorite = async (sessionId) => {
        try {
            const data = await toggleFavorite(sessionId);
            setSessions(sessions.map(s =>
                s.id === sessionId ? { ...s, is_favorite: data.is_favorite } : s
            ));
        } catch (error) {
            alert('즐겨찾기 변경 중 오류가 발생했습니다.');
            console.error('즐겨찾기 토글 오류:', error);
        }
    };


    // handleOpenFavorites : 즐겨찾기 패널 열기 + 목록 로드
    const handleOpenFavorites = async () => {
        setShowFavorites(true);
        setLoadingFavorites(true);
        try {
            const data = await getFavorites();
            setFavorites(data.sessions);
        } catch (error) {
            console.error('즐겨찾기 로드 오류:', error);
        } finally {
            setLoadingFavorites(false);
        }
    };


    // handleEditSession : 세션 수정 버튼 클릭 — 수정 폼 열기
    const handleEditSession = (session) => {
        setEditingSession(session);    // 수정할 세션 설정
        setTemplateSession(null);      // 루틴 불러오기 상태 초기화 (충돌 방지)
        setShowForm(false);            // 새 세션 폼은 닫기
        // 스크롤을 페이지 상단으로 이동해 수정 폼이 보이도록 함
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    // handleLoadRoutine : 즐겨찾기 패널에서 "불러오기" 버튼 클릭 시 실행
    // 선택한 즐겨찾기 세션의 종목·세트 구조를 새 세션 입력 폼에 복사
    // session : 불러올 즐겨찾기 세션 객체
    const handleLoadRoutine = (session) => {
        setTemplateSession(session);   // 템플릿으로 사용할 세션 지정 → SessionForm이 자동으로 폼 채움
        setEditingSession(null);       // 수정 모드 초기화 (충돌 방지)
        setShowForm(true);             // 새 세션 입력 폼 열기
        setShowFavorites(false);       // 즐겨찾기 패널 닫기
        // 스크롤을 페이지 상단으로 이동해 폼이 보이도록 함
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    // ─────────────────────────────────────────────
    // 클라이언트 측 검색·필터·페이지네이션
    // ─────────────────────────────────────────────

    // filteredSessions : 검색어·부위·월 필터를 적용한 세션 목록
    const filteredSessions = sessions.filter(session => {

        // 텍스트 검색 — 세션 제목, 메모, 종목 이름에서 검색어 포함 여부 확인
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            // 세션 제목에 검색어 포함 여부
            const inTitle = (session.title || '').toLowerCase().includes(q);
            // 메모에 검색어 포함 여부
            const inMemo = (session.memo || '').toLowerCase().includes(q);
            // 종목 이름에 검색어 포함 여부 (하나라도 포함되면 통과)
            const inExercise = session.sets.some(s =>
                s.exercise_name.toLowerCase().includes(q)
            );
            if (!inTitle && !inMemo && !inExercise) return false;
        }

        // 운동 부위 필터 — '전체'가 아니면 해당 부위의 종목이 하나라도 있어야 함
        if (filterMuscle !== '전체') {
            const hasMusle = session.sets.some(s => s.muscle_group === filterMuscle);
            if (!hasMusle) return false;
        }

        // 월별 필터 — 'YYYY-MM' 형식으로 비교
        if (filterMonth) {
            // session_date: "2024-06-01" → slice(0, 7) → "2024-06"
            if (!session.session_date.startsWith(filterMonth)) return false;
        }

        return true; // 모든 조건 통과
    });

    // 필터 적용 후 총 페이지 수 계산
    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PER_PAGE));

    // 현재 페이지에 표시할 세션 슬라이스
    const pagedSessions = filteredSessions.slice(
        (currentPage - 1) * PER_PAGE,  // 시작 인덱스
        currentPage * PER_PAGE          // 끝 인덱스 (미포함)
    );

    // 필터가 바뀌면 1페이지로 리셋 — 아직 없는 페이지를 보여주지 않도록
    // (useEffect로 처리하면 추가 렌더링이 발생하므로 여기서 직접 계산)
    const effectivePage = Math.min(currentPage, totalPages);


    // ─────────────────────────────────────────────
    // JSX 렌더링
    // ─────────────────────────────────────────────

    return (
        <div>

            {/* ── 페이지 헤더 ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>
                    운동루틴
                </h2>
                <span
                    style={{
                        background: colors.aiTagLight,
                        color: colors.aiTag,
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                    }}
                >
                    ✦ AI 분석 포함
                </span>

                <div style={{ flex: 1 }} />

                {/* 즐겨찾기 불러오기 버튼 */}
                <button
                    onClick={handleOpenFavorites}
                    style={{
                        background: '#FFFBEB',   // 연한 노란 배경
                        color: '#B45309',        // 진한 노란 글씨
                        border: `1px solid #F59E0B`,
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    ★ 즐겨찾기
                </button>

                {/* 새 운동 기록 버튼 */}
                <button
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingSession(null);    // 수정 모드 취소
                        setTemplateSession(null);   // 루틴 불러오기 모드도 취소 (폼 닫을 때 초기화)
                    }}
                    style={{
                        background: showForm ? colors.border : colors.primary,
                        color: showForm ? colors.sub : colors.card,
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    {showForm ? '닫기' : '+ 새 운동 기록'}
                </button>
            </div>


            {/* ── 수정 폼 — editingSession이 있을 때만 표시 ── */}
            {editingSession && (
                <SessionForm
                    editSession={editingSession}
                    onSessionUpdated={handleSessionUpdated}
                    onCancelEdit={handleCancelEdit}
                />
            )}

            {/* ── 새 운동 기록 폼 — showForm이 true이고 수정 중이 아닐 때 표시 ── */}
            {/* templateSession이 있으면 루틴 불러오기 모드로 폼이 열림 */}
            {showForm && !editingSession && (
                <SessionForm
                    onSessionCreated={(newSession) => {
                        handleSessionCreated(newSession);
                        setTemplateSession(null); // 저장 완료 후 템플릿 상태 초기화
                    }}
                    templateSession={templateSession} // 루틴 불러오기 템플릿 전달
                />
            )}


            {/* ── 검색·필터 바 ── */}
            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                {/* 텍스트 검색 입력 */}
                <input
                    type="text"
                    placeholder="검색 (제목·메모·종목명)"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    style={{
                        flex: '1 1 180px',
                        padding: '8px 12px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        fontSize: 13,
                        color: colors.text,
                            background: colors.card,
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />

                {/* 운동 부위 필터 드롭다운 */}
                <select
                    value={filterMuscle}
                    onChange={e => { setFilterMuscle(e.target.value); setCurrentPage(1); }}
                    style={{
                        padding: '8px 10px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        fontSize: 13,
                        color: colors.text,
                            background: colors.card,
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    {MUSCLE_GROUP_OPTIONS.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>

                {/* 월별 필터 입력 — type="month" : "YYYY-MM" 선택기 */}
                <input
                    type="month"
                    value={filterMonth}
                    onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1); }}
                    style={{
                        padding: '8px 10px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        fontSize: 13,
                        color: filterMonth ? colors.text : colors.muted,
                            background: colors.card,
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                />

                {/* 필터 초기화 버튼 — 필터가 하나라도 활성화된 경우에만 표시 */}
                {(searchQuery || filterMuscle !== '전체' || filterMonth) && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setFilterMuscle('전체');
                            setFilterMonth('');
                            setCurrentPage(1);
                        }}
                        style={{
                            background: 'none',
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 12,
                            color: colors.sub,
                            cursor: 'pointer',
                        }}
                    >
                        초기화
                    </button>
                )}
            </div>


            {/* ── 세션 목록 영역 ── */}

            {/* 로딩 중 */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: colors.sub, fontSize: 14 }}>
                    불러오는 중...
                </div>
            )}

            {/* 오류 */}
            {!loading && errorMsg && (
                <div
                    style={{
                        background: '#FEF2F2',
                        border: `1px solid ${colors.danger}`,
                        borderRadius: 8,
                        padding: '12px 16px',
                        color: colors.danger,
                        fontSize: 14,
                        marginBottom: 16,
                    }}
                >
                    {errorMsg}
                </div>
            )}

            {/* 빈 상태 안내 — 세션 없을 때 */}
            {!loading && !errorMsg && sessions.length === 0 && (
                <div
                    style={{
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 12,
                        padding: '48px 24px',
                        textAlign: 'center',
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

            {/* 검색 결과 없음 — 세션은 있지만 필터 결과가 없을 때 */}
            {!loading && sessions.length > 0 && filteredSessions.length === 0 && (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '32px 0',
                        color: colors.sub,
                        fontSize: 14,
                    }}
                >
                    검색 조건에 맞는 운동 기록이 없습니다.
                </div>
            )}

            {/* 세션 카드 목록 */}
            {!loading && pagedSessions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {pagedSessions.map(session => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            onDelete={handleDeleteSession}
                            onAnalyze={handleAnalyzeSession}
                            isAnalyzing={analyzingId === session.id}
                            onEdit={handleEditSession}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    ))}
                </div>
            )}


            {/* ── 페이지네이션 컨트롤 ── */}
            {!loading && totalPages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 24,
                    }}
                >
                    {/* 이전 페이지 버튼 */}
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={effectivePage === 1} // 첫 페이지면 비활성화
                        style={{
                            background: 'none',
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 13,
                            cursor: effectivePage === 1 ? 'not-allowed' : 'pointer',
                            color: effectivePage === 1 ? colors.muted : colors.text,
                        }}
                    >
                        ‹ 이전
                    </button>

                    {/* 페이지 번호 버튼들 */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{
                                background: page === effectivePage ? colors.primary : 'none',
                                color: page === effectivePage ? '#fff' : colors.text,
                                border: `1px solid ${page === effectivePage ? colors.primary : colors.border}`,
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: 13,
                                cursor: 'pointer',
                                fontWeight: page === effectivePage ? 700 : 400,
                            }}
                        >
                            {page}
                        </button>
                    ))}

                    {/* 다음 페이지 버튼 */}
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={effectivePage === totalPages} // 마지막 페이지면 비활성화
                        style={{
                            background: 'none',
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 13,
                            cursor: effectivePage === totalPages ? 'not-allowed' : 'pointer',
                            color: effectivePage === totalPages ? colors.muted : colors.text,
                        }}
                    >
                        다음 ›
                    </button>
                </div>
            )}


            {/* ══════════════════════════════════════
                즐겨찾기 패널 — showFavorites=true 일 때 오버레이로 표시
                ══════════════════════════════════════ */}
            {showFavorites && (
                // 반투명 어두운 배경 오버레이 — 클릭하면 패널 닫힘
                <div
                    onClick={() => setShowFavorites(false)}
                    style={{
                        position: 'fixed',      // 화면 전체를 덮음
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.4)', // 40% 투명도 검정
                        zIndex: 100,            // 다른 요소 위에 표시
                        display: 'flex',
                        justifyContent: 'flex-end', // 패널을 오른쪽에 배치
                    }}
                >
                    {/* 패널 본체 — 오버레이 클릭 이벤트가 패널까지 전파되지 않도록 차단 */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: colors.card,
                            width: 360,         // 패널 너비
                            maxWidth: '90vw',   // 작은 화면에서 90%로 제한
                            height: '100%',
                            overflowY: 'auto',  // 내용이 길면 스크롤
                            padding: 20,
                            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', // 왼쪽 그림자
                        }}
                    >
                        {/* 패널 헤더 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>
                                ★ 즐겨찾기 루틴
                            </h3>
                            {/* 닫기 버튼 */}
                            <button
                                onClick={() => setShowFavorites(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: 20,
                                    cursor: 'pointer',
                                    color: colors.muted,
                                    lineHeight: 1,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 설명 텍스트 */}
                        <p style={{ fontSize: 12, color: colors.sub, marginBottom: 16 }}>
                            ★ 버튼으로 저장한 운동 루틴입니다.<br />
                            자주 하는 운동을 즐겨찾기해 빠르게 참고하세요.
                        </p>

                        {/* 즐겨찾기 로드 중 */}
                        {loadingFavorites && (
                            <div style={{ textAlign: 'center', color: colors.sub, padding: 24 }}>
                                불러오는 중...
                            </div>
                        )}

                        {/* 즐겨찾기 없음 */}
                        {!loadingFavorites && favorites.length === 0 && (
                            <div style={{ textAlign: 'center', color: colors.sub, padding: 24 }}>
                                즐겨찾기한 루틴이 없습니다.<br />
                                카드의 ☆ 버튼을 눌러 저장해보세요!
                            </div>
                        )}

                        {/* 즐겨찾기 세션 카드 목록 */}
                        {!loadingFavorites && favorites.map(session => {
                            // 종목 이름 목록 (중복 제거, 작성 순서 유지)
                            const names = [...new Set(session.sets.map(s => s.exercise_name))];
                            return (
                                <div
                                    key={session.id}
                                    style={{
                                        background: colors.bg,
                                        border: `1px solid ${colors.border}`,
                                        borderLeft: '4px solid #F59E0B', // 즐겨찾기 금색 강조선
                                        borderRadius: 8,
                                        padding: '12px 14px',
                                        marginBottom: 10,
                                    }}
                                >
                                    {/* 카드 상단: 날짜 + 불러오기 버튼 */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        {/* 날짜 */}
                                        <div style={{ fontSize: 11, color: colors.muted }}>
                                            {session.session_date}
                                        </div>

                                        {/* 불러오기 버튼 — 클릭하면 이 루틴의 종목·세트를 새 세션 폼에 복사 */}
                                        <button
                                            onClick={() => handleLoadRoutine(session)}
                                            style={{
                                                background: '#F59E0B',    // 금색 배경 — 즐겨찾기와 같은 계열
                                                color: '#fff',            // 흰 글씨
                                                border: 'none',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            불러오기
                                        </button>
                                    </div>

                                    {/* 제목 */}
                                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 6 }}>
                                        {session.title || '운동 기록'}
                                    </div>

                                    {/* 종목 태그 */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {names.map(name => (
                                            <span
                                                key={name}
                                                style={{
                                                    background: colors.primaryLight,
                                                    color: colors.primary,
                                                    borderRadius: 20,
                                                    padding: '2px 8px',
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {name}
                                            </span>
                                        ))}
                                    </div>

                                    {/* 세트 수 요약 — 이 루틴에 몇 세트가 포함되어 있는지 미리보기 */}
                                    <div style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
                                        {/* 종목 수, 세트 수를 간단히 요약해 루틴 규모를 확인할 수 있도록 함 */}
                                        {names.length}종목 · 총 {session.sets.length}세트
                                    </div>
                                </div>
                            );
                        })}

                    </div>
                </div>
            )}

        </div>
    );
}

export default WorkoutPage;
