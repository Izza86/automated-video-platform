# Admin Setup Instructions

## How to Create an Admin User

Since all new users are created as regular users (role: 'user') by default, you need to manually promote the first admin user through the database.

### Method 1: Using Drizzle Studio (Recommended)

1. Run Drizzle Studio:

   ```bash
   npx drizzle-kit studio
   ```

2. Open the browser at the URL shown (usually http://localhost:4983)

3. Navigate to the `user` table

4. Find the user you want to make admin

5. Edit the `role` field and change it from `user` to `admin`

6. Save the changes

### Method 2: Direct Database Query

Connect to your Neon PostgreSQL database and run:

```sql
UPDATE "user"
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### Method 3: Using pgAdmin or any PostgreSQL client

1. Connect to your Neon database using the connection string from `.env`

2. Run the UPDATE query above with your admin email

## User Roles

- **admin**: Full access to admin panel, can manage users, view all projects
- **user**: Regular user, can only access their own content

## Admin Panel Features

Admins will see an additional "Admin Panel" section on their dashboard with:

- Manage Users
- All Projects
- System Settings

## Security Notes

- The first admin must be created manually for security
- Only admins can promote other users to admin (via the `promoteToAdmin` function)
- Session-based protection ensures only logged-in users can access the dashboard
- Middleware redirects unauthorized users to the login page
