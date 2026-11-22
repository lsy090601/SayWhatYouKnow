// MySQL에 데이터베이스와 테이블을 준비하고 초기 단어를 등록합니다.

import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {config} from './config.js';
import {seedWords} from './seed.js';
// CREATE DATABASE에 직접 들어가는 DB 이름의 문자를 제한합니다.
if(!/^[a-zA-Z0-9_]+$/.test(config.db.database)) throw new Error('DB_NAME에는 영문, 숫자, 밑줄만 허용됩니다.');
// DB가 아직 없을 수 있으므로 database 옵션을 빼고 접속합니다.
const {database,connectionLimit,...options}=config.db;
const db=await mysql.createConnection(options);
try{
 // 데이터베이스가 없으면 만들고 해당 DB로 전환합니다.
 await db.query('CREATE DATABASE IF NOT EXISTS '+db.escapeId(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 await db.changeUser({database});
 // 테이블 구조 파일을 읽습니다.
 const sql=await readFile(new URL('../schema.sql',import.meta.url),'utf8');
 // 세미콜론을 기준으로 나눠 실행하므로 schema.sql의 주석에 세미콜론을 쓰면 안 됩니다.
 for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)) await db.query(statement);
 // 단어를 등록합니다. 이미 있으면 영어 표기와 참고 설명만 갱신합니다.
 for(const w of seedWords) await db.execute('INSERT INTO words (word,en,field,difficulty,reference_text) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE en=VALUES(en),reference_text=VALUES(reference_text)',[w.word,w.en,w.field,w.difficulty,w.reference]);
 console.log('DB 준비 완료: '+seedWords.length+'개 단어');
}finally{await db.end();}

