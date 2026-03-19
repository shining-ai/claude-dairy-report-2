import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        backgroundColor: '#fee2e2',
        border: '1px solid #fca5a5',
        borderRadius: '4px',
        color: '#dc2626',
        padding: '12px 16px',
        marginBottom: '16px',
        fontSize: '14px',
      }}
    >
      {message}
    </div>
  );
};

export default ErrorMessage;
