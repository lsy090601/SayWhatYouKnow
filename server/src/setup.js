// MySQL에 데이터베이스와 테이블을 준비하고 분야, 난이도, 채점 항목, 단어를 등록합니다.

import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {config} from './config.js';
import {seedFields,seedDifficulties,seedCriteria,seedWords} from './seed.js';
// CREATE DATABASE에 직접 들어가는 DB 이름의 문자를 제한합니다.
if(!/^[a-zA-Z0-9_]+$/.test(config.db.database)) throw new Error('DB_NAME에는 영문, 숫자, 밑줄만 허용됩니다.');
// DB가 아직 없을 수 있으므로 database 옵션을 빼고 접속합니다.
const {database,connectionLimit,...options}=config.db;
const db=await mysql.createConnection(options);
// 테이블의 열 이름 목록을 조회합니다. 테이블이 없으면 빈 집합입니다.
const columnsOf=async table=>new Set((await db.query('SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',[database,table]))[0].map(c=>c.name));
try{
 // 데이터베이스가 없으면 만들고 해당 DB로 전환합니다.
 await db.query('CREATE DATABASE IF NOT EXISTS '+db.escapeId(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 await db.changeUser({database});
 // 정규화 이전 구조(피드백 JSON 열)가 남아 있으면 도전·링크·단어 테이블을 새 구조로 다시 만듭니다. 회원 계정은 유지합니다.
 if((await columnsOf('challenges')).has('feedback')){
  for(const table of ['reference_links','challenges','words'])await db.query('DROP TABLE '+table);
  console.log('이전 구조의 도전 기록과 단어 테이블을 새 구조로 다시 만듭니다.');
 }
 // 이전 구조의 users 테이블을 새 구조에 맞춥니다.
 const userColumns=await columnsOf('users');
 if(userColumns.size){
  if(!userColumns.has('username'))await db.query('ALTER TABLE users ADD COLUMN username VARCHAR(20) NULL UNIQUE');
  if(!userColumns.has('password_hash'))await db.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(161) NULL');
  if(userColumns.has('created_at'))await db.query('ALTER TABLE users DROP COLUMN created_at');
 }
 // 테이블 구조 파일을 세미콜론 기준으로 나눠 실행합니다.
 const sql=await readFile(new URL('../schema.sql',import.meta.url),'utf8');
 for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)) await db.query(statement);
 // 분야, 난이도, 채점 항목을 등록합니다. 배열 순서(1부터)가 ID입니다.
 for(const [i,name] of seedFields.entries())await db.execute('INSERT INTO fields (id,name) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)',[i+1,name]);
 for(const [i,name] of seedDifficulties.entries())await db.execute('INSERT INTO difficulties (id,name) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)',[i+1,name]);
 for(const [i,c] of seedCriteria.entries())await db.execute('INSERT INTO criteria (id,code,name,max_score,description) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE code=VALUES(code),name=VALUES(name),max_score=VALUES(max_score),description=VALUES(description)',[i+1,c.code,c.name,c.max,c.desc]);
 // 단어를 등록합니다. 이미 있으면 나머지 정보를 갱신합니다.
 for(const w of seedWords) await db.execute('INSERT INTO words (word,en,reference_text,field_id,difficulty_id) VALUES (?,?,?,(SELECT id FROM fields WHERE name=?),(SELECT id FROM difficulties WHERE name=?)) ON DUPLICATE KEY UPDATE en=VALUES(en),reference_text=VALUES(reference_text),field_id=VALUES(field_id),difficulty_id=VALUES(difficulty_id)',[w.word,w.en,w.reference,w.field,w.difficulty]);
 console.log('DB 준비 완료: 분야 '+seedFields.length+'개, 난이도 '+seedDifficulties.length+'개, 채점 항목 '+seedCriteria.length+'개, 단어 '+seedWords.length+'개');
}finally{await db.end();}
