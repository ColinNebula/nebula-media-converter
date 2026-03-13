# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously at Nebula Media Converter. If you discover a security vulnerability, please follow these steps:

### Do NOT:
- Open a public GitHub issue
- Post about the vulnerability on social media
- Exploit the vulnerability

### DO:
1. **Email us directly** at security@nebuladev.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

2. **Allow time for response** - We will acknowledge receipt within 48 hours

3. **Coordinate disclosure** - Work with us on timing of any public disclosure

## Security Measures

### Application Security
- Content Security Policy (CSP) enforcement
- XSS protection with input sanitization
- CSRF protection
- Clickjacking prevention
- Rate limiting
- Input validation

### Data Protection
- All sensitive data encrypted at rest
- HTTPS enforced in production
- No sensitive data in client-side storage
- Session tokens properly secured

### Code Security
- Regular dependency audits
- No eval() or dynamic code execution
- Secure coding practices
- Code review requirements

## Security Updates

Security updates are released as soon as possible after a vulnerability is confirmed. 
Subscribe to our releases to be notified of security patches.

## Contact

- Security issues: security@nebuladev.com
- General inquiries: support@nebuladev.com
