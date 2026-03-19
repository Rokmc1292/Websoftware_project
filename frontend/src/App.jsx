// 여기 먼지 모르겠으면 main.jsx보고와라 
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';
import WorkoutPage from './pages/workout/WorkoutPage.jsx';
import DietPage from './pages/diet/DietPage.jsx';
import SleepPage from './pages/sleep/SleepPage.jsx';
import StatsPage from './pages/stats/StatsPage.jsx';

// 이 함수가 반환하는게 화면에 그려짐 여기 안에 주석 안써지니깐 모르면 나한테 물어보셈
function App(){
  return(
    <BroswerRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace/>}/>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/signup" element={<SignupPage/>}/>
      <Route element={<AppLayout/>}>
      <Route path="/workout" element={<WorkoutPage/>}/>
      <Route path="/diet" element={<DietPage/>}/>
      <Route path="/sleep" element={<SleepPage/>}/>
      <Route path="/stats" element={<StatsPage/>}/>
      </Route>
    </Routes>
    </BroswerRouter>
  );
}

// 다른 파일에서 import 하게 내보낸다는 뜻
export default App;