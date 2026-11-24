// 현재 로그인한 아이디를 여러 화면에서 공유합니다. 게스트면 username이 null입니다.

import {createContext,useContext,useEffect,useState} from 'react';
import {api} from './api';
// 로그인 상태를 전달하는 React Context입니다.
const AuthContext=createContext(null);
// 처음 열 때 서버에 현재 사용자를 물어보고, 로그인/로그아웃 후에는 setUsername으로 갱신합니다.
export function AuthProvider({children}){
 const [username,setUsername]=useState(null);
 useEffect(()=>{let active=true;api('/me').then(d=>{if(active)setUsername(d.username);}).catch(()=>{});return()=>{active=false;};},[]);
 return <AuthContext.Provider value={{username,setUsername}}>{children}</AuthContext.Provider>;
}
// 컴포넌트에서 로그인 상태를 꺼내 쓰기 위한 훅입니다.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(){return useContext(AuthContext);}
