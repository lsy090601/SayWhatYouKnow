// 선택지와 채점 기준 등 화면에서 사용하는 고정 데이터와 시안용 예시입니다.

// 백엔드·DB가 붙기 전까지 쓰는 임시 데이터입니다.

export const FIELDS = ['과학', '경제', 'IT', '철학', '역사', '사회', '예술', '의학'];
export const DIFFICULTIES = ['쉬움', '보통', '어려움'];

export const WORDS = {
  과학: [{ word: '엔트로피', en: 'Entropy' }, { word: '양자 얽힘', en: 'Quantum Entanglement' }],
  경제: [{ word: '기회비용', en: 'Opportunity Cost' }, { word: '스태그플레이션', en: 'Stagflation' }],
  IT: [{ word: '블록체인', en: 'Blockchain' }, { word: '캐시', en: 'Cache' }],
  철학: [{ word: '실존주의', en: 'Existentialism' }, { word: '공리주의', en: 'Utilitarianism' }],
  역사: [{ word: '산업혁명', en: 'Industrial Revolution' }, { word: '봉건제', en: 'Feudalism' }],
  사회: [{ word: '젠트리피케이션', en: 'Gentrification' }, { word: '확증 편향', en: 'Confirmation Bias' }],
  예술: [{ word: '인상주의', en: 'Impressionism' }, { word: '미니멀리즘', en: 'Minimalism' }],
  의학: [{ word: '항상성', en: 'Homeostasis' }, { word: '면역 관용', en: 'Immune Tolerance' }],
};

export const RUBRIC = [
  { key: 'accuracy', name: '정확성', max: 40, desc: '설명한 내용이 사실과 개념에 부합하는가' },
  { key: 'concepts', name: '핵심 개념', max: 30, desc: '단어를 이해하는 데 필요한 핵심 개념이 포함되어 있는가' },
  { key: 'clarity', name: '쉬운 설명', max: 20, desc: '처음 듣는 사람도 이해할 수 있는 표현과 예시를 사용하는가' },
  { key: 'logic', name: '논리적 구성', max: 10, desc: '설명이 일관된 흐름으로 연결되는가' },
];

export const MOCK_FEEDBACK = {
  scores: { accuracy: 34, concepts: 22, clarity: 18, logic: 8 },
  comment: '쉬운 예시가 훌륭해요! 핵심 개념 하나만 더 챙기면 완벽해요.',
  good: '방 정리와 커피 식는 예시로 ‘무질서해지는 방향’을 누구나 이해할 수 있게 설명했어요.',
  hint: '엔트로피가 왜 저절로 줄어들지 않는지, 이걸 설명하는 물리 법칙의 이름을 찾아보세요.',
  hintSub: '힌트: 열역학 제○법칙',
  misconception: '‘무질서’는 비유예요. 정확히는 가능한 상태(경우의 수)가 얼마나 많은지와 관련 있어요.',
};

export const HISTORY = [
  { word: '블록체인', field: 'IT', difficulty: '어려움', score: 91, date: '10.26' },
  { word: '엔트로피', field: '과학', difficulty: '보통', score: 82, date: '10.24' },
  { word: '기회비용', field: '경제', difficulty: '쉬움', score: 84, date: '10.21' },
  { word: '실존주의', field: '철학', difficulty: '어려움', score: 77, date: '10.19' },
];

export const SCORE_TREND = [58, 64, 61, 70, 68, 75, 72, 79, 77, 84, 82, 91];
