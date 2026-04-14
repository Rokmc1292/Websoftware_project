// SessionCard.jsx — 저장된 운동 세션 하나를 카드 형태로 표시하는 컴포넌트
//
// 역할:
//   - 기본 상태: 접힌(collapsed) 카드 — 날짜·제목·종목 태그·통계 요약만 표시
//   - 헤더 클릭 시: 펼쳐져(expanded) 세트 상세·AI 분석 결과·버튼 표시
//   - ★/☆ 즐겨찾기 버튼 → 부모의 onToggleFavorite 호출
//   - ✏️ 수정 버튼 → 부모의 onEdit 호출
//   - 🗑 삭제 버튼 → 부모의 onDelete 호출
//   - "AI 분석받기" 버튼 → 부모의 onAnalyze 호출
//   - 펼친 상태에서 각 세트 옆에 개인 최고 기록 대비 +/- 표시
//
// Props:
//   session          : 표시할 세션 데이터 객체
//   onDelete         : 삭제 콜백 (sessionId)
//   onAnalyze        : AI 분석 콜백 (sessionId)
//   isAnalyzing      : 이 세션이 현재 AI 분석 중인지 여부
//   onEdit           : 수정 버튼 클릭 시 콜백 (session 객체 전달)
//   onToggleFavorite : 즐겨찾기 토글 콜백 (sessionId)
//   bestMap          : 종목별 개인 최고 기록 맵 — { "벤치프레스": { best_weight_kg: 100, best_reps: 12 }, ... }

// useState  : 접힘/펼침 상태를 관리하기 위해 임포트
// useEffect : 카드가 펼쳐질 때 개인 최고 기록을 조회하기 위해 임포트
import { useState, useEffect } from 'react';

// 공통 색상 상수
import { colors } from '../../styles/colors.js';

// getExerciseBest : GET /api/workout/exercises/:name/best — 종목별 개인 최고 기록 조회
import { getExerciseBest } from '../../api/workoutApi.js';


