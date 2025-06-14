// VRF Pool API - Provides instant VRF without user transactions
// This endpoint serves pre-generated VRF seeds for immediate game use

import { NextRequest, NextResponse } from 'next/server';

interface VRFPoolEntry {
  seed: number;
  transactionId: string;
  blockHeight: number;
  timestamp: number;
  used: boolean;
}

// In-memory pool (in production, use Redis or database)
let vrfPool: VRFPoolEntry[] = [];
let poolIndex = 0;
let lastInitialization = 0;

// Initialize pool with some test data
function initializePool() {
  const now = Date.now();

  // Only initialize if pool is empty or it's been more than 1 hour
  if (vrfPool.length === 0 || (now - lastInitialization) > 3600000) {
    console.log('🔄 Initializing VRF pool...');

    // Clear existing pool
    vrfPool = [];
    poolIndex = 0;

    // Generate test VRF entries with truly random seeds
    // In production, these would be pre-generated from actual VRF transactions
    for (let i = 0; i < 100; i++) {
      const baseTime = now + i * 1000;
      // Generate truly random seed using crypto.getRandomValues for better entropy
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const randomSeed = randomArray[0];

      vrfPool.push({
        seed: randomSeed,
        transactionId: `vrf_pool_${baseTime}_${i}`,
        blockHeight: 1000000 + i,
        timestamp: baseTime,
        used: false
      });
    }

    lastInitialization = now;
    console.log(`✅ VRF pool initialized with ${vrfPool.length} entries`);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Initialize pool with proper error handling
    initializePool();

    // Validate pool state
    if (!vrfPool || vrfPool.length === 0) {
      throw new Error('VRF pool initialization failed');
    }

    // Get next unused VRF from pool
    let vrfEntry: VRFPoolEntry | null = null;
    let attempts = 0;
    const maxAttempts = Math.min(vrfPool.length, 100); // Prevent infinite loops

    while (!vrfEntry && attempts < maxAttempts) {
      const currentIndex = poolIndex % vrfPool.length;
      const currentEntry = vrfPool[currentIndex];

      if (currentEntry && !currentEntry.used) {
        vrfEntry = currentEntry;
        currentEntry.used = true;
        console.log(`🎲 VRF entry selected: ${vrfEntry.seed} (index: ${currentIndex})`);
      }

      poolIndex = (poolIndex + 1) % vrfPool.length;
      attempts++;
    }

    // If no unused entry found, generate fallback
    if (!vrfEntry) {
      console.warn('⚠️ VRF pool exhausted, generating fallback');
      // Generate truly random fallback seed
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const fallbackSeed = randomArray[0];

      vrfEntry = {
        seed: fallbackSeed,
        transactionId: `fallback_${Date.now()}`,
        blockHeight: 0,
        timestamp: Date.now(),
        used: true
      };
    }

    // Reset pool usage periodically (every 50 requests) and regenerate seeds for better randomness
    if (poolIndex % 50 === 0) {
      const resetCount = vrfPool.filter(entry => entry.used).length;

      // Regenerate seeds for used entries to ensure fresh randomness
      vrfPool.forEach(entry => {
        if (entry.used) {
          const randomArray = new Uint32Array(1);
          crypto.getRandomValues(randomArray);
          entry.seed = randomArray[0];
        }
        entry.used = false;
      });

      console.log(`🔄 VRF pool reset: ${resetCount} entries refreshed with new seeds`);
    }

    // Return successful response
    const response = {
      success: true,
      seed: vrfEntry.seed,
      transactionId: vrfEntry.transactionId,
      blockHeight: vrfEntry.blockHeight,
      timestamp: vrfEntry.timestamp,
      poolSize: vrfPool.length,
      poolIndex: poolIndex,
      usedEntries: vrfPool.filter(entry => entry.used).length
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ VRF pool error:', error);

    // Generate emergency fallback with crypto randomness
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const fallbackSeed = randomArray[0];

    return NextResponse.json({
      success: false,
      error: 'VRF pool temporarily unavailable',
      fallback: {
        seed: fallbackSeed,
        transactionId: `emergency_fallback_${Date.now()}`,
        blockHeight: 0,
        timestamp: Date.now()
      },
      message: 'Using emergency fallback randomness'
    }, {
      status: 200, // Return 200 with fallback instead of 500
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

// Background service to replenish VRF pool (would run separately in production)
// NOTE: This is NOT exported to avoid Next.js route validation errors
async function replenishVRFPool() {
  // This would connect to Flow and generate real VRF seeds
  // For now, just add more test entries with crypto randomness
  const newEntries = [];
  for (let i = 0; i < 20; i++) {
    // Generate truly random seed for replenishment
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const randomSeed = randomArray[0];

    newEntries.push({
      seed: randomSeed,
      transactionId: `replenish_${Date.now()}_${i}`,
      blockHeight: 1000000 + vrfPool.length + i,
      timestamp: Date.now() + i * 1000,
      used: false
    });
  }
  
  vrfPool.push(...newEntries);
  console.log(`🔄 VRF pool replenished with ${newEntries.length} entries`);
}
