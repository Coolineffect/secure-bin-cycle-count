/**
 * Secure Bin Cycle Count - Data Schema Definitions
 * 
 * This file defines the complete data model for the cycle counting system.
 * All data structures are designed to be immutable and audit-friendly.
 */

// ==========================================
// DATA SCHEMA DEFINITIONS
// ==========================================

/**
 * InventoryImport Schema
 * 
 * Represents a single pallet from the uploaded inventory file.
 * This data is immutable once imported.
 */
const InventoryImportSchema = {
  id: {
    type: 'string',
    description: 'Unique identifier (UUID)',
    required: true
  },
  location: {
    type: 'string',
    description: 'Warehouse area (Area-A, Area-B)',
    required: true,
    validation: /^[A-Za-z0-9\-]+$/
  },
  bin: {
    type: 'string',
    description: 'Bin location (A-1, A-2)',
    required: true,
    validation: /^[A-Za-z0-9\-]+$/
  },
  palletId: {
    type: 'string',
    description: 'Unique pallet identifier',
    required: true,
    unique: true
  },
  itemNumber: {
    type: 'string',
    description: 'SKU or item code',
    required: true
  },
  systemQuantity: {
    type: 'number',
    description: 'Quantity in system',
    required: true,
    min: 0,
    validation: (val) => Number.isInteger(val) && val >= 0
  },
  description: {
    type: 'string',
    description: 'Item description',
    required: false
  },
  uom: {
    type: 'string',
    description: 'Unit of measure (Unit, Box, Carton)',
    required: false,
    default: 'Unit'
  },
  expiryDate: {
    type: 'string',
    description: 'ISO date format YYYY-MM-DD',
    required: false,
    validation: /^\d{4}-\d{2}-\d{2}$/
  },
  status: {
    type: 'string',
    description: 'Status (Active, Inactive, Pending)',
    required: false,
    default: 'Active',
    enum: ['Active', 'Inactive', 'Pending']
  },
  importedAt: {
    type: 'string',
    description: 'ISO timestamp of import',
    required: true,
    readOnly: true
  },
  importBatch: {
    type: 'string',
    description: 'Batch identifier for traceability',
    required: true,
    readOnly: true
  }
};

/**
 * CountSessions Schema
 * 
 * Represents a counting session - when an operator counts specific bins.
 */
const CountSessionsSchema = {
  sessionId: {
    type: 'string',
    description: 'Session identifier (SES-{timestamp})',
    required: true,
    unique: true,
    readOnly: true
  },
  timestamp: {
    type: 'string',
    description: 'ISO datetime of session creation',
    required: true,
    readOnly: true
  },
  location: {
    type: 'string',
    description: 'Warehouse location being counted',
    required: true
  },
  bins: {
    type: 'array',
    description: 'Array of bin identifiers',
    required: true,
    itemType: 'string',
    minItems: 1
  },
  userId: {
    type: 'string',
    description: 'Operator identifier',
    required: true
  },
  startTime: {
    type: 'number',
    description: 'Unix timestamp in milliseconds',
    required: true,
    readOnly: true
  },
  endTime: {
    type: 'number',
    description: 'Unix timestamp in milliseconds (null if incomplete)',
    required: false
  },
  status: {
    type: 'string',
    description: 'Session status',
    required: true,
    default: 'in-progress',
    enum: ['in-progress', 'completed', 'submitted'],
    readOnly: false
  },
  totalPallets: {
    type: 'number',
    description: 'Total pallets in scope',
    required: true,
    readOnly: true
  },
  completedCount: {
    type: 'number',
    description: 'Number of pallets counted',
    required: true,
    default: 0
  },
  varianceCount: {
    type: 'number',
    description: 'Number of pallets with discrepancies',
    required: true,
    default: 0
  }
};

/**
 * CountActions Schema
 * 
 * Records individual count actions for each pallet.
 * Immutable once created.
 */
const CountActionsSchema = {
  actionId: {
    type: 'string',
    description: 'Unique action identifier',
    required: true,
    unique: true,
    readOnly: true
  },
  sessionId: {
    type: 'string',
    description: 'Reference to parent session',
    required: true,
    readOnly: true
  },
  palletId: {
    type: 'string',
    description: 'Pallet identifier being counted',
    required: true,
    readOnly: true
  },
  bin: {
    type: 'string',
    description: 'Bin location',
    required: true,
    readOnly: true
  },
  itemNumber: {
    type: 'string',
    description: 'Item number',
    required: true,
    readOnly: true
  },
  systemQuantity: {
    type: 'number',
    description: 'Original system count',
    required: true,
    readOnly: true,
    validation: (val) => val >= 0
  },
  countedQuantity: {
    type: 'number',
    description: 'What was actually counted',
    required: true,
    readOnly: true,
    validation: (val) => val >= 0
  },
  variance: {
    type: 'number',
    description: 'Difference (counted - system)',
    required: true,
    readOnly: true,
    computed: (data) => data.countedQuantity - data.systemQuantity
  },
  timestamp: {
    type: 'string',
    description: 'ISO datetime of count',
    required: true,
    readOnly: true
  },
  userId: {
    type: 'string',
    description: 'Operator who performed count',
    required: true,
    readOnly: true
  },
  flagged: {
    type: 'boolean',
    description: 'Manual conflict flag',
    required: true,
    default: false,
    readOnly: true
  },
  notes: {
    type: 'string',
    description: 'Optional comment',
    required: false
  },
  status: {
    type: 'string',
    description: 'Action status',
    required: true,
    default: 'confirmed',
    enum: ['confirmed', 'flagged', 'pending_review'],
    readOnly: true
  }
};

