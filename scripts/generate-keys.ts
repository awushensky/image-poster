import { generateKeyPairSync } from 'crypto';
import { writeFileSync, existsSync } from 'fs';

async function generateKeys() {
  console.log('Generating JWT keys for OAuth...');
  
  const keys = [];
  
  for (let i = 0; i < 3; i++) {
    // Generate ES256 key pair (ECDSA with P-256 curve)
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // This is P-256
    });
    
    // Export as JWK format
    const privateJwk = privateKey.export({ format: 'jwk' });
    const publicJwk = publicKey.export({ format: 'jwk' });
    
    // Combine into a single JWK (private key contains public key info too)
    keys.push(privateJwk);
  }

  const envContent = `
# Generated JWT Keys for AT Protocol OAuth
PRIVATE_KEY_1='${JSON.stringify(keys[0])}'
PRIVATE_KEY_2='${JSON.stringify(keys[1])}'
PRIVATE_KEY_3='${JSON.stringify(keys[2])}'
`;

  if (existsSync('.env')) {
    console.log('⚠️  Warning: .env file exists. Keys written to .env.keys');
    writeFileSync('.env.keys', envContent.trim());
    console.log('📋 Copy these keys to your .env file:');
    console.log(envContent);
  } else {
    writeFileSync('.env', envContent.trim());
    console.log('✅ Keys written to .env file');
  }
  
  console.log('🔐 Generated 3 ES256 keys for JWT signing');
}

generateKeys().catch(console.error);
