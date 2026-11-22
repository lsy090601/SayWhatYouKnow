// 현재 도전 상태를 여러 화면에서 공유하고 탭의 세션 저장소에 보관합니다.

import {createContext,useCallback,useContext,useEffect,useState} from 'react';
// 도전 상태를 전달하는 React Context입니다.
const ChallengeContext=createContext(null);
// 새 도전을 시작할 때의 기본 상태입니다.
const INITIAL={id:null,field:'과학',difficulty:'보통',word:null,links:[],explanation:'',feedback:null,startedAt:null};
// 세션 저장소의 값을 복원합니다. 값이 없거나 손상됐으면 기본 상태를 사용합니다.
function load(){try{const saved=JSON.parse(sessionStorage.getItem('swk_challenge'));return saved&&typeof saved==='object'?{...INITIAL,...saved}:INITIAL;}catch{return INITIAL;}}
// 하위 컴포넌트에 도전 상태와 변경 함수를 제공합니다.
export function ChallengeProvider({children}){
 const [challenge,setChallenge]=useState(load);
 // 전달받은 필드만 기존 상태에 덮어씁니다.
 const update=useCallback(patch=>setChallenge(c=>({...c,...patch})),[]);
 // 도전 상태를 기본값으로 되돌립니다.
 const reset=useCallback(()=>setChallenge(INITIAL),[]);
 // 상태가 바뀔 때마다 세션 저장소에 저장해 새로고침해도 유지합니다.
 useEffect(()=>{try{sessionStorage.setItem('swk_challenge',JSON.stringify(challenge));}catch{/* Storage may be unavailable. */}},[challenge]);
 return <ChallengeContext.Provider value={{challenge,update,reset}}>{children}</ChallengeContext.Provider>;
}
// 컴포넌트에서 도전 상태를 간단히 꺼내 쓰기 위한 훅입니다.
// eslint-disable-next-line react-refresh/only-export-components
export function useChallenge(){return useContext(ChallengeContext);}

