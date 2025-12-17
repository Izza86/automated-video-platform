// Script to check and update user roles
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkAndUpdateRole() {
  try {
    // Get all users
    const result = await pool.query('SELECT id, name, email, role FROM "user" ORDER BY "created_at" DESC');
    
    console.log('\n=================================');
    console.log('ALL USERS IN DATABASE:');
    console.log('=================================\n');
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role || 'NULL (PROBLEM!)'}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

    // Check if any user has NULL role
    const usersWithoutRole = result.rows.filter(u => !u.role);
    if (usersWithoutRole.length > 0) {
      console.log('⚠️  WARNING: Some users have NULL role. Updating to "user"...\n');
      
      for (const user of usersWithoutRole) {
        await pool.query('UPDATE "user" SET role = $1 WHERE id = $2', ['user', user.id]);
        console.log(`✅ Updated ${user.email} to role: user`);
      }
    }

    // Prompt for admin promotion
    const email = process.argv[2];
    if (email) {
      const userToPromote = result.rows.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!userToPromote) {
        console.log(`\n❌ User with email "${email}" not found.`);
      } else if (userToPromote.role === 'admin') {
        console.log(`\n✅ ${userToPromote.email} is already an admin!`);
      } else {
        await pool.query('UPDATE "user" SET role = $1 WHERE id = $2', ['admin', userToPromote.id]);
        console.log(`\n✅ Successfully promoted ${userToPromote.email} to ADMIN!`);
        console.log('   Please refresh your browser to see admin dashboard.');
      }
    } else {
      console.log('\n💡 To promote a user to admin, run:');
      console.log('   node check-user-role.js user@example.com\n');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAndUpdateRole();
