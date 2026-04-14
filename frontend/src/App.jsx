import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import DietPage from './pages/diet/DietPage.jsx';
import SleepPage from './pages/sleep/SleepPage.jsx';
import StatsPage from './pages/stats/StatsPage.jsx';
import WorkoutPage from './pages/workout/WorkoutPage.jsx';
import MyPage from './pages/mypage/MyPage.jsx';
import IntroPage from './pages/intro/IntroPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IntroPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/diet" element={<DietPage />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/mypage" element={<MyPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
