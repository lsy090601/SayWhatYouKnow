// DB 저장소와 Express 앱을 연결해 서버를 시작하고 종료 신호를 처리합니다.

import {createApp} from './app.js';
import {createRepository} from './repository.js';
import {config} from './config.js';
// 실제 MySQL 저장소로 앱을 만듭니다.
const repo=createRepository();
const app=createApp({repo});
// 설정한 주소와 포트에서 요청을 받습니다.
const server=app.listen(config.port,config.host,()=>console.log('API: http://'+config.host+':'+config.port));
// 서버와 DB 연결을 닫고 프로세스를 종료합니다.
async function shutdown(){server.close();await repo.close();process.exit(0);}
// Ctrl+C나 종료 신호를 받으면 한 번만 정리 작업을 실행합니다.
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);

