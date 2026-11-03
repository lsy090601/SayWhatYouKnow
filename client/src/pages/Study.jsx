// 서약 후 학습 타이머를 시작하고 사용자가 모은 참고 링크를 관리합니다.

import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import {post} from '../api';
import Steps from '../components/Steps';
import { useChallenge } from '../ChallengeContext';

const TOTAL = 10 * 60;

function TimerRing({ remaining }) {
  const size = 220, r = size / 2 - 8, c = 2 * Math.PI * r;
  const frac = remaining / TOTAL;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke="#E0965A" strokeWidth="8" fill="none" strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 1s linear' }}
      />
    </svg>
  );
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export default function Study() {
  const navigate = useNavigate();
  const { challenge, update } = useChallenge();
  const [agreed, setAgreed] = useState(false);
  const [pledged, setPledged] = useState(Boolean(challenge.startedAt));
  const [running, setRunning] = useState(Boolean(challenge.startedAt));
  const [remaining, setRemaining] = useState(() => challenge.startedAt ? Math.max(0,Math.ceil((new Date(challenge.startedAt).getTime()+TOTAL*1000-Date.now())/1000)) : TOTAL);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const deadline = useRef(challenge.startedAt ? new Date(challenge.startedAt).getTime()+TOTAL*1000 : null);
  const [startError,setStartError] = useState('');
  const [starting,setStarting] = useState(false);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) setRunning(false);
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [running]);

  if (!challenge.word) return <Navigate to="/challenge" replace />;

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const startStudy = async () => {
    setStarting(true);setStartError('');
    try {
      const result=await post('/challenges/'+challenge.id+'/start',{pledged:true});
      update({startedAt:result.startedAt,status:result.status});
      deadline.current=new Date(result.startedAt).getTime()+TOTAL*1000;
      setPledged(true);setRunning(true);
    } catch(e) {setStartError(e.message);} finally {setStarting(false);}
  };
  const addLink = (e) => {
    e.preventDefault();
    const url = linkInput.trim();
    if(challenge.links.length >= 20){setLinkError('링크는 최대 20개까지 저장할 수 있어요.');return;}
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error();
    } catch {
      setLinkError('http:// 또는 https://로 시작하는 올바른 주소를 입력해 주세요.');
      return;
    }
    if (challenge.links.some((link) => link.url === url)) {
      setLinkError('이미 저장한 링크예요.');
      return;
    }
    setLinkError('');
    update({ links: [...challenge.links, { url, host: hostOf(url) }] });
    setLinkInput('');
  };

  return (
    <>
      <Steps current={1} />
      {startError && <p className="demo-notice" role="alert">{startError}</p>}
      <div className="grid-2 study">
        <div className="panel center-col glow-card">
          <div className="tags"><span className="tag">{challenge.field}</span><span className="tag">{challenge.difficulty}</span></div>
          <div className="word sm">{challenge.word.word}</div>
          <div className="ring">
            <TimerRing remaining={remaining} />
            <div className="ring-in">
              <span className="time">{mm}:{ss}</span>
              <span className="time-sub">{remaining === 0 ? '시간 끝!' : '남은 시간'}</span>
            </div>
          </div>

          {pledged ? (
            <>
              <div className="pledge"><Icon name="shield" size={15} strokeWidth={2} /><span>AI 없이 검색만으로 공부하기로 약속했어요</span></div>
              <div className="row gap full">
                {remaining > 0 && (
                  <button className="btn btn-ghost" onClick={() => { deadline.current = Date.now() + remaining * 1000; setRunning((v) => !v); }}>{running ? '일시정지' : '계속하기'}</button>
                )}
                <button className="btn btn-primary grow" onClick={() => navigate('/challenge/explain')}>
                  설명하러 가기 <Icon name="arrow" size={16} strokeWidth={2.4} />
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="pledge-check">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                AI 없이 검색만으로 공부할게요
              </label>
              <button className="btn btn-primary full" disabled={!agreed || starting} onClick={startStudy}>
                서약하고 시작하기
              </button>
            </>
          )}
        </div>

        <div className="panel">
          <div className="label">참고한 링크 <span className="muted">· 선택</span></div>
          <form className="input" onSubmit={addLink}>
            <Icon name="link" size={16} strokeWidth={2} />
            <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="공부에 도움된 링크를 붙여넣어 주세요" aria-label="참고 링크" />
            <button type="submit" className="btn btn-sm btn-soft">저장</button>
          </form>
          {linkError && <p className="sub" role="alert">{linkError}</p>}
          <div className="links">
            {challenge.links.map((l, i) => (
              <a key={i} className="link-row" href={l.url} target="_blank" rel="noreferrer">
                <span className="link-ic"><Icon name="link" size={16} strokeWidth={2} /></span>
                <div className="col"><span className="link-t">{l.host}</span><span className="link-d">{l.url}</span></div>
              </a>
            ))}
          </div>
          <div className="tip">
            <Icon name="bulb" size={16} strokeWidth={2} />
            <span>정의만 외우기보다 <b>예시</b>와 <b>왜 중요한지</b>를 찾아보면 설명이 쉬워져요.</span>
          </div>
        </div>
      </div>
    </>
  );
}




