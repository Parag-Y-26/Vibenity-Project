// Input behavior monitoring system
// Tracks typing cadence, paste events, field interaction times

export class BehaviorMonitor {
  constructor() {
    this.fieldMetrics = new Map();
    this.sessionStart = Date.now();
  }

  // Initialize monitoring for a field
  startFieldMonitoring(fieldName) {
    if (!this.fieldMetrics.has(fieldName)) {
      this.fieldMetrics.set(fieldName, {
        startTime: Date.now(),
        keystrokes: [],
        pasteEvents: [],
        copyEvents: [],
        focusTime: 0,
        blurTime: 0,
        characterCount: 0,
        rapidEntryDetected: false
      });
    }
    
    const metrics = this.fieldMetrics.get(fieldName);
    metrics.focusTime = Date.now();
  }

  // Record keystroke event
  recordKeystroke(fieldName, key, timestamp = Date.now()) {
    const metrics = this.fieldMetrics.get(fieldName);
    if (!metrics) return;

    metrics.keystrokes.push({
      key,
      timestamp,
      timeSinceLastKey: metrics.keystrokes.length > 0 
        ? timestamp - metrics.keystrokes[metrics.keystrokes.length - 1].timestamp 
        : 0
    });

    // Detect rapid entry (< 50ms between keystrokes)
    if (metrics.keystrokes.length > 5) {
      const recentKeystrokes = metrics.keystrokes.slice(-5);
      const avgInterval = recentKeystrokes.reduce((sum, ks, i) => 
        i > 0 ? sum + ks.timeSinceLastKey : sum, 0
      ) / (recentKeystrokes.length - 1);

      if (avgInterval < 50) {
        metrics.rapidEntryDetected = true;
      }
    }
  }

  // Record paste event
  recordPaste(fieldName, pastedLength, timestamp = Date.now()) {
    const metrics = this.fieldMetrics.get(fieldName);
    if (!metrics) return;

    metrics.pasteEvents.push({
      timestamp,
      length: pastedLength,
      timeSinceFieldStart: timestamp - metrics.startTime
    });
  }

  // Record copy event
  recordCopy(fieldName, copiedLength, timestamp = Date.now()) {
    const metrics = this.fieldMetrics.get(fieldName);
    if (!metrics) return;

    metrics.copyEvents.push({
      timestamp,
      length: copiedLength
    });
  }

  // Stop field monitoring
  stopFieldMonitoring(fieldName, finalValue) {
    const metrics = this.fieldMetrics.get(fieldName);
    if (!metrics) return;

    metrics.blurTime = Date.now();
    metrics.characterCount = finalValue ? finalValue.length : 0;
    metrics.totalTimeSpent = metrics.blurTime - metrics.focusTime;
  }

  // Calculate typing cadence (chars per second)
  getTypingCadence(fieldName) {
    const metrics = this.fieldMetrics.get(fieldName);
    if (!metrics || !metrics.totalTimeSpent) return 0;

    const timeInSeconds = metrics.totalTimeSpent / 1000;
    return metrics.characterCount / timeInSeconds;
  }

  // Get average time between keystrokes
  getAverageKeystrokeInterval(fieldName) {
    const metrics = this.fieldMetrics.get(fieldName);
    if (!metrics || metrics.keystrokes.length < 2) return 0;

    const intervals = metrics.keystrokes
      .slice(1)
      .map(ks => ks.timeSinceLastKey);
    
    return intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  }

  // Check if field had paste events
  hadPasteEvent(fieldName) {
    const metrics = this.fieldMetrics.get(fieldName);
    return metrics ? metrics.pasteEvents.length > 0 : false;
  }

  // Get time spent on field
  getTimeSpent(fieldName) {
    const metrics = this.fieldMetrics.get(fieldName);
    return metrics ? metrics.totalTimeSpent || 0 : 0;
  }

  // Analyze behavior patterns for anomaly detection
  analyzeBehavior(fieldName) {
    const metrics = this.fieldMetrics.get(fieldName);
    if (!metrics) return { risk: 'low', flags: [] };

    const flags = [];
    let riskScore = 0;

    // Check for rapid entry
    const avgInterval = this.getAverageKeystrokeInterval(fieldName);
    if (avgInterval > 0 && avgInterval < 50) {
      flags.push('rapid-entry');
      riskScore += 3;
    }

    // Check for very fast typing (> 10 chars/sec is suspicious for data entry)
    const cadence = this.getTypingCadence(fieldName);
    if (cadence > 10) {
      flags.push('high-cadence');
      riskScore += 2;
    }

    // Check for paste events (not necessarily bad, but notable)
    if (metrics.pasteEvents.length > 0) {
      flags.push('paste-detected');
      riskScore += 1;
    }

    // Check for very short time spent (< 500ms)
    if (metrics.totalTimeSpent && metrics.totalTimeSpent < 500) {
      flags.push('minimal-interaction');
      riskScore += 2;
    }

    // Check for copy-paste pattern (both copy and paste in same field)
    if (metrics.copyEvents.length > 0 && metrics.pasteEvents.length > 0) {
      flags.push('copy-paste-pattern');
      riskScore += 1;
    }

    // Determine risk level
    let risk = 'low';
    if (riskScore >= 5) risk = 'high';
    else if (riskScore >= 3) risk = 'medium';

    return {
      risk,
      riskScore,
      flags,
      metrics: {
        avgKeystrokeInterval: avgInterval,
        typingCadence: cadence,
        timeSpent: metrics.totalTimeSpent,
        pasteCount: metrics.pasteEvents.length,
        keystrokeCount: metrics.keystrokes.length
      }
    };
  }

  // Get complete behavior report for all fields
  getBehaviorReport() {
    const report = {};
    
    for (const [fieldName, metrics] of this.fieldMetrics) {
      report[fieldName] = {
        ...this.analyzeBehavior(fieldName),
        rawMetrics: metrics
      };
    }

    return report;
  }

  // Reset monitoring for a specific field
  resetField(fieldName) {
    this.fieldMetrics.delete(fieldName);
  }

  // Reset all monitoring
  reset() {
    this.fieldMetrics.clear();
    this.sessionStart = Date.now();
  }

  // Get session duration
  getSessionDuration() {
    return Date.now() - this.sessionStart;
  }
}

export default BehaviorMonitor;
