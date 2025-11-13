const copyByStatus = {
  approved: {
    title: 'Approved',
    description: 'You have full access. Happy matching!'
  },
  declined: {
    title: 'Declined',
    description: 'Contact support if you think this was a mistake.'
  },
  reupload_required: {
    title: 'Re-upload required',
    description: 'Submit clearer photos to unlock your account again.'
  },
  pending: {
    title: 'Pending review',
    description: 'Hang tight! Limited features until the team approves you.'
  }
};

export default function StatusBanner({ status, adminNote }) {
  if (!status) return null;

  const { title, description } = copyByStatus[status] || copyByStatus.pending;

  return (
    <div className="status-banner" data-status={status}>
      <div className="status-content">
        <span className="status-pill">{title}</span>
        <p>{description}</p>
        {adminNote && <p className="status-note">Note from admin: {adminNote}</p>}
      </div>
    </div>
  );
}
