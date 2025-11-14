import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';

export default function Admin() {
  const [me, setMe] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Pending verifications
  const [pending, setPending] = useState([]);
  const [noteById, setNoteById] = useState({});
  
  // Users management
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersFilters, setUsersFilters] = useState({
    search: '',
    verificationStatus: '',
    isBlocked: '',
    college: ''
  });
  const [blockReason, setBlockReason] = useState({});
  
  // Chats
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  
  // Stats
  const [stats, setStats] = useState(null);
  
  // Audit log
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    apiGet('/api/auth/me')
      .then((u) => {
        if (!u.isAdmin) window.location.href = '/';
        setMe(u);
      })
      .catch(() => (window.location.href = '/login'));
  }, []);

  // Load pending verifications
  const loadPending = async () => {
    const p = await apiGet('/api/admin/pending');
    setPending(p);
  };

  // Load users
  const loadUsers = async (page = 1) => {
    const params = new URLSearchParams({
      page,
      limit: 50,
      ...Object.fromEntries(Object.entries(usersFilters).filter(([_, v]) => v))
    });
    const data = await apiGet(`/api/admin/users?${params}`);
    setUsers(data.users);
    setUsersPage(data.page);
    setUsersTotalPages(data.pages);
  };

  // Load chats - get unique conversation pairs
  const loadChats = async () => {
    try {
      const data = await apiGet('/api/admin/chats?limit=500');
      // Group messages by user pairs to show conversations
      const conversationMap = new Map();
      
      data.messages.forEach(msg => {
        const fromId = typeof msg.fromUser === 'object' ? msg.fromUser._id : msg.fromUser;
        const toId = typeof msg.toUser === 'object' ? msg.toUser._id : msg.toUser;
        
        // Create a consistent key for the conversation pair
        const key = [fromId, toId].sort().join('_');
        
        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            user1: typeof msg.fromUser === 'object' ? msg.fromUser : { _id: fromId, name: 'Loading...', email: '' },
            user2: typeof msg.toUser === 'object' ? msg.toUser : { _id: toId, name: 'Loading...', email: '' },
            lastMessage: msg,
            messageCount: 0
          });
        }
        
        const conv = conversationMap.get(key);
        conv.messageCount += 1;
        if (new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt)) {
          conv.lastMessage = msg;
        }
      });
      
      const conversations = Array.from(conversationMap.values());
      conversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
      setChats(conversations);
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
    }
  };

  // Load chat between two users
  const loadChatBetweenUsers = async (user1Id, user2Id) => {
    try {
      const data = await apiGet(`/api/admin/chats/${user1Id}/${user2Id}`);
      setChatMessages(data.messages || []);
      setSelectedChat(data);
    } catch (error) {
      console.error('Error loading chat:', error);
      alert('Failed to load chat');
    }
  };

  // Load stats
  const loadStats = async () => {
    const data = await apiGet('/api/admin/stats');
    setStats(data);
  };

  // Load audit logs
  const loadLogs = async () => {
    const l = await apiGet('/api/admin/audit-log');
    setLogs(l);
  };

  useEffect(() => {
    if (me) {
      if (activeTab === 'pending') loadPending();
      else if (activeTab === 'users') loadUsers();
      else if (activeTab === 'chats') loadChats();
      else if (activeTab === 'stats') loadStats();
      else if (activeTab === 'logs') loadLogs();
    }
  }, [me, activeTab]);

  const approve = async (id) => {
    await apiPost('/api/admin/approve', { userId: id, note: noteById[id] || '' });
    await loadPending();
  };

  const reupload = async (id) => {
    await apiPost('/api/admin/request-reupload', { userId: id, note: noteById[id] || '' });
    await loadPending();
  };

  const decline = async (id) => {
    await apiPost('/api/admin/decline', { userId: id, note: noteById[id] || '' });
    await loadPending();
  };

  const blockUser = async (userId) => {
    if (!confirm('Are you sure you want to block this user?')) return;
    await apiPost(`/api/admin/users/${userId}/block`, { reason: blockReason[userId] || 'Blocked by admin' });
    await loadUsers(usersPage);
  };

  const unblockUser = async (userId) => {
    if (!confirm('Are you sure you want to unblock this user?')) return;
    await apiPost(`/api/admin/users/${userId}/unblock`, {});
    await loadUsers(usersPage);
  };

  const viewChat = async (user1Id, user2Id) => {
    const data = await apiGet(`/api/admin/chats/${user1Id}/${user2Id}`);
    setSelectedChat(data);
    setChatMessages(data.messages);
  };

  if (!me) return null;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={() => window.location.href = '/profile'} className="back-btn">
          Back to Profile
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={activeTab === 'pending' ? 'active' : ''} 
          onClick={() => setActiveTab('pending')}
        >
          Pending Verifications
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          Users Management
        </button>
        <button 
          className={activeTab === 'chats' ? 'active' : ''} 
          onClick={() => setActiveTab('chats')}
        >
          Chat Monitoring
        </button>
        <button 
          className={activeTab === 'stats' ? 'active' : ''} 
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
        <button 
          className={activeTab === 'logs' ? 'active' : ''} 
          onClick={() => setActiveTab('logs')}
        >
          Audit Log
        </button>
      </div>

      {/* Pending Verifications Tab */}
      {activeTab === 'pending' && (
        <div className="admin-section">
          <h2>Pending Verifications ({pending.length})</h2>
          {pending.length === 0 ? (
            <p>No pending verifications</p>
          ) : (
            <div className="pending-grid">
              {pending.map((u) => (
                <div key={u._id} className="pending-card">
                  <div className="pending-info">
                    <div><strong>{u.email}</strong></div>
                    <div>{u.name || '(no name)'} — {u.college || ''} {u.year || ''}</div>
                    <div>Status: <span className="status-badge">{u.verification_status}</span></div>
                    <div>Joined: {new Date(u.createdAt).toLocaleString()}</div>
                    <textarea
                      placeholder="Note to user (optional)"
                      value={noteById[u._id] || ''}
                      className="note-input"
                      onChange={(e) => setNoteById({ ...noteById, [u._id]: e.target.value })}
                    />
                    <div className="action-buttons">
                      <button onClick={() => approve(u._id)} className="btn-approve">Approve</button>
                      <button onClick={() => reupload(u._id)} className="btn-reupload">Request Re-upload</button>
                      <button onClick={() => decline(u._id)} className="btn-decline">Decline</button>
                    </div>
                  </div>
                  <div className="pending-photos">
                    <div className="photo-container">
                      <div className="photo-label">ID Photo</div>
                      {u.id_photo_url ? (
                        <img alt="id" src={u.id_photo_url} className="verification-photo" />
                      ) : (
                        <div className="no-photo">No ID</div>
                      )}
                    </div>
                    <div className="photo-container">
                      <div className="photo-label">Selfie</div>
                      {u.selfie_url ? (
                        <img alt="selfie" src={u.selfie_url} className="verification-photo" />
                      ) : (
                        <div className="no-photo">No Selfie</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <div className="admin-section">
          <h2>Users Management</h2>
          
          {/* Filters */}
          <div className="filters-panel">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={usersFilters.search}
              onChange={(e) => setUsersFilters({ ...usersFilters, search: e.target.value })}
              className="filter-input"
            />
            <select
              value={usersFilters.verificationStatus}
              onChange={(e) => setUsersFilters({ ...usersFilters, verificationStatus: e.target.value })}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="reupload_required">Reupload Required</option>
            </select>
            <select
              value={usersFilters.isBlocked}
              onChange={(e) => setUsersFilters({ ...usersFilters, isBlocked: e.target.value })}
              className="filter-select"
            >
              <option value="">All Users</option>
              <option value="false">Active Only</option>
              <option value="true">Blocked Only</option>
            </select>
            <input
              type="text"
              placeholder="College..."
              value={usersFilters.college}
              onChange={(e) => setUsersFilters({ ...usersFilters, college: e.target.value })}
              className="filter-input"
            />
            <button onClick={() => loadUsers(1)} className="filter-apply-btn">Apply Filters</button>
          </div>

          {/* Users Table */}
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>College</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Blocked</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className={user.isBlocked ? 'blocked-user' : ''}>
                    <td>{user.email}</td>
                    <td>{user.name || '-'} {user.isAdmin && <span className="admin-badge">ADMIN</span>}</td>
                    <td>{user.college || '-'}</td>
                    <td>{user.department || '-'}</td>
                    <td><span className={`status-badge status-${user.verification_status}`}>{user.verification_status}</span></td>
                    <td>{user.isBlocked ? '🚫 Yes' : '✅ No'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      {!user.isAdmin && (
                        user.isBlocked ? (
                          <button onClick={() => unblockUser(user._id)} className="btn-unblock">Unblock</button>
                        ) : (
                          <div className="block-controls">
                            <input
                              type="text"
                              placeholder="Block reason..."
                              value={blockReason[user._id] || ''}
                              onChange={(e) => setBlockReason({ ...blockReason, [user._id]: e.target.value })}
                              className="reason-input"
                            />
                            <button onClick={() => blockUser(user._id)} className="btn-block">Block</button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button 
              onClick={() => loadUsers(usersPage - 1)} 
              disabled={usersPage <= 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span>Page {usersPage} of {usersTotalPages}</span>
            <button 
              onClick={() => loadUsers(usersPage + 1)} 
              disabled={usersPage >= usersTotalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Chat Monitoring Tab */}
      {activeTab === 'chats' && (
        <div className="admin-section">
          <h2>Chat Monitoring</h2>
          
          {!selectedChat ? (
            <div className="chats-list">
              <h3>Conversations ({chats.length})</h3>
              {chats.length === 0 ? (
                <p>No conversations yet. Users need to match first to start chatting.</p>
              ) : (
                <div className="chat-previews">
                  {chats.map((conv, idx) => {
                    const user1Id = typeof conv.user1 === 'object' ? conv.user1._id : conv.user1;
                    const user2Id = typeof conv.user2 === 'object' ? conv.user2._id : conv.user2;
                    return (
                      <div 
                        key={idx} 
                        className="chat-preview" 
                        onClick={() => loadChatBetweenUsers(user1Id, user2Id)}
                      >
                        <div className="chat-users">
                          <strong>{conv.user1?.name || conv.user1?.email || 'User 1'}</strong> ↔ 
                          <strong>{conv.user2?.name || conv.user2?.email || 'User 2'}</strong>
                        </div>
                        <div className="chat-content">
                          {conv.lastMessage?.content?.substring(0, 100) || 
                           (conv.lastMessage?.messageType === 'voice' ? '🎤 Voice note' : 
                           conv.lastMessage?.messageType === 'image' ? '🖼️ Image' :
                           conv.lastMessage?.messageType === 'video' ? '🎥 Video' : 
                           'Message')}
                        </div>
                        <div className="chat-meta">
                          <span>{conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}</span>
                          <span className="chat-time">{new Date(conv.lastMessage?.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="chat-detail">
              <button onClick={() => { setSelectedChat(null); setChatMessages([]); }} className="back-btn-small">
                ← Back to conversations
              </button>
              <h3>Chat between {selectedChat.users?.user1?.name || selectedChat.users?.user1?.email || 'User 1'} and {selectedChat.users?.user2?.name || selectedChat.users?.user2?.email || 'User 2'}</h3>
              <div className="messages-list">
                {chatMessages.length === 0 ? (
                  <p>No messages in this conversation.</p>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const fromUser = typeof msg.fromUser === 'object' ? msg.fromUser : { name: 'User', email: '' };
                    const toUser = typeof msg.toUser === 'object' ? msg.toUser : { name: 'User', email: '' };
                    
                    return (
                      <div key={idx} className="message-item">
                        <div className="message-header">
                          <strong>{fromUser?.name || fromUser?.email}</strong> → {toUser?.name || toUser?.email}
                          <span className="message-type">({msg.messageType || 'text'})</span>
                        </div>
                        <div className="message-content">
                          {msg.messageType === 'image' && msg.mediaUrl ? (
                            <img src={msg.mediaUrl} alt="Shared image" style={{ maxWidth: '300px', maxHeight: '300px' }} />
                          ) : msg.messageType === 'video' && msg.mediaUrl ? (
                            <video src={msg.mediaUrl} controls style={{ maxWidth: '300px', maxHeight: '300px' }} />
                          ) : msg.messageType === 'voice' && msg.mediaUrl ? (
                            <audio src={msg.mediaUrl} controls />
                          ) : (
                            msg.content
                          )}
                        </div>
                        <div className="message-time">{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div className="admin-section">
          <h2>Platform Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.approvedUsers}</div>
              <div className="stat-label">Approved Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.pendingUsers}</div>
              <div className="stat-label">Pending Verifications</div>
            </div>
            <div className="stat-card blocked">
              <div className="stat-value">{stats.blockedUsers}</div>
              <div className="stat-label">Blocked Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalMessages}</div>
              <div className="stat-label">Total Messages</div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'logs' && (
        <div className="admin-section">
          <h2>Audit Log (Recent 200)</h2>
          <div className="audit-log">
            {logs.map((l) => (
              <div key={l.id} className="log-entry">
                <div className="log-action"><strong>{l.action.toUpperCase()}</strong></div>
                <div className="log-details">
                  User: {l.userEmail} | Admin: {l.adminEmail} | {new Date(l.timestamp).toLocaleString()}
                </div>
                {l.note && <div className="log-note">Note: {l.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
