// Vite 개발 서버를 설정하고 API 요청을 백엔드로 전달합니다.

import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
// React 플러그인을 사용하고 개발 중 /api 요청을 3001번 포트의 백엔드로 전달합니다.
export default defineConfig({plugins:[react()],server:{proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:true}}}});
