module.exports = {
  appId: 'com.domo.workspace', productName: 'DOMO',
  directories: { app: '.desktop-app', output: 'dist-desktop' },
  files: ['*.cjs', 'icon.png', 'package.json', '!node_modules/**/*'], asar: true,
  beforePack: async context => {
    if (!['linux', 'win32'].includes(context.electronPlatformName)) throw new Error('현재 DOMO Desktop은 Windows와 Linux만 지원합니다.');
    if (context.electronPlatformName !== process.platform) throw new Error('Next 네이티브 의존성을 포함하므로 대상 OS에서 빌드하세요. GitHub Actions의 Windows/Linux 작업을 사용할 수 있습니다.');
  },
  // builder의 의존성 수집기가 Next의 traced node_modules를 제외하지 않도록 직접 복사합니다.
  // 이 서버는 asar 밖에서 실행되며 운영체제별 CI에서 각각 준비됩니다.
  afterPack: async context => {
    const fs = require('node:fs/promises');
    const path = require('node:path');
    await fs.cp(path.resolve('.desktop-web'), path.join(context.appOutDir, 'resources', 'web'), { recursive: true, filter: source => !path.basename(source).startsWith('.env') });
  },
  artifactName: 'DOMO-${version}-${os}-${arch}.${ext}',
  linux: { target: ['AppImage', 'tar.gz'], category: 'Office', icon: '.desktop-app/icon.png', executableName: 'domo', syncDesktopName: true, desktop: { entry: { Name: 'DOMO', Comment: '로컬 프로젝트 워크스페이스' } } },
  win: { target: ['nsis'], icon: '.desktop-app/icon.png' },
  nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, createStartMenuShortcut: true, deleteAppDataOnUninstall: false },
};
