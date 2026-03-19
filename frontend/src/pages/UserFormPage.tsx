import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getUser, createUser, updateUser } from '../api/users';
import ErrorMessage from '../components/ErrorMessage';

const UserFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const userId = id ? Number(id) : null;
  const isEdit = userId !== null;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'sales' | 'manager'>('sales');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (userData && !initialized) {
      const u = userData.data.data;
      setName(u.name);
      setEmail(u.email);
      setRole(u.role);
      setDepartment(u.department ?? '');
      setInitialized(true);
    }
  }, [userData, initialized]);

  const createMutation = useMutation({ mutationFn: createUser });
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateUser>[1]) => updateUser(userId!, data),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('氏名は必須です');
      return;
    }
    if (!email.trim()) {
      setError('メールアドレスは必須です');
      return;
    }
    if (!isEdit && !password) {
      setError('パスワードは必須です（8文字以上）');
      return;
    }
    if (!isEdit && password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    setError('');

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          name,
          email,
          password: password || undefined,
          role,
          department: department || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          name,
          email,
          password,
          role,
          department: department || undefined,
        });
      }
      navigate('/users');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? '保存に失敗しました');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '32px',
    maxWidth: '560px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    marginBottom: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 24px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    border: '1px solid',
    marginLeft: '8px',
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px' }}>
        ユーザー{isEdit ? '編集' : '登録'}
      </h1>

      <ErrorMessage message={error} />

      <div style={cardStyle}>
        <form onSubmit={handleSubmit}>
          <div>
            <label style={labelStyle}>
              氏名 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="山田 太郎"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>
              メールアドレス <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="yamada@example.com"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>
              パスワード{isEdit ? '' : <span style={{ color: '#dc2626' }}> *</span>}
              {isEdit && (
                <span style={{ color: '#9ca3af', fontWeight: '400', marginLeft: '4px', fontSize: '12px' }}>
                  （変更する場合のみ入力）
                </span>
              )}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder={isEdit ? '変更しない場合は空欄' : '8文字以上'}
              required={!isEdit}
              minLength={password ? 8 : undefined}
            />
          </div>
          <div>
            <label style={labelStyle}>
              ロール <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'sales' | 'manager')}
              style={inputStyle}
              required
            >
              <option value="sales">営業（sales）</option>
              <option value="manager">マネージャー（manager）</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>部署</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={inputStyle}
              placeholder="東京営業部"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/users')}
              style={{ ...buttonStyle, backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }}
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              style={{ ...buttonStyle, backgroundColor: '#1e40af', color: '#fff', borderColor: '#1e40af', opacity: isLoading ? 0.6 : 1 }}
              disabled={isLoading}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormPage;
