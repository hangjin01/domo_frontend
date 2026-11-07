/**
 * [파일 안내] 공통 테마 저장소를 React 화면에 연결합니다.
 * 루트의 ThemeSync가 항상 구독하므로 설정 화면을 닫아도 운영체제·다른 탭 변경을 따라갑니다.
 * useSyncExternalStore는 서버 렌더 값과 브라우저 저장 값을 안전하게 구분합니다.
 */
'use client';

import { useSyncExternalStore } from 'react';
import { getThemeSnapshot, getServerThemeSnapshot, subscribeTheme, setTheme, setThemeColor, toggleTheme } from '../theme';

export function useTheme() {
  const state = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  return { ...state, setTheme, setThemeColor, toggleTheme };
}

export function ThemeSync() {
  useTheme();
  return null;
}