/**
 * AuditLog Schema
 * 
 * Records every action in the system for compliance.
 * Immutable audit trail.
 */
const AuditLogSchema = {
  logId: {
    type: 'string',
    description: 'Unique log entry identifier',
    required: true,
    unique: true,
    readOnly: true
  },
  sessionId: {
    type: 'string',
    description: 'Associated session (null for app-level events)',
    required: false,
    readOnly: true
  },
  timestamp: {
    type: 'string',
    description: 'ISO datetime of event',
    required: true,
    readOnly: true
  },
  user: {
    type: 'string',
    description: 'Entity performing action (USER, SYSTEM, ERROR)',
    required: true,
    enum: ['USER', 'SYSTEM', 'ERROR'],
    readOnly: true
  },
  action: {
    type: 'string',
    description: 'Action description',
    required: true,
    readOnly: true
  },
  details: {
    type: 'object',
    description: 'JSON object with context',
    required: false,
    readOnly: true,
    properties: {
      // Common properties
      file_name: 'string',
      record_count: 'number',
      pallet_id: 'string',
      bin: 'string',
      system_qty: 'number',
      counted_qty: 'number',
      variance: 'number',
      error: 'string',
      user_id: 'string',
      location: 'string',
      bins: 'array'
    }
  }
};

// ==========================================
// VALIDATION FUNCTIONS
// ==========================================

/**
 * Validates Excel row against schema
 */
function validateInventoryRow(row) {
  const required = ['Location', 'Bin', 'PalletID', 'ItemNumber', 'SystemQuantity'];
  const errors = [];
  
  // Check required columns
  required.forEach(col => {
    if (!row[col]) {
      errors.push(`Missing required column: ${col}`);
    }
  });
  
  // Validate data types
  if (row.SystemQuantity && isNaN(parseInt(row.SystemQuantity))) {
    errors.push(`SystemQuantity must be a number, got: ${row.SystemQuantity}`);
  }
  
  // Validate expiry date format if present
  if (row.ExpiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.ExpiryDate)) {
    errors.push(`ExpiryDate must be YYYY-MM-DD format, got: ${row.ExpiryDate}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Deduplicates inventory rows
 */
function deduplicateRows(rows) {
  const seen = new Map();
  const duplicates = [];
  
  const unique = rows.filter(row => {
    const key = `${row.PalletID}|${row.Bin}`;
    if (seen.has(key)) {
      duplicates.push({ ...row, reason: 'Duplicate PalletID+Bin' });
      return false;
    }
    seen.set(key, row);
    return true;
  });
  
  return { unique, duplicates, deduplicationCount: duplicates.length };
}

/**
 * Calculates variance statistics
 */
function calculateVarianceStats(countActions) {
  const stats = {
    totalActions: countActions.length,
    totalVariance: 0,
    positiveVariances: [],
    negativeVariances: [],
    zeroVariances: []
  };
  
  countActions.forEach(action => {
    stats.totalVariance += action.variance;
    
    if (action.variance > 0) {
      stats.positiveVariances.push(action);
    } else if (action.variance < 0) {
      stats.negativeVariances.push(action);
    } else {
      stats.zeroVariances.push(action);
    }
  });
  
  stats.varianceCount = stats.positiveVariances.length + stats.negativeVariances.length;
  stats.accuracyPercentage = ((stats.zeroVariances.length / stats.totalActions) * 100).toFixed(2);
  
  return stats;
}

/**
 * Calculates session metrics
 */
function calculateSessionMetrics(session, countActions) {
  const duration = session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime;
  const durationSeconds = Math.floor(duration / 1000);
  
  return {
    sessionId: session.sessionId,
    location: session.location,
    binsCount: session.bins.length,
    totalPallets: session.totalPallets,
    countedPallets: countActions.length,
    completionPercentage: ((countActions.length / session.totalPallets) * 100).toFixed(2),
    durationSeconds: durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    varianceCount: countActions.filter(a => a.variance !== 0).length,
    flaggedCount: countActions.filter(a => a.flagged).length
  };
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// ==========================================
// EXPORT
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    InventoryImportSchema,
    CountSessionsSchema,
    CountActionsSchema,
    AuditLogSchema,
    validateInventoryRow,
    deduplicateRows,
    calculateVarianceStats,
    calculateSessionMetrics,
    formatDuration
  };
}
