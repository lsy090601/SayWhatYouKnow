// 같은 출처의 API에 요청하고 서버 오류를 화면에서 사용할 메시지로 전달합니다.

// /api 경로로 요청을 보내고 성공 시 JSON 본문을 반환합니다.
export async function api(path,options={}){
 let response;
 // 같은 출처의 게스트 세션 쿠키를 포함해 JSON 요청을 보냅니다.
 try{response=await fetch('/api'+path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers}});}
 // 요청 자체가 실패하면 서버에 연결하지 못한 경우로 안내합니다.
 catch{throw new Error('서버에 연결하지 못했어요. 백엔드가 실행 중인지 확인해 주세요.');}
 // JSON이 아닌 응답은 null로 처리합니다.
 const body=await response.json().catch(()=>null);
 // 오류 응답이면 서버가 보낸 메시지를 그대로 화면에 전달합니다.
 if(!response.ok)throw new Error(body?.error||'요청을 처리하지 못했어요.');
 // 성공 상태인데 JSON 본문이 없으면 잘못된 응답으로 처리합니다.
 if(!body)throw new Error('API 응답이 올바르지 않아요. 백엔드 실행 상태를 확인해 주세요.');
 return body;
}
// JSON 본문을 담아 POST 요청을 보내는 단축 함수입니다.
export const post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body)});

