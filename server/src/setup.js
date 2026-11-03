// MySQL에 데이터베이스와 테이블을 준비하고 초기 단어를 등록합니다.

import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {config} from './config.js';
import {seedWords} from './seed.js';
if(!/^[a-zA-Z0-9_]+$/.test(config.db.database)) throw new Error('DB_NAME에는 영문, 숫자, 밑줄만 허용됩니다.');
const {database,connectionLimit,...options}=config.db;
const db=await mysql.createConnection(options);
try{
 await db.query('CREATE DATABASE IF NOT EXISTS '+db.escapeId(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 await db.changeUser({database});
 const sql=await readFile(new URL('../schema.sql',import.meta.url),'utf8');
 for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)) await db.query(statement);
 for(const w of seedWords) await db.execute('INSERT INTO words (word,en,field,difficulty,reference_text) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE en=VALUES(en),reference_text=VALUES(reference_text)',[w.word,w.en,w.field,w.difficulty,w.reference]);
 console.log('DB 준비 완료: '+seedWords.length+'개 단어');
}finally{await db.end();}

