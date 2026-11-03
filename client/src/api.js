// 같은 출처의 API에 요청하고 서버 오류를 화면에서 사용할 메시지로 전달합니다.

export async function api(path,options={}){
 let response;
 try{response=await fetch('/api'+path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers}});}
 catch{throw new Error('서버에 연결하지 못했어요. 백엔드가 실행 중인지 확인해 주세요.');}
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(body?.error||'요청을 처리하지 못했어요.');
 if(!body)throw new Error('API 응답이 올바르지 않아요. 백엔드 실행 상태를 확인해 주세요.');
 return body;
}
export const post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body)});

