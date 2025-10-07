import React, { useState, useEffect } from 'react';
import emailService from '../services/EmailService';
import './EmailManager.css';

const EmailManager = () => {
  const [activeTab, setActiveTab] = useState('send');
  const [emailStats, setEmailStats] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Single email form
  const [singleEmail, setSingleEmail] = useState({
    to: '',
    subject: '',
    template: 'custom',
    content: '',
    priority: 'normal'
  });

  // Newsletter form
  const [newsletter, setNewsletter] = useState({
    subject: '',
    title: '',
    content: '',
    recipients: '',
    scheduledAt: ''
  });

  // Bulk email form
  const [bulkEmail, setBulkEmail] = useState({
    emailList: '',
    subject: '',
    template: 'custom',
    content: ''
  });

  useEffect(() => {
    loadEmailData();
  }, []);

  const loadEmailData = () => {
    setEmailStats(emailService.getEmailStats(30));
    setEmailLogs(emailService.getEmailLogs(50));
  };

  const handleSendSingleEmail = async () => {
    if (!singleEmail.to || !singleEmail.subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    setLoading(true);
    try {
      await emailService.sendEmail({
        to: singleEmail.to,
        subject: singleEmail.subject,
        template: singleEmail.template,
        html: singleEmail.content,
        priority: singleEmail.priority,
        tags: ['admin-sent', 'single']
      });

      alert('Email sent successfully!');
      setSingleEmail({ to: '', subject: '', template: 'custom', content: '', priority: 'normal' });
      loadEmailData();
    } catch (error) {
      alert(`Failed to send email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewsletter = async () => {
    if (!newsletter.subject || !newsletter.content || !newsletter.recipients) {
      alert('Please fill in all newsletter fields');
      return;
    }

    setLoading(true);
    try {
      const recipients = newsletter.recipients
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
          const [email, name] = line.split(',').map(s => s.trim());
          return { email, name: name || email.split('@')[0] };
        });

      const result = await emailService.sendNewsletter({
        recipients,
        subject: newsletter.subject,
        content: {
          title: newsletter.title,
          body: newsletter.content
        },
        scheduledAt: newsletter.scheduledAt || null
      });

      alert(`Newsletter sent! ${result.successful} successful, ${result.failed} failed`);
      setNewsletter({ subject: '', title: '', content: '', recipients: '', scheduledAt: '' });
      loadEmailData();
    } catch (error) {
      alert(`Failed to send newsletter: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!bulkEmail.emailList || !bulkEmail.subject) {
      alert('Please provide email list and subject');
      return;
    }

    setLoading(true);
    try {
      const emails = bulkEmail.emailList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(email => ({
          to: email,
          subject: bulkEmail.subject,
          template: bulkEmail.template,
          html: bulkEmail.content,
          tags: ['admin-sent', 'bulk']
        }));

      const result = await emailService.sendBulkEmails(emails);
      alert(`Bulk email sent! ${result.successful} successful, ${result.failed} failed`);
      setBulkEmail({ emailList: '', subject: '', template: 'custom', content: '' });
      loadEmailData();
    } catch (error) {
      alert(`Failed to send bulk email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmails = async () => {
    setLoading(true);
    try {
      // Send verification email
      await emailService.sendVerificationEmail(
        'test@example.com',
        'test_token_123',
        'Test User'
      );

      // Send welcome email
      await emailService.sendWelcomeEmail(
        'test@example.com',
        'Test User',
        'premium'
      );

      alert('Test emails sent successfully!');
      loadEmailData();
    } catch (error) {
      alert(`Failed to send test emails: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#4caf50';
      case 'failed': return '#f44336';
      default: return '#ff9800';
    }
  };

  return (
    <div className="email-manager">
      <div className="email-header">
        <h2>📧 Email Management System</h2>
        <div className="email-stats-summary">
          {emailStats && (
            <>
              <div className="stat-item">
                <span className="stat-value">{emailStats.total}</span>
                <span className="stat-label">Total Emails</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{emailStats.sent}</span>
                <span className="stat-label">Sent</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{emailStats.failed}</span>
                <span className="stat-label">Failed</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="email-tabs">
        <button 
          className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          📤 Send Email
        </button>
        <button 
          className={`tab-btn ${activeTab === 'newsletter' ? 'active' : ''}`}
          onClick={() => setActiveTab('newsletter')}
        >
          📰 Newsletter
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          📊 Bulk Email
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Email Logs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📈 Statistics
        </button>
      </div>

      <div className="email-content">
        {/* Send Single Email Tab */}
        {activeTab === 'send' && (
          <div className="email-form">
            <h3>Send Single Email</h3>
            <div className="form-group">
              <label>To Email:</label>
              <input
                type="email"
                value={singleEmail.to}
                onChange={(e) => setSingleEmail({...singleEmail, to: e.target.value})}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="form-group">
              <label>Subject:</label>
              <input
                type="text"
                value={singleEmail.subject}
                onChange={(e) => setSingleEmail({...singleEmail, subject: e.target.value})}
                placeholder="Email subject"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Template:</label>
                <select
                  value={singleEmail.template}
                  onChange={(e) => setSingleEmail({...singleEmail, template: e.target.value})}
                >
                  <option value="custom">Custom</option>
                  <option value="welcome">Welcome</option>
                  <option value="verification">Verification</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority:</label>
                <select
                  value={singleEmail.priority}
                  onChange={(e) => setSingleEmail({...singleEmail, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Content (HTML):</label>
              <textarea
                value={singleEmail.content}
                onChange={(e) => setSingleEmail({...singleEmail, content: e.target.value})}
                placeholder="Email content in HTML format..."
                rows="8"
              />
            </div>
            <div className="form-actions">
              <button onClick={handleSendSingleEmail} disabled={loading}>
                {loading ? 'Sending...' : 'Send Email'}
              </button>
              <button onClick={handleSendTestEmails} disabled={loading}>
                Send Test Emails
              </button>
            </div>
          </div>
        )}

        {/* Newsletter Tab */}
        {activeTab === 'newsletter' && (
          <div className="email-form">
            <h3>Send Newsletter</h3>
            <div className="form-group">
              <label>Newsletter Title:</label>
              <input
                type="text"
                value={newsletter.title}
                onChange={(e) => setNewsletter({...newsletter, title: e.target.value})}
                placeholder="Newsletter title"
              />
            </div>
            <div className="form-group">
              <label>Email Subject:</label>
              <input
                type="text"
                value={newsletter.subject}
                onChange={(e) => setNewsletter({...newsletter, subject: e.target.value})}
                placeholder="Email subject line"
              />
            </div>
            <div className="form-group">
              <label>Content:</label>
              <textarea
                value={newsletter.content}
                onChange={(e) => setNewsletter({...newsletter, content: e.target.value})}
                placeholder="Newsletter content..."
                rows="6"
              />
            </div>
            <div className="form-group">
              <label>Recipients (one email per line, optionally: email,name):</label>
              <textarea
                value={newsletter.recipients}
                onChange={(e) => setNewsletter({...newsletter, recipients: e.target.value})}
                placeholder="user1@example.com,John Doe&#10;user2@example.com,Jane Smith&#10;user3@example.com"
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Schedule For (optional):</label>
              <input
                type="datetime-local"
                value={newsletter.scheduledAt}
                onChange={(e) => setNewsletter({...newsletter, scheduledAt: e.target.value})}
              />
            </div>
            <div className="form-actions">
              <button onClick={handleSendNewsletter} disabled={loading}>
                {loading ? 'Sending...' : 'Send Newsletter'}
              </button>
            </div>
          </div>
        )}

        {/* Bulk Email Tab */}
        {activeTab === 'bulk' && (
          <div className="email-form">
            <h3>Send Bulk Email</h3>
            <div className="form-group">
              <label>Email List (one per line):</label>
              <textarea
                value={bulkEmail.emailList}
                onChange={(e) => setBulkEmail({...bulkEmail, emailList: e.target.value})}
                placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                rows="6"
              />
            </div>
            <div className="form-group">
              <label>Subject:</label>
              <input
                type="text"
                value={bulkEmail.subject}
                onChange={(e) => setBulkEmail({...bulkEmail, subject: e.target.value})}
                placeholder="Email subject"
              />
            </div>
            <div className="form-group">
              <label>Template:</label>
              <select
                value={bulkEmail.template}
                onChange={(e) => setBulkEmail({...bulkEmail, template: e.target.value})}
              >
                <option value="custom">Custom</option>
                <option value="welcome">Welcome</option>
                <option value="newsletter">Newsletter</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
            <div className="form-group">
              <label>Content (HTML):</label>
              <textarea
                value={bulkEmail.content}
                onChange={(e) => setBulkEmail({...bulkEmail, content: e.target.value})}
                placeholder="Email content..."
                rows="8"
              />
            </div>
            <div className="form-actions">
              <button onClick={handleSendBulkEmail} disabled={loading}>
                {loading ? 'Sending...' : 'Send Bulk Email'}
              </button>
            </div>
          </div>
        )}

        {/* Email Logs Tab */}
        {activeTab === 'logs' && (
          <div className="email-logs">
            <h3>Email Activity Logs</h3>
            <div className="logs-container">
              {emailLogs.length === 0 ? (
                <p>No email logs found.</p>
              ) : (
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>To</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Template</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.timestamp)}</td>
                        <td>{log.action}</td>
                        <td>{log.to || '-'}</td>
                        <td>{log.subject || '-'}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(log.status) }}
                          >
                            {log.status || 'pending'}
                          </span>
                        </td>
                        <td>{log.template || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && emailStats && (
          <div className="email-stats">
            <h3>Email Statistics (Last 30 Days)</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>📧 Total Emails</h4>
                <div className="stat-number">{emailStats.total}</div>
              </div>
              <div className="stat-card">
                <h4>✅ Successfully Sent</h4>
                <div className="stat-number">{emailStats.sent}</div>
              </div>
              <div className="stat-card">
                <h4>❌ Failed</h4>
                <div className="stat-number">{emailStats.failed}</div>
              </div>
              <div className="stat-card">
                <h4>📊 Success Rate</h4>
                <div className="stat-number">
                  {emailStats.total > 0 ? 
                    Math.round((emailStats.sent / emailStats.total) * 100) : 0}%
                </div>
              </div>
            </div>

            {Object.keys(emailStats.byTemplate).length > 0 && (
              <div className="template-stats">
                <h4>By Template</h4>
                <div className="template-list">
                  {Object.entries(emailStats.byTemplate).map(([template, count]) => (
                    <div key={template} className="template-item">
                      <span className="template-name">{template}</span>
                      <span className="template-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailManager;