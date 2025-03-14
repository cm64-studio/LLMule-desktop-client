// This file helps with Node.js ESM compatibility issues
import { createRequire } from 'module';
import { webcrypto } from 'crypto';

// Add webcrypto to global.crypto for Node.js environments
if (!global.crypto) {
  global.crypto = webcrypto;
}

// Create a require function
const require = createRequire(import.meta.url);
export { require };
