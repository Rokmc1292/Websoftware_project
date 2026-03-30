// SessionForm.jsx — 새 운동 기록을 입력하는 폼 컴포넌트
//
// 역할:
//   - 운동 날짜·제목·소요시간·메모 입력 필드 제공
//   - 종목 추가 / 종목별 세트 추가 기능
//   - 저장 시 createSession() API 호출 → 부모(WorkoutPage)에 결과 전달
//
// Props (부모 컴포넌트에서 받는 값):
//   onSessionCreated : 저장 성공 후 부모에게 새 세션을 전달하는 콜백 함수

// useState : 폼 입력값과 UI 상태를 관리하는 React 훅
import { useState } from 'react';

// 공통 색상 상수
import { colors } from '../../styles/colors.js';

// createSession : POST /api/workout/sessions — 새 세션을 서버에 저장하는 API 함수
import { createSession } from '../../api/workoutApi.js';


// SessionForm 컴포넌트
// { onSessionCreated } : 부모에서 받은 props를 구조 분해(destructuring)로 추출
function SessionForm({ onSessionCreated }) {

    // ─────────────────────────────────────────────
    // 오늘 날짜를 YYYY-MM-DD 형식으로 만들기
    // ─────────────────────────────────────────────

    // new Date() : 현재 날짜·시간 객체 생성
    // toISOString() : "2024-06-01T12:00:00.000Z" 형식의 문자열 반환
    // slice(0, 10) : 앞 10자만 잘라냄 → "2024-06-01"
    const today = new Date().toISOString().slice(0, 10);


    // ─────────────────────────────────────────────
    // 상태(State) 선언
    // ─────────────────────────────────────────────

    // sessionDate : 운동 날짜 입력값 (초기값: 오늘)
    const [sessionDate, setSessionDate] = useState(today);

    // title : 세션 제목 입력값 (초기값: 빈 문자열)
    const [title, setTitle] = useState('');

    // durationMin : 총 운동 시간(분) 입력값 (초기값: 빈 문자열)
    const [durationMin, setDurationMin] = useState('');

    // memo : 운동 메모 입력값 (초기값: 빈 문자열)
    const [memo, setMemo] = useState('');

    // exercises : 입력 중인 종목 목록
    // 각 종목은 { name: '종목명', sets: [{ weight_kg: '', reps: '' }, ...] } 형태
    // 초기값: 종목 1개 + 세트 1개가 미리 준비된 상태
    const [exercises, setExercises] = useState([
        { name: '', sets: [{ weight_kg: '', reps: '' }] }
    ]);

    // saving : 저장 API 호출 중인지 여부 (true이면 버튼 비활성화로 중복 제출 방지)
    const [saving, setSaving] = useState(false);

    // errorMsg : 저장 실패 시 표시할 오류 메시지
    const [errorMsg, setErrorMsg] = useState('');


    // ─────────────────────────────────────────────
    // 종목(exercise) 관련 핸들러 함수
    // ─────────────────────────────────────────────

    // handleExerciseNameChange : 특정 종목의 이름을 수정
    // exIdx : 수정할 종목의 인덱스 (0부터 시작)
    // value : 새 종목 이름 문자열
    const handleExerciseNameChange = (exIdx, value) => {
        // exercises 배열을 복사한 뒤 해당 인덱스의 name만 변경
        // map() : 배열의 각 요소를 변환해 새 배열 생성
        const updated = exercises.map((ex, i) =>
            i === exIdx           // 수정 대상 종목인지 확인
                ? { ...ex, name: value } // 맞으면 name만 교체한 새 객체 생성
                : ex                     // 아니면 기존 객체 그대로
        );
        setExercises(updated); // 상태 업데이트 → 리렌더링
    };


    // handleSetChange : 특정 종목의 특정 세트 값(중량 또는 횟수)을 수정
    // exIdx  : 종목 인덱스
    // setIdx : 세트 인덱스
    // field  : 수정할 필드 이름 ('weight_kg' 또는 'reps')
    // value  : 새 값 (문자열)
    const handleSetChange = (exIdx, setIdx, field, value) => {
        const updated = exercises.map((ex, i) => {
            if (i !== exIdx) return ex; // 다른 종목은 그대로

            // 해당 종목의 세트 목록을 업데이트
            const updatedSets = ex.sets.map((s, j) =>
                j === setIdx               // 수정 대상 세트인지 확인
                    ? { ...s, [field]: value } // 맞으면 해당 field만 교체 ([field] : 동적 키)
                    : s                        // 아니면 기존 세트 그대로
            );
            return { ...ex, sets: updatedSets }; // 세트 목록이 교체된 새 종목 객체
        });
        setExercises(updated);
    };


    // handleAddSet : 특정 종목에 새 세트를 추가
    // exIdx : 세트를 추가할 종목의 인덱스
    const handleAddSet = (exIdx) => {
        const updated = exercises.map((ex, i) => {
            if (i !== exIdx) return ex; // 다른 종목은 그대로

            return {
                ...ex,
                // 기존 세트 목록 뒤에 빈 세트 한 개 추가
                sets: [...ex.sets, { weight_kg: '', reps: '' }]
            };
        });
        setExercises(updated);
    };


    // handleRemoveSet : 특정 종목의 특정 세트를 삭제
    // exIdx  : 종목 인덱스
    // setIdx : 삭제할 세트 인덱스
    const handleRemoveSet = (exIdx, setIdx) => {
        const updated = exercises.map((ex, i) => {
            if (i !== exIdx) return ex;

            // filter() : 삭제할 인덱스(setIdx)를 제외한 세트만 남김
            const filteredSets = ex.sets.filter((_, j) => j !== setIdx);

            // 세트가 하나뿐이면 삭제 불가 (최소 1세트 유지)
            if (filteredSets.length === 0) return ex;

            return { ...ex, sets: filteredSets };
        });
        setExercises(updated);
    };


    // handleAddExercise : 새 종목 하나를 종목 목록 맨 뒤에 추가
    const handleAddExercise = () => {
        setExercises([
            ...exercises, // 기존 종목 목록 유지
            { name: '', sets: [{ weight_kg: '', reps: '' }] } // 빈 종목 추가
        ]);
    };


    // handleRemoveExercise : 특정 종목을 목록에서 삭제
    // exIdx : 삭제할 종목의 인덱스
    const handleRemoveExercise = (exIdx) => {
        // 종목이 하나뿐이면 삭제 불가 (최소 1종목 유지)
        if (exercises.length === 1) return;

        // filter() : 삭제할 인덱스를 제외한 종목만 남김
        setExercises(exercises.filter((_, i) => i !== exIdx));
    };


    // ─────────────────────────────────────────────
    // 폼 제출 핸들러
    // ─────────────────────────────────────────────

    // handleSubmit : 저장 버튼 클릭 시 실행 — API 호출 후 부모에게 결과 전달
    const handleSubmit = async () => {
        setErrorMsg(''); // 이전 오류 메시지 초기화

        // 날짜 필수 검증
        if (!sessionDate) {
            setErrorMsg('운동 날짜를 선택해주세요.');
            return; // 검증 실패 시 함수 종료
        }

        try {
            setSaving(true); // 저장 시작 — 버튼 비활성화

            // exercises 배열을 API 요청 형식으로 변환
            // 이름이 비어있는 종목은 제외 (빈 폼 라인 무시)
            const exercisesPayload = exercises
                .filter(ex => ex.name.trim() !== '') // 이름 없는 종목 제거
                .map(ex => ({
                    name: ex.name.trim(), // 앞뒤 공백 제거
                    sets: ex.sets
                        .filter(s => s.reps !== '' || s.weight_kg !== '') // 값 없는 세트 제거
                        .map(s => ({
                            // parseFloat() : 문자열 → 실수 변환 (예: "60.5" → 60.5)
                            // || undefined : 빈 문자열이면 undefined → 서버로 전송 안 함
                            weight_kg: s.weight_kg !== '' ? parseFloat(s.weight_kg) : undefined,
                            // parseInt() : 문자열 → 정수 변환 (예: "10" → 10)
                            reps: s.reps !== '' ? parseInt(s.reps, 10) : undefined,
                        }))
                }));

            // 서버에 보낼 최종 데이터 객체 조립
            const payload = {
                session_date: sessionDate,                             // 운동 날짜 (필수)
                title: title.trim() || undefined,                      // 제목 (없으면 전송 안 함)
                duration_min: durationMin !== '' ? parseInt(durationMin, 10) : undefined, // 시간(분)
                memo: memo.trim() || undefined,                        // 메모
                exercises: exercisesPayload,                           // 종목·세트 목록
            };

            // createSession() : POST /api/workout/sessions — 서버에 세션 저장 요청
            const data = await createSession(payload);

            // 저장 성공 → 부모(WorkoutPage)의 handleSessionCreated() 호출
            // data.session : 서버가 반환한 새 세션 객체
            onSessionCreated(data.session);

            // 폼 초기화 — 다음 입력을 위해 빈 상태로 리셋
            setTitle('');
            setDurationMin('');
            setMemo('');
            setSessionDate(today);
            setExercises([{ name: '', sets: [{ weight_kg: '', reps: '' }] }]);

        } catch (error) {
            // 저장 실패 시 오류 메시지 표시
            const msg = error.response?.data?.message || '저장 중 오류가 발생했습니다.';
            // error.response?.data?.message : 서버가 반환한 오류 메시지 (없으면 기본 메시지 사용)
            // ?. (옵셔널 체이닝) : 중간 값이 null이어도 에러 없이 undefined 반환
            setErrorMsg(msg);

        } finally {
            setSaving(false); // 저장 완료 — 버튼 다시 활성화
        }
    };


    // ─────────────────────────────────────────────
    // 공통 입력 필드 스타일 (반복 사용)
    // ─────────────────────────────────────────────

    // inputStyle : 텍스트 입력 필드에 공통으로 적용할 스타일 객체
    const inputStyle = {
        width: '100%',                           // 부모 너비에 맞춤
        padding: '8px 10px',                     // 내부 여백
        border: `1px solid ${colors.border}`,    // 연한 회색 테두리
        borderRadius: 6,                         // 모서리 둥글게
        fontSize: 13,                            // 글자 크기
        color: colors.text,                      // 글자 색
        background: '#fff',                      // 흰 배경
        boxSizing: 'border-box',                 // padding이 width 안에 포함되도록
        outline: 'none',                         // 브라우저 기본 파란 테두리 제거
    };

    // smallInputStyle : 세트 입력 필드(중량·횟수)에 사용하는 작은 스타일
    const smallInputStyle = {
        ...inputStyle,         // inputStyle의 모든 속성 복사
        width: 70,             // 고정 너비 70px (작은 숫자 입력)
        textAlign: 'center',   // 숫자 가운데 정렬
        padding: '6px 4px',   // 더 작은 여백
    };


    // ─────────────────────────────────────────────
    // JSX 렌더링
    // ─────────────────────────────────────────────

    return (
        // 폼 전체 카드 컨테이너
        <div
            style={{
                background: colors.card,             // 흰 카드 배경
                border: `1px solid ${colors.border}`, // 연한 회색 테두리
                borderRadius: 12,                    // 모서리 둥글게
                padding: 20,                         // 안쪽 여백
                marginBottom: 20,                    // 아래 콘텐츠와의 간격
            }}
        >
            {/* 폼 제목 */}
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: colors.text }}>
                새 운동 기록
            </h3>

            {/* ── 세션 기본 정보 입력 영역 ── */}
            {/* 날짜·제목·시간을 가로로 나란히 배치 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>

                {/* 운동 날짜 */}
                <div style={{ flex: '1 1 140px' }}> {/* flex-grow:1, flex-shrink:1, 최소너비140px */}
                    <label style={{ display: 'block', fontSize: 12, color: colors.sub, marginBottom: 4 }}>
                        날짜 *  {/* * : 필수 항목 표시 */}
                    </label>
                    <input
                        type="date"                  // 날짜 선택기 UI
                        value={sessionDate}          // 현재 상태값
                        onChange={e => setSessionDate(e.target.value)} // 입력 변경 시 상태 업데이트
                        style={inputStyle}           // 공통 스타일 적용
                    />
                </div>

                {/* 세션 제목 */}
                <div style={{ flex: '2 1 200px' }}> {/* 날짜보다 2배 더 넓어질 수 있음 */}
                    <label style={{ display: 'block', fontSize: 12, color: colors.sub, marginBottom: 4 }}>
                        세션 제목 (선택)
                    </label>
                    <input
                        type="text"
                        placeholder="예: 등·이두 데이, 풀바디"  // 입력 예시 힌트
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                {/* 운동 시간(분) */}
                <div style={{ flex: '0 1 100px' }}> {/* 늘어나지 않음, 최대 100px */}
                    <label style={{ display: 'block', fontSize: 12, color: colors.sub, marginBottom: 4 }}>
                        시간 (분)
                    </label>
                    <input
                        type="number"   // 숫자 전용 입력 (모바일에서 숫자 키패드 표시)
                        placeholder="60"
                        min="0"         // 최솟값 0 (음수 방지)
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
                    rows={2}  // 기본 2줄 높이
                    style={{ ...inputStyle, resize: 'vertical' }}
                    // resize: 'vertical' : 사용자가 세로 방향으로만 크기 조절 가능
                />
            </div>


            {/* ── 종목 입력 영역 ── */}
            <div style={{ marginBottom: 16 }}>
                {/* 소제목 */}
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 12 }}>
                    운동 종목
                </div>

                {/* 종목 목록 반복 렌더링 */}
                {exercises.map((ex, exIdx) => (
                    // 종목 하나를 감싸는 박스
                    <div
                        key={exIdx}  // React 렌더링 최적화를 위한 고유 키 (인덱스 사용)
                        style={{
                            background: colors.bg,               // 연한 회색 배경 (카드와 구분)
                            border: `1px solid ${colors.border}`, // 테두리
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 10,
                        }}
                    >
                        {/* 종목 이름 행 — 입력 필드 + 삭제 버튼 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <input
                                type="text"
                                placeholder={`종목 ${exIdx + 1} (예: 벤치프레스)`}  // 순서 표시
                                value={ex.name}
                                onChange={e => handleExerciseNameChange(exIdx, e.target.value)}
                                style={{ ...inputStyle, fontWeight: 600 }} // 종목명은 굵게
                            />
                            {/* 종목 삭제 버튼 — 종목이 2개 이상일 때만 표시 */}
                            {exercises.length > 1 && (
                                <button
                                    onClick={() => handleRemoveExercise(exIdx)}
                                    style={{
                                        background: 'none',        // 배경 없음
                                        border: 'none',            // 테두리 없음
                                        color: colors.muted,       // 흐린 회색
                                        cursor: 'pointer',
                                        fontSize: 18,
                                        lineHeight: 1,
                                        padding: '0 4px',
                                        flexShrink: 0,             // 버튼 크기 고정
                                    }}
                                    title="종목 삭제" // 마우스 호버 시 나타나는 툴팁
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* 세트 헤더 — 컬럼 레이블 */}
                        <div
                            style={{
                                display: 'grid',
                                // 컬럼 3개: 세트번호(40px) | 중량(1fr) | 횟수(1fr) | 삭제(32px)
                                gridTemplateColumns: '40px 1fr 1fr 32px',
                                gap: 6,
                                marginBottom: 6,
                                fontSize: 11,
                                color: colors.muted,   // 흐린 회색 레이블
                                fontWeight: 600,
                                textAlign: 'center',
                            }}
                        >
                            <span>세트</span>
                            <span>중량 (kg)</span>
                            <span>횟수 (회)</span>
                            <span />  {/* 삭제 버튼 컬럼 — 레이블 없음 */}
                        </div>

                        {/* 세트 목록 반복 렌더링 */}
                        {ex.sets.map((s, setIdx) => (
                            <div
                                key={setIdx}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 1fr 1fr 32px', // 세트 헤더와 동일한 컬럼 구조
                                    gap: 6,
                                    marginBottom: 4,
                                    alignItems: 'center', // 세로 중앙 정렬
                                }}
                            >
                                {/* 세트 번호 표시 */}
                                <span
                                    style={{
                                        textAlign: 'center',
                                        fontSize: 12,
                                        color: colors.sub,
                                        fontWeight: 600,
                                    }}
                                >
                                    {setIdx + 1}  {/* 0부터 시작하는 인덱스를 1부터 표시 */}
                                </span>

                                {/* 중량 입력 */}
                                <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    step="0.5"  // 0.5 단위로 증감 가능 (예: 60.5 kg)
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

                                {/* 세트 삭제 버튼 — 세트가 2개 이상일 때만 표시 */}
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
                                    <span /> // 세트가 하나면 빈 공간으로 채움 (그리드 유지)
                                )}
                            </div>
                        ))}

                        {/* 세트 추가 버튼 */}
                        <button
                            onClick={() => handleAddSet(exIdx)}
                            style={{
                                background: 'none',
                                border: `1px dashed ${colors.border}`, // 점선 테두리
                                borderRadius: 6,
                                padding: '4px 12px',
                                fontSize: 12,
                                color: colors.sub,
                                cursor: 'pointer',
                                marginTop: 6,
                                width: '100%',  // 종목 박스 전체 너비
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
                        background: colors.primaryLight, // 연한 파랑 배경
                        color: colors.primary,           // 파랑 글씨
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
            {/* errorMsg가 있을 때만 표시 */}
            {errorMsg && (
                <div style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>
                    {errorMsg}
                </div>
            )}


            {/* ── 저장 버튼 ── */}
            <button
                onClick={handleSubmit}  // 클릭 시 handleSubmit 실행
                disabled={saving}       // 저장 중일 때 버튼 비활성화 (중복 제출 방지)
                style={{
                    background: saving ? colors.border : colors.primary, // 저장 중이면 회색
                    color: saving ? colors.sub : '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer', // 저장 중이면 금지 커서
                    width: '100%',
                }}
            >
                {/* 저장 중이면 "저장 중...", 아니면 "💾 저장하기" */}
                {saving ? '저장 중...' : '💾 저장하기'}
            </button>

        </div>
    );
}

export default SessionForm; // WorkoutPage.jsx에서 import해 사용
