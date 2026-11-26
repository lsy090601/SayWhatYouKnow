// MySQL 연결 풀을 사용해 사용자, 단어, 채점 항목, 도전 기록을 조회하고 저장합니다.

import mysql from 'mysql2/promise';
import {randomUUID} from 'node:crypto';
import {config} from './config.js';
// 도전에 단어, 분야, 난이도 이름을 붙여 조회하는 공통 SQL입니다.
const CHALLENGE_SQL='SELECT c.*,w.word,w.en,w.reference_text,f.name AS field,d.name AS difficulty FROM challenges c JOIN words w ON w.id=c.word_id JOIN fields f ON f.id=w.field_id JOIN difficulties d ON d.id=w.difficulty_id';
// DB 접근 함수들을 묶은 저장소 객체를 만듭니다.
export function createRepository(){
 // 연결을 재사용하는 MySQL 연결 풀입니다.
 const pool=mysql.createPool(config.db);
 // 쿼리를 실행하고 모든 행 또는 첫 번째 행만 반환합니다.
 const all=async(sql,args=[]) => (await pool.execute(sql,args))[0];
 const one=async(sql,args=[]) => (await all(sql,args))[0];
 return {
 // 연결 풀 종료와 DB 연결 확인
 close:()=>pool.end(),health:()=>pool.query('SELECT 1'),
 // 토큰 해시로 사용자를 찾고 없으면 새로 만듭니다.
 async user(hash){
  await pool.execute('INSERT IGNORE INTO users (id,token_hash) VALUES (?,?)',[randomUUID(),hash]);
  return one('SELECT id,username FROM users WHERE token_hash=?',[hash]);
 },
 // 게스트 사용자에 아이디와 비밀번호를 붙여 회원으로 전환합니다. 기존 기록은 그대로 유지됩니다.
 async register(userId,username,passwordHash){const [r]=await pool.execute('UPDATE users SET username=?,password_hash=? WHERE id=? AND username IS NULL',[username,passwordHash,userId]);return r.affectedRows===1;},
 // 로그인할 때 아이디로 회원을 찾습니다.
 account:username=>one('SELECT id,username,password_hash FROM users WHERE username=?',[username]),
 // 회원의 세션 토큰을 새 토큰으로 바꿉니다. 이전 토큰은 더 이상 사용할 수 없습니다.
 setToken:(userId,hash)=>pool.execute('UPDATE users SET token_hash=? WHERE id=?',[hash,userId]),
 // 화면에서 고를 수 있는 분야와 난이도 이름을 순서대로 반환합니다.
 async options(){
  const [fields,difficulties]=await Promise.all([all('SELECT name FROM fields ORDER BY id'),all('SELECT name FROM difficulties ORDER BY id')]);
  return {fields:fields.map(r=>r.name),difficulties:difficulties.map(r=>r.name)};
 },
 // 채점 항목과 배점을 순서대로 반환합니다.
 criteria:()=>all('SELECT id,code,name,max_score,description FROM criteria ORDER BY id'),
 // 분야와 난이도에 맞는 단어를 조회합니다. 채점용 참고 내용은 제외합니다.
 words:(field,difficulty)=>all('SELECT w.id,w.word,w.en,f.name AS field,d.name AS difficulty FROM words w JOIN fields f ON f.id=w.field_id JOIN difficulties d ON d.id=w.difficulty_id WHERE f.name=? AND d.name=?',[field,difficulty]),
 // ID로 단어가 있는지 확인합니다.
 word:id=>one('SELECT id FROM words WHERE id=?',[id]),
 // 새 도전을 만들고 ID를 반환합니다.
 async create(userId,wordId){const id=randomUUID();await pool.execute('INSERT INTO challenges (id,user_id,word_id) VALUES (?,?,?)',[id,userId,wordId]);return id;},
 // 사용자가 소유한 도전을 단어 정보, 참고 링크, 항목별 점수와 함께 조회합니다.
 async get(id,userId){
  const row=await one(CHALLENGE_SQL+' WHERE c.id=? AND c.user_id=?',[id,userId]);
  if(!row)return null;
  const links=await all('SELECT url FROM reference_links WHERE challenge_id=? ORDER BY id',[id]);
  let feedback=null;
  // 완료된 도전은 항목별 점수를 채점 항목과 합쳐 피드백으로 만들고, 총점은 점수를 더해 계산합니다.
  if(row.status==='completed'){
   const scores=(await all('SELECT cr.code AS `key`,cr.name,cr.max_score AS max,s.score FROM challenge_scores s JOIN criteria cr ON cr.id=s.criterion_id WHERE s.challenge_id=? ORDER BY cr.id',[id]));
   feedback={scores,total:scores.reduce((sum,s)=>sum+s.score,0),comment:row.comment,good:row.good,hint:row.hint,hintSub:row.hint_sub||'',misconception:row.misconception};
  }
  return {...row,links,feedback};
 },
 // 선택 상태의 도전을 학습 상태로 바꾸고 시작 시각을 기록합니다.
 start:(id,userId)=>pool.execute("UPDATE challenges SET status='studying',started_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND status='selected'",[id,userId]),
 // 채점 권한을 원자적으로 확보합니다. 5분 넘게 중단된 채점은 다시 가져올 수 있습니다.
 async claim(id,userId){const [r]=await pool.execute("UPDATE challenges SET status='grading',grading_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND (status='studying' OR (status='grading' AND grading_at < UTC_TIMESTAMP(3) - INTERVAL 5 MINUTE))",[id,userId]);return r.affectedRows===1;},
 // 채점에 실패하면 학습 상태로 되돌립니다.
 release:(id,userId)=>pool.execute("UPDATE challenges SET status='studying' WHERE id=? AND user_id=? AND status='grading'",[id,userId]),
 // 글 피드백, 항목별 점수, 참고 링크 저장을 하나의 트랜잭션으로 처리합니다.
 async complete(id,userId,explanation,links,feedback){
  const db=await pool.getConnection();
  try{
   await db.beginTransaction();
   const [r]=await db.execute("UPDATE challenges SET status='completed',explanation=?,comment=?,good=?,hint=?,hint_sub=?,misconception=?,completed_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND status='grading'",[explanation,feedback.comment,feedback.good,feedback.hint,feedback.hintSub,feedback.misconception,id,userId]);
   // 채점 중 상태가 아니면 아무것도 저장하지 않습니다.
   if(r.affectedRows!==1){await db.rollback();return;}
   // 항목 키(accuracy 등)로 채점 항목 ID를 찾아 점수를 저장합니다.
   for(const [code,score] of Object.entries(feedback.scores))await db.execute('INSERT INTO challenge_scores (challenge_id,criterion_id,score) SELECT ?,id,? FROM criteria WHERE code=?',[id,score,code]);
   // 기존 링크를 지우고 이번 제출의 링크로 교체합니다.
   await db.execute('DELETE FROM reference_links WHERE challenge_id=?',[id]);
   for(const url of links)await db.execute('INSERT INTO reference_links (challenge_id,url) VALUES (?,?)',[id,url]);
   await db.commit();
  }catch(e){await db.rollback();throw e;}finally{db.release();}
 },
 // 완료한 도전을 최신순으로 최대 100개 조회합니다. 점수는 항목별 점수를 더해 계산합니다.
 async history(userId){
  const rows=await all("SELECT c.id,(SELECT SUM(s.score) FROM challenge_scores s WHERE s.challenge_id=c.id) AS score,c.completed_at AS completedAt,w.word,w.en,f.name AS field,d.name AS difficulty FROM challenges c JOIN words w ON w.id=c.word_id JOIN fields f ON f.id=w.field_id JOIN difficulties d ON d.id=w.difficulty_id WHERE c.user_id=? AND c.status='completed' ORDER BY c.completed_at DESC LIMIT 100",[userId]);
  // SUM 결과는 문자열로 올 수 있어 숫자로 바꿉니다.
  return rows.map(r=>({...r,score:Number(r.score||0)}));
 }
 };
}
