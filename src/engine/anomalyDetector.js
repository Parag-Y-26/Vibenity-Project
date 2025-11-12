// Heuristic anomaly detection engine
// Detects format issues, improbable values, and patterns

export class AnomalyDetector {
  constructor(validationRules = null) {
    this.rules = validationRules || this.getDefaultRules();
  }

  getDefaultRules() {
    return {
      phone: {
        minLength: 10,
        maxLength: 15,
        pattern: /^[\d\s\-\+\(\)]+$/,
        countrySpecific: {
          US: /^(\+1)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/,
          IN: /^(\+91)?[\s\-]?[6-9]\d{9}$/
        }
      },
      email: {
        pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        maxLength: 254,
        suspiciousPatterns: [
          /(.)\1{4,}/, // Repeating characters
          /^[^@]+@[^@]+\.[a-z]{10,}$/i, // Suspicious TLD
          /test|fake|dummy|spam/i
        ]
      },
      name: {
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z\s\-'.]+$/,
        suspiciousPatterns: [
          /(.)\1{3,}/, // Repeating characters
          /^[a-z]+$/, // All lowercase
          /test|fake|dummy|asdf|qwerty/i,
          /^\d+$/ // All numbers
        ]
      },
      date: {
        futureYearsAllowed: 1,
        pastYearsAllowed: 120,
        suspiciousDates: ['1900-01-01', '2000-01-01', '1970-01-01']
      },
      address: {
        minLength: 10,
        maxLength: 200,
        suspiciousPatterns: [
          /(.)\1{5,}/, // Repeating characters
          /^[0-9\s]+$/, // Only numbers
          /test|fake|dummy|N\/A|none/i
        ]
      },
      zipCode: {
        US: /^\d{5}(-\d{4})?$/,
        IN: /^\d{6}$/,
        generic: /^\d{4,10}$/
      },
      ssn: {
        pattern: /^\d{3}-?\d{2}-?\d{4}$/,
        invalidPatterns: [
          /^000/, // Invalid area number
          /^\d{3}-?00-/, // Invalid group number
          /^\d{3}-?\d{2}-?0000$/, // Invalid serial number
          /^666/, // Reserved
          /^9/ // Not issued
        ]
      }
    };
  }

  // Main anomaly detection method
  detectAnomalies(fieldName, value, behaviorAnalysis = null) {
    if (!value) return { anomalies: [], severity: 'none', score: 0 };

    const anomalies = [];
    let severityScore = 0;

    // Type-specific validation
    const fieldType = this.inferFieldType(fieldName);
    const typeAnomalies = this.checkTypeSpecificAnomalies(fieldType, value);
    anomalies.push(...typeAnomalies);
    severityScore += typeAnomalies.length * 2;

    // Pattern-based detection
    const patternAnomalies = this.checkPatternAnomalies(fieldType, value);
    anomalies.push(...patternAnomalies);
    severityScore += patternAnomalies.length * 3;

    // Statistical anomalies
    const statsAnomalies = this.checkStatisticalAnomalies(value);
    anomalies.push(...statsAnomalies);
    severityScore += statsAnomalies.length * 2;

    // Behavior-based risk amplification
    if (behaviorAnalysis && behaviorAnalysis.risk !== 'low') {
      anomalies.push({
        type: 'behavior',
        message: `Suspicious input behavior detected: ${behaviorAnalysis.flags.join(', ')}`,
        severity: behaviorAnalysis.risk
      });
      severityScore += behaviorAnalysis.riskScore;
    }

    // Determine overall severity
    let severity = 'none';
    if (severityScore >= 8) severity = 'high';
    else if (severityScore >= 4) severity = 'medium';
    else if (severityScore > 0) severity = 'low';

    return {
      anomalies,
      severity,
      score: severityScore,
      fieldType
    };
  }

  // Infer field type from name
  inferFieldType(fieldName) {
    const name = fieldName.toLowerCase();
    
    if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) 
      return 'phone';
    if (name.includes('email') || name.includes('mail')) 
      return 'email';
    if (name.includes('name') && !name.includes('username')) 
      return 'name';
    if (name.includes('date') || name.includes('birth') || name.includes('dob')) 
      return 'date';
    if (name.includes('address') || name.includes('street') || name.includes('city')) 
      return 'address';
    if (name.includes('zip') || name.includes('postal')) 
      return 'zipCode';
    if (name.includes('ssn') || name.includes('social')) 
      return 'ssn';
    
