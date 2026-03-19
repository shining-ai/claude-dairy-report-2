import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getCustomers, deleteCustomer } from '../api/customers';
import ErrorMessage from '../components/ErrorMessage';

const CustomerListPage: React.FC = () => {
  const { isManager } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', searchQuery, page],
    queryFn: () => getCustomers({ q: searchQuery || undefined, page }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'], exact: false });
    },
  });

  const customers = customersData?.data.data.customers ?? [];
  const pagination = customersData?.data.data.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(query);
  };

  const handleDelete = async (id: number, name: string) => {
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

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    width: '280px',
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>顧客マスタ</h1>
        {isManager && (
          <button
            onClick={() => navigate('/customers/new')}
            style={{ ...buttonStyle, backgroundColor: '#1e40af', color: '#fff', borderColor: '#1e40af', padding: '8px 20px' }}
          >
            新規登録
          </button>
        )}
      </div>

      <ErrorMessage message={error} />

      <div style={cardStyle}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
              キーワード検索（会社名・担当者名）
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={inputStyle}
              placeholder="キーワードを入力"
            />
          </div>
          <button
            type="submit"
            style={{ ...buttonStyle, backgroundColor: '#1e40af', color: '#fff', borderColor: '#1e40af', padding: '8px 20px' }}
          >
            検索
          </button>
          <button
            type="button"
            onClick={() => { setQuery(''); setSearchQuery(''); setPage(1); }}
            style={{ ...buttonStyle, backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db', padding: '8px 20px' }}
          >
            リセット
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        {isLoading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>読み込み中...</p>
        ) : customers.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>顧客が見つかりません</p>
        ) : (
          <>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>会社名</th>
                  <th style={thStyle}>担当者名</th>
                  <th style={thStyle}>電話番号</th>
                  <th style={thStyle}>メールアドレス</th>
                  {isManager && <th style={thStyle}>操作</th>}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td style={{ ...tdStyle, fontWeight: '500' }}>{customer.company_name}</td>
                    <td style={tdStyle}>{customer.contact_name ?? '—'}</td>
                    <td style={tdStyle}>{customer.phone ?? '—'}</td>
                    <td style={tdStyle}>{customer.email ?? '—'}</td>
                    {isManager && (
                      <td style={tdStyle}>
                        <button
                          onClick={() => navigate(`/customers/${customer.customer_id}/edit`)}
                          style={{ ...buttonStyle, backgroundColor: '#fff', color: '#d97706', borderColor: '#d97706' }}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(customer.customer_id, customer.company_name)}
                          style={{ ...buttonStyle, backgroundColor: '#fff', color: '#dc2626', borderColor: '#dc2626' }}
                        >
                          削除
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
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
                  {page} / {pagination.total_pages}（全{pagination.total}件）
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

export default CustomerListPage;
