// MySQL 연결 풀을 사용해 사용자, 단어, 도전 기록을 조회하고 저장합니다.

import mysql from 'mysql2/promise';
import {randomUUID} from 'node:crypto';
import {config} from './config.js';
export function createRepository(){
 const pool=mysql.createPool(config.db);
 const one=async(sql,args=[]) => (await pool.execute(sql,args))[0][0];
 return {
 close:()=>pool.end(),health:()=>pool.query('SELECT 1'),
 async user(hash){
  await pool.execute('INSERT IGNORE INTO users (id,token_hash) VALUES (?,?)',[randomUUID(),hash]);
  return one('SELECT id FROM users WHERE token_hash=?',[hash]);
 },
 async words(field,difficulty){return (await pool.execute('SELECT id,word,en,field,difficulty FROM words WHERE field=? AND difficulty=?',[field,difficulty]))[0];},
 word:id=>one('SELECT * FROM words WHERE id=?',[id]),
 async create(userId,wordId){const id=randomUUID();await pool.execute('INSERT INTO challenges (id,user_id,word_id) VALUES (?,?,?)',[id,userId,wordId]);return id;},
 async get(id,userId){
  const row=await one('SELECT c.*,w.word,w.en,w.field,w.difficulty,w.reference_text FROM challenges c JOIN words w ON w.id=c.word_id WHERE c.id=? AND c.user_id=?',[id,userId]);
  if(!row)return null;
  const [links]=await pool.execute('SELECT url FROM reference_links WHERE challenge_id=? ORDER BY id',[id]);
  if(typeof row.feedback==='string')row.feedback=JSON.parse(row.feedback);
  return {...row,links};
 },
 start:(id,userId)=>pool.execute("UPDATE challenges SET status='studying',started_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND status='selected'",[id,userId]),
 async claim(id,userId){const [r]=await pool.execute("UPDATE challenges SET status='grading',grading_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND (status='studying' OR (status='grading' AND grading_at < UTC_TIMESTAMP(3) - INTERVAL 5 MINUTE))",[id,userId]);return r.affectedRows===1;},
 release:(id,userId)=>pool.execute("UPDATE challenges SET status='studying' WHERE id=? AND user_id=? AND status='grading'",[id,userId]),
 async complete(id,userId,explanation,links,feedback){
  const db=await pool.getConnection();
  try{
   await db.beginTransaction();
   await db.execute("UPDATE challenges SET status='completed',explanation=?,feedback=?,total=?,completed_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND status='grading'",[explanation,JSON.stringify(feedback),feedback.total,id,userId]);
   await db.execute('DELETE FROM reference_links WHERE challenge_id=?',[id]);
   for(const url of links)await db.execute('INSERT INTO reference_links (challenge_id,url) VALUES (?,?)',[id,url]);
   await db.commit();
  }catch(e){await db.rollback();throw e;}finally{db.release();}
 },
 async history(userId){return (await pool.execute("SELECT c.id,c.total AS score,c.completed_at AS completedAt,w.word,w.en,w.field,w.difficulty FROM challenges c JOIN words w ON c.word_id=w.id WHERE c.user_id=? AND c.status='completed' ORDER BY c.completed_at DESC LIMIT 100",[userId]))[0];}
 };
}


