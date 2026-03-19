import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { createReport, submitReport } from '../api/reports';
import { getCustomers } from '../api/customers';
import ErrorMessage from '../components/ErrorMessage';

interface VisitFormRow {
  customer_id: string;
  visit_content: string;
}

const ReportCreatePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [visits, setVisits] = useState<VisitFormRow[]>([{ customer_id: '', visit_content: '' }]);
  const [problem, setProblem] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => getCustomers({ per_page: 200 }),
  });
  const customers = customersData?.data.data.customers ?? [];

  const createMutation = useMutation({
    mutationFn: createReport,
  });

  const submitMutation = useMutation({
    mutationFn: submitReport,
  });

  const validate = (): boolean => {
    if (visits.length === 0) {
      setError('訪問記録を1件以上入力してください');
      return false;
    }
    for (let i = 0; i < visits.length; i++) {
      if (!visits[i].customer_id) {
        setError(`訪問記録${i + 1}行目の顧客を選択してください`);
        return false;
      }
      if (!visits[i].visit_content.trim()) {
        setError(`訪問記録${i + 1}行目の訪問内容を入力してください`);
        return false;
      }
    }
    return true;
  };

  const buildVisitData = () =>
    visits.map((v, i) => ({
      customer_id: Number(v.customer_id),
      visit_content: v.visit_content,
      sort_order: i + 1,
    }));

  const handleDraft = async () => {
    if (!validate()) return;
    setError('');
    try {
      const response = await createMutation.mutateAsync({
        report_date: today,
        problem,
        plan,
        visits: buildVisitData(),
      });
      navigate(`/reports/${response.data.data.report_id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? '保存に失敗しました');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const confirmed = window.confirm('日報を提出しますか？提出後は編集できません。');
    if (!confirmed) return;
    setError('');
    try {
      const response = await createMutation.mutateAsync({
        report_date: today,
        problem,
        plan,
        visits: buildVisitData(),
      });
      await submitMutation.mutateAsync(response.data.data.report_id);
      navigate(`/reports/${response.data.data.report_id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? '提出に失敗しました');
    }
  };

  const addVisitRow = () => {
    setVisits([...visits, { customer_id: '', visit_content: '' }]);
  };

  const removeVisitRow = (index: number) => {
    setVisits(visits.filter((_, i) => i !== index));
  };

  const updateVisit = (index: number, field: keyof VisitFormRow, value: string) => {
    setVisits(visits.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const isLoading = createMutation.isPending || submitMutation.isPending;

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '24px',
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
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 20px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    border: '1px solid',
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px' }}>
        日報作成
      </h1>

      <ErrorMessage message={error} />

      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>基本情報</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="text" value={today} readOnly style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280' }} />
          </div>
          <div>
            <label style={labelStyle}>担当者</label>
            <input type="text" value={user?.name ?? ''} readOnly style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280' }} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>訪問記録</h2>
          <button
            type="button"
            onClick={addVisitRow}
            style={{ ...buttonStyle, backgroundColor: '#fff', color: '#1e40af', borderColor: '#1e40af' }}
          >
            + 行を追加
          </button>
        </div>

        {visits.map((visit, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '12px',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                訪問 {index + 1}
              </span>
              {visits.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVisitRow(index)}
                  style={{ ...buttonStyle, backgroundColor: '#fff', color: '#dc2626', borderColor: '#dc2626', padding: '4px 12px', fontSize: '12px' }}
                >
                  削除
                </button>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                顧客 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={visit.customer_id}
                onChange={(e) => updateVisit(index, 'customer_id', e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">顧客を選択してください</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.company_name}
                    {c.contact_name ? `（${c.contact_name}）` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                訪問内容 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={visit.visit_content}
                onChange={(e) => updateVisit(index, 'visit_content', e.target.value)}
                style={{ ...textareaStyle, minHeight: '80px' }}
                placeholder="訪問内容を入力してください"
                required
              />
            </div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
          Problem / Plan
        </h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>課題・相談（Problem）</label>
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            style={textareaStyle}
            placeholder="課題や相談事項を入力してください"
          />
        </div>
        <div>
          <label style={labelStyle}>明日やること（Plan）</label>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            style={textareaStyle}
            placeholder="明日の計画を入力してください"
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="button"
          onClick={() => navigate('/reports')}
          style={{ ...buttonStyle, backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }}
          disabled={isLoading}
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleDraft}
          style={{ ...buttonStyle, backgroundColor: '#fff', color: '#d97706', borderColor: '#d97706' }}
          disabled={isLoading}
        >
          下書き保存
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{ ...buttonStyle, backgroundColor: '#1e40af', color: '#fff', borderColor: '#1e40af', opacity: isLoading ? 0.6 : 1 }}
          disabled={isLoading}
        >
          提出する
        </button>
      </div>
    </div>
  );
};

export default ReportCreatePage;
