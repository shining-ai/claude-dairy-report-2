import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getReports } from '../api/reports';
import { getUsers } from '../api/users';
import type { ReportStatus, ReportListParams } from '../api/reports';

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

const ReportListPage: React.FC = () => {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<ReportListParams>({});

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports', filters, page],
    queryFn: () => getReports({ ...filters, page }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: isManager,
  });

  const reports = reportsData?.data.data.reports ?? [];
  const pagination = reportsData?.data.data.pagination;
  const users = usersData?.data.data.users ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      status: status || undefined,
      user_id: selectedUserId ? Number(selectedUserId) : undefined,
    });
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setStatus('');
    setSelectedUserId('');
    setPage(1);
    setFilters({});
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '24px',
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    marginRight: '8px',
  };

  const badgeStyle = (s: ReportStatus): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: `${statusColor[s]}20`,
    color: statusColor[s],
    border: `1px solid ${statusColor[s]}40`,
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

  const buttonStyle: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    border: '1px solid',
    marginRight: '6px',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>日報一覧</h1>
        {!isManager && (
          <button
            style={{ ...buttonStyle, backgroundColor: '#1e40af', color: '#fff', borderColor: '#1e40af' }}
            onClick={() => navigate('/reports/new')}
          >
            新規作成
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                日付（開始）
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                日付（終了）
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                ステータス
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus | '')}
                style={inputStyle}
              >
                <option value="">すべて</option>
                <option value="draft">下書き</option>
                <option value="submitted">提出済み</option>
                <option value="reviewed">確認済み</option>
              </select>
            </div>
            {isManager && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                  担当者
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">全員</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                style={{ ...buttonStyle, backgroundColor: '#1e40af', color: '#fff', borderColor: '#1e40af' }}
              >
                検索
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{ ...buttonStyle, backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }}
              >
                リセット
              </button>
            </div>
          </div>
        </form>
      </div>

      <div style={cardStyle}>
        {isLoading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>読み込み中...</p>
        ) : reports.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>日報がありません</p>
        ) : (
          <>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>日付</th>
                  {isManager && <th style={thStyle}>担当者</th>}
                  <th style={thStyle}>ステータス</th>
                  <th style={thStyle}>訪問数</th>
                  <th style={thStyle}>コメント数</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const canEdit =
                    !isManager &&
                    report.user.user_id === user?.user_id &&
                    report.status === 'draft';
                  return (
                    <tr key={report.report_id}>
                      <td style={tdStyle}>{report.report_date}</td>
                      {isManager && <td style={tdStyle}>{report.user.name}</td>}
                      <td style={tdStyle}>
                        <span style={badgeStyle(report.status)}>{statusLabel[report.status]}</span>
                      </td>
                      <td style={tdStyle}>{report.visit_count}</td>
                      <td style={tdStyle}>{report.comment_count}</td>
                      <td style={tdStyle}>
                        <button
                          style={{ ...buttonStyle, backgroundColor: '#fff', color: '#2563eb', borderColor: '#2563eb' }}
                          onClick={() => navigate(`/reports/${report.report_id}`)}
                        >
                          詳細
                        </button>
                        {canEdit && (
                          <button
                            style={{ ...buttonStyle, backgroundColor: '#fff', color: '#d97706', borderColor: '#d97706' }}
                            onClick={() => navigate(`/reports/${report.report_id}/edit`)}
                          >
                            編集
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {pagination && pagination.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ ...buttonStyle, backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }}
                >
                  前へ
                </button>
                <span style={{ padding: '6px 14px', fontSize: '13px', color: '#374151' }}>
                  {page} / {pagination.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={page === pagination.total_pages}
                  style={{ ...buttonStyle, backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }}
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportListPage;
