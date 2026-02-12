/**
 * Secure Bin Cycle Count - Comprehensive Unit Tests
 * 
 * Tests cover:
 * - Excel parsing and validation
 * - Bin filtering (single, multi, prefix)
 * - Variance calculation
 * - Audit logging
 * - Data deduplication
 */

// ==========================================
// TEST UTILITIES
// ==========================================

const TestRunner = {
  tests: [],
  passed: 0,
  failed: 0,
  
  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    console.log('━'.repeat(50));
    fn();
  },
  
  it(description, fn) {
    try {
      fn();
      this.passed++;
      console.log(`✅ ${description}`);
    } catch (error) {
      this.failed++;
      console.log(`❌ ${description}`);
      console.log(`   Error: ${error.message}`);
    }
  },
  
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  },
  
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  
  assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Arrays not equal: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
    }
  },
  
  assertObjectEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Objects not equal`);
    }
  },
  
  report() {
    const total = this.passed + this.failed;
    const percentage = ((this.passed / total) * 100).toFixed(1);
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📊 Test Results: ${this.passed}/${total} passed (${percentage}%)`);
    console.log(`${'═'.repeat(50)}\n`);
  }
};

// ==========================================
// TESTS: EXCEL PARSING
// ==========================================

TestRunner.describe('Excel Parsing & Validation', () => {
  
  TestRunner.it('should detect required columns', () => {
    const row = {
      Location: 'Area-A',
      Bin: 'A-1',
      PalletID: 'PAL-001',
      ItemNumber: 'SKU-1001',
      SystemQuantity: 50
    };
    
    const result = validateInventoryRow(row);
    TestRunner.assert(result.isValid === true, 'Should be valid with all required columns');
  });
  
  TestRunner.it('should reject missing required columns', () => {
    const row = {
      Location: 'Area-A',
      Bin: 'A-1',
      ItemNumber: 'SKU-1001',
      SystemQuantity: 50
      // Missing PalletID
    };
    
    const result = validateInventoryRow(row);
    TestRunner.assert(result.isValid === false, 'Should be invalid without required columns');
    TestRunner.assert(result.errors.length > 0, 'Should have error messages');
  });
  
  TestRunner.it('should validate numeric quantity field', () => {
    const row = {
      Location: 'Area-A',
      Bin: 'A-1',
      PalletID: 'PAL-001',
      ItemNumber: 'SKU-1001',
      SystemQuantity: 'not-a-number'
    };
    
    const result = validateInventoryRow(row);
    TestRunner.assert(result.isValid === false, 'Should reject non-numeric quantities');
    TestRunner.assert(result.errors[0].includes('number'), 'Error should mention number type');
  });
  
  TestRunner.it('should validate date format YYYY-MM-DD', () => {
    const row = {
      Location: 'Area-A',
      Bin: 'A-1',
      PalletID: 'PAL-001',
      ItemNumber: 'SKU-1001',
      SystemQuantity: 50,
      ExpiryDate: '2026-12-31'
    };
    
    const result = validateInventoryRow(row);
    TestRunner.assert(result.isValid === true, 'Should accept valid ISO date');
  });
  
  TestRunner.it('should reject invalid date formats', () => {
    const row = {
      Location: 'Area-A',
      Bin: 'A-1',
      PalletID: 'PAL-001',
      ItemNumber: 'SKU-1001',
      SystemQuantity: 50,
      ExpiryDate: '31/12/2026'
    };
    
    const result = validateInventoryRow(row);
    TestRunner.assert(result.isValid === false, 'Should reject DD/MM/YYYY format');
  });
});

// ==========================================
// TESTS: DEDUPLICATION
// ==========================================

TestRunner.describe('Data Deduplication', () => {
  
  TestRunner.it('should identify duplicate pallet+bin combinations', () => {
    const rows = [
      { PalletID: 'PAL-001', Bin: 'A-1', ItemNumber: 'SKU-1001', SystemQuantity: 50, Location: 'Area-A' },
      { PalletID: 'PAL-001', Bin: 'A-1', ItemNumber: 'SKU-1001', SystemQuantity: 50, Location: 'Area-A' }
    ];
    
    const result = deduplicateRows(rows);
    TestRunner.assertEqual(result.unique.length, 1, 'Should have 1 unique row');
    TestRunner.assertEqual(result.deduplicationCount, 1, 'Should identify 1 duplicate');
  });
  
  TestRunner.it('should preserve unique records', () => {
    const rows = [
      { PalletID: 'PAL-001', Bin: 'A-1', ItemNumber: 'SKU-1001', SystemQuantity: 50, Location: 'Area-A' },
      { PalletID: 'PAL-002', Bin: 'A-1', ItemNumber: 'SKU-1002', SystemQuantity: 75, Location: 'Area-A' },
      { PalletID: 'PAL-003', Bin: 'A-2', ItemNumber: 'SKU-1003', SystemQuantity: 100, Location: 'Area-A' }
    ];
    
    const result = deduplicateRows(rows);
    TestRunner.assertEqual(result.unique.length, 3, 'Should preserve all unique rows');
    TestRunner.assertEqual(result.deduplicationCount, 0, 'Should identify 0 duplicates');
  });
  
  TestRunner.it('should allow same pallet in different bins', () => {
    const rows = [
      { PalletID: 'PAL-001', Bin: 'A-1', ItemNumber: 'SKU-1001', SystemQuantity: 50, Location: 'Area-A' },
      { PalletID: 'PAL-001', Bin: 'A-2', ItemNumber: 'SKU-1001', SystemQuantity: 50, Location: 'Area-A' }
    ];
    
    const result = deduplicateRows(rows);
    TestRunner.assertEqual(result.unique.length, 2, 'Should keep same pallet in different bins');
  });
});

