import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as authApi from '../api/auth';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isManager, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ログアウトAPIが失敗してもローカルの状態はクリアする
    }
    logout();
    navigate('/login');
  };

  const navStyle: React.CSSProperties = {
    backgroundColor: '#1e40af',
    color: '#fff',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const linkStyle: React.CSSProperties = {
    color: '#93c5fd',
    textDecoration: 'none',
    marginRight: '20px',
    fontSize: '14px',
  };

  const activeLinkStyle: React.CSSProperties = {
    ...linkStyle,
    color: '#fff',
    fontWeight: 'bold',
  };

  const brandStyle: React.CSSProperties = {
    fontWeight: 'bold',
    fontSize: '16px',
    marginRight: '32px',
    color: '#fff',
    textDecoration: 'none',
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
  };

  const logoutButtonStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    border: '1px solid #93c5fd',
    borderRadius: '4px',
    color: '#93c5fd',
    cursor: 'pointer',
    padding: '4px 12px',
    fontSize: '13px',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/" style={brandStyle}>営業日報システム</Link>
          <Link to="/" style={activeLinkStyle}>ダッシュボード</Link>
          <Link to="/reports" style={linkStyle}>日報一覧</Link>
          <Link to="/customers" style={linkStyle}>顧客マスタ</Link>
          {isManager && (
            <Link to="/users" style={linkStyle}>ユーザー管理</Link>
          )}
        </div>
        <div style={userInfoStyle}>
          {user && (
            <span style={{ color: '#bfdbfe' }}>
              {user.name}（{user.role === 'manager' ? 'マネージャー' : '営業'}）
            </span>
          )}
          <button style={logoutButtonStyle} onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </nav>
      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
