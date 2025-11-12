// Sync simulator - demonstrates conflict reduction with local validation

import * as db from '../db/storage.js';

export class SyncSimulator {
  constructor() {
    this.simulationResults = [];
  }

  // Simulate sync process with and without validation
  async runSimulation() {
    const validated = await db.getAllValidated();
    const entries = await db.getAllEntries();
    const quarantined = await db.getAllQuarantined();

    const allEntries = [...validated, ...entries, ...quarantined];

    // Simulate WITHOUT validation (baseline)
    const baselineResults = this.simulateBaselineSync(allEntries);

    // Simulate WITH validation (prototype)
    const prototypeResults = this.simulateValidatedSync(allEntries);

    // Calculate improvements
    const improvements = this.calculateImprovements(baselineResults, prototypeResults);

    const results = {
      baseline: baselineResults,
      prototype: prototypeResults,
      improvements,
      timestamp: Date.now()
    };

    // Store simulation history
    await db.addSyncHistory(results);
    this.simulationResults.push(results);

    return results;
  }

  // Simulate baseline sync (no local validation)
  simulateBaselineSync(entries) {
    let conflicts = 0;
    let corruptions = 0;
    let duplicates = 0;
    let successful = 0;
    const issues = [];

    entries.forEach((entry, index) => {
      const data = entry.data || entry;

      // Simulate various issues that would occur without validation
      
      // 1. Format issues cause corruptions
      if (this.hasFormatIssues(data)) {
        corruptions++;
        issues.push({
          entryId: entry.id || index,
          type: 'corruption',
          reason: 'Invalid data format',
          field: this.findInvalidFields(data)
        });
      }

      // 2. Incomplete data causes conflicts
      if (this.isIncomplete(data)) {
        conflicts++;
        issues.push({
          entryId: entry.id || index,
          type: 'conflict',
          reason: 'Missing required fields',
          field: this.findMissingFields(data)
        });
      }

      // 3. Anomalous data causes validation errors on server
      if (this.hasAnomalies(data)) {
        corruptions++;
        issues.push({
          entryId: entry.id || index,
          type: 'corruption',
          reason: 'Anomalous data rejected by server',
          field: this.findAnomalousFields(data)
        });
      }

      // 4. Similar entries cause duplicates
      if (this.isDuplicateProne(data, entries.slice(0, index))) {
        duplicates++;
        issues.push({
          entryId: entry.id || index,
          type: 'duplicate',
          reason: 'Potential duplicate entry'
        });
      }

      // If no issues, it's successful
      if (!this.hasFormatIssues(data) && 
          !this.isIncomplete(data) && 
          !this.hasAnomalies(data) &&
          !this.isDuplicateProne(data, entries.slice(0, index))) {
        successful++;
      }
    });

    const totalAttempted = entries.length;
    const failureRate = totalAttempted > 0 ? 
      (conflicts + corruptions + duplicates) / totalAttempted : 0;

    return {
      totalAttempted,
      successful,
      conflicts,
      corruptions,
      duplicates,
      failureRate,
      successRate: totalAttempted > 0 ? successful / totalAttempted : 0,
      issues
    };
  }

  // Simulate validated sync (with prototype)
  simulateValidatedSync(entries) {
    let conflicts = 0;
    let corruptions = 0;
    let duplicates = 0;
    let successful = 0;
    let quarantined = 0;
    const issues = [];

    entries.forEach((entry, index) => {
      // Only validated entries attempt sync
      const status = entry.status || 'staging';
      const confidence = entry.confidence?.score || 0.5;

      if (status === 'quarantine') {
        quarantined++;
        return; // Skip quarantined entries
      }

      if (status === 'validated' || confidence >= 0.85) {
        // High confidence entries sync successfully
        successful++;
      } else if (confidence >= 0.6) {
        // Medium confidence might have minor issues
        if (Math.random() < 0.1) { // 10% chance of minor conflict
          conflicts++;
          issues.push({
            entryId: entry.id || index,
            type: 'minor_conflict',
            reason: 'Timestamp mismatch',
            resolved: true
          });
        } else {
          successful++;
        }
      } else {
        // Low confidence entries would be caught
        conflicts++;
        issues.push({
          entryId: entry.id || index,
          type: 'prevented_conflict',
          reason: 'Low confidence prevented sync',
          confidence
        });
      }
    });

    const totalAttempted = entries.length - quarantined;
    const failureRate = totalAttempted > 0 ? 
      (conflicts + corruptions + duplicates) / totalAttempted : 0;

    return {
      totalAttempted,
      successful,
      conflicts,
      corruptions,
      duplicates,
      quarantined,
      failureRate,
      successRate: totalAttempted > 0 ? successful / totalAttempted : 0,
      issues
    };
  }

