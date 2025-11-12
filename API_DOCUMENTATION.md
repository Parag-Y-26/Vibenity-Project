# API Documentation

## Overview

This document describes all API endpoints available in the Offline-First Form Validator. The current implementation uses local storage (IndexedDB) with mock API calls that can be easily replaced with real backend endpoints.

**Base URL (Production):** `http://localhost:3001/api` (configurable via `VITE_API_URL`)

---

## Authentication

### Register User
**POST** `/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_1699705200000_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": 1699705200000,
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - User already exists
- `400` - Invalid email or password
- `500` - Server error

---

### Login
**POST** `/auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_1699705200000_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "lastLogin": 1699705300000
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account deactivated
- `500` - Server error

---

### Logout
**POST** `/auth/logout`

Invalidates the current session.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## User Management

### Get Current User
**GET** `/users/me`

Returns the authenticated user's profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_1699705200000_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "avatar": "data:image/png;base64,...",
    "createdAt": 1699705200000,
    "updatedAt": 1699705250000
  }
}
```

---

### Update Profile
**PUT** `/users/me`

Updates the authenticated user's profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "John Smith",
  "avatar": "data:image/png;base64,..."
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_1699705200000_abc123",
    "name": "John Smith",
    "email": "john@example.com",
    "updatedAt": 1699705400000
  }
}
```

---

### Change Password
**POST** `/users/me/password`

Changes the authenticated user's password.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "oldPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors:**
- `400` - Invalid old password
- `400` - New password too weak

---

### Delete Account
**DELETE** `/users/me`

Permanently deletes the authenticated user's account.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## Entries (CRUD Operations)

### Get All Entries
**GET** `/entries`

Retrieves all entries with optional filters.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (optional): Filter by status (`staging`, `quarantine`, `validated`)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort field (default: `createdAt`)
- `order` (optional): Sort order (`asc`, `desc`)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "data": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "(555) 123-4567"
      },
      "status": "validated",
      "confidence": {
        "score": 0.92,
        "status": "validated"
      },
      "createdAt": 1699705200000,
      "updatedAt": 1699705250000
    }
  ],
  "meta": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Get Single Entry
**GET** `/entries/:id`

Retrieves a specific entry by ID.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "data": {...},
    "confidence": {...},
    "behaviorAnalysis": {...},
    "anomalyDetection": {...},
    "metadata": {...},
    "changeHistory": [...]
  }
}
```

**Errors:**
- `404` - Entry not found

---

### Create Entry
**POST** `/entries`

Creates a new entry with validation.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "(555) 987-6543",
  "dateOfBirth": "1990-05-15",
  "address": "123 Main St",
  "city": "New York",
  "zipCode": "10001"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "data": {...},
    "status": "validated",
    "confidence": {
      "score": 0.88,
      "status": "validated"
    },
    "createdAt": 1699705300000
  }
}
```

---

### Update Entry
**PUT** `/entries/:id`

Updates an existing entry and re-validates.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "email": "jane.smith@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "data": {...},
    "confidence": {...},
    "updatedAt": 1699705400000,
    "changeHistory": [
      {
        "timestamp": 1699705400000,
        "changes": {"email": "jane.smith@example.com"},
        "reason": "manual_update"
      }
    ]
  }
}
```

---

### Delete Entry
**DELETE** `/entries/:id`

Permanently deletes an entry.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": 2
  }
}
```

---

### Bulk Create Entries
**POST** `/entries/bulk`

Creates multiple entries in one request.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "entries": [
    {
      "firstName": "User1",
      "email": "user1@example.com"
    },
    {
      "firstName": "User2",
      "email": "user2@example.com"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "created": 2,
    "failed": 0,
    "results": [...]
  }
}
```

---

## Quarantine Management

### Get Quarantined Entries
**GET** `/quarantine`

Retrieves all quarantined entries.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "data": {...},
      "confidence": {
        "score": 0.32,
        "status": "quarantine"
      },
      "anomalyDetection": {
        "results": {
          "email": {
            "anomalies": [
              {
                "type": "format",
                "message": "Invalid email format",
                "severity": "high"
              }
            ]
          }
        }
      },
      "quarantinedAt": 1699705200000
    }
  ]
}
```

---

### Resolve Quarantined Entry
**POST** `/quarantine/:id/resolve`

Resolves a quarantined entry with corrections.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "corrections": {
    "email": "corrected@example.com",
    "phone": "(555) 123-4567"
  },
  "action": "validate" // or "delete"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "status": "validated",
    "confidence": {
      "score": 0.89
    }
  }
}
```

---

## File Upload

### Upload File
**POST** `/files/upload`

Uploads a file (image, document, etc.).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: File to upload
- `metadata`: JSON string with additional info

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "file_1699705200000_xyz789",
    "name": "document.pdf",
    "size": 102400,
    "type": "application/pdf",
    "url": "https://cdn.example.com/files/document.pdf",
    "uploadedAt": 1699705200000
  }
}
```

**Errors:**
- `400` - File too large
- `400` - Invalid file type
- `413` - Payload too large

---

### Get Files
**GET** `/files`

Retrieves all uploaded files.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `type` (optional): Filter by file type
- `limit` (optional): Number of results

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "file_1699705200000_xyz789",
      "name": "document.pdf",
      "size": 102400,
      "type": "application/pdf",
      "url": "https://cdn.example.com/files/document.pdf",
      "uploadedAt": 1699705200000
    }
  ]
}
```

---

### Get Single File
**GET** `/files/:id`

Retrieves file metadata.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "file_1699705200000_xyz789",
    "name": "document.pdf",
    "size": 102400,
    "type": "application/pdf",
    "url": "https://cdn.example.com/files/document.pdf",
    "uploadedAt": 1699705200000,
    "metadata": {
      "uploadedBy": "user_123",
      "category": "form_attachment"
    }
  }
}
```

