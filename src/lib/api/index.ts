// API 설정
export { API_CONFIG, apiFetch, apiUpload, mockDelay } from './config';

// 타입 매퍼
export * from './mappers';

// 인증 API
export {
  login,
  signup,
  verify,
  logout,
  getCurrentUser,
} from './auth';

// 워크스페이스/프로젝트 API
export {
  // 워크스페이스
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  // 프로젝트
  getMyProjects,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  // 멤버
  getWorkspaceMembers,
  getOnlineMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  createInvitation,
  acceptInvitation,
  getProjectMembers,
} from './workspace';

// 보드/태스크 API
export {
  // 컬럼
  getColumns,
  createColumn,
  // 보드
  getBoard,
  // 태스크
  getTasks,
  getAllCards,
  getBoardCards,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  // 댓글
  getCardComments,
  createCardComment,
  deleteCardComment,
  // 연결선
  getConnections,
  createConnection,
  deleteConnection,
  // 멤버
  getBoardMembers,
  // 편집 상태
  getEditingCards,
  startEditingCard,
  stopEditingCard,
  // 하위 호환용
  getNodes,
  createNode,
  updateNode,
  deleteNode,
} from './board';

// 게시판 API (신규)
export {
  getProjectPosts,
  getCommunityPosts,
  createProjectPost,
  createCommunityPost,
  getProjectPost,
  getCommunityPost,
  updateCommunityPost,
  updateProjectPost,
  deleteCommunityPost,
  deleteProjectPost,
  createCommunityComment,
  createProjectComment,
  deleteCommunityComment,
  deleteProjectComment,
} from './post';

// 파일 API
export {
  uploadFile,
  getFileDownloadUrl,
  getFileVersions,
  deleteFile,
  attachFileToCard,
  detachFileFromCard,
} from './file';

// 사용자 API
export {
  getMyInfo,
  updateMyInfo,
  updateProfileImage,
} from './user';

// 활동 로그 API
export {
  getMyActivities,
  getWorkspaceActivities,
} from './activity';
export type { ActivityLog } from './activity';

// 스케줄/일정 API
export {
  // 개인 시간표
  getMySchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  // 팀 공통 빈 시간
  getCommonFreeTime,
  // 프로젝트 일정
  getProjectEvents,
  createProjectEvent,
  updateProjectEvent,
  deleteProjectEvent,
} from './schedule';
export type {
  Schedule,
  ScheduleCreate,
  FreeTimeSlot,
  ProjectEvent,
  ProjectEventCreate,
} from './schedule';

// 목업 데이터 (개발용)
export * from './mock-data';