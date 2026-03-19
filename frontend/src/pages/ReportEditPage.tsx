import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getReport, updateReport, submitReport, addVisit, updateVisit, deleteVisit } from '../api/reports';
import { getCustomers } from '../api/customers';
import ErrorMessage from '../components/ErrorMessage';

interface VisitFormRow {
  visit_id?: number;
  customer_id: string;
  visit_content: string;
  isNew: boolean;
}

const ReportEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const reportId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [visits, setVisits] = useState<VisitFormRow[]>([]);
  const [problem, setProblem] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: !!reportId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => getCustomers({ per_page: 200 }),
  });
  const customers = customersData?.data.data.customers ?? [];

  const report = reportData?.data.data;

  useEffect(() => {
    if (report && !initialized) {
      setProblem(report.problem ?? '');
      setPlan(report.plan ?? '');
      setVisits(
        report.visits.map((v) => ({
          visit_id: v.visit_id,
          customer_id: String(v.customer.customer_id),
          visit_content: v.visit_content,
          isNew: false,
        }))
      );
      setInitialized(true);
    }
  }, [report, initialized]);

  const updateReportMutation = useMutation({ mutationFn: () => updateReport(reportId, { problem, plan }) });
  const submitReportMutation = useMutation({ mutationFn: () => submitReport(reportId) });
  const addVisitMutation = useMutation({
    mutationFn: (data: { customer_id: number; visit_content: string; sort_order: number }) =>
      addVisit(reportId, data),
  });
  const updateVisitMutation = useMutation({
    mutationFn: (data: { visit_id: number; customer_id: number; visit_content: string; sort_order: number }) =>
      updateVisit(reportId, data.visit_id, {
        customer_id: data.customer_id,
        visit_content: data.visit_content,
        sort_order: data.sort_order,
      }),
  });
  const deleteVisitMutation = useMutation({
    mutationFn: (visitId: number) => deleteVisit(reportId, visitId),
  });

  // アクセス制御: 自分のdraft以外はリダイレクト
  useEffect(() => {
    if (report) {
      if (report.user.user_id !== user?.user_id || report.status !== 'draft') {
        navigate(`/reports/${reportId}`, { replace: true });
      }
    }
  }, [report, user, reportId, navigate]);

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

  const syncVisits = async (originalVisits: typeof visits) => {
    const originalIds = (report?.visits ?? []).map((v) => v.visit_id);
    const currentIds = visits.filter((v) => !v.isNew && v.visit_id).map((v) => v.visit_id!);

    // 削除された訪問記録
    for (const origId of originalIds) {
      if (!currentIds.includes(origId)) {
        await deleteVisitMutation.mutateAsync(origId);
      }
    }

    // 追加・更新
    for (let i = 0; i < originalVisits.length; i++) {
      const v = originalVisits[i];
      if (v.isNew) {
        await addVisitMutation.mutateAsync({
          customer_id: Number(v.customer_id),
          visit_content: v.visit_content,
          sort_order: i + 1,
        });
      } else if (v.visit_id) {
        await updateVisitMutation.mutateAsync({
          visit_id: v.visit_id,
          customer_id: Number(v.customer_id),
          visit_content: v.visit_content,
          sort_order: i + 1,
        });
      }
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setError('');
    try {
      await updateReportMutation.mutateAsync();
      await syncVisits(visits);
      navigate(`/reports/${reportId}`);
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
      await updateReportMutation.mutateAsync();
      await syncVisits(visits);
      await submitReportMutation.mutateAsync();
      navigate(`/reports/${reportId}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message ?? '提出に失敗しました');
    }
  };

  const addVisitRow = () => {
    setVisits([...visits, { customer_id: '', visit_content: '', isNew: true }]);
  };

  const removeVisitRow = (index: number) => {
    setVisits(visits.filter((_, i) => i !== index));
  };

  const updateVisitField = (index: number, field: 'customer_id' | 'visit_content', value: string) => {
    setVisits(visits.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const isLoading =
    updateReportMutation.isPending ||
    submitReportMutation.isPending ||
    addVisitMutation.isPending ||
    updateVisitMutation.isPending ||
    deleteVisitMutation.isPending;

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

  if (reportLoading) {
    return <p style={{ color: '#6b7280', padding: '24px' }}>読み込み中...</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px' }}>
        日報編集
      </h1>

      <ErrorMessage message={error} />

      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>基本情報</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>日付</label>
            <input type="text" value={report?.report_date ?? ''} readOnly style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280' }} />
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
            style={{ ...buttonStyle, backgroundColor: '#fff', color: '#1e40af', borderColor: '#1e40af', padding: '6px 16px' }}
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
                onChange={(e) => updateVisitField(index, 'customer_id', e.target.value)}
                style={inputStyle}
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
                onChange={(e) => updateVisitField(index, 'visit_content', e.target.value)}
                style={{ ...textareaStyle, minHeight: '80px' }}
                placeholder="訪問内容を入力してください"
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
          onClick={() => navigate(`/reports/${reportId}`)}
          style={{ ...buttonStyle, backgroundColor: '#fff', color: '#374151', borderColor: '#d1d5db' }}
          disabled={isLoading}
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSave}
          style={{ ...buttonStyle, backgroundColor: '#fff', color: '#d97706', borderColor: '#d97706' }}
          disabled={isLoading}
        >
          保存（下書き）
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

export default ReportEditPage;
