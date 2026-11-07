/**
 * [파일 안내] frontend/src/models/api/mock-auth.ts
 * 담당 범위: 데모 계정·인증 상태·로그인 세션·프로필 저장.
 * 화면 상태와 영속 데이터의 경계를 담당하므로 저장 원본과 반환 객체, 브라우저 실행 여부를 구분해야 합니다.
 * 비밀번호를 포함한 데모 계정은 localStorage, 현재 사용자 ID는 sessionStorage에 둡니다. 실제 비밀정보를 넣으면 안 됩니다. publicUser에서 비밀번호를 제외합니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

import type { User } from '../types';
import { MOCK_CURRENT_USER, MOCK_USERS } from './mock-data';
import { mockId, readMock, writeMock } from './mock-store';

// 데모 전용 계정입니다. 백엔드 계정/쿠키 세션을 생성하지 않으며 실제 비밀번호 사용은 금지합니다.
type Account = User & { password: string };
const initialAccounts: Account[] = MOCK_USERS.map((user, index) => ({
  ...MOCK_CURRENT_USER, ...user, id: index === 0 ? 1 : 100 + index,
}));
const SESSION_KEY = 'domo:mock:session';

// 매번 저장소를 읽어 프로필/가입 변경 뒤에도 최초 샘플을 잘못 반환하지 않게 합니다.
function accounts(): Account[] { return readMock('accounts', initialAccounts); }
// 내부 Account에는 비밀번호가 있지만 화면에 전달하는 User에는 포함하지 않습니다.
function publicUser(account: Account): User {
  const user = { ...account };
  Reflect.deleteProperty(user, 'password');
  return user;
}
/** 탭 세션의 사용자 ID와 저장된 인증 완료 계정을 대조합니다. 자동 로그인은 하지 않습니다. */
export function getMockUser(): User | null {
  if (typeof window === 'undefined') return null;
  const id = Number(window.sessionStorage.getItem(SESSION_KEY));
  const account = accounts().find(user => user.id === id && user.is_student_verified);
  return account ? publicUser(account) : null;
}
/** 로그인 필수 작업용 가드입니다. nullable 조회와 달리 미로그인을 예외로 전달합니다. */
export function requireMockUser(): User {
  const user = getMockUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  return user;
}
/**
 * 일치하는 계정을 찾은 뒤 이메일 인증 여부를 확인하고 탭 세션에 ID만 기록합니다.
 * 데모의 평문 비교는 UI 흐름 테스트용이며 실제 비밀번호 해싱/시도 제한을 구현하지 않습니다.
 */
export function loginMock(email: string, password: string): User {
  const account = accounts().find(user => user.email === email && user.password === password);
  if (!account) throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
  if (!account.is_student_verified) throw new Error('이메일 인증이 완료되지 않았습니다.');
  window.sessionStorage.setItem(SESSION_KEY, String(account.id));
  return publicUser(account);
}
// 로그아웃은 인증 상태만 제거합니다. 팀/프로젝트/게시글 등의 작업 데이터는 남깁니다.
export function logoutMock(): void { window.sessionStorage.removeItem(SESSION_KEY); }
/** 학교 이메일만 신규 가입시키고 미인증 상태로 저장합니다. 실제 SMTP 메일은 보내지 않습니다. */
export function signupMock(email: string, password: string, name: string, nickname?: string): User {
  if (!email.endsWith('@jj.ac.kr')) throw new Error('전주대학교 이메일(@jj.ac.kr)만 사용 가능합니다.');
  const users = accounts();
  if (users.some(user => user.email === email)) throw new Error('이미 가입된 이메일입니다.');
  const account: Account = { id: mockId(), email, password, name, nickname, is_student_verified: false };
  writeMock('accounts', [...users, account]);
  return publicUser(account);
}
/** 고정 데모 코드 123456으로 인증 상태를 변경합니다. 실제 OTP 만료/재전송 정책은 없습니다. */
export function verifyMock(email: string, code: string): void {
  const users = accounts();
  const user = users.find(user => user.email === email);
  if (!user || code !== '123456') throw new Error('인증 코드가 일치하지 않거나 만료되었습니다.');
  user.is_student_verified = true;
  writeMock('accounts', users);
}
/** 현재 계정의 허용된 프로필 필드만 갱신하고 저장합니다. 다른 계정의 프로필은 바꾸지 않습니다. */
export function updateMockUser(data: Partial<Pick<User, 'name' | 'nickname' | 'profile_image'>>): User {
  const current = requireMockUser();
  const users = accounts();
  const account = users.find(user => user.id === current.id)!;
  Object.assign(account, data);
  writeMock('accounts', users);
  return publicUser(account);
}
