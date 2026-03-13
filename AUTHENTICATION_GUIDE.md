# 🔐 User Authentication System - Nebula Media Converter

## Overview

The desktop app now requires users to **register and login** before accessing the media converter. This provides:

- ✅ **User Identity Management** - Know who's using your app
- ✅ **Session Persistence** - Stay logged in for 7 days
- ✅ **Secure Access** - Only authenticated users can convert files
- ✅ **User Tracking** - Track user activity and preferences
- ✅ **Premium Upgrades** - Manage free vs premium accounts

---

## 🚀 Quick Start

### First Time Users

1. **Launch the Desktop App**
2. **Click "Sign Up"** tab
3. **Enter your details**:
   - Full Name
   - Email Address
   - Password (min 8 characters)
   - Confirm Password
4. **Click "Create Account"**
5. **Switch to "Login"** tab
6. **Enter credentials and login**

### Returning Users

1. **Launch the Desktop App**
2. **Enter your email and password**
3. **Click "Login"**
4. **Start converting!**

---

## 🔑 Features

### Registration
- **Required Fields**: Name, Email, Password
- **Password Requirements**: Minimum 8 characters
- **Email Validation**: Must be valid email format
- **Duplicate Prevention**: Email must be unique

### Login
- **Session Duration**: 7 days
- **Auto-Login**: Returns automatically if session is valid
- **Secure Storage**: Local session management

### Session Management
- **View Session Info**: Check login time and expiry
- **Active Status**: See your current session
- **Logout Anytime**: End session from anywhere in the app

---

## 💾 Data Storage

### User Data Structure
```json
{
  "id": "user_1234567890_abc123xyz",
  "email": "user@example.com",
  "password": "********",
  "name": "John Doe",
  "createdAt": "2025-10-15T12:00:00.000Z",
  "lastLogin": "2025-10-15T15:30:00.000Z",
  "isActive": true,
  "isPremium": false,
  "plan": "free"
}
```

### Session Data Structure
```json
{
  "userId": "user_1234567890_abc123xyz",
  "email": "user@example.com",
  "name": "John Doe",
  "loginTime": "2025-10-15T15:30:00.000Z",
  "expiresAt": "2025-10-22T15:30:00.000Z"
}
```

### Storage Locations
- **Users**: `localStorage['nebula_users']` - Array of all registered users
- **Session**: `localStorage['nebula_session']` - Current active session

---

## 🎨 User Interface

### Authentication Screen
- **Beautiful gradient background** with animated stars
- **Nebula effect** for brand consistency
- **Tab switching** between Login and Sign Up
- **Real-time validation** with error messages
- **Success notifications** for actions
- **Feature highlights** showing app benefits

### User Info Bar
- **Welcome message** with user's name
- **Logout button** for quick session end
- **Always visible** at top of app

### Desktop Features Tab
- **Session information card**
  - Current user details
  - Login time
  - Session expiry countdown
  - Active status indicator
  - End session button

---

## 🔒 Security Considerations

### Current Implementation (Development)
- ⚠️ **Passwords stored in plain text** in localStorage
- ⚠️ **No backend validation**
- ⚠️ **Client-side only authentication**

### Production Recommendations

1. **Backend Authentication Server**
   ```javascript
   // Example: Use JWT tokens
   const response = await fetch('https://api.nebula.com/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password })
   });
   const { token } = await response.json();
   ```

