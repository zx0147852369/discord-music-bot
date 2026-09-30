#!/usr/bin/env node
// Reset a dashboard account's password from the server (useful if someone is locked out).
//
// Usage:  node scripts/reset-password.js <username|email> <newPassword>
// On Railway:  railway run node scripts/reset-password.js jaymusic "NewStr0ngPass"
//
// It writes to the same SQLite database the bot uses (via DB_PATH / the Railway volume), so run
// it in the same environment as the bot.
require('dotenv').config();

const [, , login, newPassword] = process.argv;
if (!login || !newPassword) {
  console.error('Usage: node scripts/reset-password.js <username|email> <newPassword>');
  process.exit(1);
}

const accounts = require('../lib/accounts');
const result = accounts.resetPasswordByLogin(login, newPassword);
if (result.ok) {
  console.log(`✓ รีเซ็ตรหัสผ่านของ "${result.username}" เรียบร้อยแล้ว — เข้าสู่ระบบด้วยรหัสใหม่ได้เลย`);
  process.exit(0);
}
console.error(`✗ ${result.error}`);
process.exit(1);
