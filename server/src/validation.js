// 요청과 AI 응답이 허용된 값, 길이, 자료형을 따르는지 검사합니다.

import {z} from 'zod';
// 단어 목록 조회의 쿼리 값. 실제로 있는 분야·난이도인지는 DB 목록과 비교합니다.
export const wordQuery=z.object({field:z.string().trim().min(1).max(30),difficulty:z.string().trim().min(1).max(20)});
// 도전 생성 요청 본문. 정의되지 않은 필드는 거부합니다.
export const newChallenge=z.object({wordId:z.number().int().positive()}).strict();
// 회원가입과 로그인 요청 본문
export const credentials=z.object({
 username:z.string().trim().regex(/^[a-zA-Z0-9_가-힣]{3,20}$/,'아이디는 한글, 영문, 숫자, 밑줄(_)로 3~20자여야 해요.'),
 password:z.string().min(6,'비밀번호는 6자 이상이어야 해요.').max(72,'비밀번호는 72자까지 입력할 수 있어요.')
}).strict();
// http와 https 주소만 허용하는 URL 검사
export const urlSchema=z.string().trim().max(2048).url().refine(v=>['http:','https:'].includes(new URL(v).protocol),'HTTP(S) 주소만 허용합니다.');
// 설명 제출 요청 본문
export const submission=z.object({
 explanation:z.string().trim().min(20,'20자 이상 설명해 주세요.').max(10000,'설명은 10,000자까지 입력할 수 있어요.'),
 links:z.array(urlSchema).max(20).default([])
}).strict();
// AI가 반환한 피드백의 구조와 길이. 항목별 점수 범위는 DB의 채점 항목(criteria)으로 만듭니다.
export const feedbackSchema=criteria=>z.object({
 scores:z.object(Object.fromEntries(criteria.map(c=>[c.code,z.number().int().min(0).max(c.max_score)]))).strict(),
 comment:z.string().min(1).max(1000),good:z.string().min(1).max(2000),hint:z.string().min(1).max(2000),hintSub:z.string().max(1000),misconception:z.string().min(1).max(2000)
}).strict();
// HTTP 상태 코드를 함께 담는 오류
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
// 값을 검증해 반환하고, 실패하면 첫 번째 문제를 400 오류로 던집니다.
export function parse(schema,value){const result=schema.safeParse(value);if(!result.success)throw new HttpError(400,result.error.issues[0]?.message||'입력값을 확인해 주세요.');return result.data;}

