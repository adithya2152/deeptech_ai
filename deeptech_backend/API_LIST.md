
---

## Day Work Summaries APIs

For daily contract work logging and approval.

### 1. Submit Daily Work Summary

**POST** `/api/day-work-summaries/`

- **Auth:** Expert only
- **Description:** Submit work summary for a single day
- **Request Body:**

```json
{
  "contract_id": "uuid",
  "work_date": "2025-12-28",
  "total_hours": 8
}
```

- **Response:** Created work summary with status "pending"
- **Notes:** Limited to 1 submission per 24 hours

---

### 2. Get My Work Summaries

**GET** `/api/day-work-summaries/my-summaries`

- **Auth:** Expert only
- **Description:** Get all work summaries submitted by the current expert
- **Response:** Array of all work summaries

---

### 3. Get Contract Work Summaries

**GET** `/api/day-work-summaries/contract/:contractId`

- **Auth:** Buyer/Expert/Admin on that contract
- **Description:** Get all work summaries for a specific contract
- **Response:** Array of work summaries for the contract

---

### 4. Get Single Work Summary

**GET** `/api/day-work-summaries/:summaryId`

- **Auth:** Buyer/Expert/Admin on that contract
- **Description:** Get details of a specific work summary
- **Response:** Single work summary object

---

### 5. Approve/Reject Work Summary

**PATCH** `/api/day-work-summaries/:summaryId/status`

- **Auth:** Buyer/Admin only
- **Description:** Approve or reject submitted work (auto-creates invoice on approval)
- **Request Body:**

```json
{
  "status": "approved",
  "reviewer_comment": "Great work today!"
}
```

- **Response:** Updated work summary + created invoice (if approved)
- **Auto-Action:** Invoice automatically created when status = "approved"

---

## Invoice APIs

For viewing and paying invoices.

### 6. Get Invoice Details

**GET** `/api/invoices/:invoiceId`

- **Auth:** Buyer/Expert/Admin on that contract
- **Description:** Get details of a specific invoice
- **Response:** Single invoice object

---

### 7. Pay Invoice

**PATCH** `/api/invoices/:invoiceId/pay`

- **Auth:** Buyer/Admin only
- **Description:** Mark invoice as paid and release funds from escrow
- **Request Body:** None required
- **Response:** Updated invoice + updated contract balances
- **Auto-Actions:**
  - Invoice status → "paid"
  - Escrow balance decreases
  - Total amount paid increases
  - Released total increases

---

## Contract APIs (New Endpoints)

New endpoints added for escrow and contract management.

### 8. Fund Escrow

**POST** `/api/contracts/:contractId/fund`

- **Auth:** Buyer/Admin only
- **Description:** Add money to the contract's escrow balance
- **Request Body:**

```json
{
  "amount": 10000
}
```

- **Response:** Updated contract with new escrow_balance
- **Auto-Actions:**
  - Escrow balance increases
  - Escrow funded total increases

---

### 9. Finish Sprint

**POST** `/api/contracts/:id/finish-sprint`

- **Auth:** Buyer/Admin only
- **Description:** Complete current sprint and start the next one (sprint contracts only)
- **Request Body:** None required
- **Response:** Updated contract with incremented sprint number
- **Auto-Actions:**
  - Invoice created for completed sprint
  - Sprint number increments
  - New sprint start date set

---

### 10. Complete Contract

**POST** `/api/contracts/:id/complete`

- **Auth:** Buyer/Admin only
- **Description:** Mark contract as completed
- **Request Body:** None required
- **Response:** Updated contract with status "completed"
- **Auto-Actions:**
  - Contract status → "completed"
  - For fixed contracts: Final invoice created

---

## Contract APIs (Existing Endpoints)

These endpoints were already working and remain unchanged.

### 11. Get Contract Details

**GET** `/api/contracts/:contractId`

- **Auth:** Buyer/Expert/Admin on that contract
- **Description:** Get full contract details including payment terms

---

### 12. Get Contract Invoices

**GET** `/api/contracts/:contractId/invoices`

- **Auth:** Buyer/Expert/Admin on that contract
- **Description:** Get all invoices for a specific contract
- **Response:** Array of invoices

---

### 13. Create Contract

**POST** `/api/contracts/`

- **Auth:** Buyer only
- **Description:** Create a new contract for a project
- **Request Body:** Contract details including engagement model and payment terms

---

### 14. Accept Contract & Sign NDA

**POST** `/api/contracts/:contractId/accept-and-sign-nda`

- **Auth:** Expert only
- **Description:** Expert accepts contract and signs NDA (activates contract)
- **Request Body:**

```json
{
  "signature_name": "John Doe"
}
```

---

### 15. Get My Contracts

**GET** `/api/contracts/`

