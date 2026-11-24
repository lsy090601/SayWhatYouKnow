// 아이디와 비밀번호만으로 회원가입하거나 로그인하고, 로그인 상태에서는 로그아웃할 수 있는 화면입니다.

import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {post} from '../api';
import {useAuth} from '../AuthContext';
import {useChallenge} from '../ChallengeContext';

export default function Account(){
 const {username,setUsername}=useAuth();
 const {reset}=useChallenge();
 const navigate=useNavigate();
 const [mode,setMode]=useState('signup'),[form,setForm]=useState({username:'',password:''});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 // 가입 또는 로그인 요청을 보냅니다. 로그인하면 다른 사용자의 진행 중 도전이 남지 않도록 비웁니다.
 const submit=async e=>{
  e.preventDefault();setBusy(true);setError('');
  try{
   const d=await post(mode==='signup'?'/signup':'/login',form);
   if(mode==='login')reset();
   setUsername(d.username);navigate('/history');
  }catch(err){setError(err.message);}finally{setBusy(false);}
 };
 // 로그아웃하면 새 게스트로 시작합니다.
 const logout=async()=>{setBusy(true);setError('');try{await post('/logout',{});reset();setUsername(null);}catch(err){setError(err.message);}finally{setBusy(false);}};

 // 이미 로그인한 경우
 if(username)return <section className="account">
  <div className="page-head"><h2 className="h-page">{username}님</h2><p className="sub">로그인되어 있어요. 다른 기기에서도 이 아이디로 로그인하면 기록을 볼 수 있어요.</p></div>
  <div className="panel account-panel">
   {error&&<p className="demo-notice" role="alert">{error}</p>}
   <button className="btn btn-ghost account-submit" disabled={busy} onClick={logout}>로그아웃</button>
  </div>
 </section>;

 const isSignup=mode==='signup';
 return <section className="account">
  <div className="page-head"><h2 className="h-page">{isSignup?'회원가입':'로그인'}</h2>
   <p className="sub">{isSignup?'아이디와 비밀번호만 있으면 돼요. 지금까지 게스트로 쌓은 기록은 그대로 계정에 저장돼요.':'다른 브라우저나 기기에서 만든 기록을 불러와요.'}</p></div>
  <form className="panel account-panel" onSubmit={submit}>
   <div className="seg" role="group" aria-label="회원가입 또는 로그인">
    {[['signup','회원가입'],['login','로그인']].map(([m,label])=><button type="button" key={m} className={'seg-item'+(mode===m?' on':'')} aria-pressed={mode===m} onClick={()=>{setMode(m);setError('');}}>{label}</button>)}
   </div>
   <label className="label mt" htmlFor="acc-id">아이디</label>
   <div className="input"><input id="acc-id" autoComplete="username" placeholder="한글, 영문, 숫자, _ 3~20자" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} required minLength={3} maxLength={20}/></div>
   <label className="label mt" htmlFor="acc-pw">비밀번호</label>
   <div className="input"><input id="acc-pw" type="password" autoComplete={isSignup?'new-password':'current-password'} placeholder="6자 이상" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required minLength={6} maxLength={72}/></div>
   {error&&<p className="demo-notice" role="alert">{error}</p>}
   <button className="btn btn-primary account-submit" disabled={busy}>{busy?'처리 중…':isSignup?'가입하기':'로그인'}</button>
  </form>
 </section>;
}
