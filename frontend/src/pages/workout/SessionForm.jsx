// SessionForm.jsx — 새 운동 기록 입력 및 기존 기록 수정 폼 컴포넌트
//
// 역할:
//   - 운동 날짜·제목·소요시간·메모 입력 필드 제공
//   - 종목별 세트 추가 / 삭제, 운동 부위(muscle_group) 선택
//   - 종목 이름 자동완성 (이전에 기록한 종목 목록 제공)
//   - 새 세션 저장 (createSession) 또는 기존 세션 수정 (updateSession)
//
// Props:
//   onSessionCreated  : 새 세션 저장 완료 후 부모에게 세션 객체를 전달하는 콜백
//   editSession       : 수정할 세션 객체 (없으면 새 세션 입력 모드)
//   onSessionUpdated  : 세션 수정 완료 후 부모에게 업데이트된 세션 객체를 전달하는 콜백
//   onCancelEdit      : 수정 취소 버튼 클릭 시 부모에게 취소를 알리는 콜백

// useState   : 폼 입력값과 UI 상태를 관리하는 React 훅
// useEffect  : 컴포넌트 마운트 시 / 특정 값 변경 시 코드를 실행하는 React 훅
import { useState, useEffect } from 'react';

// 공통 색상 상수
import { colors } from '../../styles/colors.js';

// createSession  : POST /api/workout/sessions — 새 세션 저장
// updateSession  : PUT  /api/workout/sessions/:id — 기존 세션 수정
// getExercises   : GET  /api/workout/exercises — 자동완성용 종목 이름 목록 조회
import { createSession, updateSession, getExercises } from '../../api/workoutApi.js';


// 운동 부위 선택지 — 드롭다운에 표시될 목록
// 빈 문자열('') : 선택 안 함 (nullable)
const MUSCLE_GROUPS = ['', '가슴', '등', '하체', '어깨', '팔', '코어', '유산소', '기타'];


