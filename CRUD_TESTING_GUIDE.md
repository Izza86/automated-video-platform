# CRUD Operations Testing Guide

## Overview

This document provides step-by-step instructions for testing all CRUD (Create, Read, Update, Delete) operations for both Admin and Non-Admin users.

## Prerequisites

### 1. Push Database Schema

Before testing, run this command to add `profilePhoto` and `role` columns to the database:

```bash
npx drizzle-kit push
```

### 2. Create Admin User

Follow instructions in [ADMIN_SETUP.md](./ADMIN_SETUP.md) to promote a user to admin:

```bash
npm run create-admin -- your-email@example.com
```

## Admin User CRUD Operations

### 1. View All Users

**Feature:** Admin can see all registered users in a table

**Test Steps:**

1. Login as admin user
2. Navigate to Dashboard
3. Scroll to "Admin Panel" section (yellow background)
4. Verify "All Registered Users" table appears
5. Table should display:
   - User profile photo
   - Name
   - Email
   - Role badge (Admin/User)
   - Actions column

**Expected Result:** All users shown in table with proper formatting

### 2. Delete User

**Feature:** Admin can delete any registered user (except themselves)

**Test Steps:**

1. In the Admin Panel users table, locate a non-admin user
2. Click the "Delete" button (red trash icon)
3. Confirm deletion in the dialog
4. Verify toast notification: "User deleted successfully"
5. User should disappear from table
6. Try deleting your own admin account - should see error: "Cannot delete yourself"

**Expected Result:** User deleted successfully, cannot delete self

### 3. View User Count

**Feature:** Admin can see total number of registered users

**Test Steps:**

1. Check the users table in Admin Panel
2. Count visible users
3. Verify count matches total registered users

**Expected Result:** Accurate user count displayed

## Non-Admin User CRUD Operations

### 1. View Profile

**Feature:** User can view their complete profile

**Test Steps:**

1. Login as regular (non-admin) user
2. Navigate to Dashboard
3. Click "View Profile" in the "Profile Management" section
4. Verify profile page displays:
   - Profile photo (or default avatar)
   - Full name
   - Email address
   - Account type badge (User)
   - Email verification status
   - Member since date
   - User ID

**Expected Result:** Complete profile information displayed with proper formatting

**URL:** `/dashboard/profile`

### 2. Edit Profile

**Feature:** User can update name and profile photo

**Test Steps:**

1. From Dashboard, click "Edit Profile"
2. Current name should be pre-filled
3. Update name to new value (min 3 characters)
4. Upload new profile photo:
   - Click file input
   - Select image (max 5MB)
   - Verify preview updates
5. Click "Save Changes"
6. Verify toast: "Profile updated successfully"
7. Redirected to Dashboard
8. Verify changes reflected in header

**Expected Result:** Profile updated successfully with new name/photo

**URL:** `/dashboard/edit-profile`

**Validations:**

- Name: Required, minimum 3 characters
- Photo: Optional, max 5MB, image files only
- Email: Cannot be changed (disabled field)

### 3. Change Password

**Feature:** User can change password securely with validation

**Test Steps:**

#### Method 1: Direct Password Change (with current password)

1. From Dashboard, click "Change Password"
2. Enter current password
3. Enter new password (must meet requirements):
   - At least 8 characters
   - One uppercase letter
   - One lowercase letter
   - One number
4. Enter confirm password (must match)
5. Verify password strength indicator updates in real-time
6. Click "Change Password"
7. Verify toast: "Password changed successfully"
8. Logout and login with new password

**Expected Result:** Password changed successfully, can login with new credentials

**URL:** `/dashboard/change-password`

#### Method 2: Token-Based Reset (development only)

For production implementation with email tokens:

1. Server action `requestPasswordChange()` generates token
2. Token logged to console (in production, sent via email)
3. Token valid for 24 hours
4. Access: `/dashboard/change-password?token=YOUR_TOKEN`
5. No current password required
6. Complete new password fields
7. Token consumed after use

**Console Output Example:**

```
===========================================
PASSWORD RESET REQUEST
===========================================
User: user@example.com
Token: a1b2c3d4e5f6...
Reset URL: http://localhost:3000/dashboard/change-password?token=...
Expires: 12/25/2024, 10:30:00 AM
===========================================
```

**Validations:**

- Current password: Required (unless using token)
- New password:
  - Minimum 8 characters
  - Must contain uppercase letter
  - Must contain lowercase letter
  - Must contain number
- Confirm password: Must match new password
- Real-time validation indicators turn green when requirements met

### 4. View Dashboard

**Feature:** User sees personalized dashboard with quick actions

