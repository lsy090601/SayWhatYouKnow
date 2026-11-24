// 비밀번호를 scrypt로 해시하고 저장된 해시와 비교합니다. 추가 패키지 없이 Node 내장 crypto만 사용합니다.

import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scryptAsync=promisify(scrypt);
// "솔트:해시" 형식의 문자열을 만듭니다. 사용자마다 다른 솔트를 사용합니다.
export async function hashPassword(password){
 const salt=randomBytes(16).toString('hex');
 return salt+':'+(await scryptAsync(password,salt,64)).toString('hex');
}
// 입력한 비밀번호가 저장된 해시와 같은지 일정한 시간으로 비교합니다.
export async function verifyPassword(password,stored){
 const [salt,hex]=String(stored||'').split(':');
 if(!salt||!hex)return false;
 const expected=Buffer.from(hex,'hex'),actual=await scryptAsync(password,salt,64);
 return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