// SessionForm 컴포넌트
// editSession / onSessionUpdated / onCancelEdit 은 선택 props (없으면 새 세션 모드)
function SessionForm({ onSessionCreated, editSession = null, onSessionUpdated, onCancelEdit }) {

    // ─────────────────────────────────────────────
    // 오늘 날짜를 YYYY-MM-DD 형식으로 만들기
    // ─────────────────────────────────────────────

    // new Date().toISOString().slice(0, 10) → "2024-06-01"
    const today = new Date().toISOString().slice(0, 10);

    // isEditMode : 수정 모드인지 여부 — editSession prop이 있으면 수정 모드
    const isEditMode = editSession !== null;


    // ─────────────────────────────────────────────
    // 상태(State) 선언
    // ─────────────────────────────────────────────

    // sessionDate : 운동 날짜 입력값
    const [sessionDate, setSessionDate] = useState(today);

    // title : 세션 제목 입력값
    const [title, setTitle] = useState('');

    // durationMin : 총 운동 시간(분) 입력값
    const [durationMin, setDurationMin] = useState('');

    // memo : 운동 메모 입력값
    const [memo, setMemo] = useState('');

    // exercises : 입력 중인 종목 목록
    // 각 종목: { name, muscle_group, sets: [{ weight_kg, reps }] }
    const [exercises, setExercises] = useState([
        { name: '', muscle_group: '', sets: [{ weight_kg: '', reps: '' }] }
    ]);

    // saving : 저장/수정 API 호출 중인지 여부
    const [saving, setSaving] = useState(false);

    // errorMsg : 저장 실패 시 표시할 오류 메시지
    const [errorMsg, setErrorMsg] = useState('');

    // exerciseNameList : 자동완성 목록 — 이전에 기록한 종목 이름들
    // <datalist>에 렌더링됨
    const [exerciseNameList, setExerciseNameList] = useState([]);


    // ─────────────────────────────────────────────
    // 마운트 시 자동완성 목록 로드
    // ─────────────────────────────────────────────

    useEffect(() => {
        // 컴포넌트가 처음 나타날 때 서버에서 종목 이름 목록을 가져옴
        const loadExercises = async () => {
            try {
                const data = await getExercises(); // GET /api/workout/exercises
                setExerciseNameList(data.exercises || []);
            } catch {
                // 실패해도 폼 동작에 영향 없음 — 자동완성만 안 뜸
            }
        };
        loadExercises();
    }, []); // 빈 배열 → 마운트 1회만 실행


    // ─────────────────────────────────────────────
    // 수정 모드: editSession prop 변경 시 폼 pre-fill
    // ─────────────────────────────────────────────

    useEffect(() => {
        if (!editSession) return; // 새 세션 모드면 실행 안 함

        // 세션 기본 정보 채우기
        setSessionDate(editSession.session_date || today);
        setTitle(editSession.title || '');
        setDurationMin(editSession.duration_min != null ? String(editSession.duration_min) : '');
        setMemo(editSession.memo || '');

        // 세트 목록을 종목별로 그룹핑
        // editSession.sets : 백엔드가 반환한 평평한(flat) 세트 배열
        // 예: [{exercise_name:'벤치', set_number:1, weight_kg:60, reps:10, muscle_group:'가슴'}, ...]
        if (editSession.sets && editSession.sets.length > 0) {
            // 종목 이름 목록 (중복 제거, 작성 순서 유지)
            const names = [...new Set(editSession.sets.map(s => s.exercise_name))];

            // 종목별로 세트를 묶어 exercises 형태로 변환
            const grouped = names.map(name => {
                // 이 종목의 세트만 필터링 (id 오름차순 = 작성 순서)
                const exSets = editSession.sets
                    .filter(s => s.exercise_name === name)
                    .map(s => ({
                        weight_kg: s.weight_kg != null ? String(s.weight_kg) : '',
                        reps: s.reps != null ? String(s.reps) : '',
                    }));

                return {
                    name,
                    // 첫 번째 세트의 muscle_group으로 종목 부위를 대표 (모든 세트 동일한 부위로 저장됨)
                    muscle_group: editSession.sets.find(s => s.exercise_name === name)?.muscle_group || '',
                    sets: exSets,
                };
            });

            setExercises(grouped);
        } else {
            // 세트가 없으면 빈 입력 칸 하나 준비
            setExercises([{ name: '', muscle_group: '', sets: [{ weight_kg: '', reps: '' }] }]);
        }
    }, [editSession]); // editSession이 바뀔 때마다 다시 실행


    // ─────────────────────────────────────────────
    // 종목(exercise) 관련 핸들러 함수
    // ─────────────────────────────────────────────

    // handleExerciseNameChange : 특정 종목의 이름을 수정
    const handleExerciseNameChange = (exIdx, value) => {
        const updated = exercises.map((ex, i) =>
            i === exIdx ? { ...ex, name: value } : ex
        );
        setExercises(updated);
    };

    // handleMuscleGroupChange : 특정 종목의 운동 부위를 수정
    const handleMuscleGroupChange = (exIdx, value) => {
        const updated = exercises.map((ex, i) =>
            i === exIdx ? { ...ex, muscle_group: value } : ex
        );
        setExercises(updated);
    };

    // handleSetChange : 특정 세트의 중량 또는 횟수를 수정
    // field : 'weight_kg' 또는 'reps'
    const handleSetChange = (exIdx, setIdx, field, value) => {
        const updated = exercises.map((ex, i) => {
            if (i !== exIdx) return ex;
            const updatedSets = ex.sets.map((s, j) =>
                j === setIdx ? { ...s, [field]: value } : s
            );
            return { ...ex, sets: updatedSets };
        });
        setExercises(updated);
    };

    // handleAddSet : 특정 종목에 새 세트를 추가
    const handleAddSet = (exIdx) => {
        const updated = exercises.map((ex, i) => {
            if (i !== exIdx) return ex;
            return { ...ex, sets: [...ex.sets, { weight_kg: '', reps: '' }] };
        });
        setExercises(updated);
    };

    // handleRemoveSet : 특정 세트를 삭제 (최소 1세트 유지)
    const handleRemoveSet = (exIdx, setIdx) => {
        const updated = exercises.map((ex, i) => {
            if (i !== exIdx) return ex;
            const filtered = ex.sets.filter((_, j) => j !== setIdx);
            if (filtered.length === 0) return ex; // 마지막 세트는 삭제 불가
            return { ...ex, sets: filtered };
        });
        setExercises(updated);
    };

    // handleAddExercise : 새 종목 추가
    const handleAddExercise = () => {
        setExercises([
            ...exercises,
            { name: '', muscle_group: '', sets: [{ weight_kg: '', reps: '' }] }
        ]);
    };

    // handleRemoveExercise : 특정 종목을 삭제 (최소 1종목 유지)
    const handleRemoveExercise = (exIdx) => {
        if (exercises.length === 1) return;
        setExercises(exercises.filter((_, i) => i !== exIdx));
    };


    // ─────────────────────────────────────────────
    // 폼 제출 핸들러
    // ─────────────────────────────────────────────

    const handleSubmit = async () => {
        setErrorMsg('');

        if (!sessionDate) {
            setErrorMsg('운동 날짜를 선택해주세요.');
            return;
        }

        try {
            setSaving(true);

            // exercises → API payload 형태로 변환
            const exercisesPayload = exercises
                .filter(ex => ex.name.trim() !== '') // 이름 없는 종목 제거
                .map(ex => ({
                    name: ex.name.trim(),
                    // muscle_group : 빈 문자열이면 undefined (서버로 전송 안 함)
                    muscle_group: ex.muscle_group || undefined,
                    sets: ex.sets
                        .filter(s => s.reps !== '' || s.weight_kg !== '') // 빈 세트 제거
                        .map(s => ({
                            weight_kg: s.weight_kg !== '' ? parseFloat(s.weight_kg) : undefined,
                            reps: s.reps !== '' ? parseInt(s.reps, 10) : undefined,
                        }))
                }));

            const payload = {
                session_date: sessionDate,
                title: title.trim() || undefined,
                duration_min: durationMin !== '' ? parseInt(durationMin, 10) : undefined,
                memo: memo.trim() || undefined,
                exercises: exercisesPayload,
            };

            if (isEditMode) {
                // 수정 모드 — PUT /api/workout/sessions/:id
                const data = await updateSession(editSession.id, payload);
                onSessionUpdated && onSessionUpdated(data.session);
            } else {
                // 새 세션 모드 — POST /api/workout/sessions
                const data = await createSession(payload);
                onSessionCreated && onSessionCreated(data.session);

                // 새 세션 저장 후 폼 초기화
                setTitle('');
                setDurationMin('');
                setMemo('');
                setSessionDate(today);
                setExercises([{ name: '', muscle_group: '', sets: [{ weight_kg: '', reps: '' }] }]);
            }

        } catch (error) {
            const msg = error.response?.data?.message || '저장 중 오류가 발생했습니다.';
            setErrorMsg(msg);
        } finally {
            setSaving(false);
        }
    };


    // ─────────────────────────────────────────────
    // 공통 입력 필드 스타일
    // ─────────────────────────────────────────────

    const inputStyle = {
        width: '100%',
        padding: '8px 10px',
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        fontSize: 13,
        color: colors.text,
        background: '#fff',
        boxSizing: 'border-box',
        outline: 'none',
    };

    // smallInputStyle : 세트 입력 필드(중량·횟수)용 — 그리드 셀을 꽉 채워 헤더와 정렬
    const smallInputStyle = {
        ...inputStyle,
        width: '100%',           // 그리드 셀 너비 꽉 채움
        textAlign: 'center',
        padding: '6px 4px',
        boxSizing: 'border-box',
    };


    // ─────────────────────────────────────────────
    // JSX 렌더링
    // ─────────────────────────────────────────────

    return (
        // 폼 전체 카드 컨테이너
        <div
            style={{
                background: colors.card,
                border: `1px solid ${isEditMode ? colors.primary : colors.border}`,
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
            }}
        >
            {/* 폼 제목 — 수정 모드이면 "운동 기록 수정" */}
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: colors.text }}>
                {isEditMode ? '✏️ 운동 기록 수정' : '새 운동 기록'}
            </h3>

            {/* ── 세션 기본 정보 입력 ── */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>

                {/* 날짜 */}
                <div style={{ flex: '1 1 140px' }}>
                    <label style={{ display: 'block', fontSize: 12, color: colors.sub, marginBottom: 4 }}>
                        날짜 *
                    </label>
                    <input
                        type="date"
                        value={sessionDate}
                        onChange={e => setSessionDate(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                {/* 세션 제목 */}
                <div style={{ flex: '2 1 200px' }}>
                    <label style={{ display: 'block', fontSize: 12, color: colors.sub, marginBottom: 4 }}>
                        세션 제목 (선택)
                    </label>
                    <input
                        type="text"
                        placeholder="예: 등·이두 데이, 풀바디"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                {/* 운동 시간(분) */}
                <div style={{ flex: '0 1 100px' }}>
                    <label style={{ display: 'block', fontSize: 12, color: colors.sub, marginBottom: 4 }}>
                        시간 (분)
                    </label>
                    <input
                        type="number"
                        placeholder="60"
                        min="0"
                        value={durationMin}
                        onChange={e => setDurationMin(e.target.value)}
                        style={inputStyle}
                    />
                </div>
            </div>

            {/* 메모 */}
            <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: colors.sub, marginBottom: 4 }}>
                    메모 (선택)
                </label>
                <textarea
                    placeholder="오늘 컨디션, 특이사항 등 자유롭게 입력"
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }}
                />
            </div>


            {/* ── 종목 입력 영역 ── */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 12 }}>
                    운동 종목
                </div>

                {/* 자동완성 데이터소스 — <input list="..."> 와 연결됨 */}
                {/* <datalist> : 브라우저 기본 자동완성 드롭다운을 제공 */}
                <datalist id="exercise-suggestions">
                    {exerciseNameList.map(name => (
                        // <option> : 자동완성 후보 항목 하나
                        <option key={name} value={name} />
                    ))}
                </datalist>

                {/* 종목 목록 반복 렌더링 */}
                {exercises.map((ex, exIdx) => (
                    <div
                        key={exIdx}
                        style={{
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 10,
                        }}
                    >
                        {/* 종목 이름 행 — 자동완성 입력 + 부위 드롭다운 + 삭제 버튼 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>

                            {/* 종목 이름 입력 — list 속성으로 위의 datalist에 연결 */}
                            <input
                                type="text"
                                list="exercise-suggestions"  // datalist id와 연결 → 자동완성 활성화
                                placeholder={`종목 ${exIdx + 1} (예: 벤치프레스)`}
                                value={ex.name}
                                onChange={e => handleExerciseNameChange(exIdx, e.target.value)}
                                style={{ ...inputStyle, flex: 1, fontWeight: 600 }}
                            />

                            {/* 운동 부위 드롭다운 */}
                            <select
                                value={ex.muscle_group}
                                onChange={e => handleMuscleGroupChange(exIdx, e.target.value)}
                                style={{
                                    ...inputStyle,
                                    width: 90,        // 좁은 고정 너비
                                    flex: '0 0 90px', // 크기 변동 없음
                                    padding: '8px 4px',
                                    color: ex.muscle_group ? colors.text : colors.muted, // 미선택 시 흐리게
                                }}
                                title="운동 부위 선택"
                            >
                                {/* MUSCLE_GROUPS 배열의 각 항목을 <option>으로 렌더링 */}
                                {MUSCLE_GROUPS.map(g => (
                                    <option key={g} value={g}>
                                        {g || '부위 선택'}  {/* 빈 문자열이면 "부위 선택" 표시 */}
                                    </option>
                                ))}
                            </select>

                            {/* 종목 삭제 버튼 — 2개 이상일 때만 표시 */}
                            {exercises.length > 1 && (
                                <button
                                    onClick={() => handleRemoveExercise(exIdx)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: colors.muted,
                                        cursor: 'pointer',
                                        fontSize: 18,
                                        lineHeight: 1,
                                        padding: '0 4px',
                                        flexShrink: 0,
                                    }}
                                    title="종목 삭제"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* 세트 헤더 — 컬럼 레이블 */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '40px 1fr 1fr 32px',
                                gap: 6,
                                marginBottom: 6,
                                fontSize: 11,
                                color: colors.muted,
                                fontWeight: 600,
                                textAlign: 'center',
                            }}
                        >
                            <span>세트</span>
                            <span>중량 (kg)</span>
                            <span>횟수 (회)</span>
                            <span />
                        </div>

                        {/* 세트 목록 */}
                        {ex.sets.map((s, setIdx) => (
                            <div
                                key={setIdx}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 1fr 1fr 32px',
                                    gap: 6,
                                    marginBottom: 4,
                                    alignItems: 'center',
                                }}
                            >
                                {/* 세트 번호 */}
                                <span style={{ textAlign: 'center', fontSize: 12, color: colors.sub, fontWeight: 600 }}>
                                    {setIdx + 1}
                                </span>

                                {/* 중량 입력 */}
                                <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    step="0.5"
                                    value={s.weight_kg}
                                    onChange={e => handleSetChange(exIdx, setIdx, 'weight_kg', e.target.value)}
                                    style={smallInputStyle}
                                />

                                {/* 횟수 입력 */}
                                <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={s.reps}
                                    onChange={e => handleSetChange(exIdx, setIdx, 'reps', e.target.value)}
                                    style={smallInputStyle}
                                />

                                {/* 세트 삭제 버튼 */}
                                {ex.sets.length > 1 ? (
                                    <button
                                        onClick={() => handleRemoveSet(exIdx, setIdx)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: colors.muted,
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            padding: 0,
                                        }}
                                    >
                                        ✕
                                    </button>
                                ) : (
                                    <span />
                                )}
                            </div>
                        ))}

                        {/* 세트 추가 버튼 */}
                        <button
                            onClick={() => handleAddSet(exIdx)}
                            style={{
                                background: 'none',
                                border: `1px dashed ${colors.border}`,
                                borderRadius: 6,
                                padding: '4px 12px',
                                fontSize: 12,
                                color: colors.sub,
                                cursor: 'pointer',
                                marginTop: 6,
                                width: '100%',
                            }}
                        >
                            + 세트 추가
                        </button>
                    </div>
                ))}

                {/* 종목 추가 버튼 */}
                <button
                    onClick={handleAddExercise}
                    style={{
                        background: colors.primaryLight,
                        color: colors.primary,
                        border: `1px solid ${colors.primary}`,
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                    }}
                >
                    + 종목 추가
                </button>
            </div>


            {/* ── 오류 메시지 ── */}
            {errorMsg && (
                <div style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>
                    {errorMsg}
                </div>
            )}


            {/* ── 저장/수정 버튼 영역 ── */}
            <div style={{ display: 'flex', gap: 8 }}>

                {/* 수정 취소 버튼 — 수정 모드일 때만 표시 */}
                {isEditMode && (
                    <button
                        onClick={onCancelEdit}  // 부모에게 취소 알림
                        style={{
                            background: colors.bg,
                            color: colors.sub,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            padding: '10px 20px',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            flex: '0 0 auto',
                        }}
                    >
                        취소
                    </button>
                )}

                {/* 저장/수정 버튼 */}
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    style={{
                        background: saving ? colors.border : colors.primary,
                        color: saving ? colors.sub : '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 24px',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        flex: 1,
                    }}
                >
                    {/* 저장 중: "저장 중..." / 수정모드: "✔ 수정 저장" / 새 세션: "💾 저장하기" */}
                    {saving ? '저장 중...' : isEditMode ? '✔ 수정 저장' : '💾 저장하기'}
                </button>
            </div>

        </div>
    );
}

export default SessionForm;
