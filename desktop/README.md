# DOMO Desktop · Windows / Linux

현재 버전은 **개인용 로컬 목 모드**입니다. 앱 아이콘을 누르면 Electron과 포함된 Next 서버가 함께 시작됩니다. Node.js·Python·Docker를 별도로 켤 필요가 없습니다. 팀 실시간 동기화, 서버 계정 보안, 음성 기능은 제공하지 않습니다.

## 확인된 상태 (2026-11-04)

- Linux x64 실행 폴더: 내장 Next 16.4.4 서버 기동 및 Electron `loadURL` 완료(`DOMO_DESKTOP_READY`) 확인.
- Linux 사용자 앱 메뉴: `DOMO` 아이콘 등록 완료. 현재 경로를 옮기면 재등록해야 합니다.
- Windows x64: NSIS 설치 프로그램과 바탕화면/시작 메뉴 바로가기 설정 완료. **Windows EXE 생성 및 실제 Windows 실행은 아직 검증하지 않았습니다.** 아래 Windows 빌드 또는 GitHub Actions가 필요합니다.
- Next 프로덕션 빌드, TypeScript, 테스트 4개 파일 통과. 운영 의존성 `npm audit --omit=dev`는 2026-11-03 확인 시 경고 0개. 개발/빌드 도구에는 별도 경고가 남아 있으며 전체 무결점 보안 인증은 아닙니다.
- 네이티브 창의 수동 기능 전체 검증은 미완료입니다. 기존 목 API/화면 테스트가 실제 다중 사용자 서버 테스트를 대체하지 않습니다.

## Linux에서 사용

현재 컴퓨터의 앱 메뉴에서 **DOMO**를 검색해 실행합니다.

직접 실행: `dist-desktop/linux-unpacked/domo`

이동식 배포: `dist-desktop/DOMO-0.1.0-linux-x86_64.AppImage`. 실행 권한을 부여한 뒤 실행하세요. AppImage/FUSE가 지원되지 않는 환경에서는 압축 배포 또는 `linux-unpacked` 폴더를 사용합니다. 보안 샌드박스를 끄는 옵션은 사용하지 않습니다.

앱 메뉴 아이콘을 다시 등록하려면:

```bash
npm run desktop:install-linux
```

등록 파일: `~/.local/share/applications/domo.desktop`. 빌드 폴더를 삭제/이동하면 이 바로가기도 다시 등록해야 합니다. 아이콘 등록은 바탕화면 배경에 파일을 복사하는 작업이 아니라 OS 앱 메뉴 등록입니다.

## Windows에서 빌드·설치

Node.js 22를 설치한 Windows 컴퓨터에서 frontend 저장소를 열고:

```powershell
npm ci
npm test
npm run desktop:build
```

`dist-desktop/DOMO-0.1.0-win-x64.exe` 설치 프로그램을 실행합니다. 사용자 단위 설치이며 바탕화면과 시작 메뉴 바로가기를 생성하도록 설정했습니다. 코드 서명 인증서는 아직 없으므로 배포본에 게시자 미확인 경고가 발생할 수 있습니다. 조직 정책을 우회하지 말고 서명이 필요한 배포는 별도로 진행하세요.

Windows와 Linux는 각각 해당 OS에서 빌드합니다. 서버에 포함되는 sharp 등의 네이티브 의존성이 달라 Linux 서버 리소스를 Windows 패키지에 재사용하지 않습니다.

## GitHub Actions

`.github/workflows/desktop.yml`을 frontend 저장소에 올린 뒤 Actions → **Desktop packages** → Run workflow를 실행합니다. Windows/Linux 작업이 각 OS에서 빌드하고 결과를 Actions artifact로 보관합니다. 현재 자동으로 push·release·공개 배포하지 않습니다.

## 기존 브라우저 데이터 옮기기

1. 기존 웹 앱의 설정 → 환경설정 → 데이터 백업 → **백업 내보내기**.
2. 데스크톱 앱 로그인 후 같은 메뉴에서 **백업 가져오기**.
3. 파일을 선택하고 교체 안내를 확인한 뒤 직접 적용합니다. 적용 후 다시 로그인해야 합니다.

앱과 브라우저는 서로 다른 저장소입니다. 처음 앱을 열면 초기 샘플이 나타나며 기존 브라우저 데이터가 자동으로 옮겨오거나 삭제되지 않습니다. 데모 로그인은 `test@gmail.com` / `1234`입니다. 실제 비밀번호나 민감한 개인정보를 데모 계정에 입력하지 마세요.

