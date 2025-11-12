import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, CheckCircle, Clock, Sparkles, 
  Save, RotateCcw, Loader
} from 'lucide-react';

export default function FormEntry({ orchestrator, onSubmit }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    zipCode: ''
  });

  const [suggestions, setSuggestions] = useState({});
  const [fieldStatus, setFieldStatus] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldRefs = useRef({});

  // India-specific suggestions data
  const indianSuggestions = {
    cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'],
    emailDomains: ['gmail.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com', 'rediffmail.com'],
    phoneFormat: '+91'
  };

  useEffect(() => {
    // Initialize behavior monitoring for all fields
    Object.keys(formData).forEach(field => {
      orchestrator.startFieldMonitoring(field);
    });
  }, []);

  const handleFieldFocus = (fieldName) => {
    orchestrator.startFieldMonitoring(fieldName);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 12; // 10 digits or +91 with 10 digits
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    // Get predictions with India-specific context
    let predictions = orchestrator.getPredictions(fieldName, value);
    
    // Add India-specific suggestions
    if (fieldName === 'email' && value.includes('@') && !value.includes('.')) {
      const localPart = value.split('@')[0];
      const indianEmailSuggestions = indianSuggestions.emailDomains.map(domain => ({
        value: `${localPart}@${domain}`,
        reason: `Indian email provider`,
        type: 'completion',
        confidence: 0.8
      }));
      predictions = { suggestions: indianEmailSuggestions };
    }

    if (fieldName === 'phone' && value.length > 0) {
      const digits = value.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 10) {
        predictions = {
          suggestions: [{
            value: value,
            reason: `Indian mobile: needs 10 digits (currently ${digits.length})`,
            type: 'info',
            confidence: 0.7
          }]
        };
      } else if (digits.length === 10) {
        // Suggest formatted versions
        const formatted1 = `+91${digits}`;
        const formatted2 = `${digits.slice(0, 5)} ${digits.slice(5)}`;
        const formatted3 = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
        predictions = {
          suggestions: [
            { value: formatted1, reason: 'With country code +91', type: 'format', confidence: 0.9 },
            { value: formatted2, reason: 'Formatted (5+5)', type: 'format', confidence: 0.85 },
            { value: formatted3, reason: 'Formatted (XXX-XXX-XXXX)', type: 'format', confidence: 0.85 }
          ]
        };
      }
    }

    if (fieldName === 'city' && value.length >= 2) {
      const matchingCities = indianSuggestions.cities.filter(city => 
        city.toLowerCase().startsWith(value.toLowerCase())
      );
      if (matchingCities.length > 0) {
        predictions = {
          suggestions: matchingCities.slice(0, 3).map(city => ({
            value: city,
            reason: 'Indian city',
            type: 'completion',
            confidence: 0.85
          }))
        };
      }
    }

    if (predictions.suggestions && predictions.suggestions.length > 0) {
      setSuggestions(prev => ({ 
        ...prev, 
        [fieldName]: predictions.suggestions 
      }));
    } else {
      setSuggestions(prev => {
        const newSuggestions = { ...prev };
        delete newSuggestions[fieldName];
        return newSuggestions;
      });
    }
  };

  const handleKeyDown = (fieldName, e) => {
    orchestrator.recordKeystroke(fieldName, e.key);
  };

  const handlePaste = (fieldName, e) => {
    const pastedText = e.clipboardData.getData('text');
    orchestrator.recordPaste(fieldName, pastedText.length);
  };

  const handleFieldBlur = (fieldName, value) => {
    orchestrator.stopFieldMonitoring(fieldName, value);
    
    // Only analyze if field has value
    if (value && value.trim()) {
      const behaviorReport = orchestrator.getBehaviorMonitor().analyzeBehavior(fieldName);
      setFieldStatus(prev => ({
        ...prev,
        [fieldName]: behaviorReport
      }));
    }
  };

  const applySuggestion = (fieldName, suggestionValue) => {
    setFormData(prev => ({ ...prev, [fieldName]: suggestionValue }));
    setSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[fieldName];
      return newSuggestions;
    });

    // Learn from accepted suggestion
    orchestrator.predictiveValidator.learnFromInput(fieldName, suggestionValue, true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      alert('Please fill all required fields (First Name, Last Name, Email, Phone)');
      return;
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Validate phone format
    if (!isValidPhone(formData.phone)) {
      alert('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await orchestrator.processEntry(formData);
      onSubmit(result);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        address: '',
        city: '',
        zipCode: ''
      });
      setSuggestions({});
      setFieldStatus({});
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      address: '',
      city: '',
      zipCode: ''
    });
    setSuggestions({});
    setFieldStatus({});
    orchestrator.getBehaviorMonitor().reset();
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'text-red-600 dark:text-red-500';
      case 'medium': return 'text-orange-600 dark:text-orange-500';
      case 'low': return 'text-green-600 dark:text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskBgColor = (risk) => {
    switch (risk) {
      case 'high': return 'bg-red-50 dark:bg-red-950/30 border-red-500/50';
      case 'medium': return 'bg-orange-50 dark:bg-orange-950/30 border-orange-500/50';
      case 'low': return 'bg-green-50 dark:bg-green-950/30 border-green-500/50';
      default: return 'bg-muted/10 border-border';
    }
  };

  const getFieldBorderColor = (fieldName, value) => {
    if (!value || !value.trim()) return 'border-border';
    if (!isFieldValid(fieldName, value)) return 'border-red-500';
    if (fieldStatus[fieldName]?.risk === 'high') return 'border-red-500';
    if (fieldStatus[fieldName]?.risk === 'medium') return 'border-orange-500';
    if (fieldStatus[fieldName]?.risk === 'low' && isFieldValid(fieldName, value)) return 'border-green-500';
    return 'border-border';
  };

  const isFieldValid = (fieldName, value) => {
    if (!value || !value.trim()) return false;
    
    switch(fieldName) {
      case 'firstName':
      case 'lastName':
        return value.length >= 2;
      case 'email':
        return isValidEmail(value);
      case 'phone':
        return isValidPhone(value);
      case 'zipCode':
        return value.length === 6 && /^\d{6}$/.test(value);
      default:
        return value.length > 0;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Smart Form Entry</h2>
        <p className="text-muted-foreground">
          Intelligent validation with real-time feedback and India-specific suggestions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name *</label>
            <div className="relative">
              <input
                ref={el => fieldRefs.current['firstName'] = el}
                type="text"
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                onFocus={() => handleFieldFocus('firstName')}
                onBlur={(e) => handleFieldBlur('firstName', e.target.value)}
                onKeyDown={(e) => handleKeyDown('firstName', e)}
                onPaste={(e) => handlePaste('firstName', e)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  getFieldBorderColor('firstName', formData.firstName)
                } ${formData.firstName && fieldStatus.firstName ? getRiskBgColor(fieldStatus.firstName.risk) : ''} bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                placeholder="Rajesh"
                required
              />
              {formData.firstName && fieldStatus.firstName && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${getRiskColor(fieldStatus.firstName.risk)}`}>
                  {isFieldValid('firstName', formData.firstName) && fieldStatus.firstName.risk === 'low' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>
            {suggestions.firstName && suggestions.firstName.length > 0 && (
              <div className="space-y-1 animate-slide-down">
                {suggestions.firstName.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySuggestion('firstName', sug.value)}
                    className="w-full px-3 py-2 text-sm rounded-md bg-primary/10 hover:bg-primary/20 text-left flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>{sug.value}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{sug.reason}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name *</label>
            <div className="relative">
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                onFocus={() => handleFieldFocus('lastName')}
                onBlur={(e) => handleFieldBlur('lastName', e.target.value)}
                onKeyDown={(e) => handleKeyDown('lastName', e)}
                onPaste={(e) => handlePaste('lastName', e)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  getFieldBorderColor('lastName', formData.lastName)
                } ${formData.lastName && fieldStatus.lastName ? getRiskBgColor(fieldStatus.lastName.risk) : ''} bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                placeholder="Kumar"
                required
              />
              {formData.lastName && fieldStatus.lastName && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${getRiskColor(fieldStatus.lastName.risk)}`}>
                  {isFieldValid('lastName', formData.lastName) && fieldStatus.lastName.risk === 'low' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>
            {suggestions.lastName && suggestions.lastName.length > 0 && (
              <div className="space-y-1 animate-slide-down">
                {suggestions.lastName.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySuggestion('lastName', sug.value)}
                    className="w-full px-3 py-2 text-sm rounded-md bg-primary/10 hover:bg-primary/20 text-left flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>{sug.value}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{sug.reason}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email *</label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onFocus={() => handleFieldFocus('email')}
                onBlur={(e) => handleFieldBlur('email', e.target.value)}
                onKeyDown={(e) => handleKeyDown('email', e)}
                onPaste={(e) => handlePaste('email', e)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  getFieldBorderColor('email', formData.email)
                } ${formData.email && fieldStatus.email ? getRiskBgColor(fieldStatus.email.risk) : ''} bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                placeholder="rajesh@gmail.com"
                required
              />
              {formData.email && fieldStatus.email && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${getRiskColor(fieldStatus.email.risk)}`}>
                  {isFieldValid('email', formData.email) && fieldStatus.email.risk === 'low' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>
            {suggestions.email && suggestions.email.length > 0 && (
              <div className="space-y-1 animate-slide-down">
                {suggestions.email.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySuggestion('email', sug.value)}
                    className="w-full px-3 py-2 text-sm rounded-md bg-primary/10 hover:bg-primary/20 text-left flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>{sug.value}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{sug.reason}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone *</label>
            <div className="relative">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                onFocus={() => handleFieldFocus('phone')}
                onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                onKeyDown={(e) => handleKeyDown('phone', e)}
                onPaste={(e) => handlePaste('phone', e)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  getFieldBorderColor('phone', formData.phone)
                } ${formData.phone && fieldStatus.phone ? getRiskBgColor(fieldStatus.phone.risk) : ''} bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                placeholder="9876543210 or +919876543210"
                required
              />
              {formData.phone && fieldStatus.phone && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${getRiskColor(fieldStatus.phone.risk)}`}>
                  {isFieldValid('phone', formData.phone) && fieldStatus.phone.risk === 'low' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>
            {suggestions.phone && suggestions.phone.length > 0 && (
              <div className="space-y-1 animate-slide-down">
                {suggestions.phone.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySuggestion('phone', sug.value)}
                    className="w-full px-3 py-2 text-sm rounded-md bg-primary/10 hover:bg-primary/20 text-left flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>{sug.value}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{sug.reason}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
              onFocus={() => handleFieldFocus('dateOfBirth')}
              onBlur={(e) => handleFieldBlur('dateOfBirth', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                formData.dateOfBirth && fieldStatus.dateOfBirth ? getRiskBgColor(fieldStatus.dateOfBirth.risk) : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
            />
          </div>

          {/* Zip Code (PIN Code in India) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">PIN Code</label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => handleFieldChange('zipCode', e.target.value)}
              onFocus={() => handleFieldFocus('zipCode')}
              onBlur={(e) => handleFieldBlur('zipCode', e.target.value)}
              onKeyDown={(e) => handleKeyDown('zipCode', e)}
              onPaste={(e) => handlePaste('zipCode', e)}
              maxLength="6"
              className={`w-full px-4 py-2 rounded-lg border ${
                formData.zipCode && fieldStatus.zipCode ? getRiskBgColor(fieldStatus.zipCode.risk) : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
              placeholder="400001"
            />
            {suggestions.zipCode && suggestions.zipCode.length > 0 && (
              <div className="space-y-1 animate-slide-down">
                {suggestions.zipCode.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySuggestion('zipCode', sug.value)}
                    className="w-full px-3 py-2 text-sm rounded-md bg-primary/10 hover:bg-primary/20 text-left flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>{sug.value}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{sug.reason}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Address - Full Width */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Street Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            onFocus={() => handleFieldFocus('address')}
            onBlur={(e) => handleFieldBlur('address', e.target.value)}
            onKeyDown={(e) => handleKeyDown('address', e)}
            onPaste={(e) => handlePaste('address', e)}
            className={`w-full px-4 py-2 rounded-lg border ${
              formData.address && fieldStatus.address ? getRiskBgColor(fieldStatus.address.risk) : 'border-border'
            } bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
            placeholder="123, MG Road, Andheri West"
          />
          {suggestions.address && suggestions.address.length > 0 && (
            <div className="space-y-1 animate-slide-down">
              {suggestions.address.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applySuggestion('address', sug.value)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-primary/10 hover:bg-primary/20 text-left flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>{sug.value}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{sug.reason}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* City */}
        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            onFocus={() => handleFieldFocus('city')}
            onBlur={(e) => handleFieldBlur('city', e.target.value)}
            onKeyDown={(e) => handleKeyDown('city', e)}
            onPaste={(e) => handlePaste('city', e)}
            className={`w-full px-4 py-2 rounded-lg border ${
              formData.city && fieldStatus.city ? getRiskBgColor(fieldStatus.city.risk) : 'border-border'
            } bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
            placeholder="Mumbai"
          />
          {suggestions.city && suggestions.city.length > 0 && (
            <div className="space-y-1 animate-slide-down">
              {suggestions.city.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applySuggestion('city', sug.value)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-primary/10 hover:bg-primary/20 text-left flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>{sug.value}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{sug.reason}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Submit Entry
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
