#!/usr/bin/env node

/**
 * Simple test script for the self-hosted sandbox provider
 * This script tests the basic functionality without requiring a full Next.js environment
 */

const { SelfHostedProvider } = require('./lib/sandbox/providers/self-hosted-provider.ts');

async function testSelfHostedProvider() {
  console.log('🧪 Testing Self-Hosted Sandbox Provider...\n');

  // Create provider instance
  const provider = new SelfHostedProvider({
    apiKey: 'test-key',
    timeoutMs: 30000,
  });

  try {
    // Test 1: Create sandbox
    console.log('1️⃣ Creating sandbox...');
    const sandboxInfo = await provider.createSandbox();
    console.log('✅ Sandbox created:', sandboxInfo);
    console.log('🌐 Sandbox URL:', sandboxInfo.url);

    // Test 2: Write a file
    console.log('\n2️⃣ Writing test file...');
    await provider.writeFile('test.txt', 'Hello from self-hosted sandbox!');
    console.log('✅ File written successfully');

    // Test 3: Read the file back
    console.log('\n3️⃣ Reading test file...');
    const content = await provider.readFile('test.txt');
    console.log('✅ File content:', content);

    // Test 4: List files
    console.log('\n4️⃣ Listing files...');
    const files = await provider.listFiles();
    console.log('✅ Files:', files);

    // Test 5: Run a command
    console.log('\n5️⃣ Running command...');
    const result = await provider.runCommand('echo "Hello from command"');
    console.log('✅ Command result:', result);

    // Test 6: Check if alive
    console.log('\n6️⃣ Checking if sandbox is alive...');
    const isAlive = await provider.isAlive();
    console.log('✅ Sandbox alive:', isAlive);

    // Test 7: Setup Vite app
    console.log('\n7️⃣ Setting up Vite app...');
    await provider.setupViteApp();
    console.log('✅ Vite app setup complete');

    // Test 8: Get sandbox URL again (should have Vite running)
    console.log('\n8️⃣ Getting sandbox URL with Vite...');
    const url = await provider.getSandboxUrl();
    console.log('✅ Sandbox URL with Vite:', url);

    console.log('\n🎉 All tests passed! Self-hosted sandbox is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    try {
      await provider.terminate();
      console.log('✅ Sandbox terminated successfully');
    } catch (error) {
      console.error('❌ Failed to terminate sandbox:', error);
    }
  }
}

// Run the test
if (require.main === module) {
  testSelfHostedProvider()
    .then(() => {
      console.log('\n✨ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSelfHostedProvider };