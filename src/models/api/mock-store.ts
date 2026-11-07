/**
 * [파일 안내] frontend/src/models/api/mock-store.ts
 * 담당 범위: 브라우저 데모 데이터 읽기/쓰기·ID 발급·이미지 data URL 변환.
 * 화면 상태와 영속 데이터의 경계를 담당하므로 저장 원본과 반환 객체, 브라우저 실행 여부를 구분해야 합니다.
 * v2는 단일 워크스페이스로 새로 시작하는 영역입니다. 이전 v1은 화면에서 제외하지만 복구용으로 남습니다. 다른 도메인/장치/DB와 공유되지 않습니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

// 단일 워크스페이스 데모의 저장 영역입니다. 실제 API/DB와는 무관합니다.
// 이전 작업(v1)은 복구 가능하도록 그대로 두되 읽지 않습니다.
// 매번 초기화하는 방식이 아니므로 이후 v2에서 수정한 내용은 새로고침 후에도 유지됩니다.
const PREFIX = 'domo:mock:v2:';

/**
 * 논리 키(예: workspaces)에 접두사를 붙여 현재 데모 데이터만 읽습니다.
 * 저장값이 없거나 서버 렌더링 중이면 초기값의 깊은 복사본을 돌려줍니다.
 * 복사하는 이유는 호출자가 배열을 수정해도 원본 샘플 상수가 오염되지 않도록 하기 위해서입니다.
 * JSON 파싱은 수행하지만 T 타입의 실제 필드 구조까지 검증하지는 않습니다.
 */
export function readMock<T>(key: string, initial: T): T {
  if (typeof window === 'undefined') return structuredClone(initial);
  const raw = window.localStorage.getItem(PREFIX + key);
  if (raw === null) return structuredClone(initial);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('목업 저장 데이터가 손상되었습니다. 개발 도구에서 domo:mock:v2: 데이터를 확인해주세요.');
  }
}

/**
 * 한 논리 데이터 묶음을 JSON으로 저장하고 호출자가 사용할 복사본을 반환합니다.
 * 용량 초과/브라우저 차단 시 예외를 던져 UI가 성공으로 오인하지 않게 합니다.
 * 여러 키를 한 번에 commit하는 트랜잭션이나 탭 간 동시 수정 잠금은 제공하지 않습니다.
 */
export function writeMock<T>(key: string, value: T): T {
  if (typeof window === 'undefined') throw new Error('목업 데이터는 브라우저에서만 저장할 수 있습니다.');
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    throw new Error('브라우저 저장 공간이 부족하거나 차단되어 변경사항을 저장하지 못했습니다.');
  }
  return structuredClone(value);
}

let lastId = 0;
/** 같은 모듈 수명 안에서 연속 호출해도 ID가 겹치지 않도록 밀리초 값보다 최소 1씩 증가시킵니다.
 * 여러 탭/장치까지 보장하는 분산 ID가 아니므로 실제 서버의 PK 발급을 대체할 수 없습니다.
 */
export function mockId(): number {
  lastId = Math.max(Date.now(), lastId + 1);
  return lastId;
}

/**
 * 로컬 이미지를 문자열로 바꾸어 새로고침 후에도 미리보기를 복원할 수 있게 합니다.
 * 일시적인 blob URL과 달리 문자열 자체에 바이트가 들어가므로 localStorage 용량을 소비합니다.
 * 네트워크 업로드는 하지 않으며 FileReader의 완료/실패 이벤트를 Promise로 감쌉니다.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}
