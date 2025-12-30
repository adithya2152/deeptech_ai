# Bug Fix: Project Status Filter Not Working

**Date:** December 20, 2025
**Status:** ✅ Fixed
**Severity:** High - Caused duplicate projects in UI

---

## The Bug: Duplicate Projects Across All Status Categories

### Root Cause

The `getMyProjects` controller function in `projectController.js` was **ignoring the `status` query parameter** from the frontend.

### What Was Happening

**Before Fix:**

```javascript
export const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id; 
    const projects = await projectModel.getProjectsByClient(userId); // ❌ No status parameter
    res.status(200).json({ data: projects }); 
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);
    res.status(500).json({ error: 'Server error' });
  }
};
```

**After Fix:**

```javascript
export const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status; // ✅ Extract status from query params
    const projects = await projectModel.getProjectsByClient(userId, status); // ✅ Pass to model
    res.status(200).json({ data: projects }); 
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);
    res.status(500).json({ error: 'Server error' });
  }
};
```

---

## The Flow of the Bug

### 1. Frontend Makes 3 Separate API Calls

**File:** `deeptech/src/pages/dashboard/DashboardPage.tsx`

```typescript
const { data: draftProjects, isLoading: loadingDrafts } = useProjects('draft');
const { data: activeProjects, isLoading: loadingActive } = useProjects('active');
const { data: completedProjects, isLoading: loadingCompleted } = useProjects('completed');

// These translate to:
// GET /api/projects?status=draft
// GET /api/projects?status=active
// GET /api/projects?status=completed
```

### 2. Frontend API Client Correctly Builds Query Strings

**File:** `deeptech/src/lib/api.ts`

```typescript
export const projectsApi = {
  getAll: (token: string, status?: string) => {
    const query = status ? `?status=${status}` : ''
    return api.get<{ data: any[] }>(`/projects${query}`, token)
  },
  // ...
}
```

✅ Frontend is working correctly - sends proper query parameters.

### 3. Backend Controller IGNORES the Query Parameter ❌

**File:** `deeptech_backend/controllers/projectController.js`

```javascript
export const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id; 
    const projects = await projectModel.getProjectsByClient(userId);
    // ❌ Missing: const status = req.query.status;
    // ❌ Status parameter not passed to model
    res.status(200).json({ data: projects }); 
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);
    res.status(500).json({ error: 'Server error' });
  }
};
```

**Problem:** Controller doesn't read `req.query.status`, so it always passes `undefined` to the model.

### 4. Model Has Correct Logic But Receives No Status

**File:** `deeptech_backend/models/projectModel.js`

```javascript
getProjectsByClient: async (clientId, status = null) => {
  let sql = `SELECT * FROM projects WHERE client_id = $1`;
  const params = [clientId];
  
  if (status) {  // ❌ status is always null/undefined from controller
    sql += ` AND status = $2`;
    params.push(status);
  }
  
  sql += ` ORDER BY created_at DESC`;
  const { rows } = await pool.query(sql, params);
  return rows;
}
```

**Problem:** The model is correctly designed to filter by status, but because the controller never passes the status parameter, the `if (status)` condition is always false.

### 5. Result: All 3 API Calls Return ALL Projects

**Actual Behavior:**

- `GET /api/projects?status=draft` → Returns ALL projects (draft, active, completed)
- `GET /api/projects?status=active` → Returns ALL projects (draft, active, completed)
- `GET /api/projects?status=completed` → Returns ALL projects (draft, active, completed)

**Expected Behavior:**

- `GET /api/projects?status=draft` → Returns ONLY draft projects
- `GET /api/projects?status=active` → Returns ONLY active projects
- `GET /api/projects?status=completed` → Returns ONLY completed projects

---

## The Impact

### Dashboard Showed Incorrect Counts

```javascript
console.log('📊 Projects counts:', { 
  draft: 1,      // ❌ Same project
  active: 1,     // ❌ Same project  
  completed: 1,  // ❌ Same project
  total: 1       // ✅ Correct count after deduplication
});
```

### Symptoms Observed

- ❌ **Duplicate project cards** in the UI (same project appearing multiple times)
- ❌ **React warning:** "Encountered two children with the same key, `19f3e11f-de35-45dd-b93c-5ce15dcf0e69`"
- ❌ **Incorrect status counts** on dashboard stats
- ❌ **Project appearing in multiple tabs** simultaneously (Draft Projects, Active Projects, Completed Projects)

---

## Why the Model Code Was Already Correct

The model (`projectModel.js`) already had the proper filtering logic:

- ✅ Accepts an optional `status` parameter
- ✅ Dynamically builds SQL query with `AND status = $2` when status is provided
- ✅ Without status, returns all projects (intended default behavior)

**The missing piece** was the controller not extracting `req.query.status` and passing it to the model.

---

## The Fix

### Changed File

**File:** `deeptech_backend/controllers/projectController.js`

### One Line Addition

```javascript
export const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status; // ✅ NEW: Extract from HTTP query params
    const projects = await projectModel.getProjectsByClient(userId, status); // ✅ Pass to model
    res.status(200).json({ data: projects }); 
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);
    res.status(500).json({ error: 'Server error' });
  }
};
```

### How It Works Now

1. **Frontend:** Sends `GET /api/projects?status=draft`
2. **Express Router:** Routes to `projectController.getMyProjects`
3. **Controller:** Reads `req.query.status` → `"draft"`
4. **Model:** Receives status parameter → Adds `AND status = 'draft'` to SQL query
5. **Database:** Executes `SELECT * FROM projects WHERE client_id = $1 AND status = $2`
6. **Response:** Returns ONLY draft projects ✅

---

## Testing Verification

### Before Fix

```javascript
// Dashboard console output
📊 Projects counts: { draft: 1, active: 1, completed: 1, total: 1 }
// Same project ID appearing 3 times
```

### After Fix

```javascript
// Dashboard console output (expected)
📊 Projects counts: { draft: 1, active: 0, completed: 0, total: 1 }
// OR
📊 Projects counts: { draft: 0, active: 1, completed: 0, total: 1 }
// Project appears in ONLY ONE category
```

---

## Lessons Learned

1. **Query Parameters Must Be Explicitly Read**

   - Express doesn't automatically pass query params to functions
   - Always extract from `req.query` when needed
2. **Frontend-Backend Contract Verification**

   - Frontend was sending correct query parameters
   - Backend assumed they would be automatically processed
   - Always verify the complete data flow
3. **Defensive Programming**

   - Model had defensive logic (`status = null` default)
   - But controller bypassed it by not passing the parameter
   - Both layers need to handle the parameter correctly
4. **Console Logging for Debugging**

   - Console logs revealed the duplicate counts immediately
   - React warnings about duplicate keys pointed to the root cause

---

## Related Files

- ✅ `deeptech_backend/controllers/projectController.js` - **FIXED**
- ✅ `deeptech_backend/models/projectModel.js` - Already correct
- ✅ `deeptech/src/lib/api.ts` - Already correct
- ✅ `deeptech/src/hooks/useProjects.ts` - Already correct
- ✅ `deeptech/src/pages/dashboard/DashboardPage.tsx` - Already correct

---

## Status: RESOLVED ✅

**Resolution Date:** December 20, 2025
**Backend Server Restarted:** Yes
**Testing Required:** Refresh browser and verify counts are correct