---

### Delete File
**DELETE** `/files/:id`

Deletes a file.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## Validation

### Validate Entry Data
**POST** `/validate`

Validates entry data without saving.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "firstName": "John",
  "email": "john@example.com",
  "phone": "555-123-4567"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "confidence": {
      "score": 0.65,
      "status": "staging"
    },
    "anomalies": {
      "phone": [
        {
          "type": "format",
          "message": "Phone format suggestion available",
          "severity": "low"
        }
      ]
    },
    "suggestions": {
      "phone": [
        {
          "value": "(555) 123-4567",
          "reason": "Standard US format",
          "confidence": 0.85
        }
      ]
    }
  }
}
```

---

### Get Validation Rules
**GET** `/validation/rules`

Retrieves current validation rules.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "phone": {
      "minLength": 10,
      "maxLength": 15,
      "pattern": "^[\\d\\s\\-\\+\\(\\)]+$"
    },
    "email": {
      "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      "maxLength": 254
    }
  }
}
```

---

### Update Validation Rules
**PUT** `/validation/rules`

Updates validation rules (admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "phone": {
    "minLength": 10,
    "maxLength": 15
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "updated": true,
    "entriesRevalidated": 25
  }
}
```

---

## Sync

### Sync Data
**POST** `/sync`

Syncs local data to server.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "entries": [
    {
      "id": "local_1",
      "data": {...},
      "confidence": {...}
    }
  ],
  "lastSyncTimestamp": 1699705000000
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "synced": 15,
    "conflicts": 2,
    "failed": 0,
    "conflictDetails": [...]
  }
}
```

---

### Get Sync Status
**GET** `/sync/status`

Returns current sync status.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lastSync": 1699705200000,
    "pendingChanges": 5,
    "inProgress": false
  }
}
```

---

### Resolve Sync Conflicts
**POST** `/sync/conflicts/resolve`

Resolves sync conflicts.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "conflicts": [
    {
      "id": 1,
      "resolution": "use_local" // or "use_remote", "merge"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resolved": 2
  }
}
```

---

## Analytics

### Get Dashboard Stats
**GET** `/analytics/dashboard`

Returns dashboard statistics.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalEntries": 500,
    "validated": 425,
    "quarantined": 50,
    "staging": 25,
    "quarantineRate": 0.10,
    "avgConfidence": 0.82
  }
}
```

---

### Get Entry Analytics
**GET** `/analytics/entries`

Returns entry analytics for a date range.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `from`: Start date (timestamp)
- `to`: End date (timestamp)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "timeRange": {
      "from": 1699705200000,
      "to": 1699791600000
    },
    "entries": {
      "total": 100,
      "validated": 85,
      "quarantined": 15
    },
    "trends": [...]
  }
}
```

---

## Audit

### Get Audit Logs
**GET** `/audit/logs`

Retrieves audit logs.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `action` (optional): Filter by action type
- `userId` (optional): Filter by user
- `from` (optional): Start date
- `to` (optional): End date

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "action": "created",
      "entryId": 5,
      "userId": "user_123",
      "timestamp": 1699705200000,
      "metadata": {...}
    }
  ]
}
```

---

### Get Entry Audit Trail
**GET** `/audit/entry/:id`

Retrieves complete audit trail for an entry.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "action": "created",
      "timestamp": 1699705200000,
      "changes": {...}
    },
    {
      "id": 2,
      "action": "revalidated",
      "timestamp": 1699705300000,
      "changes": {...}
    }
  ]
}
```

---

## Export

### Export to CSV
**POST** `/export/csv`

Exports entries to CSV format.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "validated",
  "fields": ["firstName", "lastName", "email"]
}
```

**Response (200):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="entries-export.csv"

firstName,lastName,email
John,Doe,john@example.com
Jane,Smith,jane@example.com
```

---

### Export to JSON
**POST** `/export/json`

Exports entries to JSON format.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "all",
  "includeMetadata": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "exportedAt": 1699705200000,
    "entries": [...]
  }
}
```

---

## Error Handling

All API endpoints follow a consistent error response format:

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": 1699705200000
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401) - Missing or invalid token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input
- `CONFLICT` (409) - Resource conflict
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `SERVER_ERROR` (500) - Internal server error

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication**: 5 requests/minute per IP
- **Standard endpoints**: 100 requests/minute per user
- **File uploads**: 10 uploads/minute per user
- **Bulk operations**: 5 requests/minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699705260
```

---

## Webhooks (Optional)

Configure webhooks to receive real-time notifications:

**POST** `/webhooks/configure`

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["entry.created", "entry.quarantined", "sync.completed"],
  "secret": "your_webhook_secret"
}
```

**Webhook Payload:**
```json
{
  "event": "entry.quarantined",
  "data": {...},
  "timestamp": 1699705200000,
  "signature": "sha256_hash"
}
```

---

## Integration Guide

### JavaScript/TypeScript Example

```javascript
import ApiService from './services/apiService';

const api = new ApiService();

// Create entry
const result = await api.createEntry({
  firstName: 'John',
  email: 'john@example.com'
});

// Upload file
const file = document.getElementById('fileInput').files[0];
const uploadResult = await api.uploadFile(file);

// Get entries
const entries = await api.getEntries({ status: 'validated' });
```

### cURL Example

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@vibeity.com","password":"Demo@12345"}'

# Create entry
curl -X POST http://localhost:3001/api/entries \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","email":"john@example.com"}'
```

---

## Support

For API support, please contact:
- Email: support@vibeity.com
- Documentation: https://docs.vibeity.com
- GitHub Issues: https://github.com/vibeity/form-validator/issues
