// Predictive validation and suggestion engine
// Lightweight heuristic-based predictions for autocomplete and corrections

export class PredictiveValidator {
  constructor() {
    this.commonPatterns = this.initializePatterns();
    this.userHistory = [];
  }

  initializePatterns() {
    return {
      phone: {
        formats: [
          { pattern: /^(\d{3})(\d{3})(\d{4})$/, format: '($1) $2-$3', country: 'US' },
          { pattern: /^(\d{3})(\d{4})$/, format: '$1-$2', country: 'Generic' },
          { pattern: /^(\d{5})(\d{5})$/, format: '$1-$2', country: 'IN' }
        ],
        completions: [
          '+1', '+91', '+44', '+61'
        ]
      },
      email: {
        commonDomains: [
          'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
          'icloud.com', 'protonmail.com', 'aol.com', 'mail.com'
        ],
        typoCorrections: {
          'gmial': 'gmail',
          'gmai': 'gmail',
          'yahooo': 'yahoo',
          'outlok': 'outlook',
          'hotmial': 'hotmail'
        }
      },
      name: {
        commonTitles: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'],
        capitalizationRules: true
      },
      address: {
        commonAbbreviations: {
          'street': 'St',
          'avenue': 'Ave',
          'boulevard': 'Blvd',
          'road': 'Rd',
          'lane': 'Ln',
          'drive': 'Dr',
          'court': 'Ct',
          'apartment': 'Apt',
          'suite': 'Ste'
        }
      },
      date: {
        formats: [
          'YYYY-MM-DD',
          'MM/DD/YYYY',
          'DD/MM/YYYY'
        ]
      }
    };
  }

  // Main prediction method
  predict(fieldName, value, context = {}) {
    if (!value) return { suggestions: [], confidence: 0 };

    const fieldType = this.inferFieldType(fieldName);
    const suggestions = [];

    switch (fieldType) {
      case 'phone':
        suggestions.push(...this.predictPhone(value));
        break;
      case 'email':
        suggestions.push(...this.predictEmail(value));
        break;
      case 'name':
        suggestions.push(...this.predictName(value));
        break;
      case 'address':
        suggestions.push(...this.predictAddress(value));
        break;
      case 'date':
        suggestions.push(...this.predictDate(value));
        break;
      case 'zipCode':
        suggestions.push(...this.predictZipCode(value));
        break;
      default:
        suggestions.push(...this.predictGeneric(value, fieldType));
    }

    // Add context-based suggestions
    if (context.relatedFields) {
      suggestions.push(...this.predictFromContext(fieldName, value, context));
    }

    // Calculate confidence scores for each suggestion
    const scoredSuggestions = suggestions.map(s => ({
      ...s,
      confidence: this.calculateSuggestionConfidence(s, value)
    })).sort((a, b) => b.confidence - a.confidence);

    return {
      suggestions: scoredSuggestions.slice(0, 5), // Top 5 suggestions
      confidence: scoredSuggestions.length > 0 ? scoredSuggestions[0].confidence : 0
    };
  }

  // Phone number predictions
  predictPhone(value) {
    const suggestions = [];
    const digitsOnly = value.replace(/\D/g, '');

    // Format suggestions based on length
    if (digitsOnly.length === 10) {
      // US format
      suggestions.push({
        value: `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`,
        reason: 'Standard US format',
        type: 'format'
      });
      suggestions.push({
        value: `+1 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`,
        reason: 'International US format',
        type: 'format'
      });
    } else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
      // US with country code
      suggestions.push({
        value: `+${digitsOnly[0]} (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`,
        reason: 'US international format',
        type: 'format'
      });
    }

    // Suggest completion if partial
    if (digitsOnly.length < 10 && digitsOnly.length > 6) {
      suggestions.push({
        value: value,
        reason: `Continue entering (${10 - digitsOnly.length} more digits needed)`,
        type: 'completion'
      });
    }