// SessionCard 컴포넌트 — Props 구조 분해
function SessionCard({ session, onDelete, onAnalyze, isAnalyzing, onEdit, onToggleFavorite }) {

    // ─────────────────────────────────────────────
    // 상태(State) 선언
    // ─────────────────────────────────────────────

    // collapsed : 카드가 접혀있는지 여부 (초기값 true — 기본 접힘)
    const [collapsed, setCollapsed] = useState(true);

    // bestMap : 이 세션에 포함된 종목들의 개인 최고 기록 캐시
    // { "벤치프레스": { best_weight_kg: 100, best_reps: 12 }, ... }
    // 한 번 조회하면 재조회 없이 재사용 (카드 접었다 펼쳐도 유지됨)
    const [bestMap, setBestMap] = useState({});


    // ─────────────────────────────────────────────
    // 카드 펼칠 때 개인 최고 기록 로드
    // ─────────────────────────────────────────────

    useEffect(() => {
        // 접혀있거나 세트가 없으면 조회 불필요
        if (collapsed || session.sets.length === 0) return;

        // 이 세션에 포함된 종목 이름 목록 (중복 제거)
        const names = [...new Set(session.sets.map(s => s.exercise_name))];

        // 아직 최고 기록을 조회하지 않은 종목만 새로 조회 (이미 있으면 재사용)
        const unknownNames = names.filter(n => !(n in bestMap));
        if (unknownNames.length === 0) return; // 모두 캐시에 있으면 재조회 불필요

        // 모든 미조회 종목을 병렬로 요청 — Promise.all()로 동시에 여러 API 호출
        const fetchBests = async () => {
            const results = await Promise.all(
                unknownNames.map(async (name) => {
                    try {
                        const data = await getExerciseBest(name);
                        return { name, best: data }; // { name, best_weight_kg, best_reps }
                    } catch {
                        return { name, best: null }; // 오류 시 null로 처리
                    }
                })
            );

            // 새로 조회한 결과를 bestMap에 추가
            setBestMap(prev => {
                const updated = { ...prev };
                results.forEach(({ name, best }) => {
                    // best : { exercise_name, best_weight_kg, best_reps }
                    updated[name] = best;
                });
                return updated;
            });
        };

        fetchBests();
    }, [collapsed]); // collapsed 상태가 바뀔 때마다 실행 (false → 펼쳐질 때 조회)


    // ─────────────────────────────────────────────
    // 날짜 포맷 변환 함수
    // ─────────────────────────────────────────────

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
        });
    };


    // ─────────────────────────────────────────────
    // 종목 요약 + 볼륨 계산
    // ─────────────────────────────────────────────

    // 세션에 포함된 종목 이름 목록 (중복 제거, 작성 순서 유지)
    const exerciseNames = [...new Set(session.sets.map(s => s.exercise_name))];

    // 총 볼륨 = 모든 세트의 (중량 × 횟수) 합산
    const totalVolume = session.sets.reduce((acc, s) => {
        if (s.weight_kg > 0 && s.reps) return acc + (s.weight_kg * s.reps);
        return acc;
    }, 0);


    // ─────────────────────────────────────────────
    // 개인 최고 기록 대비 차이 계산 유틸리티
    // ─────────────────────────────────────────────

    // getDiff : 이 세트의 중량/횟수가 개인 최고 기록보다 얼마나 높은지 계산
    // exerciseName : 종목 이름
    // weight       : 이 세트의 중량 (kg)
    // reps         : 이 세트의 횟수
    // 반환값 : null(조회 전·최고기록 없음) | { weightDiff, repsDiff } (숫자, 양수=초과, 음수=미달)
    const getDiff = (exerciseName, weight, reps) => {
        const best = bestMap[exerciseName];
        if (!best) return null; // 아직 로드되지 않았거나 기록 없음

        const weightDiff = (weight > 0 && best.best_weight_kg != null)
            ? parseFloat((weight - best.best_weight_kg).toFixed(2))
            : null;

        const repsDiff = (reps != null && best.best_reps != null)
            ? reps - best.best_reps
            : null;

        return { weightDiff, repsDiff };
    };

    // renderDiffBadge : 차이값을 색깔 있는 배지로 렌더링
    // diff  : 숫자 (양수: 최고 초과, 0: 타이, 음수: 미달)
    // unit  : 단위 문자열 (예: 'kg', '회')
    const renderDiffBadge = (diff, unit) => {
        if (diff === null || diff === undefined) return null;

        // 최고 기록과 동일하면 뱃지 숨김 (=는 당연하므로 표시 불필요)
        if (diff === 0) return null;

        const isUp = diff > 0; // 최고 기록 초과 여부
        return (
            <span
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isUp ? '#16A34A' : '#DC2626', // 초과: 초록, 미달: 빨강
                    background: isUp ? '#DCFCE7' : '#FEE2E2', // 초과: 연초록, 미달: 연빨강
                    borderRadius: 4,
                    padding: '1px 4px',
                    marginLeft: 4,
                }}
            >
                {/* 양수: "+5kg", 음수: "-5kg" */}
                {isUp ? '+' : ''}{diff}{unit}
            </span>
        );
    };


    // ─────────────────────────────────────────────
    // 이벤트 핸들러
    // ─────────────────────────────────────────────

    // handleToggle : 카드 헤더 클릭 — 접힘/펼침 전환
    const handleToggle = () => setCollapsed(prev => !prev);

    // handleDeleteClick : 삭제 버튼 — 이벤트 버블링 차단 후 부모 콜백
    const handleDeleteClick = (e) => {
        e.stopPropagation(); // 헤더 클릭으로 오해되지 않도록 버블링 차단
        onDelete(session.id);
    };

    // handleAnalyzeClick : AI 분석 버튼 — 이벤트 버블링 차단 후 부모 콜백
    const handleAnalyzeClick = (e) => {
        e.stopPropagation();
        onAnalyze(session.id);
    };

    // handleEditClick : 수정 버튼 — 이벤트 버블링 차단 후 부모 콜백 (session 전체 전달)
    const handleEditClick = (e) => {
        e.stopPropagation();
        onEdit && onEdit(session);
    };

    // handleFavoriteClick : 즐겨찾기 토글 — 이벤트 버블링 차단 후 부모 콜백
    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        onToggleFavorite && onToggleFavorite(session.id);
    };


    // ─────────────────────────────────────────────
    // JSX 렌더링
    // ─────────────────────────────────────────────

    return (
        // 카드 전체 컨테이너
        <div
            style={{
                background: colors.card,
                // 즐겨찾기된 카드는 왼쪽 테두리에 금색 강조선 추가
                border: session.is_favorite
                    ? `1px solid #F59E0B`
                    : `1px solid ${colors.border}`,
                borderLeft: session.is_favorite ? '4px solid #F59E0B' : undefined,
                borderRadius: 12,
                overflow: 'hidden',
            }}
        >

            {/* ════════════════════════════════════
                카드 헤더 — 항상 표시
                ════════════════════════════════════ */}
            <div
                onClick={handleToggle}
                style={{
                    padding: 16,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: collapsed ? 'none' : `1px solid ${colors.border}`,
                }}
            >

                {/* 헤더 1행 — 날짜·버튼 영역 */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                    }}
                >
                    {/* 운동 날짜 */}
                    <span style={{ fontSize: 12, color: colors.sub }}>
                        {formatDate(session.session_date)}
                    </span>

                    {/* 오른쪽 버튼 영역 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

                        {/* AI 분석 완료 뱃지 */}
                        {session.ai_feedback && (
                            <span
                                style={{
                                    fontSize: 10,
                                    color: colors.aiTag,
                                    background: colors.aiTagLight,
                                    borderRadius: 4,
                                    padding: '1px 5px',
                                    fontWeight: 600,
                                }}
                            >
                                ✦ AI
                            </span>
                        )}

                        {/* 즐겨찾기 버튼 — ★(저장됨) / ☆(저장안됨) */}
                        <button
                            onClick={handleFavoriteClick}
                            style={{
                                background: 'none',
                                border: 'none',
                                // 즐겨찾기 상태: 금색 / 미저장: 흐린 회색
                                color: session.is_favorite ? '#F59E0B' : colors.muted,
                                cursor: 'pointer',
                                fontSize: 16,
                                padding: '2px 4px',
                                lineHeight: 1,
                            }}
                            title={session.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 저장'}
                        >
                            {session.is_favorite ? '★' : '☆'}
                        </button>

                        {/* 수정 버튼 */}
                        <button
                            onClick={handleEditClick}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: colors.muted,
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '2px 4px',
                            }}
                            title="이 운동 기록 수정"
                        >
                            수정
                        </button>

                        {/* 삭제 버튼 */}
                        <button
                            onClick={handleDeleteClick}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: colors.muted,
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '2px 4px',
                            }}
                            title="이 운동 기록 삭제"
                        >
                            삭제
                        </button>

                        {/* 접힘/펼침 화살표 */}
                        <span style={{ fontSize: 11, color: colors.muted, display: 'inline-block' }}>
                            {collapsed ? '▼' : '▲'}
                        </span>

                    </div>
                </div>

                {/* 헤더 2행 — 세션 제목 */}
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: colors.text }}>
                    {session.title || '운동 기록'}
                </h3>

                {/* 헤더 3행 — 통계 요약 (항상 표시) */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {session.duration_min ? (
                        <span style={{ fontSize: 12, color: colors.sub }}>⏱ {session.duration_min}분</span>
                    ) : null}
                    <span style={{ fontSize: 12, color: colors.sub }}>🏋️ {exerciseNames.length}종목</span>
                    {totalVolume > 0 ? (
                        <span style={{ fontSize: 12, color: colors.sub }}>
                            📊 총 볼륨 {totalVolume.toLocaleString()}kg
                        </span>
                    ) : null}
                </div>

                {/* 종목 태그 — 항상 표시 */}
                {exerciseNames.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                        {exerciseNames.map(name => (
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
                )}

            </div>
            {/* 헤더 끝 */}


            {/* ════════════════════════════════════
                상세 내용 — collapsed=false 일 때만 렌더링
                ════════════════════════════════════ */}
            {!collapsed && (
                <div style={{ padding: 16 }}>

                    {/* ── 세트 상세 테이블 ── */}
                    {session.sets.length > 0 && (
                        <div
                            style={{
                                background: colors.bg,
                                borderRadius: 8,
                                padding: '10px 14px',
                                marginBottom: 14,
                            }}
                        >
                            {/* 종목별로 세트 묶어 표시 */}
                            {exerciseNames.map(name => {
                                const exSets = session.sets.filter(s => s.exercise_name === name);
                                // 이 종목의 개인 최고 기록
                                const best = bestMap[name];

                                return (
                                    <div key={name} style={{ marginBottom: 10 }}>
                                        {/* 종목 이름 + 개인 최고 기록 표시 */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'baseline',
                                                gap: 8,
                                                marginBottom: 4,
                                            }}
                                        >
                                            <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>
                                                {name}
                                            </span>

                                            {/* 개인 최고 기록 요약 — best_weight_kg 또는 best_reps가 있을 때 */}
                                            {best && (best.best_weight_kg != null || best.best_reps != null) && (
                                                <span style={{ fontSize: 10, color: colors.muted }}>
                                                    PB:
                                                    {best.best_weight_kg != null ? ` ${best.best_weight_kg}kg` : ''}
                                                    {best.best_reps != null ? ` ${best.best_reps}회` : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* 세트 목록 — 가로로 나열 */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {exSets.map(s => {
                                                // 이 세트와 최고 기록의 차이 계산
                                                const diff = getDiff(name, s.weight_kg, s.reps);

                                                return (
                                                    <span
                                                        key={s.id}
                                                        style={{
                                                            fontSize: 12,
                                                            color: colors.sub,
                                                            background: '#fff',
                                                            border: `1px solid ${colors.border}`,
                                                            borderRadius: 4,
                                                            padding: '2px 8px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                        }}
                                                    >
                                                        {/* 세트 번호 */}
                                                        {s.set_number}세트
                                                        {/* 중량 > 0이고 횟수가 있으면 "60kg×10회" */}
                                                        {s.weight_kg > 0 && s.reps ? ` ${s.weight_kg}kg×${s.reps}회` : null}
                                                        {/* 맨몸 운동 */}
                                                        {!(s.weight_kg > 0) && s.reps ? ` ${s.reps}회(맨몸)` : null}
                                                        {/* 시간 기반 운동 */}
                                                        {s.duration_sec ? ` ${s.duration_sec}초` : null}

                                                        {/* 개인 최고 기록 대비 중량 차이 뱃지 */}
                                                        {diff && renderDiffBadge(diff.weightDiff, 'kg')}
                                                        {/* 개인 최고 기록 대비 횟수 차이 뱃지 (중량 없는 경우만) */}
                                                        {diff && !(s.weight_kg > 0) && renderDiffBadge(diff.repsDiff, '회')}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 메모 */}
                    {session.memo && (
                        <div
                            style={{
                                fontSize: 13,
                                color: colors.sub,
                                background: colors.bg,
                                borderRadius: 8,
                                padding: '8px 12px',
                                marginBottom: 14,
                                lineHeight: 1.6,
                            }}
                        >
                            📝 {session.memo}
                        </div>
                    )}


                    {/* ── AI 분석 영역 ── */}

                    {/* AI 분석 결과 */}
                    {session.ai_feedback && (
                        <div
                            style={{
                                background: colors.aiTagLight,
                                border: `1px solid #DDD6FE`,
                                borderRadius: 8,
                                padding: '12px 14px',
                                marginBottom: 10,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: colors.aiTag,
                                    marginBottom: 6,
                                    letterSpacing: 0.5,
                                }}
                            >
                                ✦ AI 코치 분석
                            </div>
                            <div style={{ fontSize: 13, color: '#4C1D95', lineHeight: 1.7 }}>
                                {session.ai_feedback.split('\n').map((line, idx) => (
                                    <p key={idx} style={{ margin: '0 0 4px' }}>
                                        {line || '\u00A0'}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI 분석 버튼 */}
                    <button
                        onClick={handleAnalyzeClick}
                        disabled={isAnalyzing}
                        style={{
                            background: isAnalyzing ? colors.border : colors.aiTagLight,
                            color: isAnalyzing ? colors.sub : colors.aiTag,
                            border: `1px solid ${isAnalyzing ? colors.border : '#DDD6FE'}`,
                            borderRadius: 8,
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                            width: '100%',
                        }}
                    >
                        {isAnalyzing
                            ? '✦ AI 분석 중...'
                            : session.ai_feedback
                                ? '✦ AI 재분석받기'
                                : '✦ AI 분석받기'}
                    </button>

                </div>
            )}

        </div>
    );
}

export default SessionCard;
