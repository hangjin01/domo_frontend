// CSS 빌드 파이프라인에 Tailwind v4 PostCSS 플러그인을 등록합니다.
// globals.css와 컴포넌트의 유틸리티 클래스를 처리하는 설정이며 브라우저에서 직접 실행되지 않습니다.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
