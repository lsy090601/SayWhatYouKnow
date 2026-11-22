// 요청과 AI 응답이 허용된 값, 길이, 자료형을 따르는지 검사합니다.

import {z} from 'zod';
// 허용하는 분야와 난이도
export const fields=['과학','경제','IT','철학','역사','사회','예술','의학'];
export const difficulties=['쉬움','보통','어려움'];
// 단어 목록 조회의 쿼리 값
export const wordQuery=z.object({field:z.enum(fields),difficulty:z.enum(difficulties)});
// 도전 생성 요청 본문. 정의되지 않은 필드는 거부합니다.
export const newChallenge=z.object({wordId:z.number().int().positive()}).strict();
// http와 https 주소만 허용하는 URL 검사
export const urlSchema=z.string().trim().max(2048).url().refine(v=>['http:','https:'].includes(new URL(v).protocol),'HTTP(S) 주소만 허용합니다.');
// 설명 제출 요청 본문
export const submission=z.object({
 explanation:z.string().trim().min(20,'20자 이상 설명해 주세요.').max(10000,'설명은 10,000자까지 입력할 수 있어요.'),
 links:z.array(urlSchema).max(20).default([])
}).strict();
// AI가 반환한 항목별 점수의 범위
export const scoresSchema=z.object({accuracy:z.number().int().min(0).max(40),concepts:z.number().int().min(0).max(30),clarity:z.number().int().min(0).max(20),logic:z.number().int().min(0).max(10)}).strict();
// AI가 반환한 피드백 전체의 구조와 길이
export const feedbackSchema=z.object({scores:scoresSchema,comment:z.string().min(1).max(1000),good:z.string().min(1).max(2000),hint:z.string().min(1).max(2000),hintSub:z.string().max(1000),misconception:z.string().min(1).max(2000)}).strict();
// HTTP 상태 코드를 함께 담는 오류
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
// 값을 검증해 반환하고, 실패하면 첫 번째 문제를 400 오류로 던집니다.
export function parse(schema,value){const result=schema.safeParse(value);if(!result.success)throw new HttpError(400,result.error.issues[0]?.message||'입력값을 확인해 주세요.');return result.data;}