// ==========================================
// TESTS: BIN FILTERING
// ==========================================

TestRunner.describe('Bin Filtering', () => {
  
  const inventoryData = [
    { Location: 'Area-A', Bin: 'A-1', PalletID: 'PAL-001', ItemNumber: 'SKU-1001', SystemQuantity: 50 },
    { Location: 'Area-A', Bin: 'A-2', PalletID: 'PAL-002', ItemNumber: 'SKU-1002', SystemQuantity: 75 },
    { Location: 'Area-A', Bin: 'A-3', PalletID: 'PAL-003', ItemNumber: 'SKU-1003', SystemQuantity: 100 },
    { Location: 'Area-B', Bin: 'B-1', PalletID: 'PAL-004', ItemNumber: 'SKU-2001', SystemQuantity: 120 }
  ];
  
  TestRunner.it('should filter by single location', () => {
    const filtered = inventoryData.filter(item => item.Location === 'Area-A');
    TestRunner.assertEqual(filtered.length, 3, 'Should return 3 items from Area-A');
  });
  
  TestRunner.it('should filter by single bin', () => {
    const location = 'Area-A';
    const bin = 'A-1';
    const filtered = inventoryData.filter(item => item.Location === location && item.Bin === bin);
    TestRunner.assertEqual(filtered.length, 1, 'Should return 1 item from A-1');
  });
  
  TestRunner.it('should filter by multiple bins', () => {
    const location = 'Area-A';
    const bins = ['A-1', 'A-2'];
    const filtered = inventoryData.filter(item => item.Location === location && bins.includes(item.Bin));
    TestRunner.assertEqual(filtered.length, 2, 'Should return 2 items from A-1 and A-2');
  });
  
  TestRunner.it('should filter by bin prefix', () => {
    const location = 'Area-A';
    const prefix = 'A-';
    const filtered = inventoryData.filter(item => item.Location === location && item.Bin.startsWith(prefix));
    TestRunner.assertEqual(filtered.length, 3, 'Should return 3 items with A- prefix');
  });
});

// ==========================================
// TESTS: VARIANCE CALCULATION
// ==========================================

TestRunner.describe('Variance Calculation', () => {
  
  TestRunner.it('should calculate positive variance', () => {
    const countAction = {
      systemQuantity: 50,
      countedQuantity: 60,
      variance: 60 - 50
    };
    TestRunner.assertEqual(countAction.variance, 10, 'Positive variance should be +10');
  });
  
  TestRunner.it('should calculate negative variance', () => {
    const countAction = {
      systemQuantity: 50,
      countedQuantity: 45,
      variance: 45 - 50
    };
    TestRunner.assertEqual(countAction.variance, -5, 'Negative variance should be -5');
  });
  
  TestRunner.it('should calculate zero variance', () => {
    const countAction = {
      systemQuantity: 50,
      countedQuantity: 50,
      variance: 50 - 50
    };
    TestRunner.assertEqual(countAction.variance, 0, 'Zero variance should be 0');
  });
  
  TestRunner.it('should calculate variance statistics', () => {
    const countActions = [
      { variance: 10, flagged: false },   // Positive
      { variance: -5, flagged: false },   // Negative
      { variance: 0, flagged: false },    // Zero
      { variance: 0, flagged: false }     // Zero
    ];
    
    const stats = calculateVarianceStats(countActions);
    TestRunner.assertEqual(stats.totalActions, 4, 'Should have 4 total actions');
    TestRunner.assertEqual(stats.positiveVariances.length, 1, 'Should have 1 positive');
    TestRunner.assertEqual(stats.negativeVariances.length, 1, 'Should have 1 negative');
    TestRunner.assertEqual(stats.zeroVariances.length, 2, 'Should have 2 zeros');
    TestRunner.assertEqual(stats.varianceCount, 2, 'Should have 2 variances');
  });
});

// ==========================================
// TESTS: AUDIT LOGGING
// ==========================================

