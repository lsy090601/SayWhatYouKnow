// 현재 도전 상태를 여러 화면에서 공유하고 탭의 세션 저장소에 보관합니다.

import {createContext,useCallback,useContext,useEffect,useState} from 'react';
const ChallengeContext=createContext(null);
const INITIAL={id:null,field:'과학',difficulty:'보통',word:null,links:[],explanation:'',feedback:null,startedAt:null};
function load(){try{const saved=JSON.parse(sessionStorage.getItem('swk_challenge'));return saved&&typeof saved==='object'?{...INITIAL,...saved}:INITIAL;}catch{return INITIAL;}}
export function ChallengeProvider({children}){
 const [challenge,setChallenge]=useState(load);
 const update=useCallback(patch=>setChallenge(c=>({...c,...patch})),[]);
 const reset=useCallback(()=>setChallenge(INITIAL),[]);
 useEffect(()=>{try{sessionStorage.setItem('swk_challenge',JSON.stringify(challenge));}catch{/* Storage may be unavailable. */}},[challenge]);
 return <ChallengeContext.Provider value={{challenge,update,reset}}>{children}</ChallengeContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useChallenge(){return useContext(ChallengeContext);}

