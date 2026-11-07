/**
 * [파일 안내] 로그인 사용자 프로필과 브라우저 테마를 관리하는 설정 화면입니다.
 * UserContext를 직접 읽고 저장 성공 응답을 공유하므로 다른 화면도 새 이름·사진을 표시합니다.
 * 편집 초안은 저장 전까지 공유하지 않으며, 취소하거나 저장에 실패하면 기존 정보를 유지합니다.
 * mock 프로필은 이 브라우저에만 저장됩니다. 미구현 기능은 준비 중으로 명확히 구분합니다.
 */
'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { logout } from '@/src/models/api';
import { API_CONFIG } from '@/src/models/api/config';
import { updateMyInfo, updateProfileImage } from '@/src/models/api/user';
import { getImageUrl } from '@/src/models/utils/image';
import { useUser } from '@/src/lib/contexts/UserContext';
import { useTheme } from '@/src/lib/contexts/ThemeSync';
import type { User } from '@/src/models/types';
import { THEME_OPTIONS, COLOR_OPTIONS } from '@/src/lib/theme';
import { DataBackupSettings } from './DataBackupSettings';

interface SettingsViewProps { initialTab?: 'profile' | 'preferences' }
type Notice = { error: boolean; text: string } | null;
const panelClass = 'rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--surface-panel)] p-6';
const inputClass = 'w-full mt-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-black/20 px-3 py-2 text-gray-900 dark:text-white disabled:opacity-50';
const buttonClass = 'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ';

