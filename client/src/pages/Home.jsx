// 서비스 소개와 학습 진행 순서, 도전 시작 버튼을 보여줍니다.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useChallenge } from '../ChallengeContext';

const HOME_FIELDS = ['과학', '경제', 'IT', '철학', '역사', '의학'];
const FLOW = [
  ['card', '단어 받기', '분야·난이도 선택'],
  ['search', '10분 검색', 'AI 없이 스스로'],
  ['pen', '설명하기', '글 또는 말로'],
  ['spark', 'AI 피드백', '점수와 힌트'],
  ['chart', '기록', '성장 확인'],
];

export default function Home() {
  const navigate = useNavigate();
  const { update } = useChallenge();
  const [field, setField] = useState(null);

  const start = () => {
    if (field) update({ field, word: null });
    navigate('/challenge');
  };

  return (
    <>
      <section className="hero">
        <span className="eyebrow"><span className="eyebrow-dot" />AI는 정답이 아니라, 내 설명을 듣는 청자</span>
        <h1 className="h-hero">
          <span className="hl1">아는 만큼,</span>
          <br />
          <span className="hl2">말해 보세요.</span>
        </h1>
        <p className="lead">
          어려운 단어 하나를 받아 10분 동안 검색으로 공부하고, <br className="br-d" />
          처음 듣는 친구에게 설명하듯 말해 보세요. AI가 피드백을 드려요.
        </p>
        <div className="pill-bar">
          <span className="pill-ic"><Icon name="search" size={20} /></span>
          <span className="pill-ph">{field ? `${field} 분야로 도전해 볼까요?` : '오늘 도전할 분야를 골라 보세요'}</span>
          <button className="btn btn-primary pill-btn" onClick={start}>
            단어 받기 <Icon name="arrow" size={16} strokeWidth={2.4} />
          </button>
        </div>
        <div className="chips center" role="group" aria-label="분야 선택">
          {HOME_FIELDS.map((f) => (
            <button key={f} className={`chip${field === f ? ' on' : ''}`} aria-pressed={field === f} onClick={() => setField(f === field ? null : f)}>
              {f}
            </button>
          ))}
        </div>
      </section>
      <section className="flow">
        {FLOW.map(([icon, t, d]) => (
          <div key={t} className="flow-item">
            <span className="flow-ic"><Icon name={icon} size={22} strokeWidth={2} /></span>
            <span className="flow-t">{t}</span>
            <span className="flow-d">{d}</span>
          </div>
        ))}
      </section>
    </>
  );
}
