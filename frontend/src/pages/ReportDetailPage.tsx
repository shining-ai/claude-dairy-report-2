import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getReport, reviewReport, addComment, deleteComment } from '../api/reports';
import ErrorMessage from '../components/ErrorMessage';
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

const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const reportId = Number(id);
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: !!reportId,
  });

  const reviewMutation = useMutation({
    mutationFn: () => reviewReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) => addComment(reportId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      setCommentText('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(reportId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
    },
  });

  const report = reportData?.data.data;

  const handleReview = async () => {
    const confirmed = window.confirm('この日報を確認済みにしますか？');
    if (!confirmed) return;
    try {
      await reviewMutation.mutateAsync();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? '操作に失敗しました');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setError('');
    try {
      await addCommentMutation.mutateAsync(commentText);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? 'コメントの送信に失敗しました');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const confirmed = window.confirm('このコメントを削除しますか？');
    if (!confirmed) return;
    try {
      await deleteCommentMutation.mutateAsync(commentId);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? 'コメントの削除に失敗しました');
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '24px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '8px',
  };

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
    backgroundColor: '#f9fafb',
  };

  const tdStyle: React.CSSProperties = {
    borderBottom: '1px solid #f3f4f6',
    padding: '12px',
    color: '#374151',
    verticalAlign: 'top',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 20px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    border: '1px solid',
    marginLeft: '8px',
  };

  if (isLoading) {
    return <p style={{ color: '#6b7280', padding: '24px' }}>読み込み中...</p>;
  }

  if (!report) {
    return <p style={{ color: '#dc2626', padding: '24px' }}>日報が見つかりません</p>;
  }

  const canEdit =
    !isManager &&
    report.user.user_id === user?.user_id &&
    report.status === 'draft';

  const canReview = isManager && report.status === 'submitted';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>日報詳細</h1>
        <div>
          <button
            onClick={() => navigate('/reports')}
            style={{ ...buttonStyle, backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }}
          >
            戻る
          </button>
          {canEdit && (
            <button
              onClick={() => navigate(`/reports/${reportId}/edit`)}
              style={{ ...buttonStyle, backgroundColor: '#fff', color: '#d97706', borderColor: '#d97706' }}
            >
              編集する
            </button>
          )}
          {canReview && (
            <button
              onClick={handleReview}
              disabled={reviewMutation.isPending}
              style={{ ...buttonStyle, backgroundColor: '#16a34a', color: '#fff', borderColor: '#16a34a' }}
            >
              確認済みにする
            </button>
          )}
        </div>
      </div>

      <ErrorMessage message={error} />

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>基本情報</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '14px' }}>
          <div>
            <span style={{ color: '#6b7280', marginRight: '8px' }}>日付:</span>
            <span style={{ color: '#1e293b', fontWeight: '500' }}>{report.report_date}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280', marginRight: '8px' }}>担当者:</span>
            <span style={{ color: '#1e293b', fontWeight: '500' }}>{report.user.name}</span>
            {report.user.department && (
              <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: '4px' }}>
                ({report.user.department})
              </span>
            )}
          </div>
          <div>
            <span style={{ color: '#6b7280', marginRight: '8px' }}>ステータス:</span>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: `${statusColor[report.status]}20`,
                color: statusColor[report.status],
                border: `1px solid ${statusColor[report.status]}40`,
              }}
            >
              {statusLabel[report.status]}
            </span>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>訪問記録</h2>
        {report.visits.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>訪問記録がありません</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '48px' }}>No</th>
                <th style={thStyle}>顧客名</th>
                <th style={thStyle}>訪問内容</th>
              </tr>
            </thead>
            <tbody>
              {report.visits
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((visit, index) => (
                  <tr key={visit.visit_id}>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{index + 1}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '500' }}>{visit.customer.company_name}</div>
                      {visit.customer.contact_name && (
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>{visit.customer.contact_name}</div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'pre-wrap' }}>{visit.visit_content}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Problem / Plan</h2>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            課題・相談（Problem）
          </h3>
          <p style={{ color: report.problem ? '#1e293b' : '#9ca3af', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {report.problem || '（記入なし）'}
          </p>
        </div>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            明日やること（Plan）
          </h3>
          <p style={{ color: report.plan ? '#1e293b' : '#9ca3af', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {report.plan || '（記入なし）'}
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>コメント（{report.comments.length}件）</h2>

        {report.comments.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>コメントはありません</p>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {report.comments.map((comment) => (
              <div
                key={comment.comment_id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>{comment.user.name}</span>
                    <span style={{ color: '#9ca3af', marginLeft: '8px' }}>
                      {new Date(comment.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  {isManager && comment.user.user_id === user?.user_id && (
                    <button
                      onClick={() => handleDeleteComment(comment.comment_id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 6px',
                      }}
                    >
                      削除
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.6' }}>
                  {comment.comment_text}
                </p>
              </div>
            ))}
          </div>
        )}

        {isManager && (
          <form onSubmit={handleAddComment}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                コメントを追加
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
                placeholder="コメントを入力してください"
              />
            </div>
            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                disabled={!commentText.trim() || addCommentMutation.isPending}
                style={{
                  padding: '8px 20px',
                  backgroundColor: !commentText.trim() ? '#93c5fd' : '#1e40af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: !commentText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                送信
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportDetailPage;
