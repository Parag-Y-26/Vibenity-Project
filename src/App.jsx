import React, { useState, useEffect } from 'react';
import { Moon, Sun, FileText, Shield, Activity, History, User as UserIcon, Database } from 'lucide-react';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import ErrorBoundary from './components/ErrorBoundary';
import LoginForm from './components/Auth/LoginForm';
import SignupForm from './components/Auth/SignupForm';
import FormEntry from './components/FormEntry';
import QuarantineInbox from './components/QuarantineInbox';
import DiagnosticsDashboard from './components/DiagnosticsDashboard';
import AuditTrail from './components/AuditTrail';
import EntriesManager from './components/EntriesManager';
import UserProfile from './components/UserProfile';
import ValidationOrchestrator from './engine/validationOrchestrator';
import AuthService from './services/authService';
import ApiService from './services/apiService';
import { initDB } from './db/storage';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('form');
  const [orchestrator, setOrchestrator] = useState(null);
  const [apiService, setApiService] = useState(null);
  const [authService, setAuthService] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await initDB();
      const orch = new ValidationOrchestrator();
      const api = new ApiService();
      const auth = new AuthService();
      
      setOrchestrator(orch);
      setApiService(api);
      setAuthService(auth);

      // Check if user is already logged in
      const currentUser = auth.getCurrentUser();
      if (currentUser && auth.isAuthenticated()) {
        setUser(currentUser);
      }

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

  const handleLogin = (userData) => {
    setUser(userData);
    showNotification(`Welcome back, ${userData.name}!`, 'success');
  };

  const handleSignup = (userData) => {
    setUser(userData);
    showNotification(`Account created successfully! Welcome, ${userData.name}!`, 'success');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setActiveTab('form');
    showNotification('Logged out successfully', 'info');
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
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
    { id: 'form', label: 'Form Entry', icon: FileText, requiresAuth: false, requiresAdmin: false },
    { id: 'crud', label: 'Manage Entries', icon: Database, requiresAuth: true, requiresAdmin: true },
    { id: 'quarantine', label: 'Quarantine', icon: Shield, requiresAuth: true, requiresAdmin: true },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity, requiresAuth: true, requiresAdmin: true },
    { id: 'audit', label: 'Audit Trail', icon: History, requiresAuth: true, requiresAdmin: true },
  ];

  // Filter tabs based on role: regular users only see form entry, admin sees all
  const isAdmin = user && user.role === 'admin';
  const visibleTabs = tabs.filter(tab => {
    if (tab.requiresAdmin && !isAdmin) return false;
    if (tab.requiresAuth && !user) return false;
    return true;
  });

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

  // Auth Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Vibeity Validator</h1>
                  <p className="text-xs text-muted-foreground">Offline-First Form System</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          {authView === 'login' ? (
            <LoginForm
              onLogin={handleLogin}
              onSwitchToSignup={() => setAuthView('signup')}
              authService={authService}
            />
          ) : (
            <SignupForm
              onSignup={handleSignup}
              onSwitchToLogin={() => setAuthView('login')}
              authService={authService}
            />
          )}
        </main>
      </div>
    );
  }

  // Main App (Authenticated)
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
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Admin Panel - Full Access' : 'Offline-First Form System'}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {visibleTabs.map((tab) => (
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

            {/* User Menu & Theme */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors ${
                  activeTab === 'profile' ? 'bg-muted' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
              </button>

              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex gap-2 pb-3 overflow-x-auto scrollbar-thin">
            {visibleTabs.map((tab) => (
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
        {activeTab === 'crud' && (
          <EntriesManager apiService={apiService} />
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
        {activeTab === 'profile' && (
          <UserProfile
            user={user}
            authService={authService}
            onUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Offline-First Form Validator</strong> • Production-Ready with Auth & CRUD
              </p>
              <p className="text-xs mt-1">
                Authentication • Full CRUD • File Upload • Error Handling • Responsive Design
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  isAdmin ? 'bg-blue-500' : 'bg-success'
                }`} />
                <span>Logged in as {user.name} {isAdmin && '(Admin)'}</span>
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
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
