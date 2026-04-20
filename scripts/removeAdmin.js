// scripts/removeAdmin.js
// Run: node scripts/removeAdmin.js <email>
// Example: node scripts/removeAdmin.js admin@lexperts.com

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/user/user.model');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/removeAdmin.js <email>');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    mongoose.disconnect();
    return;
  }
  if (user.role !== 'admin') {
    console.warn(`⚠️  ${user.name} (${user.email}) is not an admin (current role: ${user.role})`);
    mongoose.disconnect();
    return;
  }
  user.role = 'client';
  await user.save();
  console.log(`✅ ${user.name} (${user.email}) has been demoted to client`);
  mongoose.disconnect();
}).catch((err) => {
  console.error('DB connection failed:', err.message);
  process.exit(1);
});