- **Auth:** Any authenticated user
- **Description:** Get all contracts for the current user
- **Response:** Array of contracts (filtered by role)

---

### 16. Get Project Contracts

**GET** `/api/contracts/project/:projectId`

- **Auth:** Any authenticated user
- **Description:** Get all contracts for a specific project
- **Response:** Array of contracts

---

### 17. Decline Contract

**POST** `/api/contracts/:contractId/decline`

- **Auth:** Expert only
- **Description:** Expert declines a pending contract
- **Response:** Success message

---

## Quick Reference by Role

### Expert Permissions

✅ Can Use:

- POST `/api/day-work-summaries/` - Submit work
- GET `/api/day-work-summaries/my-summaries` - View my work
- GET `/api/contracts/:contractId` - View contract
- GET `/api/contracts/:contractId/invoices` - View invoices
- POST `/api/contracts/:contractId/accept-and-sign-nda` - Sign contract
- POST `/api/contracts/:contractId/decline` - Decline contract

❌ Cannot Use:

- Approve/reject work
- Fund escrow
- Pay invoices
- Finish sprints
- Complete contracts

---

### Buyer Permissions

✅ Can Use:

- All GET endpoints (view everything)
- PATCH `/api/day-work-summaries/:summaryId/status` - Approve/reject work
- POST `/api/contracts/:contractId/fund` - Fund escrow
- PATCH `/api/invoices/:invoiceId/pay` - Pay invoices
- POST `/api/contracts/:id/finish-sprint` - Finish sprints
- POST `/api/contracts/:id/complete` - Complete contracts
- POST `/api/contracts/` - Create contracts

❌ Cannot Use:

- Submit daily work summaries
- Sign NDA (that's for experts)

---

### Admin Permissions

✅ Can Use:

- All endpoints (full access)

---

## Automatic Actions Summary

These happen automatically without additional API calls:

1. **Invoice Auto-Creation:**

   - When daily work is approved → Periodic invoice created
   - When sprint finishes → Sprint invoice created
   - When fixed contract completes → Final invoice created

2. **Balance Updates:**

   - When invoice paid → Escrow decreases, total_amount increases
   - When escrow funded → Escrow balance increases

3. **Contract State Changes:**

   - When sprint finishes → Sprint number increments
   - When NDA signed → Contract activates
   - When contract completed → Status changes to "completed"

4. **Week Range Calculation:**

   - Daily invoices automatically get Monday-Sunday range

5. **Duplicate Prevention:**
   - Same work summary won't create multiple invoices

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    /* relevant data */
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Common HTTP Status Codes

- **200** - Success
- **201** - Created (new resource)
- **400** - Bad Request (validation error)
- **403** - Forbidden (permission denied)
- **404** - Not Found
- **500** - Internal Server Error

---

## Base URL

Development: `http://localhost:3000`

All endpoints are prefixed with `/api`

**Example:** `http://localhost:3000/api/contracts/abc-123/fund`

---

## Files Created/Modified

### New Files:

- `models/invoiceModel.js`
- `models/dayWorkSummaryModel.js`
- `controllers/invoiceController.js`
- `controllers/dayWorkSummaryController.js`
- `routes/invoiceRoutes.js`
- `routes/dayWorkSummariesRoutes.js`

### Modified Files:

- `models/contractModel.js`
- `controllers/contractController.js`
- `routes/contractsRoutes.js`
- `server.js`

---

## Testing Flow Example

### Daily Contract Full Flow:

1. Buyer creates contract → `POST /api/contracts/`
2. Expert signs NDA → `POST /api/contracts/:id/accept-and-sign-nda`
3. Buyer funds escrow → `POST /api/contracts/:id/fund` with `{ amount: 10000 }`
4. Expert submits work → `POST /api/day-work-summaries/` with work details
5. Buyer approves → `PATCH /api/day-work-summaries/:id/status` (invoice auto-created)
6. Buyer pays invoice → `PATCH /api/invoices/:id/pay` (escrow releases)
7. Repeat steps 4-6 for each work day

### Sprint Contract Full Flow:

1. Buyer creates contract → `POST /api/contracts/`
2. Expert signs NDA → `POST /api/contracts/:id/accept-and-sign-nda`
3. Buyer funds escrow → `POST /api/contracts/:id/fund`
4. Expert works for sprint duration (no API calls)
5. Buyer finishes sprint → `POST /api/contracts/:id/finish-sprint` (invoice auto-created)
6. Buyer pays invoice → `PATCH /api/invoices/:id/pay`
7. Repeat steps 5-6 for each sprint

---

## Total Endpoints

**New in Epic 7:** 10 endpoints
**Existing (unchanged):** 7 endpoints
**Total Available:** 17 endpoints
