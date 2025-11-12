// Validation orchestrator - coordinates all validation engines

import BehaviorMonitor from './behaviorMonitor.js';
import AnomalyDetector from './anomalyDetector.js';
import PredictiveValidator from './predictiveValidator.js';
import ConfidenceScorer from './confidenceScorer.js';
import * as db from '../db/storage.js';

export class ValidationOrchestrator {
  constructor() {
    this.behaviorMonitor = new BehaviorMonitor();
    this.anomalyDetector = new AnomalyDetector();
    this.predictiveValidator = new PredictiveValidator();
    this.confidenceScorer = new ConfidenceScorer();
    this.deviceId = this.generateDeviceId();
  }

  // Generate unique device ID
  generateDeviceId() {
    const stored = localStorage.getItem('deviceId');
    if (stored) return stored;

    const id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', id);
    return id;
  }

  // Process form entry through full validation pipeline
  async processEntry(formData) {
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 1. Get behavior analysis
    const behaviorReport = this.behaviorMonitor.getBehaviorReport();
    
    // 2. Run anomaly detection on each field
    const anomalyResults = {};
    for (const [fieldName, value] of Object.entries(formData)) {
      const behaviorAnalysis = behaviorReport[fieldName];
      anomalyResults[fieldName] = this.anomalyDetector.detectAnomalies(
        fieldName,
        value,
        behaviorAnalysis
      );
    }

    // 3. Get predictive suggestions
    const suggestions = {};
    for (const [fieldName, value] of Object.entries(formData)) {
      suggestions[fieldName] = this.predictiveValidator.predict(fieldName, value);
    }

    // 4. Calculate confidence score
    const entry = {
      id: entryId,
      data: formData,
      behaviorAnalysis: { report: behaviorReport },
      anomalyDetection: { results: anomalyResults },
      suggestions
    };

    const confidenceResult = this.confidenceScorer.calculateConfidence(entry);

    // 5. Add metadata
    const fullEntry = {
      ...entry,
      confidence: confidenceResult,
      metadata: {
        deviceId: this.deviceId,
        createdAt: Date.now(),
        version: 1,
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      status: confidenceResult.status,
      changeHistory: []
    };

    // 6. Store in appropriate location
    await this.storeEntry(fullEntry);

    // 7. Log audit entry
    await db.addAuditLog({
      entryId,
      action: 'created',
      status: confidenceResult.status,
      confidence: confidenceResult.score,
      deviceId: this.deviceId,
      data: formData
    });

    // 8. Reset behavior monitor for next entry
    this.behaviorMonitor.reset();

    return fullEntry;
  }

  // Store entry in appropriate database
  async storeEntry(entry) {
    if (entry.confidence.status === 'quarantine') {
      await db.moveToQuarantine(entry);
    } else if (entry.confidence.status === 'validated') {
      await db.moveToValidated(entry);
    } else {
      await db.createEntry(entry);
    }
  }

  // Re-validate an existing entry
  async revalidateEntry(entryId, updates = {}) {
    // Get entry from any store
    let entry = await db.getEntry(entryId);
    if (!entry) {
      entry = await db.getQuarantinedEntry(entryId);
    }
    if (!entry) {
      throw new Error('Entry not found');
    }

    // Apply updates
    const updatedData = { ...entry.data, ...updates };

    // Re-run validation pipeline (skip behavior monitoring for corrections)
    const anomalyResults = {};
    const suggestions = {};

    for (const [fieldName, value] of Object.entries(updatedData)) {
      anomalyResults[fieldName] = this.anomalyDetector.detectAnomalies(fieldName, value);
      suggestions[fieldName] = this.predictiveValidator.predict(fieldName, value);
    }

    const updatedEntry = {
      ...entry,
      data: updatedData,
      anomalyDetection: { results: anomalyResults },
      suggestions,
      updatedAt: Date.now()
    };

    const confidenceResult = this.confidenceScorer.calculateConfidence(updatedEntry);
    updatedEntry.confidence = confidenceResult;
    updatedEntry.status = confidenceResult.status;

    // Update change history
    updatedEntry.changeHistory.push({
      timestamp: Date.now(),
      changes: updates,
      previousStatus: entry.status,
      newStatus: confidenceResult.status,
      reason: 'manual_correction'
    });

    // Update or move entry
    if (entry.status === 'quarantine' && confidenceResult.status !== 'quarantine') {
      await db.removeFromQuarantine(entryId);
      await this.storeEntry(updatedEntry);
    } else if (entry.status !== 'quarantine' && confidenceResult.status === 'quarantine') {
      await db.moveToQuarantine(updatedEntry);
    } else {
      await db.updateEntry(entryId, updatedEntry);
    }

    // Log audit entry
    await db.addAuditLog({
      entryId,
      action: 'revalidated',
      status: confidenceResult.status,
      confidence: confidenceResult.score,
      changes: updates,
      deviceId: this.deviceId
    });

    return updatedEntry;
  }

  // Get predictions for a field
  getPredictions(fieldName, value, context = {}) {
    return this.predictiveValidator.predict(fieldName, value, context);
  }

  // Start monitoring a field
  startFieldMonitoring(fieldName) {
    this.behaviorMonitor.startFieldMonitoring(fieldName);
  }

  // Record field interaction
  recordKeystroke(fieldName, key) {
    this.behaviorMonitor.recordKeystroke(fieldName, key);
  }

  recordPaste(fieldName, length) {
    this.behaviorMonitor.recordPaste(fieldName, length);
  }

  recordCopy(fieldName, length) {
    this.behaviorMonitor.recordCopy(fieldName, length);
  }

  stopFieldMonitoring(fieldName, value) {
    this.behaviorMonitor.stopFieldMonitoring(fieldName, value);
  }

  // Undo last N changes for an entry
  async undoChanges(entryId, stepsBack = 1) {
    let entry = await db.getEntry(entryId);
    if (!entry) {
      entry = await db.getQuarantinedEntry(entryId);
    }
    if (!entry) {
      throw new Error('Entry not found');
    }

    if (!entry.changeHistory || entry.changeHistory.length < stepsBack) {
      throw new Error('Not enough history to undo');
    }

    // Get the state before the changes
    const targetHistoryIndex = entry.changeHistory.length - stepsBack;
    const restorePoint = entry.changeHistory[targetHistoryIndex];

    // Restore data from change history
    // This is a simplified version - in production you'd want to store full snapshots
    const restoredData = { ...entry.data };
    
    // Remove the undone changes from history
    entry.changeHistory = entry.changeHistory.slice(0, targetHistoryIndex);
    
    // Re-validate with restored data
    return this.revalidateEntry(entryId, restoredData);
  }

  // Update validation rules
  async updateValidationRules(rules) {
    this.anomalyDetector.updateRules(rules);
    
    // Save to database
    await db.saveValidationRule({
      id: 'custom_rules',
      category: 'user_defined',
      rules,
      updatedAt: Date.now()
    });

    // Re-validate all staging entries with new rules
    const entries = await db.getAllEntries();
    const revalidated = [];

    for (const entry of entries) {
      if (entry.status === 'staging') {
        const updated = await this.revalidateEntry(entry.id);
        revalidated.push(updated);
      }
    }

    return {
      rulesUpdated: true,
      entriesRevalidated: revalidated.length
    };
  }

  // Get validation statistics
  async getValidationStats() {
    const [entries, quarantined, validated, auditLogs] = await Promise.all([
      db.getAllEntries(),
      db.getAllQuarantined(),
      db.getAllValidated(),
      db.getAllAuditLogs()
    ]);

    // Calculate metrics
    const totalEntries = entries.length + quarantined.length + validated.length;
    const quarantineRate = totalEntries > 0 ? quarantined.length / totalEntries : 0;
    
    // Count corrections
    const correctionLogs = auditLogs.filter(log => log.action === 'revalidated');
    const correctionRate = quarantined.length > 0 
      ? correctionLogs.length / quarantined.length 
      : 0;

    // Average confidence by status
    const avgConfidence = {
      staging: this.calculateAvgConfidence(entries),
      quarantine: this.calculateAvgConfidence(quarantined),
      validated: this.calculateAvgConfidence(validated)
    };

    // Time to resolution
    const avgResolutionTime = this.calculateAvgResolutionTime(correctionLogs);

    return {
      totalEntries,
      staging: entries.length,
      quarantined: quarantined.length,
      validated: validated.length,
      quarantineRate,
      correctionRate,
      avgConfidence,
      avgResolutionTime,
      auditLogCount: auditLogs.length
    };
  }

  calculateAvgConfidence(entries) {
    if (entries.length === 0) return 0;
    const total = entries.reduce((sum, e) => sum + (e.confidence?.score || 0), 0);
    return total / entries.length;
  }

  calculateAvgResolutionTime(correctionLogs) {
    if (correctionLogs.length === 0) return 0;
    
    // Group by entry and calculate time between creation and correction
    const resolutionTimes = [];
    // Simplified - in production you'd track creation time
    
    return 0; // Placeholder
  }

  // Get behavior monitor instance
  getBehaviorMonitor() {
    return this.behaviorMonitor;
  }

  // Get current validation rules
  getValidationRules() {
    return this.anomalyDetector.getRules();
  }
}

export default ValidationOrchestrator;
