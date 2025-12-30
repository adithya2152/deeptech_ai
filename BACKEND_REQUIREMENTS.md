# Backend API Requirements

## Architecture Overview

```
Frontend (React)  →  Backend API (Express/Node)  →  Supabase Database
   (Port 8081)           (Port 3000)                  (Cloud)
```

## 🎯 Why We Need This

**Current Problem:**
- Frontend directly calls Supabase (security risk)
- Supabase credentials exposed in browser
- No business logic layer
- Can't scale or add complex features

**Solution:**
- Backend exposes REST APIs
- Frontend calls backend APIs only
- Backend handles all database operations
- Supabase client only on backend (secure)

---

## 📦 Backend Setup

### 1. Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── supabase.ts          # Supabase client configuration
│   │   └── env.ts               # Environment variables
│   ├── routes/
│   │   ├── auth.routes.ts       # Authentication endpoints
│   │   ├── projects.routes.ts   # Project CRUD endpoints
│   │   ├── experts.routes.ts    # Expert endpoints
│   │   └── messages.routes.ts   # Messaging endpoints
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── projects.controller.ts
│   │   ├── experts.controller.ts
│   │   └── messages.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT verification
│   │   └── errorHandler.ts      # Error handling
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   └── server.ts                # Express server setup
├── .env                          # Environment variables
├── package.json
└── tsconfig.json
```

### 2. Required Packages

```bash
npm install express cors dotenv
npm install @supabase/supabase-js
npm install -D typescript @types/express @types/cors @types/node
npm install -D nodemon ts-node
```

### 3. Environment Variables (.env)

```env
PORT=3000
SUPABASE_URL=https://vcxrqnkfuufvyiztunwi.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:8081
```

---

## 🔐 1. Authentication APIs

### Endpoints to Create

#### `POST /api/auth/register`
**Purpose:** User registration (buyer or expert)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "buyer",
  "domains": ["ai_ml", "robotics"]  // Only for experts
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "buyer",
    "name": "John Doe"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

**What to Do:**
1. Validate email/password
2. Create user in `auth.users` table
3. Store role, name, domains in `user_metadata`
4. Create profile in `profiles` table
5. Return user + session tokens

---

#### `POST /api/auth/login`
**Purpose:** User login

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "buyer",
    "name": "John Doe"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

---

#### `POST /api/auth/logout`
**Purpose:** User logout

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

#### `GET /api/auth/me`
**Purpose:** Get current user profile

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "buyer",
  "name": "John Doe",
  "domains": ["ai_ml"],
  "profileVisible": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

#### `PATCH /api/auth/profile`
**Purpose:** Update user profile

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "bio": "Expert in AI",
  "domains": ["ai_ml", "robotics"],
  "location": "San Francisco"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "profile": { /* updated profile data */ }
}
```

---

## 📁 2. Projects APIs

### Endpoints to Create

#### `GET /api/projects`
**Purpose:** Get all projects for current user

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` - Filter by status (draft/active/completed/archived)

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "title": "AI Model Development",
      "problemDescription": "Need help with...",
      "expectedOutcome": "Working model",
      "domain": "ai_ml",
      "trlLevel": 5,
      "riskCategories": ["technical", "scale"],
      "status": "active",
      "clientId": "uuid",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**What to Do:**
1. Verify JWT token (extract user ID)
2. Query `projects` table where `client_id = user.id`
3. Convert snake_case to camelCase
4. Return projects array

---

#### `GET /api/projects/:id`
**Purpose:** Get single project details

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "title": "AI Model Development",
  "problemDescription": "Need help with...",
  "expectedOutcome": "Working model",
  "domain": "ai_ml",
  "trlLevel": 5,
  "riskCategories": ["technical"],
  "status": "active",
  "clientId": "uuid",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

#### `POST /api/projects`
**Purpose:** Create new project

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "AI Model Development",
  "problemDescription": "Need help...",
  "expectedOutcome": "Working model",
  "domain": "ai_ml",
  "trlLevel": 5,
  "riskCategories": ["technical", "scale"]
}
```

