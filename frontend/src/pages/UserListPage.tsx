import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getUsers, deleteUser } from '../api/users';
import ErrorMessage from '../components/ErrorMessage';

const roleLabel: Record<string, string> = {
  sales: '営業',
  manager: 'マネージャー',
};

const UserListPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const users = usersData?.data.data.users ?? [];

  const handleDelete = async (id: number, name: string) => {
    if (id === currentUser?.user_id) {
      setError('自分自身を削除することはできません');
      return;
    }
    const confirmed = window.confirm(`「${name}」を削除しますか？`);
    if (!confirmed) return;
    setError('');
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? '削除に失敗しました');
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '24px',
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>ユーザー管理</h1>
        <button
          onClick={() => navigate('/users/new')}
          style={{ ...buttonStyle, backgroundColor: '#1e40af', color: '#fff', borderColor: '#1e40af', padding: '8px 20px' }}
        >
          新規登録
        </button>
      </div>

      <ErrorMessage message={error} />

      <div style={cardStyle}>
        {isLoading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>読み込み中...</p>
        ) : users.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>ユーザーがいません</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>氏名</th>
                <th style={thStyle}>メールアドレス</th>
                <th style={thStyle}>ロール</th>
                <th style={thStyle}>部署</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td style={{ ...tdStyle, fontWeight: '500' }}>
                    {u.name}
                    {u.user_id === currentUser?.user_id && (
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          padding: '1px 6px',
                          borderRadius: '8px',
                        }}
                      >
                        あなた
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: u.role === 'manager' ? '#fef3c7' : '#f0fdf4',
                        color: u.role === 'manager' ? '#d97706' : '#16a34a',
                        border: `1px solid ${u.role === 'manager' ? '#fcd34d' : '#86efac'}`,
                      }}
                    >
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td style={tdStyle}>{u.department ?? '—'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => navigate(`/users/${u.user_id}/edit`)}
                      style={{ ...buttonStyle, backgroundColor: '#fff', color: '#d97706', borderColor: '#d97706' }}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(u.user_id, u.name)}
                      disabled={u.user_id === currentUser?.user_id}
                      style={{
                        ...buttonStyle,
                        backgroundColor: '#fff',
                        color: u.user_id === currentUser?.user_id ? '#d1d5db' : '#dc2626',
                        borderColor: u.user_id === currentUser?.user_id ? '#d1d5db' : '#dc2626',
                        cursor: u.user_id === currentUser?.user_id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserListPage;
