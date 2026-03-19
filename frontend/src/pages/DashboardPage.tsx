import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getReports } from '../api/reports';
import type { ReportStatus } from '../api/reports';

const statusLabel: Record<ReportStatus, string> = {
  draft: '下書き',
  submitted: '提出済み',
  reviewed: '確認済み',
};

const statusColor: Record<ReportStatus, string> = {
  draft: '#d97706',
  submitted: '#2563eb',
  reviewed: '#16a34a',
};

const DashboardPage: React.FC = () => {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => getReports({ per_page: 5 }),
  });

  const reports = reportsData?.data.data.reports ?? [];
  const todayReport = reports.find((r) => r.report_date === today);

  const todayStatus = todayReport ? todayReport.status : null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '24px',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '16px',
  };

  const badgeStyle = (status: ReportStatus): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: `${statusColor[status]}20`,
    color: statusColor[status],
    border: `1px solid ${statusColor[status]}40`,
  });

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  };

  const thStyle: React.CSSProperties = {
    borderBottom: '2px solid #e5e7eb',
    padding: '10px 12px',
    textAlign: 'left',
    color: '#6b7280',
    fontWeight: '600',
    fontSize: '13px',
  };

  const tdStyle: React.CSSProperties = {
    borderBottom: '1px solid #f3f4f6',
    padding: '12px',
    color: '#374151',
  };

  const rowStyle: React.CSSProperties = {
    cursor: 'pointer',
  };

  const createButtonStyle: React.CSSProperties = {
    backgroundColor: '#1e40af',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: todayReport ? 'not-allowed' : 'pointer',
    opacity: todayReport ? 0.5 : 1,
    marginTop: '8px',
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px' }}>
        ダッシュボード
      </h1>

      <div style={cardStyle}>
        <h2 style={headingStyle}>今日の日報ステータス</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '15px', color: '#374151' }}>
            {today} &nbsp;
            {todayStatus ? (
              <span style={badgeStyle(todayStatus)}>{statusLabel[todayStatus]}</span>
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                }}
              >
                未作成
              </span>
            )}
          </div>

          {!isManager && (
            <button
              style={createButtonStyle}
              disabled={!!todayReport}
              onClick={() => !todayReport && navigate('/reports/new')}
            >
              {todayReport ? '本日の日報作成済み' : '日報を作成する'}
            </button>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ ...headingStyle, marginBottom: 0 }}>最近の日報（5件）</h2>
          <Link to="/reports" style={{ color: '#2563eb', fontSize: '14px', textDecoration: 'none' }}>
            日報一覧を見る →
          </Link>
        </div>

        {isLoading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>読み込み中...</p>
        ) : reports.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>日報がありません</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>日付</th>
                {isManager && <th style={thStyle}>担当者</th>}
                <th style={thStyle}>ステータス</th>
                <th style={thStyle}>訪問数</th>
                <th style={thStyle}>コメント数</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.report_id}
                  style={rowStyle}
                  onClick={() => navigate(`/reports/${report.report_id}`)}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <td style={tdStyle}>{report.report_date}</td>
                  {isManager && <td style={tdStyle}>{report.user.name}</td>}
                  <td style={tdStyle}>
                    <span style={badgeStyle(report.status)}>{statusLabel[report.status]}</span>
                  </td>
                  <td style={tdStyle}>{report.visit_count}</td>
                  <td style={tdStyle}>{report.comment_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>
        ログイン中: {user?.name}（{user?.department}）
      </div>
    </div>
  );
};

export default DashboardPage;
