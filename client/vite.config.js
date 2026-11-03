// Vite 개발 서버를 설정하고 API 요청을 백엔드로 전달합니다.

import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:true}}}});
