// 텍스트와 브라우저 음성 인식으로 설명을 작성하고 채점을 요청합니다.

import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import {post} from '../api';
import Steps from '../components/Steps';
import { useChallenge } from '../ChallengeContext';

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const WAVE = [8, 14, 22, 28, 18, 24, 28, 22, 12, 26, 20, 10, 16, 24, 14, 8];

export default function Explain() {
  const navigate = useNavigate();
  const { challenge, update } = useChallenge();
  const [text, setText] = useState(challenge.explanation);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef(null);
  const baseRef = useRef('');

  useEffect(() => {
    if (!listening) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  useEffect(() => () => recRef.current?.stop(), []);

  if (!challenge.word) return <Navigate to="/challenge" replace />;

  const toggleMic = () => {
    if (!SpeechRecognition) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'ko-KR';
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = text ? text.trimEnd() + ' ' : '';
    rec.onresult = (e) => {
      let finalText = '', interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      setText(baseRef.current + finalText + interim);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (event) => {
      setListening(false);
      setMicError(event.error === 'not-allowed'
        ? '마이크 권한이 필요해요. 브라우저 설정을 확인하거나 글로 입력해 주세요.'
        : '음성을 인식하지 못했어요. 다시 시도하거나 글로 입력해 주세요.');
    };
    setMicError('');
    try { rec.start(); } catch {
      setMicError('음성 입력을 시작하지 못했어요. 다시 시도해 주세요.');
      return;
    }
    recRef.current = rec;
    setSeconds(0);
    setListening(true);
  };

  const submit = async () => {
    if (submitting) return;
    recRef.current?.stop();
    update({ explanation: text });
    setSubmitting(true);setSubmitError('');
    try {
      if (!challenge.id) throw new Error('단어 선택부터 다시 시작해 주세요.');
      const result = await post('/challenges/' + challenge.id + '/submit', {
        explanation: text, links: challenge.links.map(link => link.url),
      });
      update(result);
      navigate('/challenge/feedback');
    } catch (error) { setSubmitError(error.message); }
    finally { setSubmitting(false); }
  };
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <>
      <Steps current={2} />
      <section className="page-head">
        <div className="tags center"><span className="tag">{challenge.field}</span><span className="tag">{challenge.word.word}</span></div>
        <h2 className="h-page">처음 듣는 친구에게 설명해 보세요</h2>
        <p className="sub">어려운 용어보다 쉬운 말과 예시가 좋아요. 직접 쓰거나 마이크로 말할 수 있어요.</p>
      </section>
      {micError && <p className="demo-notice" role="alert">{micError}</p>}
      {submitError && <p className="demo-notice" role="alert">{submitError}</p>}
      <p className="sub">제출하면 설명 텍스트가 AI 채점을 위해 Google(Gemini)로 전송됩니다. 음성 원본은 이 서버에 저장하지 않습니다.</p>
      <div className="panel editor">
        <textarea
          className="editor-text"
          value={text}
          maxLength={10000}
          disabled={submitting}
          onChange={(e) => {setText(e.target.value);update({explanation:e.target.value});}}
          placeholder={`${challenge.word.word}(이)란…`}
          aria-label="설명 입력"
        />
        <div className="editor-foot">
          <div className="rec">
            <button
              className={`mic-btn${listening ? '' : ' idle'}`}
              onClick={toggleMic}
              disabled={!SpeechRecognition || submitting}
              aria-pressed={listening}
              aria-label={listening ? '음성 입력 멈추기' : '음성으로 설명하기'}
            >
              <Icon name="mic" size={22} strokeWidth={2.2} />
            </button>
            <div className="col">
              {listening ? (
                <>
                  <span className="rec-t"><span className="rec-dot" />듣고 있어요 · {mm}:{ss}</span>
                  <div className="wave">{WAVE.map((h, i) => <span key={i} className="wave-bar" style={{ height: h }} />)}</div>
                </>
              ) : (
                <span className="count">{SpeechRecognition ? '마이크를 눌러 말로 설명할 수 있어요' : '이 브라우저는 음성 입력을 지원하지 않아요'}</span>
              )}
            </div>
          </div>
          <div className="row gap foot-r">
            <span className="count">{text.length}자</span>
            <button className="btn btn-primary" disabled={submitting || text.trim().length < 20} onClick={submit}>
              {submitting ? 'AI가 설명을 읽고 있어요…' : '제출하고 피드백 받기'} <Icon name="arrow" size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}



