// Mensaje de resultado de una operación (FR-026)
export default function Message({ type = 'success', children }) {
  if (!children) return null;
  const isError = type === 'error';
  return (
    <div
      className={`message ${isError ? 'message-error' : 'message-success'}`}
      role={isError ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
