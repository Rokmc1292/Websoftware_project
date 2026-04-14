// statsApi.js — Flask 백엔드의 통계 API와 통신하는 함수 모음
// authApi.js에서 만든 apiClient(axios 인스턴스)를 재사용
// JWT 토큰 자동 첨부, 기본 URL('/api') 설정이 이미 되어 있음

// apiClient : authApi.js에서 export한 axios 인스턴스
// 이 인스턴스를 import해 재사용하면 JWT 인터셉터, timeout 설정이 자동으로 적용됨
import apiClient from './authApi.js';


// ─────────────────────────────────────────────
// 월별 기록 존재 여부 조회
// GET /api/stats/monthly?year=YYYY&month=MM
// ─────────────────────────────────────────────
// 캘린더의 각 날짜에 운동/식단/수면 점(dot)을 표시하기 위한 데이터를 가져옴
//
// 매개변수:
//   year  (number) : 조회할 연도 (예: 2024)
//   month (number) : 조회할 월 (예: 6)
//
// 반환값 예시:
// {
//   success: true,
//   year: 2024,
//   month: 6,
//   days: {
//     "2024-06-01": { workout: true,  diet: true,  sleep: false },
//     "2024-06-02": { workout: false, diet: true,  sleep: true  },
//     ...
//   }
// }
export const getMonthlyStats = async (year, month) => {
    // apiClient.get(URL, { params: 객체 }) :
    //   params 객체의 key-value가 URL 쿼리스트링으로 자동 변환됨
    //   예: { year: 2024, month: 6 } → ?year=2024&month=6
    const response = await apiClient.get('/stats/monthly', {
        params: { year, month }, // 연도와 월을 쿼리스트링으로 전달
    });

    // response.data : axios가 서버 JSON 응답을 자동으로 파싱한 결과
    return response.data;
};


// ─────────────────────────────────────────────
// 특정 날짜 상세 기록 조회
// GET /api/stats/daily?date=YYYY-MM-DD
// ─────────────────────────────────────────────
// 캘린더에서 날짜를 클릭했을 때 팝업(모달)에 표시할 상세 데이터를 가져옴
// 운동 세션 목록, 식단 기록 목록, 수면 기록을 한 번에 반환
//
// 매개변수:
//   dateStr (string) : 조회할 날짜 (예: '2024-06-01')
//
// 반환값 예시:
// {
//   success: true,
//   date: "2024-06-01",
//   workout: [ { id, title, sets: [...], ... } ],
//   diet:    [ { id, title, items: [...], calories, ... } ],
//   sleep:   { sleepHours: 7.5, satisfaction: 80, ... }  // 없으면 null
// }
export const getDailyStats = async (dateStr) => {
    // dateStr : 'YYYY-MM-DD' 형식의 날짜 문자열 (예: '2024-06-01')
    const response = await apiClient.get('/stats/daily', {
        params: { date: dateStr }, // date 파라미터를 쿼리스트링으로 전달
    });

    return response.data;
};
