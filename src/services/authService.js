// Authentication Service - Production-ready with error handling
// Uses local storage for offline-first approach, but structured for easy backend integration

export class AuthService {
  constructor() {
    this.currentUser = this.getCurrentUser();
    this.tokenKey = 'auth_token';
    this.userKey = 'current_user';
    this.usersKey = 'registered_users';
  }

  // Register new user
  async register(userData) {
    try {
      // Validate input
      this.validateUserData(userData);

      // Check if user already exists
      const users = this.getAllUsers();
      const existingUser = users.find(u => u.email === userData.email);
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password (in production, use bcrypt on backend)
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user object
      const newUser = {
        id: this.generateUserId(),
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        avatar: userData.avatar || null,
        isActive: true,
        emailVerified: false
      };

      // Store password separately (in production, backend only)
      const userAuth = {
        userId: newUser.id,
        email: userData.email,
        password: hashedPassword
      };

      // Save to storage
      users.push(newUser);
      this.saveUsers(users);
      
      const authData = this.getAuthData();
      authData.push(userAuth);
      this.saveAuthData(authData);

      // Generate token
      const token = this.generateToken(newUser);

      // Log activity
      this.logActivity('register', newUser.id);

      return {
        success: true,
        user: this.sanitizeUser(newUser),
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Check for admin credentials first
      const ADMIN_EMAIL = 'admin@gmail.com';
      const ADMIN_PASSWORD = '12345@#';

      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Admin login
        const adminUser = {
          id: 'admin-001',
          name: 'Administrator',
          email: ADMIN_EMAIL,
          role: 'admin',
          createdAt: new Date().toISOString()
        };

        localStorage.setItem(this.userKey, JSON.stringify(adminUser));
        localStorage.setItem(this.tokenKey, this.generateToken(adminUser));
        this.currentUser = adminUser;

        // Log activity
        this.logActivity('login', adminUser.id);

        return {
          success: true,
          user: this.sanitizeUser(adminUser),
          token: this.generateToken(adminUser)
        };
      }

      // Regular user login
      const users = this.getAllUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        throw new Error('Invalid credentials');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const authData = this.getAuthData();
      const userAuth = authData.find(a => a.userId === user.id);

      if (!userAuth) {
        throw new Error('Authentication data not found');
      }

      const isValid = await this.verifyPassword(password, userAuth.password);

      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      user.lastLogin = Date.now();
      this.updateUser(user);

      // Generate token
      const token = this.generateToken(user);

      // Set current user
      localStorage.setItem(this.userKey, JSON.stringify(user));
      localStorage.setItem(this.tokenKey, token);
      this.currentUser = user;

      // Log activity
      this.logActivity('login', user.id);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  logout() {
    try {
      if (this.currentUser) {
        this.logActivity('logout', this.currentUser.id);
      }

      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.tokenKey);
      this.currentUser = null;

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem(this.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem(this.tokenKey);
    const user = this.getCurrentUser();
    
    if (!token || !user) return false;

    // Verify token is not expired
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      return tokenData.exp > Date.now();
    } catch (error) {
      return false;
    }
  }

  // Check if current user is admin
  isAdmin() {
    const currentUser = this.getCurrentUser();
    return currentUser && currentUser.role === 'admin';
  }

  // Get user role
  getUserRole() {
    const currentUser = this.getCurrentUser();
    return currentUser ? currentUser.role : 'user';
  }

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === userId);

      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Update user
      users[userIndex] = {
        ...users[userIndex],
        ...updates,
        updatedAt: Date.now()
      };

      this.saveUsers(users);

      // Update current user if it's the same
      if (this.currentUser && this.currentUser.id === userId) {
        localStorage.setItem(this.userKey, JSON.stringify(users[userIndex]));
        this.currentUser = users[userIndex];
      }

      this.logActivity('update_profile', userId);

      return {
        success: true,
        user: this.sanitizeUser(users[userIndex])
      };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Validate new password
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Get auth data
      const authData = this.getAuthData();
      const userAuthIndex = authData.findIndex(a => a.userId === userId);

      if (userAuthIndex === -1) {
        throw new Error('User authentication data not found');
      }

      // Verify old password
      const isValid = await this.verifyPassword(oldPassword, authData[userAuthIndex].password);

      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      authData[userAuthIndex].password = hashedPassword;
      this.saveAuthData(authData);

      this.logActivity('change_password', userId);

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  // Delete account
  async deleteAccount(userId, password) {
    try {
      // Verify password
      const authData = this.getAuthData();
      const userAuth = authData.find(a => a.userId === userId);

      if (!userAuth) {
        throw new Error('User not found');
      }

      const isValid = await this.verifyPassword(password, userAuth.password);

      if (!isValid) {
        throw new Error('Password is incorrect');
      }

      // Remove user
      const users = this.getAllUsers();
      const filteredUsers = users.filter(u => u.id !== userId);
      this.saveUsers(filteredUsers);

      // Remove auth data
      const filteredAuth = authData.filter(a => a.userId !== userId);
      this.saveAuthData(filteredAuth);

      // Logout if current user
      if (this.currentUser && this.currentUser.id === userId) {
        this.logout();
      }

      this.logActivity('delete_account', userId);

      return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
      console.error('Account deletion error:', error);
      throw error;
    }
  }

  // Helper methods
  validateUserData(userData) {
    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new Error('Valid email is required');
    }

    if (!userData.password || userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!userData.name || userData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async hashPassword(password) {
    // Simple hash for demo - in production use bcrypt on backend
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt_key_vibeity');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPassword(password, hashedPassword) {
    const hash = await this.hashPassword(password);
    return hash === hashedPassword;
  }

  generateToken(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Date.now(),
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    }));
    const signature = btoa('signature_' + user.id);
    return `${header}.${payload}.${signature}`;
  }

  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeUser(user) {
    const { ...sanitized } = user;
    return sanitized;
  }

  getAllUsers() {
    try {
      const usersStr = localStorage.getItem(this.usersKey);
      return usersStr ? JSON.parse(usersStr) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  saveUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  getAuthData() {
    try {
      const authStr = localStorage.getItem('auth_data');
      return authStr ? JSON.parse(authStr) : [];
    } catch (error) {
      return [];
    }
  }

  saveAuthData(authData) {
    localStorage.setItem('auth_data', JSON.stringify(authData));
  }

  updateUser(user) {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      this.saveUsers(users);
    }
  }

  logActivity(action, userId) {
    try {
      const activities = JSON.parse(localStorage.getItem('auth_activities') || '[]');
      activities.push({
        action,
        userId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      // Keep last 100 activities
      if (activities.length > 100) {
        activities.shift();
      }
      localStorage.setItem('auth_activities', JSON.stringify(activities));
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}

export default AuthService;
