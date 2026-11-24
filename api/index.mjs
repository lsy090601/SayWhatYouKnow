// Vercel 서버리스 함수 진입점입니다. 기존 Express 앱을 그대로 요청 처리기로 내보냅니다.

import {createApp} from '../server/src/app.js';
import {createRepository} from '../server/src/repository.js';

// 함수 인스턴스가 살아 있는 동안 DB 연결 풀을 재사용합니다.
export default createApp({repo:createRepository()});