  // Calculate improvements
  calculateImprovements(baseline, prototype) {
    const conflictReduction = baseline.conflicts > 0 
      ? ((baseline.conflicts - prototype.conflicts) / baseline.conflicts * 100).toFixed(1)
      : 100;

    const corruptionReduction = baseline.corruptions > 0
      ? ((baseline.corruptions - prototype.corruptions) / baseline.corruptions * 100).toFixed(1)
      : 100;

    const duplicateReduction = baseline.duplicates > 0
      ? ((baseline.duplicates - prototype.duplicates) / baseline.duplicates * 100).toFixed(1)
      : 100;

    const successRateImprovement = 
      ((prototype.successRate - baseline.successRate) * 100).toFixed(1);

    const totalIssuesReduced = 
      (baseline.conflicts + baseline.corruptions + baseline.duplicates) -
      (prototype.conflicts + prototype.corruptions + prototype.duplicates);

    return {
      conflictReduction: parseFloat(conflictReduction),
      corruptionReduction: parseFloat(corruptionReduction),
      duplicateReduction: parseFloat(duplicateReduction),
      successRateImprovement: parseFloat(successRateImprovement),
      totalIssuesReduced,
      quarantinedPreventedIssues: prototype.quarantined
    };
  }

  // Helper: Check for format issues
  hasFormatIssues(data) {
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      
      const fieldType = this.inferFieldType(key);
      
      if (fieldType === 'email' && !this.isValidEmail(value)) return true;
      if (fieldType === 'phone' && !this.isValidPhone(value)) return true;
      if (fieldType === 'date' && !this.isValidDate(value)) return true;
    }
    return false;
  }

  // Helper: Check if incomplete
  isIncomplete(data) {
    const requiredFields = ['name', 'email', 'phone', 'firstName'];
    const hasRequired = requiredFields.some(field => 
      Object.keys(data).some(key => key.toLowerCase().includes(field.toLowerCase()))
    );
    
    if (!hasRequired) return true;

    // Check if required fields are filled
    for (const key of Object.keys(data)) {
      if (requiredFields.some(req => key.toLowerCase().includes(req.toLowerCase()))) {
        if (!data[key] || data[key].toString().trim().length === 0) {
          return true;
        }
      }
    }

    return false;
  }

  // Helper: Check for anomalies
  hasAnomalies(data) {
    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      
      const str = value.toString();
      
      // Check for obvious test data
      if (/test|fake|dummy|asdf|qwerty/i.test(str)) return true;
      
      // Check for excessive repetition
      if (/(.)\1{5,}/.test(str)) return true;
      
      // Check for all caps in names
      if (key.toLowerCase().includes('name') && str.length > 5 && str === str.toUpperCase()) {
        return true;
      }
    }
    return false;
  }

  // Helper: Check for duplicate prone
  isDuplicateProne(data, previousEntries) {
    // Simple similarity check
    for (const prev of previousEntries) {
      const prevData = prev.data || prev;
      let matches = 0;
      let total = 0;

      for (const key of Object.keys(data)) {
        if (prevData[key]) {
          total++;
          if (data[key] === prevData[key]) {
            matches++;
          }
        }
      }

      // If more than 80% match, likely duplicate
      if (total > 0 && matches / total > 0.8) {
        return true;
      }
    }
    return false;
  }

  // Helper methods for field validation
  inferFieldType(fieldName) {
    const name = fieldName.toLowerCase();
    if (name.includes('email')) return 'email';
    if (name.includes('phone')) return 'phone';
    if (name.includes('date')) return 'date';
    return 'text';
  }

  isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  isValidPhone(value) {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  isValidDate(value) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  findInvalidFields(data) {
    const invalid = [];
    for (const [key, value] of Object.entries(data)) {
      const fieldType = this.inferFieldType(key);
      if (fieldType === 'email' && !this.isValidEmail(value)) invalid.push(key);
      if (fieldType === 'phone' && !this.isValidPhone(value)) invalid.push(key);
      if (fieldType === 'date' && !this.isValidDate(value)) invalid.push(key);
    }
    return invalid;
  }

  findMissingFields(data) {
    const required = ['name', 'email', 'phone'];
    const missing = [];
    for (const field of required) {
      if (!Object.keys(data).some(k => k.toLowerCase().includes(field))) {
        missing.push(field);
      }
    }
    return missing;
  }

  findAnomalousFields(data) {
    const anomalous = [];
    for (const [key, value] of Object.entries(data)) {
      if (/test|fake|dummy/i.test(value)) anomalous.push(key);
      if (/(.)\1{5,}/.test(value)) anomalous.push(key);
    }
    return anomalous;
  }

  // Get simulation history
  getSimulationHistory() {
    return this.simulationResults;
  }

  // Get latest simulation
  getLatestSimulation() {
    return this.simulationResults[this.simulationResults.length - 1];
  }
}

export default SyncSimulator;
