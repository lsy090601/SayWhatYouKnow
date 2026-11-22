// 완료한 도전 기록과 점수 통계를 조회해 목록과 그래프로 보여줍니다.

import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api} from '../api';
import {useChallenge} from '../ChallengeContext';
// 완료한 도전의 점수 변화를 SVG 꺾은선 그래프로 그립니다.
function TrendChart({points}){
 // 점수가 없으면 안내 문구를 표시합니다.
 if(!points.length)return <p className="sub">첫 도전을 완료하면 점수 변화가 여기에 표시돼요.</p>;
 // SVG 좌표계의 너비와 높이
 const W=600,H=220;
 // 점수 개수에 맞춰 x 좌표를 균등하게 배치합니다. 점이 하나면 가운데에 놓습니다.
 const xs=points.map((_,i)=>points.length===1?W/2:20+i*(W-40)/(points.length-1));
 // 0~100점을 SVG의 y 좌표로 변환합니다.
 const y=v=>H-16-(v/100)*(H-36);
 // 점들을 잇는 SVG path 명령을 만듭니다.
 const line=points.map((p,i)=>(i?'L':'M')+xs[i]+' '+y(p)).join(' ');
 return <svg className="chart" viewBox={'0 0 '+W+' '+H} width="100%" height={H} role="img" aria-label="최근 완료한 도전의 점수 변화">
 <defs><linearGradient id="trend-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#E0965A" stopOpacity=".35"/><stop offset="1" stopColor="#E0965A" stopOpacity="0"/></linearGradient></defs>
 {/* 0, 50, 100점 기준선 */}
 {[0,50,100].map(v=><line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.07)"/>)}
 {/* 그래프 아래 영역과 꺾은선 */}
 <path d={line+' L'+xs.at(-1)+' '+H+' L'+xs[0]+' '+H+' Z'} fill="url(#trend-area)"/><path d={line} stroke="#E0965A" strokeWidth="2.5" fill="none"/>
 {/* 각 점수 지점 */}
 {points.map((p,i)=><circle key={i} cx={xs[i]} cy={y(p)} r="4" fill="#F2B482"/>)}</svg>;
}
// 기록 통계와 최근 도전 목록을 보여주는 화면입니다.
export default function History(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const {update}=useChallenge();const navigate=useNavigate();
 // 기록을 불러옵니다. 언마운트 후에는 상태를 변경하지 않습니다.
 useEffect(()=>{let active=true;api('/history').then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 // 선택한 도전을 불러와 피드백 화면에서 다시 보여줍니다.
 const open=async id=>{setBusy(true);setError('');try{update(await api('/challenges/'+id));navigate('/challenge/feedback');}catch(e){setError(e.message);}finally{setBusy(false);}};
 const stats=data?.stats;
 return <><section className="page-head left"><h2 className="h-page">나의 기록</h2><p className="sub">이 브라우저에서 완료한 최근 100개의 도전 기록이에요. 쿠키를 삭제하면 게스트 기록에 다시 접근할 수 없어요.</p></section>
 {/* 오류와 로딩 안내 */}
 {error&&<p className="demo-notice" role="alert">{error}</p>}
 {!data&&!error&&<p className="sub" role="status">기록을 불러오는 중이에요…</p>}
 {/* 총 도전, 평균 점수, 최고 점수 */}
 {data&&<><div className="stats">{[['총 도전',stats.total,'회'],['평균 점수',stats.average,'점'],['최고 점수',stats.best,'점']].map(([label,value,unit])=><div className="stat" key={label}><span className="stat-l">{label}</span><span className="stat-v">{value}<small>{unit}</small></span></div>)}</div>
 {/* 최신순 목록에서 12개를 골라 오래된 순으로 뒤집어 그래프에 표시합니다. */}
 <div className="grid-2 hist"><div className="panel"><div className="label">점수 변화<span className="muted">· 최근 {Math.min(12,stats.total)}회</span></div><TrendChart points={data.items.slice(0,12).reverse().map(i=>i.score)}/></div>
 {/* 최근 도전 목록: 항목을 누르면 해당 피드백으로 이동합니다. */}
 <div className="panel"><div className="label">최근 도전</div><div className="h-list">{data.items.length?data.items.map(h=><button key={h.id} className="h-row" disabled={busy} onClick={()=>open(h.id)} aria-label={h.word+' 피드백 보기'}><span className="col"><span className="h-word">{h.word}</span><span className="h-meta">{h.field} · {h.difficulty} · {new Date(h.completedAt).toLocaleDateString('ko-KR')}</span></span><span className={'h-score'+(h.score>=90?' top':'')}>{h.score}</span></button>):<p className="sub">아직 완료한 도전이 없어요. 첫 단어를 설명해 보세요.</p>}</div></div></div></>}</>;
}