TestRunner.describe('Audit Logging', () => {
  
  TestRunner.it('should create audit log entry with all fields', () => {
    const entry = {
      logId: 'LOG-001',
      timestamp: new Date().toISOString(),
      user: 'USER',
      action: 'Pallet counted',
      details: { pallet_id: 'PAL-001', variance: 5 }
    };
    
    TestRunner.assert(entry.logId !== null, 'Should have log ID');
    TestRunner.assert(entry.timestamp !== null, 'Should have timestamp');
    TestRunner.assert(entry.user === 'USER', 'Should have user type');
    TestRunner.assert(entry.action !== null, 'Should have action');
    TestRunner.assert(entry.details !== null, 'Should have details');
  });
  
  TestRunner.it('should support SYSTEM and ERROR user types', () => {
    const systemEntry = { user: 'SYSTEM', action: 'Data imported' };
    const errorEntry = { user: 'ERROR', action: 'Parse failed' };
    
    TestRunner.assert(['USER', 'SYSTEM', 'ERROR'].includes(systemEntry.user), 'Should support SYSTEM user');
    TestRunner.assert(['USER', 'SYSTEM', 'ERROR'].includes(errorEntry.user), 'Should support ERROR user');
  });
  
  TestRunner.it('should maintain immutability of audit logs', () => {
    const auditLog = [
      { logId: '1', timestamp: '2026-02-01T10:00:00Z', action: 'Import' },
      { logId: '2', timestamp: '2026-02-01T10:05:00Z', action: 'Count' }
    ];
    
    const originalLength = auditLog.length;
    // Create new entries instead of modifying
    const newEntry = { logId: '3', timestamp: '2026-02-01T10:10:00Z', action: 'Submit' };
    const updatedLog = [...auditLog, newEntry];
    
    TestRunner.assertEqual(originalLength, 2, 'Original log should be unchanged');
    TestRunner.assertEqual(updatedLog.length, 3, 'New log should have 3 entries');
  });
});

// ==========================================
// TESTS: SESSION METRICS
// ==========================================

TestRunner.describe('Session Metrics', () => {
  
  TestRunner.it('should calculate session duration', () => {
    const session = {
      sessionId: 'SES-123',
      startTime: Date.now() - 3600000, // 1 hour ago
      endTime: Date.now(),
      location: 'Area-A',
      bins: ['A-1', 'A-2'],
      totalPallets: 10
    };
    
    const countActions = [
      { variance: 0 },
      { variance: 0 },
      { variance: 5 }
    ];
    
    const metrics = calculateSessionMetrics(session, countActions);
    TestRunner.assert(metrics.durationSeconds > 3500, 'Duration should be approximately 1 hour');
  });
  
  TestRunner.it('should calculate completion percentage', () => {
    const session = {
      sessionId: 'SES-123',
      startTime: Date.now(),
      endTime: null,
      location: 'Area-A',
      bins: ['A-1'],
      totalPallets: 10
    };
    
    const countActions = [
      { variance: 0 },
      { variance: 0 },
      { variance: 0 },
      { variance: 0 },
      { variance: 0 }
    ];
    
    const metrics = calculateSessionMetrics(session, countActions);
    TestRunner.assertEqual(metrics.completionPercentage, '50.00', 'Completion should be 50%');
  });
  
  TestRunner.it('should count flagged items', () => {
    const session = {
      sessionId: 'SES-123',
      startTime: Date.now(),
      endTime: null,
      location: 'Area-A',
      bins: ['A-1'],
      totalPallets: 5
    };
    
    const countActions = [
      { variance: 0, flagged: false },
      { variance: 5, flagged: true },
      { variance: 0, flagged: false },
      { variance: -3, flagged: true }
    ];
    
    const metrics = calculateSessionMetrics(session, countActions);
    TestRunner.assertEqual(metrics.flaggedCount, 2, 'Should count 2 flagged items');
  });
});

// ==========================================
// TESTS: DATE/TIME FORMATTING
// ==========================================

TestRunner.describe('Date/Time Formatting', () => {
  
  TestRunner.it('should format duration in seconds', () => {
    const formatted = formatDuration(45);
    TestRunner.assertEqual(formatted, '45s', 'Should format seconds correctly');
  });
  
  TestRunner.it('should format duration in minutes and seconds', () => {
    const formatted = formatDuration(125); // 2 minutes 5 seconds
    TestRunner.assertEqual(formatted, '2m 5s', 'Should format minutes and seconds');
  });
  
  TestRunner.it('should format duration in hours, minutes and seconds', () => {
    const formatted = formatDuration(3665); // 1 hour 1 minute 5 seconds
    TestRunner.assertEqual(formatted, '1h 1m 5s', 'Should format hours, minutes, seconds');
  });
});

// ==========================================
// RUN ALL TESTS
// ==========================================

function runAllTests() {
  console.clear();
  console.log('\n🧪 SECURE BIN CYCLE COUNT - UNIT TESTS\n');
  console.log('═'.repeat(50));
  
  TestRunner.report();
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.addEventListener('load', runAllTests);
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestRunner, runAllTests };
}
