// 프런트엔드 JavaScript와 React 코드에 적용할 검사 규칙을 정의합니다.

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // 빌드 결과물은 검사하지 않습니다.
  { ignores: ['dist'] },
  {
    // 모든 JS와 JSX 파일에 적용합니다.
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      // window, document 등 브라우저 전역 변수를 허용합니다.
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    // JavaScript 권장 규칙과 React Hooks 규칙을 사용합니다.
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // 대문자나 밑줄로 시작하는 미사용 변수는 허용합니다.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Fast Refresh를 위해 컴포넌트 파일의 다른 내보내기를 경고합니다.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
