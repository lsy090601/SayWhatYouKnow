// 분야와 난이도에 맞는 단어를 조회하고 선택한 단어로 도전을 만듭니다.

import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Icon from '../components/Icon';
import Steps from '../components/Steps';
import {useChallenge} from '../ChallengeContext';
import {DIFFICULTIES,FIELDS} from '../data/mock';
import {api,post} from '../api';
// 분야와 난이도를 고르고 도전할 단어를 정하는 화면입니다.
export default function Pick(){
 const navigate=useNavigate();const {challenge,update}=useChallenge();
 const {field,difficulty,word}=challenge;
 // 단어 목록, 로딩, 도전 생성 중 여부, 오류 메시지
 const [words,setWords]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 // 분야나 난이도가 바뀌면 단어 목록을 다시 불러옵니다.
 useEffect(()=>{
  // 이전 요청의 늦은 응답을 무시하기 위한 플래그입니다.
  let cancelled=false;
  api('/words?'+new URLSearchParams({field,difficulty})).then(data=>{
   if(cancelled)return;setWords(data.words);setLoading(false);
   // 단어를 무작위로 하나 고르고 이전 도전 정보를 비웁니다.
   update({word:data.words[Math.floor(Math.random()*data.words.length)]||null,id:null,feedback:null,startedAt:null,links:[],explanation:''});
  }).catch(e=>{if(!cancelled){setError(e.message);setLoading(false);update({word:null});}});
  return()=>{cancelled=true;};
 },[field,difficulty,update]);
 // 분야 또는 난이도를 바꾸고 현재 단어를 비웁니다.
 const select=patch=>{setLoading(true);setError('');update({...patch,word:null,id:null});};
 // 선택한 단어로 서버에 도전을 만들고 학습 화면으로 이동합니다.
 const start=async()=>{
  setBusy(true);setError('');
  try{update(await post('/challenges',{wordId:word.id}));navigate('/challenge/study');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 // 단계 표시, 제목, 선택 패널, 단어 카드를 렌더링합니다.
 return <><Steps current={0}/><section className="page-head"><h2 className="h-page">어떤 분야를 공부할까요?</h2><p className="sub">분야와 난이도를 고르면 학습할 단어 하나를 드려요.</p></section>
 {error&&<p className="demo-notice" role="alert">{error}</p>}
 {/* 분야와 난이도 선택 패널 */}
 <div className="grid-2"><div className="panel"><div className="label">분야</div><div className="chips" role="group" aria-label="분야">
 {FIELDS.map(f=><button key={f} disabled={busy} className={'chip lg'+(f===field?' on':'')} aria-pressed={f===field} onClick={()=>{if(f!==field)select({field:f});}}>{f}</button>)}
 </div><div className="label mt">난이도</div><div className="seg" role="group" aria-label="난이도">{DIFFICULTIES.map(d=><button key={d} disabled={busy} className={'seg-item'+(d===difficulty?' on':'')} aria-pressed={d===difficulty} onClick={()=>{if(d!==difficulty)select({difficulty:d});}}>{d}</button>)}</div></div>
 {/* 선택된 단어 카드 */}
 <div className="panel word-card glow-card"><div className="tags"><span className="tag">{field}</span><span className="tag">{difficulty}</span></div><div className="word">{loading?'불러오는 중…':word?.word||'단어 없음'}</div><div className="word-en">{word?.en}</div><p className="word-note">뜻은 아직 비밀이에요. 10분 동안 직접 찾아보세요.</p><div className="row gap">
 {/* 현재 단어를 제외한 목록에서 다른 단어를 무작위로 고릅니다. */}
 <button className="btn btn-ghost" disabled={busy||loading||words.length<2} onClick={()=>{const pool=words.filter(w=>w.id!==word?.id);update({word:pool[Math.floor(Math.random()*pool.length)]});}}><Icon name="refresh" size={16}/>다른 단어</button>
 {/* 단어가 준비되면 도전을 시작할 수 있습니다. */}
 <button className="btn btn-primary grow" disabled={!word||loading||busy} onClick={start}>{busy?'준비 중…':'이 단어로 시작'}<Icon name="arrow" size={16}/></button></div></div></div></>;
}

