# Quick Start Guide - Frontend + Backend Integration

## ✅ Migration Complete!

Your frontend now uses the backend API instead of direct Supabase access.

---

## 🚀 Running the Application

### Step 1: Start Backend Server

```bash
cd deeptech_backend
npm install  # First time only
npm start
```

✅ Backend running on: **http://localhost:5000**
📚 API Docs: **http://localhost:5000/api-docs**

### Step 2: Start Frontend

```bash
cd deeptech
npm install  # First time only
npm run dev
```

✅ Frontend running on: **http://localhost:8080**

---

## 🔍 How to Verify It's Working

### 1. Open Browser DevTools
- Press `F12` or right-click → Inspect
- Go to **Network** tab

### 2. Use the Application
- Register/Login as a user
- Create a project
- Browse experts

### 3. Check Network Requests
You should see requests like:
```
POST http://localhost:5000/api/projects
GET  http://localhost:5000/api/experts?domain=ai_ml
```

**✅ If you see requests to `localhost:5000` → Migration successful!**
**❌ If you see requests to `supabase.co` → Something went wrong**

---

## 📋 What's Changed

### Before
```javascript
// ❌ OLD - Direct Supabase call
const { data } = await supabase.from('projects').select('*')
```

### After
```javascript
// ✅ NEW - Backend API call
const response = await projectsApi.getAll(token)
const projects = response.data
```

---

## 🔧 Configuration

### Frontend Environment (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://vcxrqnkfuufvyiztunwi.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

**Note:** Supabase credentials still in frontend for auth only. Backend handles all database operations.

---

## 🎯 Current API Endpoints

### Projects
- ✅ `POST /api/projects` - Create project
- ✅ `PUT /api/projects/:id` - Update project
- ✅ `DELETE /api/projects/:id` - Delete project

### Experts
- ✅ `GET /api/experts` - Search experts

---

## ⚠️ Known Limitations

### Endpoints NOT Yet Implemented by Backend

1. **Projects**
   - `GET /api/projects` (get all)
   - `GET /api/projects/:id` (get single)

2. **Experts**
   - `GET /api/experts/:id` (get single)

3. **Authentication** (Frontend still uses Supabase auth directly)
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `GET /api/auth/me`

4. **Messages** (Not implemented)
   - Entire messaging system

**Solution:** Frontend will show errors when calling these. Backend team needs to implement them following patterns in `BACKEND_REQUIREMENTS.md`.

---

## 🐛 Troubleshooting

### "Failed to fetch" errors

**Problem:** Backend not running
**Solution:**
```bash
cd deeptech_backend
npm start
```

### CORS errors

**Problem:** Backend CORS not configured
**Solution:** Backend already has `app.use(cors())` - should work

### 404 errors on API calls

**Problem:** Backend doesn't have that endpoint yet
**Solution:** Check `BACKEND_REQUIREMENTS.md` and implement missing endpoint

### Auth token errors

**Problem:** JWT token not being sent
**Solution:** Make sure you're logged in. Token comes from `session.access_token`

---

## 📚 Documentation Files

1. **`BACKEND_REQUIREMENTS.md`** - Complete API specification for backend team
2. **`MIGRATION_COMPLETE.md`** - Detailed migration documentation
3. **`README.md`** (this file) - Quick start guide

---

## 🎉 Success Checklist

- [x] Frontend removed all direct Supabase database calls
- [x] API client created (`src/lib/api.ts`)
- [x] All hooks updated to use API
- [x] Backend running on port 5000
- [x] Frontend calling backend APIs
- [x] No TypeScript errors
- [ ] Backend implements remaining endpoints
- [ ] Field naming aligned (buyerId vs clientId)
- [ ] Authentication migrated to backend

---

## 💡 Tips

1. **Check Backend Logs:** Backend console shows all incoming requests
2. **Use Swagger Docs:** Visit http://localhost:5000/api-docs for API documentation
3. **Network Tab is Your Friend:** Always check what requests are being made
4. **React Query DevTools:** See cached data and request status

---

## 🤝 Team Coordination

### Frontend Team (You) ✅
- Migration to API calls complete
- Documented all required endpoints
- Ready for backend implementation

### Backend Team
- Implement remaining endpoints from `BACKEND_REQUIREMENTS.md`
- Match response format: `{ message: string, data: any }`
- Add authentication middleware
- Test with frontend team

---

**Questions?** Check `BACKEND_REQUIREMENTS.md` or `MIGRATION_COMPLETE.md` for details.

**Happy coding! 🚀**