    return suggestions;
  }

  // Email predictions
  predictEmail(value) {
    const suggestions = [];
    const atIndex = value.indexOf('@');

    if (atIndex === -1) {
      // No @ yet, suggest adding it
      if (value.length > 2) {
        this.commonPatterns.email.commonDomains.forEach(domain => {
          suggestions.push({
            value: `${value}@${domain}`,
            reason: `Complete with @${domain}`,
            type: 'completion'
          });
        });
      }
    } else {
      const [localPart, domainPart = ''] = value.split('@');
      
      // Suggest domain completions
      if (domainPart.length > 0 && domainPart.length < 15) {
        const matchingDomains = this.commonPatterns.email.commonDomains
          .filter(d => d.startsWith(domainPart.toLowerCase()));
        
        matchingDomains.forEach(domain => {
          suggestions.push({
            value: `${localPart}@${domain}`,
            reason: `Complete domain to ${domain}`,
            type: 'completion'
          });
        });
      }

      // Check for typos in domain
      const domainBase = domainPart.split('.')[0];
      if (this.commonPatterns.email.typoCorrections[domainBase]) {
        const corrected = this.commonPatterns.email.typoCorrections[domainBase];
        suggestions.push({
          value: `${localPart}@${corrected}.com`,
          reason: `Did you mean ${corrected}?`,
          type: 'correction'
        });
      }

      // Suggest adding .com if missing
      if (domainPart.length > 2 && !domainPart.includes('.')) {
        suggestions.push({
          value: `${localPart}@${domainPart}.com`,
          reason: 'Add .com',
          type: 'completion'
        });
      }
    }

    return suggestions;
  }

  // Name predictions
  predictName(value) {
    const suggestions = [];

    // Capitalize first letter of each word
    const capitalized = value.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    if (capitalized !== value) {
      suggestions.push({
        value: capitalized,
        reason: 'Proper capitalization',
        type: 'format'
      });
    }

    // Remove extra spaces
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (trimmed !== value) {
      suggestions.push({
        value: trimmed,
        reason: 'Remove extra spaces',
        type: 'format'
      });
    }

    return suggestions;
  }

  // Address predictions
  predictAddress(value) {
    const suggestions = [];

    // Suggest common abbreviations
    for (const [full, abbr] of Object.entries(this.commonPatterns.address.commonAbbreviations)) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      if (regex.test(value)) {
        const abbreviated = value.replace(regex, abbr);
        suggestions.push({
          value: abbreviated,
          reason: `Abbreviate "${full}" to "${abbr}"`,
          type: 'format'
        });
      }
    }

    return suggestions;
  }

  // Date predictions
  predictDate(value) {
    const suggestions = [];

    // Try to parse various formats
    const formats = [
      { regex: /^(\d{4})(\d{2})(\d{2})$/, format: '$1-$2-$3' },
      { regex: /^(\d{2})(\d{2})(\d{4})$/, format: '$3-$1-$2' },
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: '$3-$1-$2' }
    ];

    formats.forEach(({ regex, format }) => {
      if (regex.test(value)) {
        const formatted = value.replace(regex, format);
        try {
          const date = new Date(formatted);
          if (!isNaN(date.getTime())) {
            suggestions.push({
              value: formatted,
              reason: 'Standard date format (YYYY-MM-DD)',
              type: 'format'
            });
          }
        } catch (e) {
          // Invalid date, skip
        }
      }
    });

    return suggestions;
  }

  // Zip code predictions
  predictZipCode(value) {
    const suggestions = [];
    const digitsOnly = value.replace(/\D/g, '');

    // US ZIP format
    if (digitsOnly.length === 5) {
      suggestions.push({
        value: digitsOnly,
        reason: 'Valid US ZIP code',
        type: 'validation'
      });
    } else if (digitsOnly.length === 9) {
      suggestions.push({
        value: `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`,
        reason: 'ZIP+4 format',
        type: 'format'
      });
    }

    return suggestions;
  }

  // Generic predictions
  predictGeneric(value, fieldType) {
    const suggestions = [];

    // Trim whitespace
    const trimmed = value.trim();
    if (trimmed !== value) {
      suggestions.push({
        value: trimmed,
        reason: 'Remove leading/trailing spaces',
        type: 'format'
      });
    }

    return suggestions;
  }

  // Context-based predictions
  predictFromContext(fieldName, value, context) {
    const suggestions = [];

    // Learn from user history
    const historicalValues = this.userHistory
      .filter(h => h.fieldName === fieldName)
      .map(h => h.value);

    if (historicalValues.length > 0) {
      const matches = historicalValues.filter(h => 
        h.toLowerCase().startsWith(value.toLowerCase())
      );

      matches.forEach(match => {
        suggestions.push({
          value: match,
          reason: 'Previously used value',
          type: 'history'
        });
      });
    }

    return suggestions;
  }

  // Calculate confidence score for a suggestion
  calculateSuggestionConfidence(suggestion, originalValue) {
    let confidence = 0.5; // Base confidence

    // Type-based confidence adjustment
    switch (suggestion.type) {
      case 'format':
        confidence += 0.3;
        break;
      case 'correction':
        confidence += 0.35;
        break;
      case 'completion':
        confidence += 0.25;
        break;
      case 'history':
        confidence += 0.2;
        break;
      case 'validation':
        confidence += 0.4;
        break;
    }

    // Similarity bonus
    const similarity = this.calculateSimilarity(originalValue, suggestion.value);
    confidence += similarity * 0.2;

    return Math.min(confidence, 1.0);
  }

  // Calculate string similarity (0-1)
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance calculation
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Learn from user input
  learnFromInput(fieldName, value, accepted = true) {
    if (accepted) {
      this.userHistory.push({
        fieldName,
        value,
        timestamp: Date.now()
      });

      // Keep history limited to last 100 entries
      if (this.userHistory.length > 100) {
        this.userHistory.shift();
      }
    }
  }

  // Infer field type
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
    if (name.includes('address') || name.includes('street')) 
      return 'address';
    if (name.includes('zip') || name.includes('postal')) 
      return 'zipCode';
    
    return 'text';
  }
}

export default PredictiveValidator;
