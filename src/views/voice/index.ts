/**
 * [파일 안내] frontend/src/views/voice/index.ts
 * 같은 영역의 구현/타입을 모아서 재수출하는 공개 진입점입니다.
 * 호출자는 내부 파일을 모두 알 필요 없이 이 경로에서 import할 수 있습니다. 실제 동작 설명은 export 대상 파일을 확인하세요.
 * 이 파일에 도메인 로직을 추가하기보다 해당 기능 모듈에서 구현해야 순환 import와 초기화 부작용을 줄일 수 있습니다.
 */

export { VoiceChatModal } from './VoiceChatModal';
export { VoiceParticipantCard } from './VoiceParticipant';
export { VoiceControls } from './VoiceControls';
