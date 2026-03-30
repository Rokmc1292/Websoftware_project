// SessionCard.jsx — 저장된 운동 세션 하나를 카드 형태로 표시하는 컴포넌트
//
// 역할:
//   - 운동 날짜·제목·소요시간·종목 요약을 카드 UI로 표시
//   - "AI 분석받기" 버튼 → 부모(WorkoutPage)의 handleAnalyzeSession 호출
//   - AI 분석 결과(ai_feedback)가 있으면 분석 박스 표시
//   - "삭제" 버튼 → 부모의 handleDeleteSession 호출
//
// Props (부모 컴포넌트에서 받는 값):
//   session     : 표시할 세션 데이터 객체
//   onDelete    : 삭제 버튼 클릭 시 호출할 콜백 함수 (sessionId를 인자로 전달)
//   onAnalyze   : AI 분석 버튼 클릭 시 호출할 콜백 함수 (sessionId를 인자로 전달)
//   isAnalyzing : 이 세션이 현재 AI 분석 중인지 여부 (true이면 버튼에 로딩 표시)

// 공통 색상 상수
import { colors } from '../../styles/colors.js';


// SessionCard 컴포넌트 — Props를 구조 분해로 추출
function SessionCard({ session, onDelete, onAnalyze, isAnalyzing }) {

    // ─────────────────────────────────────────────
    // 날짜 포맷 변환 함수
    // ─────────────────────────────────────────────

    // formatDate : "2024-06-01" 형식의 날짜 문자열을 "2024년 6월 1일 (토)" 형식으로 변환
    // dateStr : 변환할 날짜 문자열
    const formatDate = (dateStr) => {
        // new Date(dateStr) : 문자열을 Date 객체로 변환
        const d = new Date(dateStr);

        // toLocaleDateString() : 현재 로케일(언어·지역)에 맞는 날짜 문자열 반환
        // 'ko-KR' : 한국어 형식
        // options : 표시할 날짜 구성 요소 지정
        return d.toLocaleDateString('ko-KR', {
            year: 'numeric',   // 연도 (예: 2024)
            month: 'long',     // 월 전체 이름 (예: 6월)
            day: 'numeric',    // 일 (예: 1일)
            weekday: 'short',  // 요일 약어 (예: 토)
        });
    };


    // ─────────────────────────────────────────────
    // 종목 요약 텍스트 생성
    // ─────────────────────────────────────────────

    // 세션에 포함된 종목 이름 목록 추출 (중복 제거)
    // session.sets : 세션에 속한 모든 세트 배열
    // map(s => s.exercise_name) : 각 세트에서 종목 이름만 추출
    // Set() : 중복 값을 자동으로 제거하는 JavaScript 자료구조
    // [...] : Set을 다시 배열로 변환
    const exerciseNames = [...new Set(session.sets.map(s => s.exercise_name))];

    // 총 볼륨(총 중량) 계산
    // 볼륨 = 모든 세트의 (중량 × 횟수) 합산
    // reduce() : 배열의 모든 요소를 하나의 값으로 합산
    // acc : 누적값 (초기값 0)
    // s : 현재 세트 객체
    const totalVolume = session.sets.reduce((acc, s) => {
        // s.weight_kg와 s.reps가 모두 있을 때만 볼륨에 포함
        if (s.weight_kg && s.reps) {
            return acc + (s.weight_kg * s.reps); // 중량 × 횟수 누적
        }
        return acc; // 맨몸 운동은 볼륨 계산에서 제외
    }, 0); // 초기 누적값 0


    // ─────────────────────────────────────────────
    // JSX 렌더링
    // ─────────────────────────────────────────────

    return (
        // 카드 전체 컨테이너
        <div
            style={{
                background: colors.card,             // 흰 카드 배경
                border: `1px solid ${colors.border}`, // 연한 회색 테두리
                borderRadius: 12,                    // 모서리 둥글게
                padding: 20,                         // 안쪽 여백
                // 마우스 호버 시 그림자 효과는 CSS 파일에서 처리 (인라인 스타일 한계)
            }}
        >

            {/* ── 카드 헤더 — 날짜·제목·삭제 버튼 ── */}
            <div
                style={{
                    display: 'flex',       // 날짜 영역과 삭제 버튼을 가로로 배치
                    justifyContent: 'space-between', // 양 끝에 배치
                    alignItems: 'flex-start',  // 세로 위쪽 정렬
                    marginBottom: 12,
                }}
            >
                {/* 날짜 + 제목 영역 */}
                <div>
                    {/* 운동 날짜 — 한국어 형식으로 표시 */}
                    <div
                        style={{
                            fontSize: 13,
                            color: colors.sub,   // 보조 색상 (회색)
                            marginBottom: 2,
                        }}
                    >
                        {formatDate(session.session_date)}
                    </div>

                    {/* 세션 제목 — 없으면 기본 텍스트 표시 */}
                    <h3
                        style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 700,
                            color: colors.text,
                        }}
                    >
                        {/* session.title이 있으면 제목, 없으면 "운동 기록" */}
                        {session.title || '운동 기록'}
                    </h3>
                </div>

                {/* 삭제 버튼 */}
                <button
                    onClick={() => onDelete(session.id)}  // 클릭 시 부모의 onDelete에 세션 ID 전달
                    style={{
                        background: 'none',   // 배경 없음
                        border: 'none',
                        color: colors.muted,  // 흐린 회색
                        cursor: 'pointer',
                        fontSize: 13,
                        padding: '2px 6px',
                    }}
                    title="이 운동 기록 삭제" // 마우스 호버 시 툴팁
                >
                    삭제
                </button>
            </div>


            {/* ── 통계 요약 행 — 소요시간·종목수·총볼륨 ── */}
            <div
                style={{
                    display: 'flex',
                    gap: 16,              // 요소 사이 간격
                    marginBottom: 12,
                    flexWrap: 'wrap',    // 화면이 좁으면 자동 줄바꿈
                }}
            >
                {/* 소요시간 — session.duration_min이 있을 때만 표시 */}
                {session.duration_min && (
                    <div style={{ fontSize: 13, color: colors.sub }}>
                        {/* ⏱ : 시계 이모지 */}
                        ⏱ {session.duration_min}분
                    </div>
                )}

                {/* 종목 수 */}
                <div style={{ fontSize: 13, color: colors.sub }}>
                    🏋️ {exerciseNames.length}종목  {/* exerciseNames의 길이 = 종목 수 */}
                </div>

                {/* 총 볼륨 — 볼륨이 0보다 클 때만 표시 */}
                {totalVolume > 0 && (
                    <div style={{ fontSize: 13, color: colors.sub }}>
                        {/* toLocaleString() : 숫자에 쉼표를 넣어 읽기 쉽게 변환 (예: 1500 → 1,500) */}
                        📊 총 볼륨 {totalVolume.toLocaleString()}kg
                    </div>
                )}
            </div>


            {/* ── 종목 태그 목록 ── */}
            {/* 종목이 하나 이상 있을 때만 표시 */}
            {exerciseNames.length > 0 && (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap', // 많은 종목도 자동 줄바꿈
                        gap: 6,
                        marginBottom: 14,
                    }}
                >
                    {/* 각 종목 이름을 작은 태그로 표시 */}
                    {exerciseNames.map(name => (
                        <span
                            key={name}  // 종목 이름을 고유 키로 사용
                            style={{
                                background: colors.primaryLight, // 연한 파랑 배경
                                color: colors.primary,           // 파랑 글씨
                                borderRadius: 20,                // 완전히 둥근 pill 모양
                                padding: '3px 10px',
                                fontSize: 12,
                                fontWeight: 500,
                            }}
                        >
                            {name}
                        </span>
                    ))}
                </div>
            )}


            {/* ── 세트 상세 테이블 ── */}
            {/* 세트 데이터가 있을 때만 표시 */}
            {session.sets.length > 0 && (
                <div
                    style={{
                        background: colors.bg,               // 연한 회색 배경
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 14,
                    }}
                >
                    {/* 종목별로 세트를 묶어 표시 */}
                    {exerciseNames.map(name => {
                        // 이 종목의 세트만 필터링
                        const exSets = session.sets.filter(s => s.exercise_name === name);

                        return (
                            <div key={name} style={{ marginBottom: 8 }}>
                                {/* 종목 이름 */}
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: colors.text,
                                        marginBottom: 4,
                                    }}
                                >
                                    {name}
                                </div>

                                {/* 세트 목록 — 가로로 나열 */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {exSets.map(s => (
                                        <span
                                            key={s.id}  // 세트 ID를 고유 키로 사용
                                            style={{
                                                fontSize: 12,
                                                color: colors.sub,
                                                background: '#fff',          // 흰 배경
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: 4,
                                                padding: '2px 8px',
                                            }}
                                        >
                                            {/* 세트 번호와 내용 표시 */}
                                            {s.set_number}세트
                                            {/* 중량과 횟수가 모두 있으면 "60kg × 10회" 형식 */}
                                            {s.weight_kg && s.reps && ` ${s.weight_kg}kg×${s.reps}회`}
                                            {/* 횟수만 있으면 "10회(맨몸)" 형식 */}
                                            {!s.weight_kg && s.reps && ` ${s.reps}회(맨몸)`}
                                            {/* 시간 기반 운동 */}
                                            {s.duration_sec && ` ${s.duration_sec}초`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {/* ── AI 분석 영역 ── */}

            {/* AI 분석 결과가 이미 있는 경우 — 결과 박스 표시 */}
            {session.ai_feedback && (
                <div
                    style={{
                        background: colors.aiTagLight,  // 연한 보라 배경
                        border: `1px solid #DDD6FE`,    // 연한 보라 테두리
                        borderRadius: 8,
                        padding: '12px 14px',
                        marginBottom: 10,
                    }}
                >
                    {/* AI 코치 레이블 */}
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: colors.aiTag,   // 보라 글씨
                            marginBottom: 6,
                            letterSpacing: 0.5,    // 글자 간격 살짝 넓힘
                        }}
                    >
                        ✦ AI 코치 분석
                    </div>

                    {/* AI 분석 텍스트 — 줄바꿈('\n')을 HTML 줄바꿈으로 변환 */}
                    {/* split('\n') : '\n' 기준으로 텍스트를 줄 배열로 분리 */}
                    {/* map으로 각 줄을 <p> 태그로 변환 */}
                    <div style={{ fontSize: 13, color: '#4C1D95', lineHeight: 1.7 }}>
                        {session.ai_feedback.split('\n').map((line, idx) => (
                            <p key={idx} style={{ margin: '0 0 4px' }}>
                                {line || '\u00A0'} {/* 빈 줄은 공백 문자(\u00A0)로 채워 높이 유지 */}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* AI 분석 버튼 — 분석 결과가 없을 때 또는 재분석을 위해 항상 표시 */}
            <button
                onClick={() => onAnalyze(session.id)}  // 클릭 시 부모의 onAnalyze에 세션 ID 전달
                disabled={isAnalyzing}                  // 분석 중이면 버튼 비활성화
                style={{
                    background: isAnalyzing ? colors.border : colors.aiTagLight,  // 분석 중이면 회색
                    color: isAnalyzing ? colors.sub : colors.aiTag,               // 분석 중이면 회색 글씨
                    border: `1px solid ${isAnalyzing ? colors.border : '#DDD6FE'}`,
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                    width: '100%',
                }}
            >
                {/* 분석 중이면 로딩 텍스트, 결과가 있으면 "재분석", 없으면 "AI 분석받기" */}
                {isAnalyzing
                    ? '✦ AI 분석 중...'
                    : session.ai_feedback
                        ? '✦ AI 재분석받기'
                        : '✦ AI 분석받기'}
            </button>

        </div>
    );
}

export default SessionCard; // WorkoutPage.jsx에서 import해 사용
