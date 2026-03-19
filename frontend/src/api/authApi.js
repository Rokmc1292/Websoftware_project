// 백엔드 api랑 통신하는 함수 모음
// axios라이브러리 사용함 근데 이건 머냐면 fetch보다 쉬운 http 요청 라이브러리라 보면됨
import axios from 'axios';

// axios 객체 만드는거 이렇게 해두면편함
const apiClient = axios.create({
  baseURL:'/api',
  timeout:10000,
  headers:{'Content-Type':'application/json'},
});

//모든 api요청이 실제로 전송되기전에 이 함수를 거침
apiClient.interceptors.request.use(
  (config)=>{
    // 그 탭 닫아도 유지되는거 그런거(토큰)
    // 막 개신누리 로그인해놓고 창닫고 다시 드가면 로그인 되어있는거 
    const token = localStorage.getItem('access_token')
    if (token)
    {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error)=>{
    return Promise.reject(error);
  }
);

//모든 응답이 공통으로 이 함수를 거침
apiClient.interceptors.response.use(
  (response)=>{return response},
  (error)=>{
    if(error.response?.status===401)
    {
      localStorage.removeItem('access_token');
      window.location.href='/login';
    }
    return Promise.reject(error);
  }
);

//회원가입 api함수
export const register = async(userData)=>{
  const response = await apiClient.post('/auth/register',userData);
  return response.data;
};

//로그인 api함수
export const login = async(credentials)=>{
  const response = await apiClient.post('/auth/login',credentials);
  const{access_token,user} = response.data;
  localStorage.setItem('access_token',access_token);
  return {access_token,user};
};

//로그아웃 함수(이건 api아니라 그냥 토큰 삭제)
export const logout = () => {
  localStorage.removeItem('access_token');
  window.location.href = '/login';
};

//로그인 상태확인함수 토큰이 있나없나
export const isLoggedIn = () => {
  return Boolean(localStorage.getItem('access_token'));
};

export default apiClient;