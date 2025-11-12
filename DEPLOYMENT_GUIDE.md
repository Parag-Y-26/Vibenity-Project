# Deployment Guide

## 🚀 Quick Deployment Guide

### Prerequisites
- Node.js 16+ and npm
- Git (for version control)
- Modern web browser

---

## 📦 Local Development

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/vibeity.git
cd vibeity

# Install dependencies
npm install
```

### 2. Environment Setup

Create `.env` file in root:

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Feature Flags
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_ANALYTICS=true

# Storage Limits
VITE_MAX_FILE_SIZE=10485760
VITE_MAX_STORAGE=52428800
```

### 3. Run Development Server

```bash
npm run dev
```

Access at: http://localhost:3000

---

## 🏗️ Production Build

### Build for Production

```bash
# Create optimized build
npm run build

# Preview production build
npm run preview
```

Build outputs to `dist/` directory.

---

## 🌐 Backend Integration

### Update API Service

Edit `src/services/apiService.js`:

```javascript
// Replace mock API calls with real fetch
async mockApiCall(endpoint, method, body) {
  // Comment out mock implementation
  // Use real fetch instead
  const response = await fetch(`${this.baseUrl}${endpoint}`, {
    method,
    headers: this.headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}
```

### Required Backend Endpoints

See `API_DOCUMENTATION.md` for complete list:

**Essential:**
- POST `/auth/register`
- POST `/auth/login`
- GET/POST/PUT/DELETE `/entries`
- POST `/files/upload`
- GET `/users/me`

---

## ☁️ Deployment Options

### Option 1: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Option 3: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Deploy
npm run build
firebase deploy --only hosting
```

**firebase.json:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Option 4: AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Option 5: Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Build and run:**
```bash
docker build -t vibeity-app .
docker run -p 80:80 vibeity-app
```

---

## 🔐 Security Configuration

### 1. Environment Variables

**Never commit secrets!** Use environment variables:

```env
# Production
VITE_API_URL=https://api.yourdomain.com
VITE_ENABLE_ANALYTICS=true

# Secrets (server-side only)
JWT_SECRET=your_secret_key_here
DATABASE_URL=your_database_url
AWS_ACCESS_KEY=your_aws_key
```

### 2. CORS Configuration

Backend CORS setup (Express.js example):

```javascript
const cors = require('cors');

app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. Security Headers

Add to backend or CDN:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 📊 Monitoring & Analytics

### 1. Error Tracking (Sentry)

```bash
npm install @sentry/react
```

```javascript
// src/main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

### 2. Analytics (Google Analytics)

```bash
npm install react-ga4
```

```javascript
// src/App.jsx
import ReactGA from 'react-ga4';

useEffect(() => {
  ReactGA.initialize('G-YOUR-MEASUREMENT-ID');
  ReactGA.send("pageview");
}, []);
```

### 3. Performance Monitoring

```javascript
// Track Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## 🔧 Performance Optimization

### 1. Code Splitting

```javascript
// Lazy load routes
const FormEntry = lazy(() => import('./components/FormEntry'));
const Dashboard = lazy(() => import('./components/DiagnosticsDashboard'));

<Suspense fallback={<LoadingSpinner />}>
  <Route path="/form" element={<FormEntry />} />
</Suspense>
```

### 2. Image Optimization

```bash
# Install image optimizer
npm install vite-plugin-imagemin -D
```

```javascript
// vite.config.js
import viteImagemin from 'vite-plugin-imagemin';

export default {
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      webp: { quality: 80 }
    })
  ]
}
```

### 3. Bundle Analysis

```bash
npm install rollup-plugin-visualizer -D
```

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
}
```

---

## 🗄️ Database Setup

### IndexedDB (Current - No Setup Needed)

Already configured and working! Data is stored in browser.

### PostgreSQL (Backend Integration)

```sql
-- Create database
CREATE DATABASE vibeity_db;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  avatar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Entries table
CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  data JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  confidence JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  entry_id INTEGER,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 Testing

### Unit Tests

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### E2E Tests

```bash
npm install -D playwright
npx playwright install
```

**playwright.config.js:**
```javascript
export default {
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
};
```

---

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] API endpoints tested
- [ ] Error handling verified
- [ ] Loading states work
- [ ] Mobile responsiveness checked
- [ ] Authentication flows tested
- [ ] File uploads tested
- [ ] CRUD operations verified
- [ ] Security headers configured
- [ ] HTTPS enabled
- [ ] Monitoring setup
- [ ] Backup strategy defined
- [ ] Documentation updated
- [ ] Performance optimized
- [ ] Browser compatibility checked

---

## 🆘 Troubleshooting

### Issue: Build fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Issue: API calls not working

1. Check CORS configuration
2. Verify API URL in `.env`
3. Check network tab in browser DevTools
4. Verify authentication token

### Issue: IndexedDB not working

1. Check browser support
2. Clear browser cache
3. Check storage quota
4. Verify HTTPS (required for some features)

---

## 📞 Support

**Deployment Issues:**
- Check deployment logs
- Verify environment variables
- Test API endpoints
- Review error messages

**Performance Issues:**
- Run Lighthouse audit
- Check bundle size
- Optimize images
- Enable caching

---

**Ready for Production! 🚀**