**Response:**
```json
{
  "message": "Project created successfully",
  "project": { /* created project */ }
}
```

**What to Do:**
1. Verify JWT token
2. Extract user ID from token
3. Insert into `projects` table with `client_id = user.id`
4. Return created project

---

#### `PATCH /api/projects/:id`
**Purpose:** Update project

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "active"
}
```

**Response:**
```json
{
  "message": "Project updated successfully",
  "project": { /* updated project */ }
}
```

**What to Do:**
1. Verify JWT token
2. Check if user owns the project (`client_id = user.id`)
3. Update project in database
4. Return updated project

---

#### `DELETE /api/projects/:id`
**Purpose:** Delete project

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Project deleted successfully"
}
```

---

## 👥 3. Experts APIs

#### `GET /api/experts`
**Purpose:** Get filtered list of experts

**Query Parameters:**
- `domains` - Comma-separated domains (e.g., "ai_ml,robotics")
- `rateMin` - Minimum hourly rate
- `rateMax` - Maximum hourly rate
- `onlyVerified` - true/false

**Response:**
```json
{
  "experts": [
    {
      "id": "uuid",
      "name": "Dr. Jane Smith",
      "email": "jane@example.com",
      "bio": "AI Expert",
      "experienceSummary": "10+ years...",
      "domains": ["ai_ml", "robotics"],
      "hourlyRates": {
        "advisory": 200,
        "architectureReview": 300,
        "handsOnExecution": 400
      },
      "vettingStatus": "approved",
      "vettingLevel": "deep_tech_verified",
      "rating": 4.8,
      "reviewCount": 25,
      "totalHours": 150
    }
  ]
}
```

**What to Do:**
1. Query `profiles` table where `role = 'expert'`
2. Apply filters (domains, rate range, verified status)
3. Join with `experts` table if needed
4. Return filtered experts

---

#### `GET /api/experts/:id`
**Purpose:** Get single expert profile

**Response:**
```json
{
  "id": "uuid",
  "name": "Dr. Jane Smith",
  "experienceSummary": "10+ years...",
  "domains": ["ai_ml"],
  "hourlyRates": {
    "advisory": 200,
    "architectureReview": 300,
    "handsOnExecution": 400
  },
  "availability": [],
  "vettingStatus": "approved",
  "vettingLevel": "deep_tech_verified",
  "patents": ["US123456"],
  "papers": ["Paper Title"],
  "products": ["Product Name"],
  "rating": 4.8,
  "reviewCount": 25
}
```

---

## 💬 4. Messages APIs

#### `GET /api/conversations`
**Purpose:** Get all conversations for current user

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "otherUser": {
        "id": "uuid",
        "name": "Dr. Jane Smith",
        "role": "expert"
      },
      "lastMessage": "Hello, I'm interested...",
      "lastMessageAt": "2024-01-01T00:00:00Z",
      "unreadCount": 3
    }
  ]
}
```

**What to Do:**
1. Verify JWT token
2. Query `conversations` table where user is participant
3. Get last message for each conversation
4. Count unread messages
5. Return conversations

---

#### `GET /api/conversations/:id/messages`
**Purpose:** Get all messages in a conversation

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "senderId": "uuid",
      "content": "Hello, I'm interested in your project",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/conversations/:id/messages`
**Purpose:** Send a message

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "content": "Hello, I'm interested in your project"
}
```

**Response:**
```json
{
  "message": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "content": "Hello...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### `PATCH /api/conversations/:id/read`
**Purpose:** Mark conversation as read

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Conversation marked as read"
}
```

---

## 🛡️ 5. Middleware (Authentication)

### JWT Verification Middleware

Every protected route should use this middleware:

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'

export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Attach user to request object
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}
```

---

## 🚀 6. Example Implementation

### Sample Controller

