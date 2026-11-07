// 소스 품질 검사 규칙입니다. Next/TypeScript 기본 규칙을 합치고 생성된 결과물은 검사에서 제외합니다.
// 런타임 기능을 켜거나 끄는 설정이 아니며, npm run lint의 성공/실패 기준에 영향을 줍니다.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
