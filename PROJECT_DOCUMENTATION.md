# DeepTech Project - Complete Beginner's Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Architecture](#project-architecture)
4. [Backend Structure](#backend-structure)
5. [Frontend Structure](#frontend-structure)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Authentication Flow](#authentication-flow)
9. [Key Features & Workflows](#key-features--workflows)
10. [File-by-File Explanation](#file-by-file-explanation)
11. [How Data Flows](#how-data-flows)
12. [Getting Started](#getting-started)

---

## 🎯 Project Overview

**DeepTech** is a platform that connects **buyers** (people with deep-tech projects) with **experts** (qualified professionals who can help with those projects).

### What Does It Do?
- **Buyers** can create projects (AI, Robotics, Biotech, etc.)
- **Experts** can browse projects and offer their services
- Both parties can communicate through messages
- Contracts are created to formalize work agreements
- Work logs track hours worked by experts

### Key Roles
- **Buyer (Client)**: Posts projects and hires experts
- **Expert (Consultant)**: Provides expertise and gets hired
- **Admin**: Manages the platform (future feature)

---

## 💻 Technology Stack

### Backend (Server-side)
- **Node.js**: JavaScript runtime for server
- **Express.js**: Web framework for building APIs
- **PostgreSQL**: Database (via Supabase)
- **JWT**: Secure authentication tokens
- **bcryptjs**: Password hashing/encryption
- **@xenova/transformers**: AI-powered semantic search

### Frontend (Client-side)
- **React**: UI library for building interfaces
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **React Router**: Navigation between pages
- **TanStack Query**: Data fetching and caching
- **Shadcn UI**: Pre-built beautiful components
- **Tailwind CSS**: Utility-first styling

### Infrastructure
- **Supabase**: Database hosting + Authentication
- **CORS**: Cross-origin resource sharing (allows frontend to talk to backend)

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
│                    (http://localhost:8080)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP Requests
                             │ (API Calls)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Pages     │  │  Components  │  │   API Client     │   │
│  │ (Views)     │  │  (UI Parts)  │  │   (lib/api.ts)   │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│         │                 │                    │             │
│         └─────────────────┴────────────────────┘             │
│                           │                                  │
│                   Fetches data via                           │
│                   fetch() calls                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP (JSON)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js/Express)                   │
│                  (http://localhost:5000)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Routes   │→ │Controllers │→ │   Models   │            │
│  │ (Endpoints)│  │ (Logic)    │  │ (Database) │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │              │                │                    │
│         └──────────────┴────────────────┘                    │
│                        │                                     │
│              Uses middleware for:                            │
│              - Authentication (JWT)                          │
│              - Validation                                    │
│              - Error handling                                │
└────────────────────────┬───────────────────────────────────┘
                         │
                         │ SQL Queries
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL/Supabase)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ profiles │ │ projects │ │ experts  │ │contracts │       │
│  │(users)   │ │          │ │          │ │          │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │messages  │ │work_logs │ │ ...      │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Backend Structure

### Directory Layout
```
deeptech_backend/
├── server.js              # Main entry point - starts the server
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (secrets)
│
├── config/               # Configuration files
│   ├── db.js            # PostgreSQL connection setup
│   └── supabase.js      # Supabase client setup
│
├── routes/              # URL endpoints (what URLs exist)
│   ├── userAuthRoutes.js    # /api/auth/* - login, signup
│   ├── projectRoutes.js     # /api/projects/* - CRUD operations
│   ├── expertRoutes.js      # /api/experts/* - search experts
│   ├── contractRoutes.js    # /api/contracts/* - manage contracts
│   └── messageRoutes.js     # /api/conversations/* - messaging
│
├── controllers/         # Business logic (what happens when URL is hit)
│   ├── authController.js      # Handles login/signup/logout
│   ├── projectController.js   # Handles project operations
│   ├── expertController.js    # Handles expert search
│   ├── contractController.js  # Handles contract operations
│   └── messageController.js   # Handles messaging
│
├── models/              # Database queries (talks to PostgreSQL)
│   ├── projectModel.js    # Projects table operations
│   ├── expertModel.js     # Experts table operations
│   ├── contractModel.js   # Contracts table operations
│   ├── messageModel.js    # Messages table operations
│   └── workLogModel.js    # Work logs table operations
│
├── middleware/          # Code that runs BEFORE controllers
│   ├── auth.js         # Verifies JWT tokens (is user logged in?)
│   ├── logger.js       # Logs requests for debugging
│   └── rbac.js         # Role-based access control
│
└── services/           # Helper services
    └── embeddingService.js  # AI semantic search
```

### How Backend Works (Step-by-Step)

**Example: User creates a project**

1. **Frontend sends request:**
   ```
   POST http://localhost:5000/api/projects
   Headers: { Authorization: "Bearer <token>" }
   Body: { title: "AI Chatbot", description: "...", domain: "ai_ml" }
   ```

2. **Server.js receives it:**
   - CORS middleware allows the request
   - `app.use("/api/projects", projectRoutes)` routes it to projectRoutes.js

3. **Route (projectRoutes.js):**
   ```javascript
   router.post('/', auth, projectController.createProject);
   ```
   - `auth` middleware runs first → verifies JWT token → adds `req.user`
   - Then calls `projectController.createProject`

4. **Controller (projectController.js):**
   ```javascript
   export const createProject = async (req, res) => {
     const projectData = { ...req.body, client_id: req.user.id };
     const newProject = await projectModel.create(projectData);
     res.status(201).json({ message: 'Project created', data: newProject });
   }
   ```
   - Extracts data from request
   - Calls model to save to database
   - Sends response back to frontend

5. **Model (projectModel.js):**
   ```javascript
   create: async (data) => {
     const sql = `INSERT INTO projects (...) VALUES (...) RETURNING *`;
     const { rows } = await pool.query(sql, [data]);
     return rows[0];
   }
   ```
   - Executes SQL query
   - Returns saved project

6. **Response goes back:**
   ```json
   { "message": "Project created", "data": { "id": "123", "title": "AI Chatbot" } }
   ```

---

## 🎨 Frontend Structure

### Directory Layout
```
deeptech/
├── index.html           # HTML entry point
├── package.json        # Dependencies
├── vite.config.ts      # Build configuration
├── tailwind.config.ts  # Styling configuration
│
└── src/
    ├── main.tsx        # React entry point - mounts App
    ├── App.tsx         # Main app component - defines routes
    │
    ├── pages/          # Full page components
    │   ├── LandingPage.tsx       # Home page (/)
    │   ├── auth/
    │   │   ├── LoginPage.tsx     # Login form (/login)
    │   │   └── RegisterPage.tsx  # Signup form (/register)
    │   ├── dashboard/
    │   │   └── DashboardPage.tsx # User dashboard (/dashboard)
    │   ├── projects/
    │   │   ├── ProjectsPage.tsx       # List all projects (/projects)
    │   │   ├── CreateProjectPage.tsx  # Create new (/projects/new)
    │   │   ├── ProjectDetailPage.tsx  # View one (/projects/:id)
    │   │   └── EditProjectPage.tsx    # Edit (/projects/:id/edit)
    │   ├── experts/
    │   │   ├── ExpertDiscoveryPage.tsx # Search experts (/experts)
    │   │   └── ExpertProfilePage.tsx   # Expert details (/experts/:id)
    │   ├── contracts/
    │   │   ├── ContractsListPage.tsx   # List contracts (/contracts)
    │   │   └── ContractDetailPage.tsx  # Contract details (/contracts/:id)
    │   └── messages/
    │       └── MessagesPage.tsx        # Chat interface (/messages)
    │
    ├── components/     # Reusable UI pieces
    │   ├── layout/
    │   │   ├── Layout.tsx   # Wrapper with navbar + footer
    │   │   ├── Navbar.tsx   # Top navigation bar
    │   │   └── Footer.tsx   # Bottom footer
    │   ├── projects/
    │   │   └── ProjectCard.tsx  # Display project summary
    │   ├── experts/
    │   │   └── ExpertCard.tsx   # Display expert summary
    │   ├── contracts/
    │   │   └── ContractCard.tsx # Display contract summary
    │   └── ui/          # Generic UI components (buttons, dialogs, etc.)
    │
    ├── contexts/       # Global state management
    │   └── AuthContext.tsx  # User authentication state
    │
    ├── hooks/          # Reusable React hooks
    │   ├── useProjects.ts   # Fetch/manage projects
    │   ├── useExperts.ts    # Fetch/manage experts
    │   └── useMessages.ts   # Fetch/manage messages
    │
    ├── lib/            # Utilities and configs
    │   ├── api.ts      # API client - all backend calls
    │   ├── supabase.ts # Supabase client (auth only)
    │   ├── utils.ts    # Helper functions
    │   └── constants.ts # App constants
    │
    ├── types/          # TypeScript type definitions
    │   └── index.ts    # All interfaces (User, Project, Expert, etc.)
    │
    └── services/       # Business logic
        └── contractService.ts
```

### How Frontend Works (Step-by-Step)

**Example: User visits Projects page**

1. **User navigates to** `/projects`

2. **React Router (App.tsx):**
   ```tsx
   <Route path="/projects" element={<ProjectsPage />} />
   ```
   - Matches URL and renders `ProjectsPage` component

3. **Page Component (ProjectsPage.tsx):**
   ```tsx
   const { data: projects, isLoading } = useProjects();
   return (
     <div>
       {projects.map(project => <ProjectCard project={project} />)}
     </div>
   );
   ```
   - Uses `useProjects()` hook to fetch data
   - Displays loading state while fetching
   - Renders list of `ProjectCard` components

4. **Hook (useProjects.ts):**
   ```tsx
   export const useProjects = () => {
     const { token } = useAuth();
     return useQuery({
       queryKey: ['projects'],
       queryFn: () => projectsApi.getAll(token)
     });
   }
   ```
   - Gets auth token from `AuthContext`
   - Uses TanStack Query to fetch and cache data
   - Calls API client

5. **API Client (lib/api.ts):**
   ```typescript
   export const projectsApi = {
     getAll: (token) => api.get('/projects', token)
   }
   ```
   - Makes HTTP GET request to backend
   - Includes JWT token in headers
   - Returns parsed JSON response

6. **Data flows back:**
   - API returns projects array
   - TanStack Query caches it
   - Hook provides it to component
   - Component renders the UI

---

## 🗄️ Database Schema

### Key Tables

#### **profiles** (Users)
Stores all user accounts (buyers, experts, admins).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique user ID (from Supabase Auth) |
| email | VARCHAR | Email address |
| first_name | VARCHAR | First name |
| last_name | VARCHAR | Last name |
| role | VARCHAR | 'buyer', 'expert', or 'admin' |
| email_verified | BOOLEAN | Email confirmed? |
| created_at | TIMESTAMP | When account created |
| updated_at | TIMESTAMP | Last profile update |

#### **experts** (Expert Profiles)
Extended info for users with 'expert' role.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | References profiles.id |
| domains | TEXT[] | Array of expertise areas (e.g., ['ai_ml', 'robotics']) |
| experience_summary | TEXT | Bio/description |
| hourly_rate_advisory | DECIMAL | Rate for advice |
| hourly_rate_architecture | DECIMAL | Rate for architecture review |
| hourly_rate_execution | DECIMAL | Rate for hands-on work |
| vetting_status | VARCHAR | 'pending', 'approved', 'rejected' |
| vetting_level | VARCHAR | Verification tier |
| rating | DECIMAL | Average rating (0-5) |
| review_count | INTEGER | Number of reviews |
| availability | JSONB | Available time slots |
| patents | TEXT[] | Patent numbers/links |
| papers | TEXT[] | Research papers |
| products | TEXT[] | Products built |

#### **projects**
Projects posted by buyers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique project ID |
| client_id | UUID | References profiles.id (buyer) |
| title | VARCHAR | Project name |
| description | TEXT | Detailed description |
| domain | VARCHAR | Tech domain (ai_ml, robotics, etc.) |
| trl_level | INTEGER | Technology Readiness Level (1-9) |
| risk_categories | TEXT[] | ['technical', 'regulatory', 'scale', 'market'] |
| expected_outcome | TEXT | What buyer wants to achieve |
| budget_min | DECIMAL | Minimum budget |
| budget_max | DECIMAL | Maximum budget |
| deadline | DATE | Project deadline |
| status | VARCHAR | 'draft', 'active', 'completed', 'archived' |
| created_at | TIMESTAMP | When posted |
| updated_at | TIMESTAMP | Last modified |

#### **contracts**
Agreements between buyers and experts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique contract ID |
| project_id | UUID | References projects.id |
| buyer_id | UUID | References profiles.id (client) |
| expert_id | UUID | References profiles.id (consultant) |
| hourly_rate | DECIMAL | Agreed hourly rate |
| engagement_type | VARCHAR | 'advisory', 'architecture_review', 'hands_on_execution' |
| weekly_hour_cap | INTEGER | Max hours per week |
| start_date | DATE | Contract start |
| end_date | DATE | Contract end |
| ip_ownership | VARCHAR | 'buyer_owns', 'shared', 'expert_owns' |
| status | VARCHAR | 'pending', 'active', 'declined', 'paused', 'completed', 'disputed' |
| created_at | TIMESTAMP | When created |

#### **conversations**
Chat threads between users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique conversation ID |
| participant_1 | UUID | References profiles.id |
| participant_2 | UUID | References profiles.id |
| last_message_at | TIMESTAMP | Last activity |
| created_at | TIMESTAMP | When conversation started |

#### **messages**
Individual messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique message ID |
| conversation_id | UUID | References conversations.id |
| sender_id | UUID | References profiles.id |
| content | TEXT | Message text |
| is_read | BOOLEAN | Read by recipient? |
| created_at | TIMESTAMP | When sent |

#### **work_logs**
Hours worked by experts on contracts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique log ID |
| contract_id | UUID | References contracts.id |
| expert_id | UUID | References profiles.id |
| date | DATE | Work date |
| hours_worked | DECIMAL | Hours logged |
| description | TEXT | Work done |
| value_tags | TEXT[] | Value delivered tags |
| status | VARCHAR | 'draft', 'submitted', 'approved', 'disputed' |
| created_at | TIMESTAMP | When logged |

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Create new account | ❌ |
| POST | `/api/auth/login` | Login with email/password | ❌ |
| GET | `/api/auth/profile` | Get current user profile | ✅ |
| PUT | `/api/auth/profile` | Update profile | ✅ |
| POST | `/api/auth/logout` | Logout user | ✅ |

**Example Request:**
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "abc-123",
      "email": "user@example.com",
      "role": "buyer"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

### Projects (`/api/projects`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/projects` | Get my projects | ✅ |
| GET | `/api/projects/:id` | Get project details | ✅ |
| POST | `/api/projects` | Create new project | ✅ |
| PUT | `/api/projects/:id` | Update project | ✅ |
| DELETE | `/api/projects/:id` | Delete project | ✅ |

**Query Parameters for GET /api/projects:**
- `status` - Filter by status (draft, active, completed, archived)

**Example Request:**
```bash
POST http://localhost:5000/api/projects
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "title": "AI-Powered Chatbot",
  "description": "Build a customer service chatbot",
  "domain": "ai_ml",
  "trlLevel": 3,
  "riskCategories": ["technical", "market"],
  "expectedOutcome": "Working prototype",
  "budgetMin": 5000,
  "budgetMax": 15000,
  "deadline": "2025-06-30"
}
```

### Experts (`/api/experts`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/experts` | Search experts | ✅ |
| GET | `/api/experts/:id` | Get expert profile | ✅ |

**Query Parameters for GET /api/experts:**
- `domain` - Filter by domain (ai_ml, robotics, etc.)
- `queryText` - Search in name/bio
- `rateMin` - Minimum hourly rate
- `rateMax` - Maximum hourly rate
- `onlyVerified` - Show only verified experts (true/false)

**Example Request:**
```bash
GET http://localhost:5000/api/experts?domain=ai_ml&rateMin=100&rateMax=300
Authorization: Bearer eyJhbGc...
```

### Contracts (`/api/contracts`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/contracts` | Get my contracts | ✅ |
| GET | `/api/contracts/:id` | Get contract details | ✅ |
| POST | `/api/contracts` | Create new contract | ✅ |
| PUT | `/api/contracts/:id` | Update contract | ✅ |
| DELETE | `/api/contracts/:id` | Delete contract | ✅ |

### Messages (`/api/conversations`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/conversations` | Get all conversations | ✅ |
| GET | `/api/conversations/:id` | Get conversation messages | ✅ |
| POST | `/api/conversations/:id/messages` | Send message | ✅ |

---

## 🔐 Authentication Flow

### How JWT Authentication Works

```
┌─────────────┐                              ┌─────────────┐
│  FRONTEND   │                              │   BACKEND   │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │ 1. POST /api/auth/login                   │
       │    { email, password }                    │
       ├──────────────────────────────────────────>│
       │                                            │
       │                                    2. Verify password
       │                                       against hash
       │                                            │
       │                                    3. Generate JWT token
       │                                       signed with secret
       │                                            │
       │ 4. { tokens: { accessToken: "..." } }     │
       │<──────────────────────────────────────────┤
       │                                            │
   5. Store token                                  │
      in localStorage                               │
       │                                            │
       │                                            │
       │ 6. GET /api/projects                      │
       │    Header: Authorization: Bearer <token>  │
       ├──────────────────────────────────────────>│
       │                                            │
       │                                    7. Verify JWT:
       │                                       - Check signature
       │                                       - Check expiry
       │                                       - Extract user ID
       │                                            │
       │                                    8. Execute request
       │                                       as authenticated user
       │                                            │
       │ 9. { data: [...projects...] }             │
       │<──────────────────────────────────────────┤
       │                                            │
```

### Code Walkthrough

**1. Login (authController.js):**
```javascript
export const login = async (req, res) => {
  const { email, password } = req.body;
  
  // 1. Find user in database
  const user = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
  
  // 2. Compare password with stored hash
  const validPassword = await bcryptjs.compare(password, user.password_hash);
  
  // 3. Generate JWT token
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // 4. Send token to frontend
  res.json({ success: true, data: { user, tokens: { accessToken } } });
}
```

**2. Store Token (AuthContext.tsx):**
```typescript
const signIn = async (email: string, password: string) => {
  const response = await authApi.login(email, password);
  
  // Store token in browser
  localStorage.setItem('token', response.data.tokens.accessToken);
  setToken(response.data.tokens.accessToken);
  setUser(response.data.user);
}
```

**3. Use Token in Requests (api.ts):**
```typescript
async get(endpoint: string, token?: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // Attach token
  };
  
  const response = await fetch(`${this.baseUrl}${endpoint}`, { headers });
  return response.json();
}
```

**4. Verify Token (auth.js middleware):**
```javascript
const auth = (req, res, next) => {
  // 1. Extract token from header
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    // 2. Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Attach user info to request
    req.user = decoded;  // { id: "abc-123", email: "...", role: "buyer" }
    
    // 4. Continue to controller
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
```

**5. Use User Info (projectController.js):**
```javascript
export const createProject = async (req, res) => {
  // req.user was added by auth middleware
  const userId = req.user.id;  // "abc-123"
  
  const projectData = {
    ...req.body,
    client_id: userId  // Automatically use logged-in user
  };
  
  const project = await projectModel.create(projectData);
  res.json({ data: project });
}
```

---

## ⚙️ Key Features & Workflows

### 1. User Registration Flow

```
Frontend (RegisterPage.tsx)
  ↓
1. User fills form: { email, password, firstName, lastName, role }
  ↓
2. Calls: authApi.register(data)
  ↓
API Client (api.ts)
  ↓
3. POST /api/auth/register
  ↓
Backend (authController.js)
  ↓
4. Hash password with bcryptjs
5. Create user in Supabase Auth
6. Create profile in PostgreSQL
7. Generate JWT token
  ↓
8. Return { user, tokens }
  ↓
Frontend
  ↓
9. Store token in localStorage
10. Redirect to /dashboard
```

### 2. Project Creation Flow

```
Frontend (CreateProjectPage.tsx)
  ↓
1. User fills project form
2. Validates: title, description, domain, budget, etc.
  ↓
3. Calls: projectsApi.create(projectData, token)
  ↓
API Client (api.ts)
  ↓
4. POST /api/projects with Authorization header
  ↓
Backend Middleware (auth.js)
  ↓
5. Verifies JWT token
6. Extracts user ID from token
  ↓
Controller (projectController.js)
  ↓
7. Adds client_id from req.user.id
8. Calls: projectModel.create(data)
  ↓
Model (projectModel.js)
  ↓
9. Executes SQL INSERT query
10. Returns new project
  ↓
Controller
  ↓
11. Sends response: { message: "Project created", data: project }
  ↓
Frontend
  ↓
12. Shows success message
13. Redirects to /projects/:id
```

### 3. Expert Search Flow

```
Frontend (ExpertDiscoveryPage.tsx)
  ↓
1. User selects filters:
   - Domain: "ai_ml"
   - Rate range: $100-$300
   - Verified only: true
  ↓
2. Calls: expertsApi.search({ domain, rateMin, rateMax, onlyVerified })
  ↓
API Client (api.ts)
  ↓
3. GET /api/experts?domain=ai_ml&rateMin=100&rateMax=300&onlyVerified=true
  ↓
Backend (expertController.js)
  ↓
4. Calls: expertModel.searchExperts(filters)
  ↓
Model (expertModel.js)
  ↓
5. Builds dynamic SQL query:
   SELECT * FROM experts
   WHERE domains @> '{ai_ml}'
   AND hourly_rate_advisory >= 100
   AND hourly_rate_advisory <= 300
   AND vetting_status = 'approved'
  ↓
6. Returns matching experts
  ↓
Frontend
  ↓
7. Displays expert cards with:
   - Name, bio
   - Domains
   - Hourly rates
   - Rating/reviews
   - Vetting badge
```

### 4. Messaging Flow

```
Frontend (MessagesPage.tsx)
  ↓
1. Load conversations:
   GET /api/conversations
  ↓
2. Display conversation list with:
   - Other user name
   - Last message
   - Unread count
  ↓
3. User clicks conversation
  ↓
4. Load messages:
   GET /api/conversations/:id
  ↓
5. Display message history
  ↓
6. User types and sends message
  ↓
7. POST /api/conversations/:id/messages
   { content: "Hello!" }
  ↓
Backend (messageController.js)
  ↓
8. Creates message in database
9. Updates conversation.last_message_at
  ↓
Frontend
  ↓
10. Adds message to UI immediately
11. Scrolls to bottom
```

### 5. Contract Creation Flow

```
Buyer views expert profile
  ↓
Clicks "Hire Expert"
  ↓
Frontend shows ContractCreationDialog
  ↓
1. User fills contract form:
   - Select project
   - Choose engagement type (advisory/architecture/hands-on)
   - Set hourly rate
   - Weekly hour cap
   - Start/end dates
   - IP ownership
  ↓
2. POST /api/contracts
  ↓
Backend (contractController.js)
  ↓
3. Creates contract with status='pending'
4. Saves to database
  ↓
5. (Future) Sends notification to expert
  ↓
Expert receives notification
  ↓
6. Expert accepts or declines
  ↓
7. PUT /api/contracts/:id
   { status: 'active' }
  ↓
Contract becomes active
  ↓
Expert can now log work hours
```

---

## 📁 File-by-File Explanation

### Backend Files

#### **server.js**
**Purpose:** Main entry point that starts the Express server

**What it does:**
1. Imports Express and all route files
2. Sets up middleware (CORS, JSON parsing)
3. Defines health check endpoints
4. Registers all API routes
5. Handles 404 and global errors
6. Starts server on port 5000

**Key code:**
```javascript
app.use("/api/auth", userAuthRoutes);      // /api/auth/* → auth endpoints
app.use("/api/projects", projectRoutes);   // /api/projects/* → project endpoints
app.use("/api/experts", expertRoutes);     // etc...

app.listen(5000, () => console.log('Server running'));
```

---

#### **config/db.js**
**Purpose:** PostgreSQL database connection

**What it does:**
1. Creates connection pool to database
2. Uses connection string from `.env`
3. Configures SSL and connection limits
4. Handles connection errors

**Key code:**
```javascript
const pool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 10  // Max 10 concurrent connections
});
```

---

#### **routes/projectRoutes.js**
**Purpose:** Defines what URLs exist for projects

**What it does:**
1. Maps URLs to controller functions
2. Applies auth middleware to protect routes
3. Includes Swagger documentation comments

**Key code:**
```javascript
router.get('/', auth, projectController.getMyProjects);         // GET /api/projects
router.get('/:id', auth, projectController.getProjectById);     // GET /api/projects/123
router.post('/', auth, projectController.createProject);        // POST /api/projects
router.put('/:id', auth, projectController.updateProject);      // PUT /api/projects/123
router.delete('/:id', auth, projectController.deleteProject);   // DELETE /api/projects/123
```

---

#### **controllers/projectController.js**
**Purpose:** Business logic for project operations

**What it does:**
1. Receives requests from routes
2. Validates and processes data
3. Calls model functions
4. Sends responses

**Functions:**
- `getMyProjects()` - Gets all projects for logged-in user
- `getProjectById()` - Gets single project details
- `createProject()` - Creates new project
- `updateProject()` - Updates existing project
- `deleteProject()` - Deletes project

**Example:**
```javascript
export const createProject = async (req, res) => {
  try {
    // 1. Extract data from request
    const projectData = {
      title: req.body.title,
      client_id: req.user.id,  // From JWT token
      // ... other fields
    };
    
    // 2. Call model to save
    const newProject = await projectModel.create(projectData);
    
    // 3. Send success response
    res.status(201).json({ 
      message: 'Project created', 
      data: newProject 
    });
  } catch (error) {
    // 4. Handle errors
    res.status(500).json({ error: 'Server error' });
  }
};
```

---

#### **models/projectModel.js**
**Purpose:** Database operations for projects

**What it does:**
1. Executes SQL queries
2. Returns results
3. No business logic, just database access

**Functions:**
- `getProjectsByClient(clientId, status)` - Query projects with filters
- `getById(id)` - Get single project with JOIN to get client info
- `create(data)` - INSERT new project
- `update(id, updates)` - UPDATE project
- `delete(id)` - DELETE project

**Example:**
```javascript
create: async (data) => {
  const sql = `
    INSERT INTO projects (client_id, title, description, domain, ...)
    VALUES ($1, $2, $3, $4, ...)
    RETURNING *;  -- Return the created row
  `;
  
  const { rows } = await pool.query(sql, [data.client_id, data.title, ...]);
  return rows[0];  // Return first row (the new project)
}
```

---

#### **middleware/auth.js**
**Purpose:** Verify user is logged in

**What it does:**
1. Extracts JWT token from Authorization header
2. Verifies token signature and expiry
3. Decodes token to get user info
4. Attaches user info to `req.user`
5. Calls `next()` to continue to controller

**Flow:**
```javascript
Request comes in
  ↓
Extract token from "Authorization: Bearer <token>"
  ↓
jwt.verify(token, secret)
  ↓
If valid: req.user = { id, email, role }
  ↓
Call next() → proceed to controller
  ↓
If invalid: Send 401 error
```

---

#### **controllers/authController.js**
**Purpose:** Handle user authentication

**Functions:**

**signup()**
1. Validate email/password
2. Check if user exists
3. Hash password
4. Create user in Supabase Auth
5. Create profile in PostgreSQL
6. Generate JWT tokens
7. Return user + tokens

**login()**
1. Find user by email
2. Verify password hash
3. Generate JWT tokens
4. Return user + tokens

**getProfile()**
1. Get user ID from req.user (set by auth middleware)
2. Query full profile from database
3. Return profile data

---

#### **services/embeddingService.js**
**Purpose:** AI-powered semantic search

**What it does:**
1. Loads transformer model (sentence embeddings)
2. Converts text to 384-dimensional vectors
3. Enables similarity search (find experts with similar skills)

**Example:**
```javascript
// Convert text to embedding vector
const embedding = await embeddingService.generateEmbedding(
  "Expert in machine learning and computer vision"
);
// Returns: [0.234, -0.123, 0.567, ... 384 numbers]

// Store in database for similarity search
```

---

### Frontend Files

#### **src/main.tsx**
**Purpose:** Entry point that mounts React app

**What it does:**
```tsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
```

---

#### **src/App.tsx**
**Purpose:** Main app component with routing

**What it does:**
1. Wraps app in providers (QueryClient, Auth, Tooltip)
2. Defines all routes
3. Handles navigation

**Key code:**
```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/projects" element={<ProjectsPage />} />
    <Route path="/projects/:id" element={<ProjectDetailPage />} />
    {/* ... more routes */}
  </Routes>
</BrowserRouter>
```

---

#### **src/contexts/AuthContext.tsx**
**Purpose:** Global authentication state

**What it provides:**
- `user` - Current user object
- `token` - JWT token
- `isAuthenticated` - Boolean
- `signIn()` - Login function
- `signUp()` - Register function
- `signOut()` - Logout function

**How components use it:**
```tsx
const { user, token, signIn } = useAuth();

// Check if logged in
if (!user) return <Navigate to="/login" />;

// Make authenticated API call
const projects = await projectsApi.getAll(token);
```

---

#### **src/lib/api.ts**
**Purpose:** Centralized API client

**What it does:**
1. Defines base URL (http://localhost:5000/api)
2. Provides HTTP methods (get, post, put, delete)
3. Handles errors
4. Adds auth tokens to headers

**Structure:**
```typescript
// Generic API client
class ApiClient {
  get(endpoint, token) { ... }
  post(endpoint, data, token) { ... }
  put(endpoint, data, token) { ... }
  delete(endpoint, token) { ... }
}

// Specific API functions
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getProfile: (token) => api.get('/auth/profile', token)
};

export const projectsApi = {
  getAll: (token) => api.get('/projects', token),
  getById: (id, token) => api.get(`/projects/${id}`, token),
  create: (data, token) => api.post('/projects', data, token),
  update: (id, data, token) => api.put(`/projects/${id}`, data, token),
  delete: (id, token) => api.delete(`/projects/${id}`, token)
};
```

---

#### **src/hooks/useProjects.ts**
**Purpose:** Reusable hook for fetching projects

**What it does:**
1. Gets auth token
2. Uses TanStack Query to fetch data
3. Handles caching and revalidation

**Usage in component:**
```tsx
const ProjectsPage = () => {
  const { data: projects, isLoading, error } = useProjects();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  
  return (
    <div>
      {projects.map(project => <ProjectCard project={project} />)}
    </div>
  );
}
```

---

#### **src/pages/projects/CreateProjectPage.tsx**
**Purpose:** Page for creating new project

**What it does:**
1. Renders form with fields:
   - Title
   - Description
   - Domain (select)
   - TRL Level (1-9)
   - Risk categories (checkboxes)
   - Budget range
   - Deadline
2. Validates input
3. Calls API on submit
4. Redirects to project detail on success

---

#### **src/components/projects/ProjectCard.tsx**
**Purpose:** Reusable project display component

**Props:**
```typescript
interface Props {
  project: Project;
}
```

**What it shows:**
- Project title
- Domain badge
- TRL level
- Budget range
- Status badge
- Description preview
- Click to view details

---

#### **src/types/index.ts**
**Purpose:** TypeScript type definitions

**What it contains:**
- Interfaces for all data types (User, Project, Expert, Contract, etc.)
- Type aliases for enums (UserRole, ProjectStatus, Domain, etc.)
- Ensures type safety across the app

**Example:**
```typescript
export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  domain: Domain;
  trl_level: TRLLevel;
  status: ProjectStatus;
  budget_min?: number;
  budget_max?: number;
  // ...
}

export type Domain = 
  | 'ai_ml' 
  | 'robotics' 
  | 'climate_tech' 
  | 'biotech';

export type ProjectStatus = 
  | 'draft' 
  | 'active' 
  | 'completed' 
  | 'archived';
```

---

## 🔄 How Data Flows

### Complete Request/Response Cycle

Let's trace a **"Create Project"** request from start to finish:

```
┌────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                                  │
│    User fills form and clicks "Create Project"                 │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 2. REACT COMPONENT (CreateProjectPage.tsx)                     │
│                                                                 │
│    const handleSubmit = async (formData) => {                  │
│      await createProjectMutation.mutate(formData);             │
│    }                                                            │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 3. CUSTOM HOOK (useProjects.ts)                                │
│                                                                 │
│    const createProjectMutation = useMutation({                 │
│      mutationFn: (data) => projectsApi.create(data, token)     │
│    });                                                          │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 4. API CLIENT (lib/api.ts)                                     │
│                                                                 │
│    projectsApi.create = (data, token) => {                     │
│      return api.post('/projects', data, token);                │
│    }                                                            │
│                                                                 │
│    api.post = (endpoint, data, token) => {                     │
│      fetch('http://localhost:5000/api/projects', {             │
│        method: 'POST',                                          │
│        headers: {                                               │
│          'Content-Type': 'application/json',                   │
│          'Authorization': `Bearer ${token}`                    │
│        },                                                       │
│        body: JSON.stringify(data)                              │
│      })                                                         │
│    }                                                            │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    ══════════════════════
                    ║  NETWORK (HTTP)    ║
                    ══════════════════════
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 5. BACKEND - SERVER (server.js)                                │
│                                                                 │
│    app.use('/api/projects', projectRoutes);                    │
│                                                                 │
│    Middleware runs:                                             │
│    - CORS (allows request from localhost:8080)                │
│    - express.json() (parses JSON body)                        │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 6. ROUTE (routes/projectRoutes.js)                             │
│                                                                 │
│    router.post('/', auth, projectController.createProject);    │
│                     ^^^^                                        │
│                     Middleware runs first                       │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 7. MIDDLEWARE (middleware/auth.js)                             │
│                                                                 │
│    - Extract token from header                                 │
│    - Verify JWT signature                                      │
│    - Decode: { id: "abc-123", email: "...", role: "buyer" }   │
│    - Set req.user = decoded                                    │
│    - Call next()                                               │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 8. CONTROLLER (controllers/projectController.js)               │
│                                                                 │
│    export const createProject = async (req, res) => {          │
│      const projectData = {                                     │
│        title: req.body.title,                                  │
│        description: req.body.description,                      │
│        client_id: req.user.id,  // From JWT!                  │
│        domain: req.body.domain,                                │
│        // ...                                                  │
│      };                                                         │
│                                                                 │
│      const newProject = await projectModel.create(projectData);│
│                                                                 │
│      res.status(201).json({                                    │
│        message: 'Project created',                             │
│        data: newProject                                        │
│      });                                                        │
│    }                                                            │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 9. MODEL (models/projectModel.js)                              │
│                                                                 │
│    create: async (data) => {                                   │
│      const sql = `                                             │
│        INSERT INTO projects (                                  │
│          client_id, title, description, domain, ...            │
│        )                                                        │
│        VALUES ($1, $2, $3, $4, ...)                            │
│        RETURNING *;                                            │
│      `;                                                         │
│                                                                 │
│      const { rows } = await pool.query(sql, [                  │
│        data.client_id,                                         │
│        data.title,                                             │
│        data.description,                                       │
│        // ...                                                  │
│      ]);                                                        │
│                                                                 │
│      return rows[0];                                           │
│    }                                                            │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 10. DATABASE (PostgreSQL/Supabase)                             │
│                                                                 │
│     Executes SQL:                                              │
│     INSERT INTO projects (...)                                 │
│     VALUES (...)                                               │
│                                                                 │
│     Returns inserted row:                                      │
│     {                                                           │
│       id: "proj-456",                                          │
│       client_id: "abc-123",                                    │
│       title: "AI Chatbot",                                     │
│       status: "draft",                                         │
│       created_at: "2025-12-23T10:30:00Z"                       │
│     }                                                           │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    DATA FLOWS BACK UP
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 11. MODEL → CONTROLLER → ROUTE → SERVER                        │
│                                                                 │
│     Response sent to frontend:                                 │
│     {                                                           │
│       message: "Project created successfully",                 │
│       data: { ...project object... }                           │
│     }                                                           │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    ══════════════════════
                    ║  NETWORK (HTTP)    ║
                    ══════════════════════
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 12. API CLIENT (lib/api.ts)                                    │
│                                                                 │
│     Receives response, parses JSON                             │
│     Returns data to hook                                       │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 13. HOOK (useProjects.ts)                                      │
│                                                                 │
│     TanStack Query updates cache                               │
│     Triggers onSuccess callback                                │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 14. COMPONENT (CreateProjectPage.tsx)                          │
│                                                                 │
│     onSuccess: (data) => {                                     │
│       toast.success('Project created!');                       │
│       navigate(`/projects/${data.data.id}`);                   │
│     }                                                           │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ 15. USER SEES                                                   │
│     - Success toast notification                               │
│     - Redirected to project detail page                        │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** database (via Supabase)
- **Git**

### Installation Steps

**1. Clone the repository**
```bash
cd Downloads
cd Deeptech
```

**2. Set up Backend**
```bash
cd deeptech_backend
npm install
```

**3. Create `.env` file in `deeptech_backend/`**
```env
PORT=5000
SUPABASE_CONNECTION_STRING=your_postgresql_connection_string
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
```

**4. Start Backend**
```bash
npm start
```
✅ Backend should be running on http://localhost:5000

**5. Set up Frontend**
```bash
cd ../deeptech
npm install
```

**6. Create `.env` file in `deeptech/`**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**7. Start Frontend**
```bash
npm run dev
```
✅ Frontend should be running on http://localhost:8080

**8. Test the Application**
1. Open http://localhost:8080
2. Click "Register" and create an account
3. Login with your credentials
4. Create a project
5. Browse experts

---

## 🔍 Troubleshooting

### Common Issues

**1. "Cannot connect to database"**
- Check `SUPABASE_CONNECTION_STRING` in `.env`
- Ensure database is accessible
- Check network/firewall settings

**2. "Invalid token" errors**
- Check `JWT_SECRET` matches in backend
- Clear localStorage and login again
- Token may have expired (default: 24h)

**3. "CORS error" in browser**
- Backend must be running on port 5000
- Check CORS configuration in server.js
- Frontend must be on port 8080

**4. "Module not found" errors**
- Run `npm install` in both directories
- Delete `node_modules` and reinstall
- Check Node.js version (v18+)

---

## 📚 Key Concepts Explained

### What is REST API?
A way for applications to communicate over HTTP using:
- URLs (endpoints): `/api/projects`
- HTTP methods: GET, POST, PUT, DELETE
- JSON data format

### What is JWT?
**JSON Web Token** - A secure way to verify user identity:
1. User logs in
2. Server creates encrypted token with user info
3. Frontend stores token
4. Frontend sends token with every request
5. Backend verifies token to know who the user is

### What is PostgreSQL?
A powerful relational database that:
- Stores data in tables (like Excel sheets)
- Uses SQL language to query data
- Ensures data integrity with relationships

### What is React?
A JavaScript library for building user interfaces:
- Components: Reusable UI pieces
- State: Data that changes
- Props: Data passed to components
- Hooks: Special functions (useState, useEffect, etc.)

### What is TypeScript?
JavaScript with types:
```typescript
// JavaScript (no types)
function add(a, b) {
  return a + b;
}

// TypeScript (with types)
function add(a: number, b: number): number {
  return a + b;
}
```
Prevents bugs by catching errors during development.

---

## 🎓 Learning Path for Beginners

### 1. Understand the Stack
- **Frontend**: HTML → CSS → JavaScript → React → TypeScript
- **Backend**: JavaScript → Node.js → Express → PostgreSQL
- **Tools**: Git, npm, VS Code

### 2. Trace a Feature End-to-End
Pick a simple feature like "View Projects List" and trace:
1. Which page component renders it?
2. Which hook fetches the data?
3. Which API endpoint is called?
4. Which route handles it?
5. Which controller processes it?
6. Which model queries the database?
7. What SQL query runs?

### 3. Modify Existing Code
Start by making small changes:
- Add a new field to project form
- Change button colors
- Add validation to a form
- Modify a database query

### 4. Build a New Feature
Try adding:
- Comments on projects
- User profile pictures
- Project tags/labels
- Email notifications

### 5. Key Files to Study
For backend:
1. `server.js` - Understand how server starts
2. `middleware/auth.js` - How authentication works
3. `models/projectModel.js` - How database queries work

For frontend:
1. `App.tsx` - How routing works
2. `contexts/AuthContext.tsx` - How global state works
3. `lib/api.ts` - How API calls work
4. Any page in `pages/` - How components structure pages

---

## 📖 Glossary

- **API**: Application Programming Interface - a way for applications to talk to each other
- **Endpoint**: A specific URL that performs an action (e.g., `/api/projects`)
- **JWT**: JSON Web Token - encrypted string that identifies a user
- **Middleware**: Code that runs before the main handler (e.g., authentication check)
- **Model**: Code that interacts with the database
- **Controller**: Code that handles business logic
- **Route**: Maps URLs to controller functions
- **Component**: Reusable piece of UI in React
- **Hook**: Special React function (useState, useEffect, custom hooks)
- **State**: Data that can change in a component
- **Props**: Data passed from parent to child component
- **Context**: Global state shared across components
- **Query**: Request to read data from database
- **Mutation**: Request to modify data in database (create/update/delete)
- **TypeScript Interface**: Defines shape of an object
- **CORS**: Cross-Origin Resource Sharing - allows frontend on one domain to call backend on another
- **SQL**: Structured Query Language - used to query databases
- **Pool**: Collection of database connections ready to use
- **Schema**: Structure of database tables and relationships
- **Migration**: Script to change database structure
- **Validation**: Checking if data is correct before processing
- **Authentication**: Verifying who you are (login)
- **Authorization**: Verifying what you're allowed to do (permissions)

---

## 🎯 Summary

This is a **full-stack marketplace** platform connecting buyers with deep-tech experts. It uses:

- **Backend**: Node.js/Express API with PostgreSQL database
- **Frontend**: React/TypeScript SPA (Single Page Application)
- **Auth**: JWT-based authentication
- **Database**: PostgreSQL via Supabase

**Data flows:**
1. User interacts with React UI
2. React calls API endpoints
3. Express backend processes requests
4. PostgreSQL stores/retrieves data
5. Data flows back to UI

**Key features:**
- User registration/login
- Project creation and management
- Expert discovery with filters
- Contract creation
- Messaging between users
- Work logging

Start by exploring the code, making small changes, and gradually building new features!
