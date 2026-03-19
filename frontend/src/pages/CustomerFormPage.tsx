import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCustomer, createCustomer, updateCustomer } from '../api/customers';
import ErrorMessage from '../components/ErrorMessage';

const CustomerFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const customerId = id ? Number(id) : null;
  const isEdit = customerId !== null;
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: customerData } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (customerData && !initialized) {
      const c = customerData.data.data;
      setCompanyName(c.company_name);
      setContactName(c.contact_name ?? '');
      setPhone(c.phone ?? '');
      setEmail(c.email ?? '');
      setAddress(c.address ?? '');
      setNotes(c.notes ?? '');
      setInitialized(true);
    }
  }, [customerData, initialized]);

  const createMutation = useMutation({ mutationFn: createCustomer });
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateCustomer>[1]) => updateCustomer(customerId!, data),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('会社名は必須です');
      return;
    }
    setError('');

    const data = {
      company_name: companyName,
      contact_name: contactName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      notes: notes || undefined,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
      navigate('/customers');
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
    maxWidth: '640px',
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

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
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
        顧客マスタ{isEdit ? '編集' : '登録'}
      </h1>

      <ErrorMessage message={error} />

      <div style={cardStyle}>
        <form onSubmit={handleSubmit}>
          <div>
            <label style={labelStyle}>
              会社名 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={inputStyle}
              placeholder="株式会社〇〇"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>担当者名</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={inputStyle}
              placeholder="山田 太郎"
            />
          </div>
          <div>
            <label style={labelStyle}>電話番号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
              placeholder="03-1234-5678"
            />
          </div>
          <div>
            <label style={labelStyle}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label style={labelStyle}>住所</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyle}
              placeholder="東京都千代田区〇〇1-1-1"
            />
          </div>
          <div>
            <label style={labelStyle}>備考</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={textareaStyle}
              placeholder="備考を入力してください"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/customers')}
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

export default CustomerFormPage;
