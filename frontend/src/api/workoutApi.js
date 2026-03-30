// workoutApi.js — Flask 백엔드의 운동 기록 API와 통신하는 함수 모음
// authApi.js에서 만든 apiClient(axios 인스턴스)를 재사용 — JWT 토큰 자동 첨부, 기본 URL 등 설정 공유

// apiClient : authApi.js에서 export한 axios 인스턴스
// JWT 인터셉터가 설정된 상태 — 모든 요청에 Authorization 헤더가 자동으로 붙음
import apiClient from './authApi.js';


// ─────────────────────────────────────────────
// 운동 세션 목록 조회
// GET /api/workout/sessions
// ─────────────────────────────────────────────
// 현재 로그인한 사용자의 모든 운동 세션을 최신순으로 반환
// 반환값: { sessions: [ {id, session_date, title, sets, ai_feedback, ...}, ... ] }
export const getSessions = async () => {
    // await : 서버 응답이 올 때까지 기다림 — 응답이 오면 response에 저장
    const response = await apiClient.get('/workout/sessions');
    // response.data : axios가 자동으로 파싱한 서버의 JSON 응답 본문
    return response.data;
};


// ─────────────────────────────────────────────
// 새 운동 세션 생성
// POST /api/workout/sessions
// ─────────────────────────────────────────────
// 매개변수 sessionData (객체):
// {
//     session_date: "2024-06-01",       // 필수 — 운동 날짜 (YYYY-MM-DD 형식)
//     title: "등·이두 데이",             // 선택 — 세션 제목
//     memo: "오늘 컨디션 좋음",           // 선택 — 메모
//     duration_min: 60,                 // 선택 — 총 운동 시간(분)
//     exercises: [                      // 선택 — 종목 목록
//         {
//             name: "벤치프레스",         // 종목 이름
//             sets: [                   // 세트 목록
//                 { weight_kg: 60, reps: 10 },
//                 { weight_kg: 65, reps: 8 }
//             ]
//         }
//     ]
// }
// 반환값: { message: "...", session: { id, session_date, title, sets, ... } }
export const createSession = async (sessionData) => {
    // POST 요청으로 새 운동 세션 생성
    // apiClient.post(URL, 데이터) : 두 번째 인자가 요청 Body(JSON)로 전달됨
    const response = await apiClient.post('/workout/sessions', sessionData);
    return response.data;
};


// ─────────────────────────────────────────────
// 특정 운동 세션 상세 조회
// GET /api/workout/sessions/:id
// ─────────────────────────────────────────────
// 매개변수 sessionId : 조회할 세션의 고유 ID (숫자)
// 반환값: { session: { id, session_date, title, sets, ai_feedback, ... } }
export const getSession = async (sessionId) => {
    // 템플릿 리터럴(backtick)로 URL에 세션 ID를 동적으로 삽입
    const response = await apiClient.get(`/workout/sessions/${sessionId}`);
    return response.data;
};


// ─────────────────────────────────────────────
// 운동 세션 삭제
// DELETE /api/workout/sessions/:id
// ─────────────────────────────────────────────
// 매개변수 sessionId : 삭제할 세션의 고유 ID (숫자)
// 반환값: { message: "운동 세션이 삭제되었습니다." }
export const deleteSession = async (sessionId) => {
    // DELETE 요청 — 서버에서 해당 세션(+ 관련 세트)을 삭제
    const response = await apiClient.delete(`/workout/sessions/${sessionId}`);
    return response.data;
};


// ─────────────────────────────────────────────
// AI 운동 분석 요청
// POST /api/workout/sessions/:id/analyze
// ─────────────────────────────────────────────
// 특정 세션의 운동 기록을 Claude AI로 분석하고 결과를 반환
// 분석 결과는 서버 DB의 ai_feedback 컬럼에도 저장됨
// 매개변수 sessionId : 분석할 세션의 고유 ID (숫자)
// 반환값: { ai_feedback: "분석 결과 텍스트..." }
export const analyzeSession = async (sessionId) => {
    // POST 요청 — Body 데이터 없이 세션 ID만 URL에 포함
    // 서버에서 DB의 세션 데이터를 읽어 Claude API를 호출하므로 Body 전송 불필요
    const response = await apiClient.post(`/workout/sessions/${sessionId}/analyze`);
    return response.data;
};
