-- 사용자, 단어 및 도전 기록을 저장하는 MySQL 테이블의 구조입니다.

-- 1. 사용자 저장 (게스트로 시작하고, 회원가입하면 아이디와 비밀번호가 채워짐)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,      -- 사용자 고유 ID (UUID)
  token_hash CHAR(64) NOT NULL UNIQUE, -- 세션 토큰의 해시. 중복 불가
  username VARCHAR(20) NULL UNIQUE,    -- 회원 아이디. 게스트는 NULL
  password_hash VARCHAR(161) NULL,     -- scrypt 비밀번호 해시 (솔트:해시). 게스트는 NULL
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP -- 사용자 생성 시각
);

-- 2. 학습할 단어와 채점용 참고 내용 저장
CREATE TABLE IF NOT EXISTS words (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- 자동으로 증가하는 단어 ID
  word VARCHAR(100) NOT NULL,     -- 한국어 단어
  en VARCHAR(150) NOT NULL,       -- 영어 표기
  field VARCHAR(30) NOT NULL,     -- 분야 (예: 과학, 경제)
  difficulty VARCHAR(20) NOT NULL, -- 난이도 (예: 쉬움, 보통, 어려움)
  reference_text TEXT NOT NULL,   -- AI가 채점할 때 참고하는 핵심 개념

  -- 같은 단어가 같은 분야와 난이도에 중복 등록되는 것을 방지
  UNIQUE KEY unique_word (word, field, difficulty)
);

-- 3. 사용자의 도전 진행 상태, 제출 내용, 채점 결과 저장
CREATE TABLE IF NOT EXISTS challenges (
  id CHAR(36) PRIMARY KEY,       -- 도전 고유 ID (UUID)
  user_id CHAR(36) NOT NULL,     -- 도전을 시작한 사용자 ID
  word_id INT UNSIGNED NOT NULL, -- 도전에서 선택한 단어 ID

  -- 단어 선택 → 학습 중 → 채점 중 → 완료
  status ENUM('selected', 'studying', 'grading', 'completed')
    NOT NULL DEFAULT 'selected',

  explanation TEXT,              -- 사용자가 제출한 설명
  feedback JSON,                 -- 항목별 점수, 잘한 점, 힌트 등 AI 피드백
  total SMALLINT UNSIGNED,       -- 채점 총점
  started_at DATETIME(3),        -- 학습 시작 시각 (밀리초까지 저장)
  completed_at DATETIME(3),      -- 도전 완료 시각
  grading_at DATETIME(3),        -- 채점 시작 시각. 중단된 채점의 재시도 판단에 사용
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 도전 생성 시각

  FOREIGN KEY (user_id) REFERENCES users(id), -- 도전한 사용자와 연결
  FOREIGN KEY (word_id) REFERENCES words(id), -- 선택한 단어와 연결
  INDEX user_history (user_id, completed_at) -- 사용자별 완료 기록 조회에 사용
);

-- 4. 도전에 첨부한 참고 링크 저장
CREATE TABLE IF NOT EXISTS reference_links (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- 자동으로 증가하는 링크 ID
  challenge_id CHAR(36) NOT NULL, -- 링크가 속한 도전 ID
  url VARCHAR(2048) NOT NULL, -- 참고 자료 주소

  -- 도전이 삭제되면 해당 도전의 링크도 함께 삭제
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
);
