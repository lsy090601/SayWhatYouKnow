// React 앱을 HTML의 루트 요소에 연결하고 공통 스타일을 불러옵니다.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

// index.html의 #root 요소에 앱을 렌더링합니다. StrictMode는 개발 중 잠재적 문제를 검사합니다.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
