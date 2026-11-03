// DB 저장소와 Express 앱을 연결해 서버를 시작하고 종료 신호를 처리합니다.

import {createApp} from './app.js';
import {createRepository} from './repository.js';
import {config} from './config.js';
const repo=createRepository();
const app=createApp({repo});
const server=app.listen(config.port,config.host,()=>console.log('API: http://'+config.host+':'+config.port));
async function shutdown(){server.close();await repo.close();process.exit(0);}
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);

