export default function StatusBanner({ status, adminNote }) {
  if (!status) return null;
  const color =
    status === 'approved' ? '#e6ffed' : status === 'declined' ? '#ffeaea' : status === 'reupload_required' ? '#fff7e6' : '#eef6ff';
  const text =
    status === 'approved'
      ? 'Approved — you have full access.'
      : status === 'declined'
      ? 'Declined — contact support if you think this is an error.'
      : status === 'reupload_required'
      ? 'Re-upload required — please submit clearer photos.'
      : 'Pending — limited access until review completes.';
  return (
    <div style={{ background: color, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
      <strong>Status: {status}</strong>
      <div>{text}</div>
      {adminNote ? <div style={{ marginTop: 6, color: '#555' }}>Note: {adminNote}</div> : null}
    </div>
  );
}


