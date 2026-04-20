// scripts/createAdmin.js
// Run: node scripts/createAdmin.js <email>
// Example: node scripts/createAdmin.js admin@lexperts.com

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/user/user.model');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/createAdmin.js <email>');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: 'admin' },
    { new: true }
  );
  if (!user) {
    console.error(`No user found with email: ${email}`);
  } else {
    console.log(`✅ ${user.name} (${user.email}) is now an admin`);
  }
  mongoose.disconnect();
}).catch((err) => {
  console.error('DB connection failed:', err.message);
  process.exit(1);
});
