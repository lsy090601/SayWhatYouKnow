// MySQL 연결 풀을 사용해 사용자, 단어, 도전 기록을 조회하고 저장합니다.

import mysql from 'mysql2/promise';
import {randomUUID} from 'node:crypto';
import {config} from './config.js';
// DB 접근 함수들을 묶은 저장소 객체를 만듭니다.
export function createRepository(){
 // 연결을 재사용하는 MySQL 연결 풀입니다.
 const pool=mysql.createPool(config.db);
 // 쿼리를 실행하고 첫 번째 행만 반환합니다.
 const one=async(sql,args=[]) => (await pool.execute(sql,args))[0][0];
 return {
 // 연결 풀 종료와 DB 연결 확인
 close:()=>pool.end(),health:()=>pool.query('SELECT 1'),
 // 토큰 해시로 사용자를 찾고 없으면 새로 만듭니다.
 async user(hash){
  await pool.execute('INSERT IGNORE INTO users (id,token_hash) VALUES (?,?)',[randomUUID(),hash]);
  return one('SELECT id FROM users WHERE token_hash=?',[hash]);
 },
 // 분야와 난이도에 맞는 단어를 조회합니다. 채점용 참고 내용은 제외합니다.
 async words(field,difficulty){return (await pool.execute('SELECT id,word,en,field,difficulty FROM words WHERE field=? AND difficulty=?',[field,difficulty]))[0];},
 // ID로 단어 하나를 조회합니다.
 word:id=>one('SELECT * FROM words WHERE id=?',[id]),
 // 새 도전을 만들고 ID를 반환합니다.
 async create(userId,wordId){const id=randomUUID();await pool.execute('INSERT INTO challenges (id,user_id,word_id) VALUES (?,?,?)',[id,userId,wordId]);return id;},
 // 사용자가 소유한 도전을 단어 정보, 참고 링크와 함께 조회합니다.
 async get(id,userId){
  const row=await one('SELECT c.*,w.word,w.en,w.field,w.difficulty,w.reference_text FROM challenges c JOIN words w ON w.id=c.word_id WHERE c.id=? AND c.user_id=?',[id,userId]);
  if(!row)return null;
  const [links]=await pool.execute('SELECT url FROM reference_links WHERE challenge_id=? ORDER BY id',[id]);
  // feedback이 문자열로 반환되면 객체로 변환합니다.
  if(typeof row.feedback==='string')row.feedback=JSON.parse(row.feedback);
  return {...row,links};
 },
 // 선택 상태의 도전을 학습 상태로 바꾸고 시작 시각을 기록합니다.
 start:(id,userId)=>pool.execute("UPDATE challenges SET status='studying',started_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND status='selected'",[id,userId]),
 // 채점 권한을 원자적으로 확보합니다. 5분 넘게 중단된 채점은 다시 가져올 수 있습니다.
 async claim(id,userId){const [r]=await pool.execute("UPDATE challenges SET status='grading',grading_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND (status='studying' OR (status='grading' AND grading_at < UTC_TIMESTAMP(3) - INTERVAL 5 MINUTE))",[id,userId]);return r.affectedRows===1;},
 // 채점에 실패하면 학습 상태로 되돌립니다.
 release:(id,userId)=>pool.execute("UPDATE challenges SET status='studying' WHERE id=? AND user_id=? AND status='grading'",[id,userId]),
 // 결과 저장과 링크 교체를 하나의 트랜잭션으로 처리합니다.
 async complete(id,userId,explanation,links,feedback){
  const db=await pool.getConnection();
  try{
   await db.beginTransaction();
   await db.execute("UPDATE challenges SET status='completed',explanation=?,feedback=?,total=?,completed_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND status='grading'",[explanation,JSON.stringify(feedback),feedback.total,id,userId]);
   // 기존 링크를 지우고 이번 제출의 링크로 교체합니다.
   await db.execute('DELETE FROM reference_links WHERE challenge_id=?',[id]);
   for(const url of links)await db.execute('INSERT INTO reference_links (challenge_id,url) VALUES (?,?)',[id,url]);
   await db.commit();
  }catch(e){await db.rollback();throw e;}finally{db.release();}
 },
 // 완료한 도전을 최신순으로 최대 100개 조회합니다.
 async history(userId){return (await pool.execute("SELECT c.id,c.total AS score,c.completed_at AS completedAt,w.word,w.en,w.field,w.difficulty FROM challenges c JOIN words w ON c.word_id=w.id WHERE c.user_id=? AND c.status='completed' ORDER BY c.completed_at DESC LIMIT 100",[userId]))[0];}
 };
}


