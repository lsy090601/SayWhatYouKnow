// API 요청을 받아 게스트 세션, 단어 조회, 도전 진행 및 채점 결과를 처리합니다.

import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {randomBytes,createHash} from 'node:crypto';
import {config} from './config.js';
import {grade as defaultGrade} from './grader.js';
import {parse,newChallenge,wordQuery,submission,HttpError} from './validation.js';
// 응답에 공개할 도전 정보만 골라 채점용 참고 설명과 내부 식별 정보를 제외합니다.
const publicChallenge=c=>({
 id:c.id,field:c.field,difficulty:c.difficulty,word:{id:c.word_id,word:c.word,en:c.en},
 explanation:c.explanation||'',links:c.links.map(l=>({url:l.url,host:new URL(l.url).hostname})),
 feedback:c.feedback||null,status:c.status,startedAt:c.started_at||null,completedAt:c.completed_at||null
});
export function createApp({repo,grade=defaultGrade,rateLimits=true}){
 const app=express();
 app.disable('x-powered-by');
 app.use(helmet());
 app.use(express.json({limit:'48kb'}));
 app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 // 사용자 세션 없이 DB 연결 상태를 확인합니다.
 app.get('/api/health',async(_req,res)=>{
  try{await repo.health();res.json({status:'ok',database:'connected',aiConfigured:process.env.AI_PROVIDER === 'ollama' || Boolean(process.env.GEMINI_API_KEY)});}
  catch{res.status(503).json({status:'unavailable',error:'MySQL 연결을 확인하고 npm run db:init을 실행해 주세요.'});}
 });
 if(rateLimits)app.use('/api',rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'요청이 많아요. 잠시 후 다시 시도해 주세요.'}}));
 app.use('/api',async(req,res,next)=>{
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin){
   const allowed=new Set(config.production?[config.origin]:[config.origin,'http://localhost:5173','http://127.0.0.1:5173']);
   if(!allowed.has(req.headers.origin))throw new HttpError(403,'허용되지 않은 요청 출처입니다.');
  }
  // 게스트 쿠키가 없거나 형식이 잘못되면 새 토큰을 발급하고 DB에는 해시를 사용합니다.
  let token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('swk_session='))?.slice(12);
  if(!token||! /^[a-f0-9]{64}$/.test(token)){
   token=randomBytes(32).toString('hex');
   res.cookie('swk_session',token,{httpOnly:true,sameSite:'strict',secure:config.production,maxAge:31536000000,path:'/api'});
  }
  req.user=await repo.user(createHash('sha256').update(token).digest('hex'));
  next();
 });
 app.get('/api/words',async(req,res)=>{const q=parse(wordQuery,req.query);res.json({words:await repo.words(q.field,q.difficulty)});});
 app.post('/api/challenges',async(req,res)=>{
  const {wordId}=parse(newChallenge,req.body);
  if(!await repo.word(wordId))throw new HttpError(404,'단어를 찾지 못했어요.');
  const id=await repo.create(req.user.id,wordId);
  res.status(201).json(publicChallenge(await repo.get(id,req.user.id)));
 });
 const get=async req=>{
  if(!/^[0-9a-f-]{36}$/.test(req.params.id))throw new HttpError(400,'도전 ID가 올바르지 않습니다.');
  const c=await repo.get(req.params.id,req.user.id);
  if(!c)throw new HttpError(404,'도전 기록을 찾지 못했어요.');
  return c;
 };
 app.get('/api/challenges/:id',async(req,res)=>res.json(publicChallenge(await get(req))));
 app.post('/api/challenges/:id/start',async(req,res)=>{
  await get(req);if(req.body?.pledged!==true)throw new HttpError(400,'AI 미사용 서약에 동의해 주세요.');
  await repo.start(req.params.id,req.user.id);
  res.json(publicChallenge(await get(req)));
 });
 const gradingLimit=rateLimit({windowMs:60000,limit:5,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'채점 요청이 많아요. 잠시 후 다시 제출해 주세요.'}});
 app.post('/api/challenges/:id/submit',...(rateLimits?[gradingLimit]:[]),async(req,res)=>{
  const body=parse(submission,req.body);
  const c=await get(req);
  if(c.status==='completed')return res.json(publicChallenge(c));
  if(!c.started_at)throw new HttpError(409,'학습 서약 후 시작해 주세요.');
  // 채점권을 확보한 요청만 AI를 호출해 중복 제출을 방지합니다.
  if(!await repo.claim(c.id,req.user.id))throw new HttpError(409,'이미 채점 중이에요. 잠시 후 기록을 확인해 주세요.');
  try{
   const feedback=await grade({...c,explanation:body.explanation});
   await repo.complete(c.id,req.user.id,body.explanation,[...new Set(body.links)],feedback);
  // 채점 실패 시 공부 중 상태로 되돌려 다시 제출할 수 있게 합니다.
  }catch(error){await repo.release(c.id,req.user.id);throw error;}
  res.json(publicChallenge(await get(req)));
 });
 app.get('/api/history',async(req,res)=>{
  const items=await repo.history(req.user.id);
  const scores=items.map(i=>i.score);
  res.json({items,stats:{total:items.length,average:items.length?Math.round(scores.reduce((a,b)=>a+b,0)/items.length):0,best:items.length?Math.max(...scores):0}});
 });
 app.use('/api',(_req,_res,next)=>next(new HttpError(404,'API 경로를 찾지 못했어요.')));
 app.use((error,_req,res,_next)=>{
  const status=error.status||(['ECONNREFUSED','ER_ACCESS_DENIED_ERROR','ER_BAD_DB_ERROR','ER_NO_SUCH_TABLE','ETIMEDOUT'].includes(error.code)?503:500);
  if(status>=500)console.error('API error:',error.code||error.name);
  res.status(status).json({error:status===503&&!error.status?'MySQL 연결 설정과 데이터베이스 초기화를 확인해 주세요.':error.status&&status<500||error instanceof HttpError?error.message:'서버에서 요청을 처리하지 못했어요.'});
 });
 return app;
}


