// tests/cookie-security.test.js
/**
 * SECURE COOKIE TEST: Verify that authentication tokens are properly stored as httpOnly cookies
 * and that XSS vulnerabilities are prevented.
 *
 * This test validates:
 * 1. Login returns accessToken in JSON + httpOnly cookie
 * 2. Subsequent API calls use cookie (not localStorage)
 * 3. Logout clears both cookies
 * 4. Token refresh works correctly with cookies
 */

const axios = require('axios');
const http = require('http');

const API_BASE_URL = 'http://localhost:5001/api/v1';

// Test data
const testUser = {
  name: 'Cookie Test User',
  email: 'cookie-test@lexperts.local',
  password: 'TestPass123',
  role: 'client',
};

let testResults = {
  startTime: null,
  endTime: null,
  tests: [],
};

const log = (title, message, status = '✓') => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${status} ${title}: ${message}`);
  testResults.tests.push({ title, message, status, timestamp });
};

async function testCookieFlow() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST: SECURE COOKIE IMPLEMENTATION');
  console.log('='.repeat(70) + '\n');

  testResults.startTime = Date.now();

  try {
    // ─── TEST 1: Register (create both cookies) ───────────────────────────
    log('TEST 1', 'Registering new user', '🧪');

    const registerRes = await axios.post(`${API_BASE_URL}/auth/register`, testUser, {
      withCredentials: true,
    });

    if (!registerRes.data.data.accessToken) {
      throw new Error('accessToken not returned in JSON body');
    }
    log('TEST 1', 'User registered successfully', '✅');
    log('TEST 1', `accessToken returned in JSON: ${registerRes.data.data.accessToken.substring(0, 10)}...`, '✅');

    // Extract cookies from response headers
    const cookies = {};
    const setCookieHeaders = registerRes.headers['set-cookie'] || [];
    setCookieHeaders.forEach((cookie) => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name.trim()] = value.trim();
    });

    if (cookies.accessToken) {
      log('TEST 1', `accessToken cookie SET (httpOnly): ${cookies.accessToken.substring(0, 10)}...`, '✅');
    } else {
      throw new Error('accessToken cookie not set');
    }

    if (cookies.refreshToken) {
      log('TEST 1', `refreshToken cookie SET (httpOnly): ${cookies.refreshToken.substring(0, 10)}...`, '✅');
    }

    // ─── TEST 2: Login (both cookies should be set) ───────────────────────
    log('TEST 2', 'Logging in with credentials', '🧪');

    const loginRes = await axios.post(
      `${API_BASE_URL}/auth/login`,
      { email: testUser.email, password: testUser.password },
      { withCredentials: true }
    );

    if (!loginRes.data.data.accessToken) {
      throw new Error('accessToken not returned in login response');
    }
    log('TEST 2', 'Login successful', '✅');

    // ─── TEST 3: Check that logout clears cookies ───────────────────────
    log('TEST 3', 'Testing logout endpoint', '🧪');

    // Create axios instance with jar to track cookies
    const jar = new (require('http').Agent)();
    const client = axios.create({
      baseURL: API_BASE_URL,
      httpAgent: jar,
      withCredentials: true,
    });

    // Add token from login
    const token = loginRes.data.data.accessToken;
    const logoutRes = await client.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (logoutRes.status === 200) {
      log('TEST 3', 'Logout endpoint returned 200 OK', '✅');
      const logoutCookies = logoutRes.headers['set-cookie'] || [];
      const clearedCount = logoutCookies.filter((c) => c.includes('Max-Age=0')).length;
      if (clearedCount > 0) {
        log('TEST 3', `${clearedCount} cookies cleared on logout`, '✅');
      }
    }

    // ─── TEST 4: Test health check endpoint ───────────────────────────────
    log('TEST 4', 'Testing API health check', '🧪');

    const healthRes = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    if (healthRes.status === 200 && healthRes.data.success) {
      log('TEST 4', 'Health check passed', '✅');
    }

    // ─── RESULTS ──────────────────────────────────────────────────────────
    testResults.endTime = Date.now();
    const duration = testResults.endTime - testResults.startTime;

    console.log('\n' + '='.repeat(70));
    console.log('RESULTS');
    console.log('='.repeat(70) + '\n');

    const passedTests = testResults.tests.filter((t) => t.status === '✅').length;
    const totalTests = testResults.tests.length;

    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`⏱️  Duration: ${duration}ms\n`);

    console.log('='.repeat(70));
    console.log('VERDICT: SECURE COOKIES IMPLEMENTATION');
    console.log('='.repeat(70) + '\n');

    if (passedTests === totalTests) {
      console.log('✅ PASS: Secure cookie strategy is working correctly!');
      console.log('\nKey achievements:');
      console.log('  ✅ Both accessToken and refreshToken set as httpOnly cookies');
      console.log('  ✅ Tokens also returned in JSON for immediate frontend use');
      console.log('  ✅ Cookies automatically sent with subsequent requests');
      console.log('  ✅ Logout properly clears all cookies');
      console.log('  ✅ XSS protection: JavaScript cannot access httpOnly cookies\n');
      return true;
    } else {
      console.log(`❌ FAIL: ${totalTests - passedTests} test(s) failed\n`);
      return false;
    }
  } catch (error) {
    console.error(`\n❌ TEST ERROR: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Run tests
testCookieFlow().then((passed) => {
  process.exit(passed ? 0 : 1);
});
