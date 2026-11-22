// 공통 헤더와 탐색 메뉴, 배경, 각 페이지가 들어갈 영역을 구성합니다.

import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon';
import Background3D from './Background3D';

// 데스크톱과 모바일 메뉴에서 함께 사용하는 탐색 항목입니다.
const NAV = [
  { to: '/challenge', label: '도전하기' },
  { to: '/history', label: '기록' },
  { to: '/rubric', label: '채점 기준' },
];

// 홈으로 이동하는 로고입니다.
function Logo() {
  return (
    <Link to="/" className="logo" aria-label="SayWhatYouKnow 홈">
      <svg className="logo-mark" width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M6 7.5A3.5 3.5 0 0 1 9.5 4h13A3.5 3.5 0 0 1 26 7.5v10a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5h-.5A1.5 1.5 0 0 1 6 19.5v-12z" fill="#F4E6D8" />
        <path d="M16 8.2l1.2 2.8 2.8 1.2-2.8 1.2L16 16.2l-1.2-2.8-2.8-1.2 2.8-1.2L16 8.2z" fill="#C9743B" />
      </svg>
      <span className="logo-text">
        <span className="logo-small">10 MIN · NO AI</span>
        <span className="logo-name">SayWhatYouKnow</span>
      </span>
    </Link>
  );
}

// 모든 페이지를 감싸는 공통 레이아웃입니다.
export default function Layout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  // 홈에서는 상단 글로우를 더 크고 밝게 표시합니다.
  const isHome = pathname === '/';

  return (
    <div className="app">
      {/* 배경 글로우와 3D 배경 */}
      <div className={`bg-glow${isHome ? ' is-home' : ''}`} aria-hidden="true" />
      <Background3D />
      <div className="inner">
        {/* 상단 헤더 */}
        <header className="nav">
          <Logo />
          {/* 데스크톱 탐색 메뉴 */}
          <nav className="nav-links">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive ? ' on' : ''}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          {/* 사용자 표시, 시작 버튼, 모바일 메뉴 버튼 */}
          <div className="nav-right">
            <span className="nav-signin">게스트</span>
            <Link to="/challenge" className="btn btn-primary btn-sm">시작하기</Link>
            <button className="nav-menu" aria-label="메뉴" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
          {/* 모바일 메뉴: 항목을 누르면 메뉴가 닫힙니다. */}
          {menuOpen && (
            <nav className="mobile-menu" onClick={() => setMenuOpen(false)}>
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'on' : '')}>{n.label}</NavLink>
              ))}
              <span className="sub">게스트로 학습 중</span>
            </nav>
          )}
        </header>
        {/* 현재 경로의 페이지가 Outlet 위치에 표시됩니다. */}
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

