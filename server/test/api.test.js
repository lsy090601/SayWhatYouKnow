// 테스트용 저장소와 채점기를 사용해 API 흐름과 접근 제한을 검증합니다.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../src/app.js';
import {feedbackSchema,HttpError} from '../src/validation.js';
const feedback={scores:{accuracy:34,concepts:22,clarity:18,logic:8},comment:'평가',good:'잘한 점',hint:'어떤 관계일까요?',hintSub:'다시 찾아보세요',misconception:'명확한 오류 없음',total:82};
function memoryRepo(){
 const users=new Map(),items=new Map();
 const word={id:1,word:'엔트로피',en:'Entropy',field:'과학',difficulty:'보통',reference_text:'고립계의 전체 엔트로피는 감소하지 않는다.'};
 return {
 async health(){},async user(hash){if(!users.has(hash))users.set(hash,{id:randomUUID()});return users.get(hash);},
 async words(field,difficulty){return field===word.field&&difficulty===word.difficulty?[{...word,reference_text:undefined}]:[];},
 async word(id){return id===1?word:null;},
 async create(userId,wordId){const id=randomUUID();items.set(id,{...word,id,word_id:wordId,user_id:userId,status:'selected',links:[]});return id;},
 async get(id,userId){const c=items.get(id);return c?.user_id===userId?{...c}:null;},
 async start(id,userId){const c=items.get(id);if(c?.user_id===userId&&c.status==='selected'){c.status='studying';c.started_at=new Date();}},
 async claim(id,userId){const c=items.get(id);if(c?.user_id!==userId||c.status!=='studying')return false;c.status='grading';return true;},
 async release(id,userId){const c=items.get(id);if(c?.user_id===userId)c.status='studying';},
 async complete(id,userId,explanation,links,fb){const c=items.get(id);assert.equal(c.user_id,userId);Object.assign(c,{status:'completed',explanation,links:links.map(url=>({url})),feedback:fb,total:fb.total,completed_at:new Date()});},
 async history(userId){return [...items.values()].filter(c=>c.user_id===userId&&c.status==='completed').map(c=>({id:c.id,word:c.word,score:c.total,completedAt:c.completed_at}));}
 };
}
test('API workflow, ownership, validation, failures and idempotency',{timeout:20000},async t=>{
 const repo=memoryRepo();let calls=0,fail=false,wait;
 const app=createApp({repo,rateLimits:false,grade:async()=>{calls++;if(fail)throw new HttpError(502,'AI unavailable');if(wait)await wait;return feedback;}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(()=>{server.closeAllConnections();server.close();});
 const base='http://127.0.0.1:'+server.address().port;
 function client(){let cookie='';return async(path,body,extra={})=>{
  const response=await fetch(base+'/api'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Cookie:cookie,...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
  if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
  return {status:response.status,body:await response.json(),cookie};
 };}
 const a=client(),b=client();
 const words=await a('/words?field=과학&difficulty=보통');
 assert.equal(words.status,200);assert.equal(words.body.words.length,1);assert.equal(words.body.words[0].reference_text,undefined);
 assert.match(words.cookie,/swk_session=/);
 assert.equal((await a('/words?field=악성&difficulty=보통')).status,400);
 assert.equal((await a('/challenges',{wordId:999})).status,404);
 assert.equal((await a('/challenges',{wordId:1},{Origin:'https://evil.example'})).status,403);
 let c=await a('/challenges',{wordId:1});assert.equal(c.status,201);const id=c.body.id;
 assert.equal((await b('/challenges/'+id)).status,404);
 assert.equal((await b('/challenges/'+id+'/start',{pledged:true})).status,404);
 const payload={explanation:'엔트로피는 고립계의 상태 변화와 관련 있는 물리량입니다.',links:['https://example.com/reference']};
 assert.equal((await a('/challenges/'+id+'/submit',payload)).status,409);
 assert.equal((await a('/challenges/'+id+'/start',{pledged:false})).status,400);
 assert.equal((await a('/challenges/'+id+'/start',{pledged:true})).status,200);
 assert.equal((await a('/challenges/'+id+'/submit',{...payload,explanation:'짧음'})).status,400);
 assert.equal((await a('/challenges/'+id+'/submit',{...payload,links:['javascript:alert(1)']})).status,400);
 fail=true;assert.equal((await a('/challenges/'+id+'/submit',payload)).status,502);assert.equal((await a('/challenges/'+id)).body.status,'studying');
 fail=false;const result=await a('/challenges/'+id+'/submit',payload);
 assert.equal(result.status,200);assert.equal(result.body.feedback.total,82);assert.equal(result.body.links.length,1);assert.equal(result.body.reference_text,undefined);
 assert.equal((await a('/challenges/'+id+'/submit',payload)).status,200);assert.equal(calls,2);
 assert.equal((await a('/history')).body.stats.total,1);assert.equal((await b('/history')).body.stats.total,0);
 c=await a('/challenges',{wordId:1});await a('/challenges/'+c.body.id+'/start',{pledged:true});
 let release;wait=new Promise(r=>{release=r;});const pending=a('/challenges/'+c.body.id+'/submit',payload);
 while(calls<3)await new Promise(r=>setTimeout(r,5));
 assert.equal((await a('/challenges/'+c.body.id+'/submit',payload)).status,409);release();await pending;
});
test('feedback rejects out-of-range scores',()=>{
 assert.equal(feedbackSchema.safeParse({...feedback,total:undefined}).success,false);
 const {total,...valid}=feedback;
 assert.equal(feedbackSchema.safeParse(valid).success,true);
 assert.equal(feedbackSchema.safeParse({...valid,scores:{...valid.scores,accuracy:41}}).success,false);
});


test('missing API key fails explicitly without a network request',async()=>{
 const {grade}=await import('../src/grader.js');
 const saved=process.env.GEMINI_API_KEY;
 delete process.env.GEMINI_API_KEY;
 try {await assert.rejects(()=>grade({word:'엔트로피',field:'과학',reference_text:'기준',explanation:'설명'}),error=>error.status===503);}
 finally {if(saved===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=saved;}
});

test('health reports database unavailability without leaking credentials',{timeout:10000},async t=>{
 const app=createApp({repo:{health:async()=>{throw new Error('private connection information');}},rateLimits:false});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(()=>{server.closeAllConnections();server.close();});
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/health',{signal:AbortSignal.timeout(5000)});
 assert.equal(response.status,503);assert.equal(JSON.stringify(await response.json()).includes('private connection'),false);
});
