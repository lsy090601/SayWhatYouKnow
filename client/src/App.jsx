// URL 경로별 화면과 공통 레이아웃을 연결합니다.

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ChallengeProvider } from './ChallengeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Pick from './pages/Pick';
import Study from './pages/Study';
import Explain from './pages/Explain';
import Feedback from './pages/Feedback';
import History from './pages/History';
import Rubric from './pages/Rubric';

export default function App() {
  return (
    <ChallengeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="challenge" element={<Pick />} />
            <Route path="challenge/study" element={<Study />} />
            <Route path="challenge/explain" element={<Explain />} />
            <Route path="challenge/feedback" element={<Feedback />} />
            <Route path="history" element={<History />} />
            <Route path="rubric" element={<Rubric />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ChallengeProvider>
  );
}
