// authApi.js — Flask 백엔드의 인증(로그인·회원가입) API와 통신하는 함수 모음
// axios 라이브러리를 사용해 HTTP 요청을 보내고 응답을 받음

import axios from 'axios'; // axios : fetch보다 사용하기 쉬운 HTTP 요청 라이브러리

// ─────────────────────────────────────────────
// axios 인스턴스 생성
// ─────────────────────────────────────────────
// axios.create() : 기본 설정을 미리 정해둔 axios 객체를 만듦
// 매번 URL이나 헤더를 반복 작성하지 않아도 됨
const apiClient = axios.create({
  baseURL: '/api', // 모든 요청의 앞에 '/api'가 자동으로 붙음 (vite.config.js에서 Flask로 프록시됨)
  timeout: 10000, // 10초(10000ms) 안에 응답이 없으면 요청 실패로 처리
  headers: {
    'Content-Type': 'application/json', // 요청 본문이 JSON 형식임을 서버에 알림
  },
});

// ─────────────────────────────────────────────
// 요청 인터셉터 (Request Interceptor)
// ─────────────────────────────────────────────
// 모든 API 요청이 실제로 전송되기 전에 이 함수를 거침
// 로그인 후 발급받은 JWT 토큰을 모든 요청 헤더에 자동으로 첨부하는 역할
apiClient.interceptors.request.use(
  (config) => {
    // localStorage : 브라우저에 데이터를 영구적으로 저장하는 공간 (탭을 닫아도 유지됨)
    const token = localStorage.getItem('access_token'); // 저장된 JWT 토큰을 꺼냄

    if (token) {
      // 토큰이 있으면 Authorization 헤더에 'Bearer 토큰값' 형식으로 추가
      // 서버는 이 헤더를 보고 "이 사용자는 로그인된 사용자다"라고 인식함
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config; // 수정된 설정 객체를 반환해야 요청이 계속 진행됨
  },
  (error) => {
    // 요청 설정 중 에러가 발생하면 Promise.reject()로 에러를 전파
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// 응답 인터셉터 (Response Interceptor)
// ─────────────────────────────────────────────
// 서버 응답이 도착했을 때 공통으로 처리할 로직을 여기서 정의
apiClient.interceptors.response.use(
  (response) => {
    // HTTP 상태코드가 2xx(성공)인 경우 — 응답을 그대로 반환
    return response;
  },
  (error) => {
    // HTTP 상태코드가 4xx, 5xx(에러)인 경우
    const requestUrl = String(error.config?.url || '');
    const requestMethod = String(error.config?.method || '').toLowerCase();
    const isPasswordChangeRequest = requestMethod === 'put' && requestUrl.includes('/auth/password');

    if (error.response?.status === 401 && !isPasswordChangeRequest) {
      // 401 Unauthorized : 토큰이 만료되었거나 유효하지 않은 경우
      localStorage.removeItem('access_token'); // 만료된 토큰을 로컬 스토리지에서 삭제
      window.location.href = '/login'; // 로그인 페이지로 강제 이동
    }
    // 에러를 호출한 곳으로 전파 — try/catch에서 잡을 수 있도록 함
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// 회원가입 API 함수
// ─────────────────────────────────────────────
// userData : { username, email, password } 형태의 객체
// POST /api/auth/register 엔드포인트에 요청을 보냄
export async function register(userData) {
  // await : Promise가 완료될 때까지 기다림 — 비동기 코드를 동기 코드처럼 작성 가능
  const response = await apiClient.post('/auth/register', userData);
  // response.data : 서버가 JSON으로 반환한 실제 데이터 (axios가 자동으로 파싱)
  return response.data;
}

// ─────────────────────────────────────────────
// 로그인 API 함수
// ─────────────────────────────────────────────
// credentials : { email, password } 형태의 객체
// POST /api/auth/login 엔드포인트에 요청을 보냄
export async function login(credentials) {
  const response = await apiClient.post('/auth/login', credentials); // 로그인 요청 전송
  const { access_token, user } = response.data; // 서버 응답에서 토큰과 사용자 정보 추출

  // 로그인 성공 시 JWT 토큰을 로컬 스토리지에 저장
  // 이후 요청 인터셉터가 이 토큰을 자동으로 헤더에 첨부함
  localStorage.setItem('access_token', access_token);

  return { access_token, user }; // 토큰과 사용자 정보를 호출한 곳으로 반환
}

// ─────────────────────────────────────────────
// 로그아웃 함수 (클라이언트 측)
// ─────────────────────────────────────────────
// 서버에 별도 요청 없이 로컬에 저장된 토큰만 삭제
// JWT는 서버에 상태를 저장하지 않으므로, 토큰을 지우는 것만으로 로그아웃 처리됨
export function logout() {
  localStorage.removeItem('access_token'); // 토큰 삭제 — 이후 요청에 토큰이 첨부되지 않음
  window.location.href = '/login'; // 로그인 페이지로 이동
}

export async function getCurrentUser() {
  const response = await apiClient.get('/profile/me');
  return response.data;
}

export async function updateProfile(profileData) {
  const response = await apiClient.put('/profile/me', profileData);
  return response.data;
}

export async function deleteAccount(payload) {
  const response = await apiClient.delete('/profile/me', { data: payload });
  return response.data;
}

export async function changePassword(passwordData) {
  const response = await apiClient.put('/auth/password', passwordData);
  return response.data;
}

// ─────────────────────────────────────────────
// 로그인 상태 확인 함수
// ─────────────────────────────────────────────
// 로컬 스토리지에 토큰이 있으면 로그인 상태로 간주
// 실제 토큰 유효성 검사는 서버가 담당 — 여기서는 단순히 존재 여부만 확인
export function isLoggedIn() {
  return Boolean(localStorage.getItem('access_token')); // 토큰이 있으면 true, 없으면 false
}

export default apiClient; // apiClient를 기본 내보내기 — 다른 API 파일에서 재사용 가능
