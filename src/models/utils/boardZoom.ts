/** 저장된 좌표는 항상 100% 기준입니다. 화면 배율은 데이터에 반영하지 않습니다. */
export const clampZoom = (value: number) => Math.min(2, Math.max(0.25, Number.isFinite(value) ? value : 1));
export function zoomScroll(scroll: number, pointer: number, before: number, after: number) {
  return (scroll + pointer) / before * after - pointer;
}
export function fitZoom(width: number, height: number, viewportWidth: number, viewportHeight: number) {
  return clampZoom(Math.min((viewportWidth - 64) / Math.max(1, width), (viewportHeight - 64) / Math.max(1, height), 1));
}
