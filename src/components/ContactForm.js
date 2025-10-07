import React, { useState } from 'react';
import emailJSService from '../services/EmailJSService';
import SecurityUtils from '../utils/SecurityUtils';
import './ContactForm.css';

const ContactForm = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: SecurityUtils.sanitizeInput(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    if (!SecurityUtils.validateEmail(formData.email)) {
      setSubmitStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    // Rate limiting
    const rateLimit = SecurityUtils.rateLimit('contact_form', 3, 300000); // 3 submissions per 5 minutes
    if (!rateLimit.allowed) {
      setSubmitStatus({ 
        type: 'error', 
        message: `Too many submissions. Please wait ${rateLimit.remainingTime} seconds before trying again.` 
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const result = await emailJSService.sendContactMessage(
        formData.email,
        formData.name,
        formData.subject || 'Contact Form Submission',
        formData.message
      );

      if (result.success) {
        setSubmitStatus({ 
          type: 'success', 
          message: 'Thank you! Your message has been sent successfully. We\'ll get back to you soon!' 
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
        
        // Auto-close after success
        setTimeout(() => {
          onClose();
          setSubmitStatus(null);
        }, 3000);
      } else {
        setSubmitStatus({ 
          type: 'error', 
          message: `Failed to send message: ${result.error}` 
        });
      }
    } catch (error) {
      console.error('Contact form submission failed:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'An unexpected error occurred. Please try again later.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="contact-modal-overlay" onClick={onClose}>
      <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="contact-header">
          <h2>📧 Contact Us</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="contact-content">
          <p>Have a question, suggestion, or need help? We'd love to hear from you!</p>
          
          {submitStatus && (
            <div className={`status-message ${submitStatus.type}`}>
              {submitStatus.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                placeholder="Your full name"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                placeholder="your.email@example.com"
                maxLength={254}
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                disabled={isSubmitting}
                placeholder="What's this about?"
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                placeholder="Tell us what's on your mind..."
                rows={5}
                maxLength={1000}
              />
              <div className="char-count">
                {formData.message.length}/1000 characters
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>

          <div className="contact-info">
            <h4>Other ways to reach us:</h4>
            <p>📧 Email: {process.env.REACT_APP_SUPPORT_EMAIL || 'admin@nebuladev.com'}</p>
            <p>🌐 Website: {process.env.REACT_APP_APP_URL || 'https://colinnebula.github.io/nebula-media-converter/'}</p>
            <p>⏰ Response time: Usually within 24 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;