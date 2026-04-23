#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ENVIRONMENTAL VALIDATION TEST SUITE                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: All variables present (should pass)
echo "✓ TEST 1: Server starts with all correct environment variables"
echo "Command: npm run dev"
echo "Expected: ✅ ALL ENVIRONMENT VARIABLES VALIDATED (8/8)"
echo ""
read -p "Press Enter to run TEST 1 (Ctrl+C to skip)..." 
pkill -f "nodemon\|npm run dev" || true
sleep 2
cd /Users/aryanrangani/Downloads/College/SEM\ 6/lux && npm run dev > /tmp/test1.log 2>&1 &
sleep 5

if grep -q "ALL ENVIRONMENT VARIABLES VALIDATED" /tmp/test1.log; then
  echo "✅ TEST 1 PASSED: All 8 variables validated"
else
  echo "❌ TEST 1 FAILED"
fi
echo ""

# Test 2: Missing PORT (should fail)
echo "✓ TEST 2: Server refuses to start without PORT"
echo "Command: unset PORT && npm run dev"
echo "Expected: ❌ PORT - MISSING (Required)"
echo ""
read -p "Press Enter to run TEST 2 (Ctrl+C to skip)..." 

pkill -f "nodemon\|npm run dev" || true
sleep 2

# Temporarily unset PORT
export TEMP_PORT=$PORT
unset PORT

cd /Users/aryanrangani/Downloads/College/SEM\ 6/lux && npm run dev > /tmp/test2.log 2>&1 &
sleep 5

if grep -q "PORT.*MISSING" /tmp/test2.log; then
  echo "✅ TEST 2 PASSED: Server rejected missing PORT"
else
  echo "❌ TEST 2 FAILED"
fi

# Restore PORT
export PORT=$TEMP_PORT

echo ""
echo "✓ TEST 3: Invalid NODE_ENV is rejected"
echo "Command: NODE_ENV=invalid npm run dev"
echo "Expected: ❌ NODE_ENV - INVALID FORMAT"
echo ""
read -p "Press Enter to run TEST 3 (Ctrl+C to skip)..." 

pkill -f "nodemon\|npm run dev" || true
sleep 2

cd /Users/aryanrangani/Downloads/College/SEM\ 6/lux && NODE_ENV=invalid npm run dev > /tmp/test3.log 2>&1 &
sleep 5

if grep -q "NODE_ENV.*INVALID" /tmp/test3.log; then
  echo "✅ TEST 3 PASSED: Server rejected invalid NODE_ENV"
else
  echo "❌ TEST 3 FAILED"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ALL TESTS COMPLETE                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Cleanup and restart backend correctly
pkill -f "nodemon\|npm run dev" || true
sleep 2
cd /Users/aryanrangani/Downloads/College/SEM\ 6/lux && npm run dev > /tmp/backend.log 2>&1 &
sleep 3
echo "✅ Backend restarted with correct configuration"