백업 파일은 평문 JSON이며 계정·게시물 등이 포함될 수 있습니다. Git/스크린샷/공개 저장소에 포함하지 마세요. 로그인 세션은 백업에서 제외됩니다. 가져오기 전 데이터는 동일 저장소의 `domo:backup:before-import`에 보존합니다. 이것은 독립 파일 백업이 아니므로 먼저 내보내기를 권장합니다. JSON 키/크기/핵심 보드 구조를 확인하지만 모든 도메인 필드의 완전한 스키마 검증은 아닙니다.

## 데이터·백업 위치

| 대상 | 위치 |
| --- | --- |
| Linux 설치 앱 | `~/.config/DOMO` (XDG 설정에 따라 달라질 수 있음) |
| Windows 설치 앱 | `%APPDATA%\DOMO` |
| 개발 실행 | 같은 앱 데이터 경로의 `DOMO-Development` |
| 자동 백업 | 위 경로의 `backups/auto-YYYY-MM-DD.json` |

정확한 경로는 앱 메뉴 DOMO → **데이터 폴더 열기**로 확인합니다. 앱 버전/설치 경로와 데이터 경로는 분리했고 설치 앱 origin은 `127.0.0.1:47831`, 개발 앱은 `127.0.0.1:47832`로 고정했습니다. 포트 충돌 시 다른 서비스에 연결하지 않고 오류를 표시합니다.

데이터의 기본 저장은 여전히 Chromium localStorage입니다. 변경이 있으면 30초 간격으로 별도 파일 백업을 저장하고 최근 7개 날짜를 유지합니다. 강제 종료 직전 변경까지 백업을 보장하지 않으므로 중요한 작업 뒤에는 직접 내보내세요. 디스크 고장·OS 계정 삭제에 대비한 외부 백업은 별도로 필요합니다. NSIS 제거 설정은 앱 데이터를 삭제하지 않습니다.

## 개발과 안전 설정

```bash
npm run desktop:prepare  # 별도 .next-desktop에 빌드 및 리소스 준비
npm run desktop:dev      # 개발 전용 데이터로 Electron 실행
npm run desktop:package # 현재 OS의 배포 파일 생성
```

- renderer: sandbox=true, contextIsolation=true, nodeIntegration=false.
- 외부 탐색/새 창/원격 네트워크 및 권한 요청 차단. 로컬 앱 origin만 허용.
- 범용 파일 API/IPC를 노출하지 않고 백업용 IPC만 제공하며 발신 프레임을 검사.
- 내부 서버는 loopback에만 바인딩하고 앱 종료 시 함께 종료. 부모 프로세스가 사라져도 서버가 종료되도록 감시.
- `.env*`는 패키지에서 제외. `.desktop-*`, `.next-desktop`, `dist-desktop`은 Git ignore.
- OS 샌드박스를 끄지 않았습니다. Fedora에서 Wayland/Vulkan 진단 로그가 있었으나 서버와 페이지 로딩은 완료됐습니다.

## 업데이트할 때

요청받은 기능을 모두 구현하고 테스트한 다음 마지막에 Linux 앱을 한 번 빌드합니다. 실행 중인 DOMO를 닫은 뒤 아래 명령을 순서대로 실행합니다. 빌드를 동시에 실행하지 않습니다.

```bash
env LD_LIBRARY_PATH=/usr/lib64 npm test
env LD_LIBRARY_PATH=/usr/lib64 npm run desktop:prepare
env LD_LIBRARY_PATH=/usr/lib64 npm run desktop:package -- --linux AppImage
```

기존 앱 메뉴 아이콘은 `dist-desktop/linux-unpacked/domo`를 가리키므로 다시 실행하면 새 빌드가 적용됩니다. AppImage도 `dist-desktop`에 갱신됩니다. 사용자 데이터 폴더는 건드리지 않습니다.

연결선을 우클릭하면 실선·점선·화살표선을 선택할 수 있습니다. 직선/곡선은 별도 설정이며, 선택한 종류는 로컬 데이터에 저장됩니다.

앱을 닫고 백업을 내보낸 뒤 새 버전으로 교체합니다. 개발 실행은 설치 앱과 데이터를 공유하지 않습니다. `appId`, `userData` 경로, 설치 앱 origin을 임의로 바꾸면 기존 데이터가 보이지 않을 수 있으므로 변경 시 마이그레이션이 필요합니다. 자동 업데이트 기능은 아직 넣지 않았습니다.