**Test Steps:**

1. Login as regular user
2. Verify Dashboard displays:
   - Welcome message with name
   - Profile photo in header
   - Email in header
   - Quick Actions cards:
     - Upload Video
     - My Projects
     - Style Library
   - Profile Management section (3 cards):
     - View Profile
     - Edit Profile
     - Change Password
   - Recent Projects section
3. Verify Admin Panel is NOT visible

**Expected Result:** Personalized dashboard without admin features

**URL:** `/dashboard`

## Testing Checklist

### Admin Tests

- [ ] Can view all users in table
- [ ] Can delete other users
- [ ] Cannot delete own account
- [ ] See "Admin" badge in header
- [ ] Admin panel visible with yellow styling

### Non-Admin Tests

- [ ] Can view complete profile
- [ ] Can edit name successfully
- [ ] Can change profile photo
- [ ] Photo preview works before upload
- [ ] Can change password with current password
- [ ] Password validation works in real-time
- [ ] Password strength indicators update
- [ ] Cannot access admin features
- [ ] Profile Management section visible
- [ ] All navigation links work

### Cross-Role Tests

- [ ] Admin cannot access Edit Profile page (redirected to dashboard)
- [ ] Admin cannot access Change Password page (redirected to dashboard)
- [ ] Admin cannot access View Profile page (redirected to dashboard)
- [ ] Regular user cannot see admin panel
- [ ] Regular user cannot access admin API endpoints
- [ ] Session protection works (redirects to login if not authenticated)

## Common Issues & Solutions

### Issue: "Cannot find module 'pg'"

**Solution:** Run `npm install pg @types/pg`

### Issue: "Column 'profile_photo' does not exist"

**Solution:** Run `npx drizzle-kit push` to update database schema

### Issue: "Column 'role' does not exist"

**Solution:** Run `npx drizzle-kit push` to update database schema

### Issue: Profile photo not displaying

**Solution:**

1. Check image size (must be < 5MB)
2. Verify base64 encoding in database
3. Check browser console for errors

### Issue: Cannot delete user as admin

**Possible Causes:**

1. Trying to delete yourself (prevented by design)
2. Not logged in as admin
3. Database connection issue

### Issue: Password change fails

**Check:**

1. Current password is correct
2. New password meets all requirements (8+ chars, uppercase, lowercase, number)
3. Passwords match
4. Not using expired token (24 hour limit)

## API Endpoints Summary

### Admin Endpoints (server/admin.ts)

- `getAllUsers()` - Fetch all users (admin only)
- `deleteUser(userId)` - Delete user by ID (admin only, cannot delete self)
- `updateUserProfile({ name, profilePhoto })` - Update any user's profile

### User Endpoints (server/users.ts)

- `getCurrentUser()` - Get current authenticated user
- `signUp()` - Register new user with profile photo
- `signIn()` - Login with email/password
- `isAdmin()` - Check if current user is admin
- `promoteToAdmin(email)` - Promote user to admin (CLI only)

### Password Endpoints (server/password.ts)

- `requestPasswordChange()` - Generate reset token (logs to console)
- `changePasswordWithToken(token, newPassword)` - Reset password with token
- `changePasswordDirect(currentPassword, newPassword)` - Change password with current password

## File Structure

```
app/
  dashboard/
    page.tsx - Main dashboard with role-based UI
    edit-profile/
      page.tsx - Edit profile page
    profile/
      page.tsx - View profile page
    change-password/
      page.tsx - Change password page

components/
  edit-profile-form.tsx - Profile editing form
  change-password-form.tsx - Password change form
  users-table.tsx - Admin users table component

server/
  admin.ts - Admin CRUD operations
  users.ts - User authentication and profile
  password.ts - Password management

db/
  schema.ts - Database schema with role and profilePhoto fields
```

## Next Steps After Testing

1. **Set up email service** (Resend or similar)

   - Update .env with RESEND_API_KEY
   - Enable email verification in lib/auth.ts
   - Implement email templates for password reset

2. **Enhance admin panel**

   - Add user search/filter
   - Add user role promotion/demotion
   - Add user activity logs

3. **Add more user features**

   - Two-factor authentication
   - Session management (view active sessions)
   - Account deletion (self-service)

4. **Implement video editor features**
   - File upload with progress
   - Style selection
   - Processing queue
   - Download results

## Support

For issues or questions, check:

1. Console logs for detailed error messages
2. Database schema matches code (run drizzle-kit push)
3. All environment variables set in .env
4. Dev server running on correct port (3000)

---

**Last Updated:** December 2024  
**Version:** 1.0
