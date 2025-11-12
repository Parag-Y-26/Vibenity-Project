import React, { useState, useEffect } from 'react';
import { Moon, Sun, FileText, Shield, Activity, History, Settings } from 'lucide-react';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import FormEntry from './components/FormEntry';
import QuarantineInbox from './components/QuarantineInbox';
import DiagnosticsDashboard from './components/DiagnosticsDashboard';
import AuditTrail from './components/AuditTrail';
import ValidationOrchestrator from './engine/validationOrchestrator';
import { initDB } from './db/storage';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('form');
  const [orchestrator, setOrchestrator] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await initDB();
      const orch = new ValidationOrchestrator();
      setOrchestrator(orch);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      showNotification('Failed to initialize database', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFormSubmit = (result) => {
    const status = result.status;
    if (status === 'quarantine') {
      showNotification('Entry quarantined for review', 'warning');
    } else if (status === 'validated') {
      showNotification('Entry validated and ready for sync', 'success');
    } else {
      showNotification('Entry saved to staging', 'info');
    }
  };

  const handleEntryCorrect = (entry) => {
    if (entry.status === 'validated') {
      showNotification('Entry corrected and validated', 'success');
    } else {
      showNotification('Entry updated', 'info');
    }
  };

  const tabs = [
    { id: 'form', label: 'Form Entry', icon: FileText },
    { id: 'quarantine', label: 'Quarantine', icon: Shield },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing offline database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Vibeity Validator</h1>
                <p className="text-xs text-muted-foreground">Offline-First Form System</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex gap-2 pb-3 overflow-x-auto scrollbar-thin">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-slide-down">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg border ${
              notification.type === 'success'
                ? 'bg-success text-success-foreground border-success'
                : notification.type === 'warning'
                ? 'bg-warning text-warning-foreground border-warning'
                : notification.type === 'error'
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-card text-foreground border-border'
            }`}
          >
            {notification.message}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto py-8">
        {activeTab === 'form' && (
          <FormEntry orchestrator={orchestrator} onSubmit={handleFormSubmit} />
        )}
        {activeTab === 'quarantine' && (
          <QuarantineInbox orchestrator={orchestrator} onCorrect={handleEntryCorrect} />
        )}
        {activeTab === 'diagnostics' && (
          <DiagnosticsDashboard orchestrator={orchestrator} />
        )}
        {activeTab === 'audit' && (
          <AuditTrail orchestrator={orchestrator} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Offline-First Form Validator</strong> • Built with React & IndexedDB
              </p>
              <p className="text-xs mt-1">
                Local validation • Anomaly detection • Predictive suggestions • Conflict reduction
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
