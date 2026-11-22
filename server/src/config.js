// 서버 주소와 MySQL 연결 설정을 환경 변수에서 읽습니다.

export const config = {
 // 서버 주소, 실행 환경, 허용할 프런트엔드 출처
 host: process.env.HOST || '127.0.0.1', port: Number(process.env.PORT || 3001),
 production: process.env.NODE_ENV === 'production', origin: process.env.APP_ORIGIN || 'http://localhost:5173',
 // MySQL 연결 풀 설정. 시간대는 UTC를 사용합니다.
 db: {host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'saywhatyouknow',charset:'utf8mb4',timezone:'Z',connectTimeout:5000,connectionLimit:5}
};

