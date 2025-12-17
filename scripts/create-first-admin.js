/**
 * This script creates the first admin user in the system.
 * Run this ONLY ONCE after your first user registration.
 * 
 * Usage:
 * 1. Register a normal user account
 * 2. Run: node scripts/create-first-admin.js <user-email>
 * 
 * Example: node scripts/create-first-admin.js admin@example.com
 */

import { db } from "../db/drizzle.ts";
import { user } from "../db/schema.ts";
import { eq } from "drizzle-orm";

const email = process.argv[2];

if (!email) {
  console.error("❌ Error: Please provide the user email");
  console.log("Usage: node scripts/create-first-admin.js <user-email>");
  process.exit(1);
}

async function makeAdmin() {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!existingUser) {
      console.error(`❌ Error: User with email ${email} not found`);
      console.log("Please make sure the user has registered first");
      process.exit(1);
    }

    if (existingUser.role === 'admin') {
      console.log(`ℹ️  User ${email} is already an admin`);
      process.exit(0);
    }

    await db.update(user)
      .set({ role: 'admin' })
      .where(eq(user.email, email));

    console.log(`✅ Success! User ${email} is now an admin`);
    console.log(`User can now access the admin panel at /dashboard/admin/users`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

makeAdmin();
