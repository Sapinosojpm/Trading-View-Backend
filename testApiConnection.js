// API Connection Diagnostic Script
// Tests OKX API connectivity and identifies 403 error sources

import { testApiConnection, getMarketPrice, getBalance, getRecentCandles } from './okxBot.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 OKX API Connection Diagnostic\n');

// Check environment variables
console.log('📋 Environment Check:');
console.log(`   OKX_API_KEY: ${process.env.OKX_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   OKX_API_SECRET: ${process.env.OKX_API_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   OKX_API_PASSPHRASE: ${process.env.OKX_API_PASSPHRASE ? '✅ Set' : '❌ Missing'}`);

if (!process.env.OKX_API_KEY || !process.env.OKX_API_SECRET || !process.env.OKX_API_PASSPHRASE) {
  console.log('\n⚠️  Missing API credentials. Please check your .env file.');
  console.log('   The 403 errors are likely due to missing or incorrect API credentials.');
}

console.log('\n🚀 Starting API Tests...\n');

// Test 1: Basic API connection
console.log('📊 Test 1: Basic API Connection');
try {
  const connectionTest = await testApiConnection();
  console.log('Result:', connectionTest);
  
  if (!connectionTest.public) {
    console.log('❌ Public API is not working - check your internet connection');
  } else if (!connectionTest.authenticated && (process.env.OKX_API_KEY && process.env.OKX_API_SECRET && process.env.OKX_API_PASSPHRASE)) {
    console.log('❌ Authenticated API is not working - check your API credentials');
  }
} catch (error) {
  console.error('❌ Connection test failed:', error.message);
}

console.log('\n📊 Test 2: Individual Endpoint Tests');

// Test 2a: Market Price (Public)
console.log('\n   a) Market Price (Public Endpoint)');
try {
  const price = await getMarketPrice('SOL-USDT');
  console.log(`   ✅ Success: $${price}`);
} catch (error) {
  console.log(`   ❌ Failed: ${error.message}`);
  if (error.response?.status === 403) {
    console.log('   💡 403 on public endpoint suggests IP blocking or rate limiting');
  }
}

// Test 2b: Balance (Authenticated)
console.log('\n   b) Balance (Authenticated Endpoint)');
try {
  const balance = await getBalance();
  console.log(`   ✅ Success: ${JSON.stringify(balance?.data?.[0]?.details?.slice(0, 2) || 'No data')}`);
} catch (error) {
  console.log(`   ❌ Failed: ${error.message}`);
  if (error.response?.status === 403) {
    console.log('   💡 403 on authenticated endpoint suggests:');
    console.log('      - Incorrect API credentials');
    console.log('      - API key doesn\'t have trading permissions');
    console.log('      - IP not whitelisted (if enabled)');
    console.log('      - Account suspended or restricted');
  }
}

// Test 2c: Candles (Public)
console.log('\n   c) Candles (Public Endpoint)');
try {
  const candles = await getRecentCandles('SOL-USDT', 10, '1m');
  console.log(`   ✅ Success: ${candles?.length || 0} candles fetched`);
} catch (error) {
  console.log(`   ❌ Failed: ${error.message}`);
}

console.log('\n🔧 Troubleshooting Steps:');

console.log('\n1. Check API Credentials:');
console.log('   - Verify your API key, secret, and passphrase are correct');
console.log('   - Ensure no extra spaces or characters in .env file');
console.log('   - Check that API key is active and not expired');

console.log('\n2. Check API Permissions:');
console.log('   - Ensure API key has "Read" and "Trade" permissions');
console.log('   - Check if IP whitelist is enabled and your IP is added');
console.log('   - Verify account is not suspended or under maintenance');

console.log('\n3. Check Rate Limits:');
console.log('   - OKX allows ~2 requests per second');
console.log('   - If you\'re making too many requests, wait a few minutes');
console.log('   - The enhanced bot now includes rate limiting');

console.log('\n4. Network Issues:');
console.log('   - Check your internet connection');
console.log('   - Try using a VPN if your IP might be blocked');
console.log('   - Check if OKX is accessible from your location');

console.log('\n5. API Endpoint Changes:');
console.log('   - OKX occasionally updates their API');
console.log('   - Check OKX API documentation for any recent changes');

console.log('\n💡 Quick Fixes:');
console.log('1. Restart your bot after fixing credentials');
console.log('2. Wait 5-10 minutes if rate limited');
console.log('3. Test with a new API key if current one is problematic');
console.log('4. Contact OKX support if issues persist');

console.log('\n📊 Rate Limiting Status:');
console.log('✅ Enhanced rate limiting implemented');
console.log('✅ Retry logic with exponential backoff');
console.log('✅ Better error handling and logging');

console.log('\n🎯 Next Steps:');
console.log('1. Fix any credential issues identified above');
console.log('2. Restart your trading bot');
console.log('3. Monitor logs for improved error messages');
console.log('4. If still having issues, run this diagnostic again');

console.log('\n✅ Diagnostic complete!'); 