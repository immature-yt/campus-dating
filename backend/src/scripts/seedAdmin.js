import bcrypt from 'bcryptjs';
import { connectDb } from '../db.js';
import { User } from '../models/User.js';
import { config } from '../config.js';

async function main() {
  await connectDb();
  if (!config.adminEmail || !config.adminPassword) {
    // eslint-disable-next-line no-console
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed admin');
    process.exit(1);
  }
  const existing = await User.findOne({ email: config.adminEmail.toLowerCase() });
  if (existing) {
    existing.isAdmin = true;
    await existing.save();
    // eslint-disable-next-line no-console
    console.log('Admin user updated:', existing.email);
  } else {
    const hash = await bcrypt.hash(config.adminPassword, 12);
    const admin = await User.create({
      email: config.adminEmail.toLowerCase(),
      passwordHash: hash,
      isAdmin: true,
      verification_status: 'approved',
      access_level: 'full'
    });
    // eslint-disable-next-line no-console
    console.log('Admin user created:', admin.email);
  }
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


