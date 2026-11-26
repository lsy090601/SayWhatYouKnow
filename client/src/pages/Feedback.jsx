// 총점, 항목별 점수, 잘한 점과 복습 힌트를 보여줍니다.

import {useState} from 'react';
import {post} from '../api';
import { Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import Steps from '../components/Steps';
import { useChallenge } from '../ChallengeContext';

// 채점 결과와 다음 행동 버튼을 보여주는 화면입니다.
export default function Feedback() {
  const navigate = useNavigate();
  const { challenge, update } = useChallenge();
  // 다시 설명하기 요청 진행 여부
  const [busy,setBusy] = useState(false);
  // 다시 설명하기 요청 오류 메시지
  const [error,setError] = useState('');
  // 단어가 없으면 단어 선택 화면으로 돌려보냅니다.
  if (!challenge.word) return <Navigate to="/challenge" replace />;


  const fb = challenge.feedback;
  // 아직 채점 결과가 없으면 설명 화면으로 돌려보냅니다.
  if (!fb) return <Navigate to="/challenge/explain" replace />;

  return (
    <>
      <Steps current={3} />
      {error && <p className="demo-notice" role="alert">{error}</p>}
      <p className="sub">AI 피드백은 학습을 돕는 참고 자료예요. 의문이 드는 내용은 출처와 함께 확인해 보세요.</p>
      <div className="grid-fb">
        {/* 총점과 항목별 점수 */}
        <div className="panel score-panel glow-card">
          <div className="tags"><span className="tag">{challenge.field}</span><span className="tag">{challenge.word.word}</span></div>
          <div className="score"><span className="score-n">{fb.total}</span><span className="score-m">/ 100</span></div>
          <p className="score-c">“{fb.comment}”</p>
          {/* 항목별 점수를 만점 대비 막대로 표시합니다. */}
          <div className="crits">
            {fb.scores.map((r) => (
              <div key={r.key} className="crit">
                <div className="crit-top"><span>{r.name}</span><span className="crit-s"><b>{r.score}</b> / {r.max}</span></div>
                <div className="bar"><span className="bar-fill" style={{ width: `${(r.score / r.max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        {/* 잘한 점, 힌트, 다시 확인할 부분 */}
        <div className="fb-list">
          <div className="fb good">
            <div className="fb-h"><span className="fb-ic"><Icon name="thumb" size={16} strokeWidth={2} /></span>잘한 점</div>
            <p>{fb.good}</p>
          </div>
          <div className="fb hint">
            <div className="fb-h"><span className="fb-ic"><Icon name="bulb" size={16} strokeWidth={2} /></span>빠진 개념 · 힌트</div>
            <p>{fb.hint}</p>
            <p className="small">{fb.hintSub}</p>
          </div>
          <div className="fb warn">
            <div className="fb-h"><span className="fb-ic"><Icon name="alert" size={16} strokeWidth={2} /></span>다시 확인해 볼 부분</div>
            <p>{fb.misconception}</p>
          </div>
          <div className="row gap">
            {/* 같은 단어로 새 도전을 만들어 작성한 설명과 링크를 유지한 채 설명 화면으로 이동합니다. */}
            <button className="btn btn-ghost grow" disabled={busy} onClick={async () => {
              setBusy(true);setError('');
              try {
                const next = await post('/challenges',{wordId:challenge.word.id});
                const started = await post('/challenges/'+next.id+'/start',{pledged:true});
                update({...started,explanation:challenge.explanation,links:challenge.links});
                navigate('/challenge/explain');
              } catch(e) {setError(e.message);} finally {setBusy(false);}
            }}>다시 설명하기</button>
            {/* 현재 단어 정보를 비우고 단어 선택 화면으로 이동합니다. */}
            <button className="btn btn-primary grow" disabled={busy} onClick={() => { update({ id:null, word:null, links:[], explanation:'', feedback:null, startedAt:null }); navigate('/challenge'); }}>
              새 단어 도전 <Icon name="arrow" size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}