2. **Password Hashing**
   ```javascript
   // Use bcrypt or similar
   import bcrypt from 'bcryptjs';
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

3. **Secure Token Storage**
   ```javascript
   // Use httpOnly cookies or secure token storage
   // Don't store sensitive data in localStorage
   ```

4. **OAuth Integration**
   - Google Sign-In
   - GitHub Authentication
   - Microsoft Account
   - Apple ID

5. **Two-Factor Authentication (2FA)**
   - Email verification codes
   - SMS verification
   - Authenticator apps

---

## 🛠️ Customization

### Change Session Duration

Edit `AuthScreen.js`:
```javascript
// Change from 7 days to 30 days
expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
```

### Change Password Requirements

Edit validation in `AuthScreen.js`:
```javascript
const validatePassword = (password) => {
  // Require 12 characters, uppercase, number, special char
  return password.length >= 12 && 
         /[A-Z]/.test(password) && 
         /[0-9]/.test(password) && 
         /[!@#$%^&*]/.test(password);
};
```

### Add Email Verification

```javascript
// After registration, send verification email
const sendVerificationEmail = async (email) => {
  const verificationCode = Math.random().toString(36).substr(2, 8);
  // Store code temporarily
  localStorage.setItem(`verify_${email}`, verificationCode);
  // Send email with code
  await emailJSService.sendVerificationEmail(email, verificationCode);
};
```

---

## 📊 User Management

### View All Users (Admin Only)

Access via browser console:
```javascript
// Get all users
const users = JSON.parse(localStorage.getItem('nebula_users') || '[]');
console.table(users);

// Get active sessions count
const session = localStorage.getItem('nebula_session');
console.log('Current session:', session ? JSON.parse(session) : 'None');
```

### Manually Create Test Account

```javascript
const testUser = {
  id: 'user_test_123',
  email: 'test@nebula.com',
  password: 'testpass123',
  name: 'Test User',
  createdAt: new Date().toISOString(),
  lastLogin: null,
  isActive: true,
  isPremium: false,
  plan: 'free'
};

const users = JSON.parse(localStorage.getItem('nebula_users') || '[]');
users.push(testUser);
localStorage.setItem('nebula_users', JSON.stringify(users));
console.log('Test user created!');
```

### Reset All Users (Development)

```javascript
localStorage.removeItem('nebula_users');
localStorage.removeItem('nebula_session');
console.log('All users and sessions cleared!');
```

---

## 🚀 Future Enhancements

### Planned Features

1. **Forgot Password**
   - Email password reset links
   - Temporary reset codes
   - Security questions

2. **Email Verification**
   - Verify email on registration
   - Resend verification email
   - Email change verification

3. **Profile Management**
   - Update name/email
   - Change password
   - Profile picture upload
   - Account deletion

4. **Social Login**
   - Google OAuth
   - GitHub OAuth
   - Microsoft Account
   - Apple ID

5. **Multi-Device Sessions**
   - See all active sessions
   - Remote logout
   - Device management

6. **Activity Log**
   - Login history
   - Conversion history
   - Download history

---

## 🐛 Troubleshooting

### Can't Login

**Problem**: "Invalid email or password"

**Solutions**:
1. Check email spelling (case-insensitive)
2. Verify password is correct
3. Clear browser data and re-register
4. Check console for errors

### Session Expired

**Problem**: Logged out unexpectedly

**Solutions**:
1. Session expires after 7 days
2. Clearing browser data removes session
3. Just login again

### Lost Password

**Solution** (Current workaround):
```javascript
// In browser console
const users = JSON.parse(localStorage.getItem('nebula_users'));
const user = users.find(u => u.email === 'your@email.com');
console.log('Your password:', user.password);
```

**Production**: Implement password reset flow

---

## 📝 Testing Checklist

- [ ] Register new account
- [ ] Login with registered account
- [ ] Session persists after page refresh
- [ ] Logout works correctly
- [ ] Can't access app without login
- [ ] Error messages display correctly
- [ ] Success messages display correctly
- [ ] Password validation works
- [ ] Email validation works
- [ ] Duplicate email prevention works
- [ ] Session expiry works
- [ ] User info displays in header
- [ ] Session info shows in desktop tab

---

## 🎯 Implementation Summary

### Files Modified
1. `src/App.js` - Added authentication state and routing
2. `src/App.css` - Added user info bar styles

### Files Created
1. `src/components/AuthScreen.js` - Login/registration UI
2. `src/components/AuthScreen.css` - Authentication styling
3. `src/components/UserSession.js` - Session info display
4. `src/components/UserSession.css` - Session info styling
4. `AUTHENTICATION_GUIDE.md` - This documentation

### Key Features
- ✅ Beautiful authentication UI
- ✅ Registration with validation
- ✅ Login with session management
- ✅ 7-day session persistence
- ✅ User welcome message
- ✅ Logout functionality
- ✅ Session information display
- ✅ Protected app access

---

**Made with 🔐 by Nebula3D Dev Company**

*Secure, Simple, and User-Friendly Authentication*