    return 'text';
  }

  // Type-specific anomaly checks
  checkTypeSpecificAnomalies(fieldType, value) {
    const anomalies = [];
    const rule = this.rules[fieldType];
    
    if (!rule) return anomalies;

    // Length checks
    if (rule.minLength && value.length < rule.minLength) {
      anomalies.push({
        type: 'length',
        message: `Value too short (min: ${rule.minLength})`,
        severity: 'medium'
      });
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      anomalies.push({
        type: 'length',
        message: `Value too long (max: ${rule.maxLength})`,
        severity: 'medium'
      });
    }

    // Pattern checks
    if (rule.pattern && !rule.pattern.test(value)) {
      anomalies.push({
        type: 'format',
        message: `Invalid ${fieldType} format`,
        severity: 'high'
      });
    }

    // Date-specific checks
    if (fieldType === 'date') {
      const dateAnomalies = this.checkDateAnomalies(value);
      anomalies.push(...dateAnomalies);
    }

    return anomalies;
  }

  // Pattern-based anomaly detection
  checkPatternAnomalies(fieldType, value) {
    const anomalies = [];
    const rule = this.rules[fieldType];
    
    if (!rule || !rule.suspiciousPatterns) return anomalies;

    for (const pattern of rule.suspiciousPatterns) {
      if (pattern.test(value)) {
        anomalies.push({
          type: 'pattern',
          message: `Suspicious pattern detected in ${fieldType}`,
          severity: 'medium'
        });
      }
    }

    return anomalies;
  }

  // Statistical anomaly detection
  checkStatisticalAnomalies(value) {
    const anomalies = [];

    // Check for excessive character repetition
    const charCounts = {};
    for (const char of value) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    const maxRepeat = Math.max(...Object.values(charCounts));
    const repeatRatio = maxRepeat / value.length;

    if (repeatRatio > 0.4) {
      anomalies.push({
        type: 'repetition',
        message: 'Excessive character repetition detected',
        severity: 'medium'
      });
    }

    // Check for sequential characters (e.g., "123", "abc")
    const hasSequential = /(?:012|123|234|345|456|567|678|789|abc|bcd|cde|def)/i.test(value);
    if (hasSequential && value.length < 20) {
      anomalies.push({
        type: 'sequential',
        message: 'Sequential character pattern detected',
        severity: 'low'
      });
    }

    // Check for all caps (might indicate bot or copy-paste)
    if (value.length > 5 && value === value.toUpperCase() && /[A-Z]/.test(value)) {
      anomalies.push({
        type: 'formatting',
        message: 'All uppercase text',
        severity: 'low'
      });
    }

    return anomalies;
  }

  // Date-specific anomaly checks
  checkDateAnomalies(value) {
    const anomalies = [];
    
    try {
      const date = new Date(value);
      const now = new Date();
      
      if (isNaN(date.getTime())) {
        anomalies.push({
          type: 'date',
          message: 'Invalid date',
          severity: 'high'
        });
        return anomalies;
      }

      // Check future dates
      const yearsDiff = (date - now) / (1000 * 60 * 60 * 24 * 365);
      if (yearsDiff > this.rules.date.futureYearsAllowed) {
        anomalies.push({
          type: 'date',
          message: 'Date too far in future',
          severity: 'medium'
        });
      }

      // Check past dates
      if (yearsDiff < -this.rules.date.pastYearsAllowed) {
        anomalies.push({
          type: 'date',
          message: 'Date too far in past',
          severity: 'medium'
        });
      }

      // Check suspicious dates
      const dateStr = date.toISOString().split('T')[0];
      if (this.rules.date.suspiciousDates.includes(dateStr)) {
        anomalies.push({
          type: 'date',
          message: 'Suspicious default date',
          severity: 'medium'
        });
      }
    } catch (e) {
      anomalies.push({
        type: 'date',
        message: 'Date parsing error',
        severity: 'high'
      });
    }

    return anomalies;
  }

  // Update validation rules
  updateRules(newRules) {
    this.rules = { ...this.rules, ...newRules };
  }

  // Get current rules
  getRules() {
    return this.rules;
  }
}

export default AnomalyDetector;
