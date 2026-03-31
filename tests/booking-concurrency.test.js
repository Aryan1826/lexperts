// tests/booking-concurrency.test.js
/**
 * CONCURRENCY TEST: Verify that the booking slot validation prevents overbooking
 * even under simultaneous requests.
 *
 * This test simulates 5 concurrent clients trying to book the SAME time slot.
 * Expected behavior (AFTER FIX):
 *   - Exactly 1 booking succeeds
 *   - Other 4 fail with 409 Conflict error
 *
 * Expected behavior (BEFORE FIX):
 *   - Multiple bookings would succeed (RACE CONDITION!)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Booking = require('../src/modules/booking/booking.model');
const Expert = require('../src/modules/expert/expert.model');
const User = require('../src/modules/user/user.model');
const bookingService = require('../src/modules/booking/booking.service');

const TEST_CONFIG = {
  CONCURRENT_ATTEMPTS: 5,
  TARGET_DATE: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Book for next week
    return d.toISOString().split('T')[0];
  })(),
  TARGET_SLOT: { start: '14:00', end: '15:00' },
};

let testResults = {
  startTime: null,
  endTime: null,
  successCount: 0,
  failureCount: 0,
  totalDuration: 0,
  attempts: [],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupTestData() {
  console.log('\n📋 SETTING UP TEST DATA...\n');

  // Create a test expert user
  let expertUser = await User.findOne({ email: 'test-expert@lexperts.local' });
  if (!expertUser) {
    expertUser = await User.create({
      name: 'Dr. Test Expert',
      email: 'test-expert@lexperts.local',
      password: 'TestPass123',
      role: 'expert',
    });
    console.log('✅ Created expert user:', expertUser.email);
  } else {
    console.log('✅ Using existing expert user:', expertUser.email);
  }

  // Create expert profile with availability
  let expert = await Expert.findOne({ userId: expertUser._id });
  if (!expert) {
    expert = await Expert.create({
      userId: expertUser._id,
      specialization: ['Civil Law'],
      experience: 10,
      consultationFee: 500,
      bio: 'Expert for concurrency testing',
      availability: [
        {
          day: 'Monday',
          slots: [{ start: '09:00', end: '17:00' }],
        },
        {
          day: 'Tuesday',
          slots: [{ start: '09:00', end: '17:00' }],
        },
        {
          day: 'Wednesday',
          slots: [{ start: '09:00', end: '17:00' }],
        },
        {
          day: 'Thursday',
          slots: [{ start: '09:00', end: '17:00' }],
        },
        {
          day: 'Friday',
          slots: [{ start: '09:00', end: '17:00' }],
        },
        {
          day: 'Saturday',
          slots: [{ start: '10:00', end: '16:00' }],
        },
        {
          day: 'Sunday',
          slots: [{ start: '10:00', end: '16:00' }],
        },
      ],
    });
    console.log('✅ Created expert profile:', expert.specialization);
  } else {
    console.log('✅ Using existing expert profile');
  }

  // Create 5 test client users
  const clients = [];
  for (let i = 1; i <= TEST_CONFIG.CONCURRENT_ATTEMPTS; i++) {
    let client = await User.findOne({ email: `test-client-${i}@lexperts.local` });
    if (!client) {
      client = await User.create({
        name: `Test Client ${i}`,
        email: `test-client-${i}@lexperts.local`,
        password: 'ClientPass123',
        role: 'client',
      });
      console.log(`✅ Created client ${i}:`, client.email);
    } else {
      console.log(`✅ Using existing client ${i}:`, client.email);
    }
    clients.push(client);
  }

  // Clear any existing bookings for this expert on this date
  const deletedCount = await Booking.deleteMany({
    expertId: expert._id,
    date: TEST_CONFIG.TARGET_DATE,
  });
  if (deletedCount.deletedCount > 0) {
    console.log(`\n🧹 Cleaned up ${deletedCount.deletedCount} old test bookings\n`);
  }

  return { expert, clients, expertUser };
}

async function attemptBooking(clientId, expertId, attemptNumber) {
  try {
    const booking = await bookingService.createBooking(clientId, {
      expertId: expertId.toString(),
      date: TEST_CONFIG.TARGET_DATE,
      slot: TEST_CONFIG.TARGET_SLOT,
      notes: `Concurrency test attempt ${attemptNumber}`,
    });

    return {
      success: true,
      attemptNumber,
      bookingId: booking._id,
      clientId,
      message: 'Booking created successfully',
    };
  } catch (error) {
    return {
      success: false,
      attemptNumber,
      message: error.message,
      statusCode: error.statusCode,
    };
  }
}

async function runConcurrencyTest(expert, clients) {
  console.log(`\n⏱️  RUNNING CONCURRENCY TEST...`);
  console.log(`   Target Date: ${TEST_CONFIG.TARGET_DATE}`);
  console.log(`   Target Slot: ${TEST_CONFIG.TARGET_SLOT.start} - ${TEST_CONFIG.TARGET_SLOT.end}`);
  console.log(`   Concurrent Attempts: ${TEST_CONFIG.CONCURRENT_ATTEMPTS}\n`);

  testResults.startTime = Date.now();

  // Launch all 5 booking attempts simultaneously (not sequentially)
  const promises = clients.map((client, index) =>
    attemptBooking(client._id, expert._id, index + 1)
  );

  const results = await Promise.all(promises);

  testResults.endTime = Date.now();
  testResults.totalDuration = testResults.endTime - testResults.startTime;
  testResults.attempts = results;

  // Count successes and failures
  results.forEach((result) => {
    if (result.success) {
      testResults.successCount++;
    } else {
      testResults.failureCount++;
    }
  });
}

async function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS: BOOKING CONCURRENCY CHECK');
  console.log('='.repeat(70) + '\n');

  console.log(`⏱️  Duration: ${testResults.totalDuration}ms\n`);

  console.log(`📊 SUMMARY:`);
  console.log(`   ✅ Successful bookings: ${testResults.successCount}`);
  console.log(`   ❌ Failed bookings: ${testResults.failureCount}`);
  console.log(`   📈 Total attempts: ${testResults.attempts.length}\n`);

  console.log(`📋 DETAILED RESULTS:\n`);
  testResults.attempts.forEach((result) => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`   Attempt #${result.attemptNumber}: ${status}`);
    if (result.success) {
      console.log(`      Booking ID: ${result.bookingId}`);
    } else {
      console.log(`      Reason: ${result.message} (${result.statusCode || 'Transaction Rollback'})`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('VERDICT:');
  console.log('='.repeat(70) + '\n');

  if (testResults.successCount === 1 && testResults.failureCount === 4) {
    console.log('✅ PASS: Race condition is PREVENTED!');
    console.log('   - Exactly 1 booking succeeded');
    console.log('   - All other concurrent attempts were rejected');
    console.log('   - MongoDB transaction atomicity is working correctly\n');
    return true;
  } else if (testResults.successCount > 1) {
    console.log('❌ FAIL: Race condition DETECTED!');
    console.log(`   - ${testResults.successCount} bookings succeeded (should be 1)`);
    console.log('   - Multiple clients overbooked the same slot\n');
    return false;
  } else {
    console.log('⚠️  UNEXPECTED: No bookings succeeded (check test setup)\n');
    return false;
  }
}

async function main() {
  try {
    console.log('\n🔧 LEXPERTS BOOKING SYSTEM - CONCURRENCY TEST');
    console.log('Testing MongoDB Transaction atomicity for slot prevention...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Setup test data
    const { expert, clients } = await setupTestData();

    // Run the actual test
    await runConcurrencyTest(expert, clients);

    // Print results
    const passed = await printResults();

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await Booking.deleteMany({
      expertId: expert._id,
      date: TEST_CONFIG.TARGET_DATE,
    });
    console.log('✅ Cleanup complete\n');

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