```typescript
// src/controllers/projects.controller.ts
import { Request, Response } from 'express'
import { supabase } from '../config/supabase'

export async function getProjects(req: Request, res: Response) {
  try {
    const userId = req.user.id
    const { status } = req.query

    let query = supabase
      .from('projects')
      .select('*')
      .eq('client_id', userId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Convert snake_case to camelCase
    const projects = data.map(project => ({
      id: project.id,
      title: project.title,
      problemDescription: project.problem_description,
      expectedOutcome: project.expected_outcome,
      domain: project.domain,
      trlLevel: project.trl_level,
      riskCategories: project.risk_categories,
      status: project.status,
      clientId: project.client_id,
      createdAt: project.created_at
    }))

    res.json({ projects })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

### Sample Route

```typescript
// src/routes/projects.routes.ts
import { Router } from 'express'
import * as projectsController from '../controllers/projects.controller'
import { authenticateJWT } from '../middleware/auth.middleware'

const router = Router()

// All routes require authentication
router.use(authenticateJWT)

router.get('/', projectsController.getProjects)
router.get('/:id', projectsController.getProject)
router.post('/', projectsController.createProject)
router.patch('/:id', projectsController.updateProject)
router.delete('/:id', projectsController.deleteProject)

export default router
```

---

## 📝 Frontend Changes Needed

### Update API Base URL

```typescript
// src/lib/api.ts
const API_BASE_URL = 'http://localhost:3000/api'

export const api = {
  async get(endpoint: string, token?: string) {
    const headers: any = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    })
    return response.json()
  },

  async post(endpoint: string, data: any, token?: string) {
    const headers: any = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })
    return response.json()
  },

  // ... patch, delete methods
}
```

### Update Hooks

Frontend hooks will change from:
```typescript
// ❌ OLD - Direct Supabase call
const { data } = await supabase.from('projects').select('*')
```

To:
```typescript
// ✅ NEW - Backend API call
const response = await api.get('/projects', token)
const projects = response.projects
```

---

## ✅ Testing Checklist

1. [ ] Backend server starts on port 3000
2. [ ] CORS configured for frontend (port 8081)
3. [ ] Can register new user
4. [ ] Can login and receive JWT token
5. [ ] Protected routes reject requests without token
6. [ ] Can create/read/update/delete projects
7. [ ] Can fetch filtered experts
8. [ ] All responses use camelCase (not snake_case)
9. [ ] Error handling works properly
10. [ ] Frontend can call all APIs successfully

---

## 🎯 Priority Order

### Phase 1 (Immediate)
1. ✅ Setup backend server structure
2. ✅ Implement authentication APIs
3. ✅ Implement projects APIs
4. ✅ Update frontend to call backend APIs

### Phase 2 (Next)
1. ⏳ Implement experts APIs
2. ⏳ Implement messages APIs
3. ⏳ Add expert invitation system

### Phase 3 (Later)
1. ⏳ Contracts system
2. ⏳ Payment integration
3. ⏳ Real-time messaging

---

## 📞 Communication Protocol

**Frontend Team Needs:**
- API base URL (e.g., `http://localhost:3000/api`)
- Authentication token format
- Exact request/response formats
- Error response format

**Backend Team Needs:**
- Database schema
- Business logic requirements
- Validation rules
- Rate limiting needs

---

## 🐛 Common Issues to Avoid

1. ❌ Don't expose service role key to frontend
2. ❌ Don't skip JWT validation on protected routes
3. ❌ Don't return snake_case (convert to camelCase)
4. ❌ Don't forget CORS configuration
5. ❌ Don't skip error handling
6. ❌ Don't hardcode sensitive data

---

## 📚 Additional Resources

- Express.js: https://expressjs.com/
- Supabase Server-side: https://supabase.com/docs/reference/javascript/initializing
- JWT Authentication: https://jwt.io/introduction
- REST API Best Practices: https://restfulapi.net/

---

**Questions?** Ask in team channel or meeting.
