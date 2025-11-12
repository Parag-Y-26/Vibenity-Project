// Confidence scoring engine
// Combines behavior analysis, anomaly detection, and predictive validation

export class ConfidenceScorer {
  constructor(config = {}) {
    this.config = {
      weights: {
        behaviorRisk: 0.3,
        anomalySeverity: 0.35,
        formatValidity: 0.2,
        completeness: 0.15
      },
      thresholds: {
        autoQuarantine: 0.7,  // STRICT: 70% - entries below 70% go to quarantine
        requiresReview: 0.8,  // STRICT: 80% - requires review
        autoValidate: 0.95    // STRICT: 95% - only near-perfect entries auto-validate
      },
      ...config
    };
  }

  // Main confidence scoring method
  calculateConfidence(entry) {
    const scores = {
      behavior: this.scoreBehavior(entry.behaviorAnalysis),
      anomaly: this.scoreAnomalies(entry.anomalyDetection),
      format: this.scoreFormat(entry.data),
      completeness: this.scoreCompleteness(entry.data),
      overall: 0
    };

    // Calculate weighted overall score
    scores.overall = 
      (scores.behavior * this.config.weights.behaviorRisk) +
      (scores.anomaly * this.config.weights.anomalySeverity) +
      (scores.format * this.config.weights.formatValidity) +
      (scores.completeness * this.config.weights.completeness);

    // Determine status based on thresholds
    const status = this.determineStatus(scores.overall);

    return {
      score: scores.overall,
      breakdown: scores,
      status,
      recommendation: this.getRecommendation(scores.overall, scores)
    };
  }

