-- SayWhatYouKnow의 MySQL 테이블 구조입니다. (3NF)
-- 주의: setup.js가 세미콜론 기준으로 나눠 실행하므로 주석에 세미콜론을 쓰면 안 됩니다.

-- 1. 사용자 (게스트로 시작하고, 회원가입하면 아이디와 비밀번호가 채워짐)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,             -- 사용자 고유 ID (UUID)
  token_hash CHAR(64) NOT NULL UNIQUE, -- 세션 토큰의 SHA-256 해시
  username VARCHAR(20) NULL UNIQUE,    -- 회원 아이디. 게스트는 NULL
  password_hash VARCHAR(161) NULL      -- scrypt 비밀번호 해시 (솔트:해시). 게스트는 NULL
);

-- 2. 분야 (과학, 경제 등). id 순서대로 화면에 표시
CREATE TABLE IF NOT EXISTS fields (
  id TINYINT UNSIGNED PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE
);

-- 3. 난이도 (쉬움, 보통, 어려움). id 순서대로 화면에 표시
CREATE TABLE IF NOT EXISTS difficulties (
  id TINYINT UNSIGNED PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE
);

-- 4. 학습할 단어. 단어마다 한 행이며 분야와 난이도는 ID로 참조
CREATE TABLE IF NOT EXISTS words (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  word VARCHAR(100) NOT NULL UNIQUE,      -- 한국어 단어
  en VARCHAR(150) NOT NULL,               -- 영어 표기
  reference_text TEXT NOT NULL,           -- AI가 채점할 때 참고하는 핵심 개념
  field_id TINYINT UNSIGNED NOT NULL,     -- 분야
  difficulty_id TINYINT UNSIGNED NOT NULL, -- 난이도
  FOREIGN KEY (field_id) REFERENCES fields(id),
  FOREIGN KEY (difficulty_id) REFERENCES difficulties(id),
  INDEX field_difficulty (field_id, difficulty_id) -- 분야·난이도별 단어 조회에 사용
);

-- 5. 채점 항목과 배점 (정확성 40점 등). id 순서대로 화면에 표시
CREATE TABLE IF NOT EXISTS criteria (
  id TINYINT UNSIGNED PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,     -- AI 응답에서 쓰는 항목 키 (accuracy 등)
  name VARCHAR(30) NOT NULL,            -- 화면에 보이는 항목 이름
  max_score TINYINT UNSIGNED NOT NULL,  -- 배점
  description VARCHAR(200) NOT NULL     -- 평가 내용
);

-- 6. 사용자의 도전 진행 상태, 제출한 설명, AI의 글 피드백
CREATE TABLE IF NOT EXISTS challenges (
  id CHAR(36) PRIMARY KEY,       -- 도전 고유 ID (UUID)
  user_id CHAR(36) NOT NULL,     -- 도전한 사용자
  word_id INT UNSIGNED NOT NULL, -- 선택한 단어

  -- 단어 선택 → 학습 중 → 채점 중 → 완료
  status ENUM('selected', 'studying', 'grading', 'completed') NOT NULL DEFAULT 'selected',

  explanation TEXT,          -- 사용자가 제출한 설명
  comment VARCHAR(1000),     -- AI 총평
  good TEXT,                 -- 잘한 점
  hint TEXT,                 -- 빠진 개념에 대한 질문형 힌트
  hint_sub VARCHAR(1000),    -- 힌트 보조 설명
  misconception TEXT,        -- 잘못 이해한 부분
  started_at DATETIME(3),    -- 학습 시작 시각
  grading_at DATETIME(3),    -- 채점 시작 시각. 중단된 채점의 재시도 판단에 사용
  completed_at DATETIME(3),  -- 도전 완료 시각

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (word_id) REFERENCES words(id),
  INDEX user_history (user_id, completed_at) -- 사용자별 완료 기록 조회에 사용
);

-- 7. 도전별 항목 점수. 총점은 저장하지 않고 조회할 때 합산
CREATE TABLE IF NOT EXISTS challenge_scores (
  challenge_id CHAR(36) NOT NULL,
  criterion_id TINYINT UNSIGNED NOT NULL,
  score TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (challenge_id, criterion_id),
  FOREIGN KEY (challenge_id) REFERENCES challenges(id),
  FOREIGN KEY (criterion_id) REFERENCES criteria(id)
);

-- 8. 도전에 첨부한 참고 링크 (도전 1 : 링크 N)
CREATE TABLE IF NOT EXISTS reference_links (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  challenge_id CHAR(36) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id)
);