function NoticeText({ notice }: { notice: Notice }) {
  return notice ? <p role={notice.error ? 'alert' : 'status'} className={'mt-4 text-sm ' + (notice.error ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400')}>{notice.text}</p> : null;
}

/** 사용자 전환 시 key로 초안을 초기화합니다. 같은 사용자의 저장 결과는 즉시 표시합니다. */
export function ProfileSettings({ user, onSaved }: { user: User; onSaved: (user: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // 같은 렌더 사이에 연속 클릭해도 요청을 중복 전송하지 않도록 잠급니다.
  const saving = useRef(false);

  const save = async (operation: () => Promise<User>, message: string) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const savedUser = await operation();
      onSaved(savedUser);
      setEditing(false);
      setNotice({ error: false, text: message });
    } catch (error) {
      // 실패한 이미지의 임시 URL을 표시하지 않습니다. 저장된 사진만 보여줍니다.
      setNotice({ error: true, text: error instanceof Error ? error.message : '저장하지 못했습니다. 다시 시도해 주세요.' });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  return <section className={panelClass} aria-label="프로필 정보">
    <div className="flex flex-col items-center gap-3 mb-6">
      <div className="w-28 h-28 overflow-hidden rounded-3xl bg-blue-600 flex items-center justify-center text-3xl text-white font-bold">
        {user.profile_image
          ? <img src={getImageUrl(user.profile_image)} alt={user.name + ' 프로필'} className="w-full h-full object-cover" />
          : user.name.slice(0, 2)}
      </div>
      <button className={buttonClass + 'text-blue-600 dark:text-blue-400 flex items-center gap-2'} disabled={busy || editing} onClick={() => fileInput.current?.click()}>
        <Camera size={16} />프로필 사진 변경
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400">JPG·PNG·WebP, 최대 2MB</p>
      <input ref={fileInput} type="file" aria-label="프로필 사진 파일" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy || editing} onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = ''; // 실패한 파일도 다시 선택할 수 있게 입력만 비웁니다.
        if (file) void save(() => updateProfileImage(file), '프로필 사진을 저장했습니다.');
      }} />
    </div>
    {editing ? <form onSubmit={event => {
      event.preventDefault();
      void save(() => updateMyInfo({ name, nickname }), '프로필을 저장했습니다.');
    }} onKeyDown={event => { if (event.key === 'Escape' && !busy) { setEditing(false); setNotice(null); } }} className="space-y-4">
      <label className="block text-sm">이름<input autoFocus required value={name} disabled={busy} onChange={event => setName(event.target.value)} className={inputClass} /></label>
      <label className="block text-sm">닉네임 (선택)<input value={nickname} disabled={busy} onChange={event => setNickname(event.target.value)} className={inputClass} /></label>
      <p className="text-xs text-gray-500 dark:text-gray-400">닉네임을 비우면 기존 닉네임이 삭제됩니다.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={buttonClass + 'bg-blue-600 text-white'}>{busy ? '저장 중…' : '프로필 저장'}</button>
        <button type="button" disabled={busy} className={buttonClass + 'bg-gray-100 dark:bg-gray-800'} onClick={() => { setEditing(false); setNotice(null); }}>취소</button>
      </div>
    </form> : <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h3 className="text-xl font-bold break-words">{user.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400 break-words">{user.nickname || '닉네임 미설정'}</p></div>
      <button disabled={busy} className={buttonClass + 'shrink-0 text-blue-600 dark:text-blue-400'} onClick={() => {
        setName(user.name); setNickname(user.nickname ?? ''); setNotice(null); setEditing(true);
      }}>프로필 편집</button>
    </div>}
    <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-semibold mb-1">학교 이메일</h4>
      <p className="break-all">{user.email}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{user.is_student_verified ? '인증된 계정' : '미인증 계정'} · 이메일 변경은 준비 중입니다.</p>
    </div>
    {busy && <p role="status" className="mt-4 text-sm">변경사항을 저장하고 있습니다…</p>}
    <NoticeText notice={notice} />
  </section>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'profile' }) => {
  const { user, loading, updateUser, clearUser } = useUser();
  const { theme, color, resolved, setTheme, setThemeColor } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [notice, setNotice] = useState<Notice>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const loggingOut = useRef(false);

  const handleLogout = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setIsLoggingOut(true);
    setNotice(null);
    try {
      // 이 화면이 API 호출과 공유 상태 정리를 한 번씩 책임집니다.
      await logout();
      clearUser();
      router.replace('/login');
    } catch {
      setNotice({ error: true, text: '로그아웃하지 못했습니다. 다시 시도해 주세요.' });
    } finally { loggingOut.current = false; setIsLoggingOut(false); }
  };

  return <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-auto text-gray-900 dark:text-white">
    <nav aria-label="설정 메뉴" className="shrink-0 md:w-44 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 p-4 flex md:flex-col gap-2">
      <h2 className="hidden md:block text-xl font-bold mb-4">설정</h2>
      {([{ id: 'profile', label: '프로필', Icon: UserIcon }, { id: 'preferences', label: '환경설정', Icon: Settings }] as const).map(({ id, label, Icon }) =>
        <button key={id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => { setActiveTab(id); setNotice(null); }} className={buttonClass + 'flex items-center gap-2 ' + (activeTab === id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400')}><Icon size={18} />{label}</button>)}
    </nav>
    <div className="flex-1 min-w-0 p-4 md:p-8 md:overflow-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">{activeTab === 'profile' ? '내 프로필' : '환경설정'}</h2>
        {API_CONFIG.USE_MOCK && <p className="text-sm text-gray-500 dark:text-gray-400">로컬 데모 모드입니다. 프로필은 이 브라우저에만 저장되며 실제 학교 인증·계정 정보는 변경되지 않습니다.</p>}
        {activeTab === 'profile' ? (user
          ? <ProfileSettings key={user.id} user={user} onSaved={updateUser} />
          : <p role="status">{loading ? '프로필을 불러오고 있습니다…' : '로그인 정보를 불러오지 못했습니다. 다시 로그인해 주세요.'}</p>) : <>
          <section className={panelClass}>
            <fieldset>
              <legend className="font-bold mb-2">화면 밝기</legend>
              <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">밝기와 색상을 따로 선택하세요. 시스템은 기기의 밝기 설정을 따릅니다.</p>
              <div className="grid grid-cols-3 gap-3">
                {THEME_OPTIONS.map(option => <label key={option.value} className={'flex items-center gap-2 rounded-xl border-2 p-3 cursor-pointer ' + (theme === option.value ? 'border-blue-500 bg-blue-50 dark:bg-gray-800' : 'border-gray-300 dark:border-gray-600')}>
                  <input type="radio" name="theme-mode" checked={theme === option.value} onChange={() => {
                    try { setTheme(option.value); setNotice({ error: false, text: '밝기를 저장했습니다. 색상은 유지됩니다.' }); }
                    catch { setNotice({ error: true, text: '브라우저 저장소가 차단되어 테마를 저장하지 못했습니다.' }); }
                  }} />{option.label}
                </label>)}
              </div>
            </fieldset>
            <fieldset className="mt-6">
              <legend className="font-bold mb-3">테마 색상</legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COLOR_OPTIONS.map(option => <label key={option.value} className={'rounded-xl border-2 p-3 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 ' + (color === option.value ? 'border-blue-500 bg-blue-50 dark:bg-gray-800' : 'border-gray-300 dark:border-gray-600')}>
                  <span aria-hidden="true" className="flex h-16 items-center justify-center rounded-lg mb-3 border border-black/10" style={{ background: resolved === 'dark' ? option.dark : option.light }}>
                    <span className="rounded px-2 py-1 text-xs font-bold shadow-sm" style={{ background: resolved === 'dark' ? '#37303f' : '#ffffff', color: resolved === 'dark' ? '#ffffff' : '#25202b' }}>Aa 카드</span>
                  </span>
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <input type="radio" name="theme-color" checked={color === option.value} onChange={() => {
                      try { setThemeColor(option.value); setNotice({ error: false, text: '색상을 저장했습니다. 밝기는 유지됩니다.' }); }
                      catch { setNotice({ error: true, text: '브라우저 저장소가 차단되어 테마를 저장하지 못했습니다.' }); }
                    }} />{option.label}
                  </span>
                </label>)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">현재 테마: {COLOR_OPTIONS.find(option => option.value === color)?.label} · {resolved === 'dark' ? '다크' : '화이트'}{theme === 'system' ? ' (시스템)' : ''}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">보드의 밝기 버튼으로 전환해도 선택한 색상은 유지됩니다. 카드 고유 색상은 바뀌지 않습니다.</p>
            </fieldset>
          </section>
          {API_CONFIG.USE_MOCK && <DataBackupSettings />}
          <section className={panelClass} aria-label="준비 중인 설정">
            <h3 className="font-bold mb-4">추가 설정</h3>
            <div className="space-y-4">{['알림 설정', '비밀번호 변경 · 2단계 인증', '상태 메시지 · 내 소개', '지원 문의'].map(label =>
              <div key={label} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">준비 중</span></div>)}
            </div>
          </section>
          <button onClick={handleLogout} disabled={isLoggingOut} className={buttonClass + 'flex items-center gap-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400'}><LogOut size={18} />{isLoggingOut ? '로그아웃 중…' : '로그아웃'}</button>
          <NoticeText notice={notice} />
        </>}
      </div>
    </div>
  </div>;
};

export default SettingsView;
