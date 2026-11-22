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

// 앱의 최상위 컴포넌트입니다. Provider가 라우터를 감싸 모든 페이지가 도전 상태를 공유합니다.
export default function App() {
  return (
    <ChallengeProvider>
      <BrowserRouter>
        <Routes>
          {/* Layout을 부모 라우트로 두어 모든 페이지에 공통 헤더와 배경을 적용합니다. */}
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            {/* 도전 흐름: 단어 선택 → 10분 학습 → 설명 → 피드백 */}
            <Route path="challenge" element={<Pick />} />
            <Route path="challenge/study" element={<Study />} />
            <Route path="challenge/explain" element={<Explain />} />
            <Route path="challenge/feedback" element={<Feedback />} />
            {/* 기록과 채점 기준 페이지 */}
            <Route path="history" element={<History />} />
            <Route path="rubric" element={<Rubric />} />
            {/* 정의되지 않은 경로는 홈으로 되돌립니다. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ChallengeProvider>
  );
}