  // Score behavior analysis
  scoreBehavior(behaviorAnalysis) {
    if (!behaviorAnalysis || !behaviorAnalysis.report) return 0.7; // Neutral if no data

    let score = 1.0;
    const report = behaviorAnalysis.report;

    // Analyze each field's behavior
    for (const [fieldName, analysis] of Object.entries(report)) {
      const { risk, riskScore } = analysis;

      // Deduct points based on risk
      if (risk === 'high') score -= 0.25;
      else if (risk === 'medium') score -= 0.15;
      else if (risk === 'low') score -= 0.05;

      // Additional deductions for specific flags
      if (analysis.flags.includes('rapid-entry')) score -= 0.1;
      if (analysis.flags.includes('paste-detected')) score -= 0.05;
      if (analysis.flags.includes('minimal-interaction')) score -= 0.08;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Score anomaly detection results
  scoreAnomalies(anomalyDetection) {
    if (!anomalyDetection || !anomalyDetection.results) return 0.8; // Neutral if no data

    let score = 1.0;
    const results = anomalyDetection.results;

    // Analyze each field's anomalies
    for (const [fieldName, detection] of Object.entries(results)) {
      const { severity, score: anomalyScore, anomalies } = detection;

      // Deduct points based on severity
      if (severity === 'high') score -= 0.3;
      else if (severity === 'medium') score -= 0.2;
      else if (severity === 'low') score -= 0.1;

      // Additional deductions for specific anomaly types
      anomalies.forEach(anomaly => {
        if (anomaly.type === 'format') score -= 0.15;
        if (anomaly.type === 'pattern') score -= 0.1;
      });
    }

    return Math.max(0, Math.min(1, score));
  }

  // Score format validity
  scoreFormat(data) {
    if (!data) return 0;

    let validFields = 0;
    let totalFields = 0;

    for (const [fieldName, value] of Object.entries(data)) {
      if (!value) continue;
      
      totalFields++;
      
      // Basic format validation
      const fieldType = this.inferFieldType(fieldName);
      if (this.isValidFormat(fieldType, value)) {
        validFields++;
      }
    }

    return totalFields > 0 ? validFields / totalFields : 0.5;
  }

  // Score completeness
  scoreCompleteness(data) {
    if (!data) return 0;

    const requiredFields = this.getRequiredFields(data);
    let filledRequired = 0;

    requiredFields.forEach(field => {
      if (data[field] && data[field].toString().trim().length > 0) {
        filledRequired++;
      }
    });

    const completenessRatio = requiredFields.length > 0 
      ? filledRequired / requiredFields.length 
      : 1.0;

    // Bonus for optional fields
    const totalFields = Object.keys(data).length;
    const filledFields = Object.values(data).filter(v => 
      v && v.toString().trim().length > 0
    ).length;

    const optionalBonus = totalFields > requiredFields.length 
      ? (filledFields - filledRequired) / (totalFields - requiredFields.length) * 0.2
      : 0;

    return Math.min(1.0, completenessRatio + optionalBonus);
  }

  // Determine status based on score
  determineStatus(score) {
    if (score >= this.config.thresholds.autoValidate) {
      return 'validated';
    } else if (score >= this.config.thresholds.requiresReview) {
      return 'review';
    } else if (score >= this.config.thresholds.autoQuarantine) {
      return 'staging';
    } else {
      return 'quarantine';
    }
  }

  // Get recommendation based on scores
  getRecommendation(overallScore, breakdown) {
    const issues = [];
    const suggestions = [];

    // Analyze breakdown to provide specific recommendations
    if (breakdown.behavior < 0.6) {
      issues.push('Suspicious input behavior detected');
      suggestions.push('Review input timing and method');
    }

    if (breakdown.anomaly < 0.6) {
      issues.push('Data anomalies found');
      suggestions.push('Verify data format and values');
    }

    if (breakdown.format < 0.7) {
      issues.push('Format issues detected');
      suggestions.push('Correct field formats');
    }

    if (breakdown.completeness < 0.8) {
      issues.push('Incomplete data');
      suggestions.push('Fill in all required fields');
    }

    // Overall recommendation
    let recommendation;
    if (overallScore >= this.config.thresholds.autoValidate) {
      recommendation = 'Entry is valid and ready for sync';
    } else if (overallScore >= this.config.thresholds.requiresReview) {
      recommendation = 'Entry requires review before sync';
    } else if (overallScore >= this.config.thresholds.autoQuarantine) {
      recommendation = 'Entry has minor issues - can be staged';
    } else {
      recommendation = 'Entry has significant issues - quarantined';
    }

    return {
      message: recommendation,
      issues,
      suggestions,
      priority: overallScore < 0.4 ? 'high' : overallScore < 0.6 ? 'medium' : 'low'
    };
  }

  // Helper: Infer field type
  inferFieldType(fieldName) {
    const name = fieldName.toLowerCase();
    
    if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) 
      return 'phone';
    if (name.includes('email') || name.includes('mail')) 
      return 'email';
    if (name.includes('name')) 
      return 'name';
    if (name.includes('date') || name.includes('birth') || name.includes('dob')) 
      return 'date';
    if (name.includes('address')) 
      return 'address';
    if (name.includes('zip') || name.includes('postal')) 
      return 'zipCode';
    
    return 'text';
  }

  // Helper: Basic format validation
  isValidFormat(fieldType, value) {
    const patterns = {
      phone: /^[\d\s\-\+\(\)]{10,}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      name: /^[a-zA-Z\s\-'.]{2,}$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      zipCode: /^\d{5,10}$/
    };

    return patterns[fieldType] ? patterns[fieldType].test(value) : true;
  }

  // Helper: Get required fields
  getRequiredFields(data) {
    // Basic heuristic: common required fields
    const allFields = Object.keys(data);
    const commonRequired = ['name', 'email', 'phone', 'firstName', 'lastName'];
    
    return allFields.filter(field => 
      commonRequired.some(req => field.toLowerCase().includes(req))
    );
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig() {
    return this.config;
  }

  // Calculate aggregate confidence for multiple entries
  calculateAggregateConfidence(entries) {
    if (!entries || entries.length === 0) return 0;

    const totalScore = entries.reduce((sum, entry) => {
      const confidence = this.calculateConfidence(entry);
      return sum + confidence.score;
    }, 0);

    return totalScore / entries.length;
  }

  // Predict sync success probability
  predictSyncSuccess(entry) {
    const confidence = this.calculateConfidence(entry);
    
    // Higher confidence = higher sync success probability
    let probability = confidence.score;

    // Adjust based on historical data (if available)
    if (entry.previousSyncAttempts) {
      const failureRate = entry.failedSyncCount / entry.previousSyncAttempts;
      probability *= (1 - failureRate * 0.5);
    }

    return {
      probability: Math.max(0, Math.min(1, probability)),
      confidence: confidence.score,
      recommendation: confidence.recommendation
    };
  }
}

export default ConfidenceScorer;
