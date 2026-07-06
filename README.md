# Plana API Reference — Frontend Integration Guide

This document contains everything needed to build a frontend against the Plana backend: every endpoint, request/response shape, auth rules, error codes, and data model. Treat this as the single source of truth when wiring up RTK Query (or any HTTP client).

---

## 1. Global Conventions

### Base URL
```
http://localhost:5000/api
```
Set via `VITE_API_BASE_URL` in the frontend `.env`. In production this becomes your deployed API domain.

### Authentication
Every protected endpoint requires a Bearer token:
```
Authorization: Bearer <accessToken>
```
- Access tokens expire in **15 minutes**.
- Refresh tokens expire in **7 days** and are stored server-side (DB) to allow logout/rotation.
- On a 401 response, call `POST /auth/refresh` with the stored refresh token before giving up — see Section 2.6.

### Standard Response Envelope

**Every successful response** follows this shape:
```json
{
  "success": true,
  "message": "Human readable message",
  "data": { /* endpoint-specific payload, may be omitted for 204s */ }
}
```

**Paginated responses** additionally include:
```json
{
  "success": true,
  "message": "Fetched successfully",
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Every error response** follows this shape:
```json
{
  "success": false,
  "message": "Human readable error message",
  "errorCode": "AUTH_001"
}
```
In development mode only, a `stack` field is also present — never present it to end users, and never rely on it being there in production.

### HTTP Status Code Meaning
| Code | Meaning | Frontend behavior |
|---|---|---|
| 200 | Success (GET, successful PATCH/POST that returns data) | Render data |
| 201 | Created | Render created resource, often navigate to it |
| 204 | Success, no body (DELETE, logout, etc.) | Update local state/cache, no data to render |
| 400 | Validation error / bad request | Show `message` inline, usually field-level |
| 401 | Not authenticated / token invalid or expired | Attempt token refresh, else redirect to login |
| 403 | Authenticated but forbidden (role/ownership) | Show permission error, do not retry |
| 404 | Resource not found | Show not-found state |
| 409 | Conflict (duplicate email, project key, etc.) | Show conflict message inline |
| 429 | Rate limited | Show "too many requests, try again in X" |
| 500 | Unexpected server error | Generic error toast, do not show raw message in prod |

### Error Code Registry
| Code | Meaning |
|---|---|
| AUTH_001 | Invalid email or password / invalid credentials |
| AUTH_002 | Email already exists |
| AUTH_003 | Token expired |
| AUTH_004 | Token invalid (malformed, reused refresh token) |
| AUTH_005 | Unauthorized (no token provided) |
| AUTH_006 | Forbidden |
| AUTH_007 | Auth provider mismatch (e.g. trying password login on a Google account) |
| WORKSPACE_001 | Workspace not found |
| WORKSPACE_002 | Slug conflict (handled automatically server-side, rarely surfaces) |
| WORKSPACE_003 | Forbidden — not a member / insufficient role |
| MEMBER_001 | Member not found |
| MEMBER_002 | Member already exists |
| MEMBER_003 | Role change forbidden (e.g. trying to set OWNER directly, or change own role) |
| MEMBER_004 | Action would remove the last OWNER |
| PROJECT_001 | Project not found |
| PROJECT_002 | Project key conflict within workspace |
| PROJECT_003 | Forbidden — not a project member / insufficient role |
| INVITE_001 | Invitation not found |
| INVITE_002 | Invitation expired |
| INVITE_003 | Invitation already accepted |
| INVITE_004 | Invitation revoked |
| INVITE_005 | Invitee is already a workspace member |
| ISSUE_001 | Issue not found |
| ISSUE_002 | Invalid parent relationship |
| ISSUE_003 | Invalid status transition |
| ISSUE_004 | Forbidden |
| SPRINT_001 | Sprint not found |
| SPRINT_002 | Sprint already active (only one active sprint per project) |
| SPRINT_003 | Sprint not active (action requires ACTIVE status) |
| SPRINT_004 | Sprint already completed (immutable) |
| SPRINT_005 | Invalid dates (endDate before startDate) |
| COMMENT_001 | Comment not found |
| COMMENT_002 | Forbidden (not author, not admin) |
| NOTIF_001 | Notification not found |
| GENERAL_001 | Route not found (404 catch-all) |
| GENERAL_002 | Validation error (Joi schema failure) |
| GENERAL_003 | Internal server error (unexpected) |

### ID Conventions
All resource IDs are MongoDB ObjectIds, returned as 24-character hex strings. Every nested route requires the parent IDs in the URL path — for example, fetching an issue requires `workspaceId`, `projectId`, and `issueId` all present in the path even though only `issueId` is strictly needed to look up the document. This is intentional: it lets backend authorization middleware verify the full chain of membership (workspace → project) before touching the resource.

---

## 2. Auth Module — `/api/auth`

No authentication required for: `register`, `login`, `check-email`, `otp/send`, `otp/verify`, `google`, `google/callback`, `refresh`, `health`.
Authentication required for: `logout`, `me`.

### 2.1 Health Check
```
GET /api/auth/health
```
No auth. No body.

**Response 200**
```json
{ "success": true, "message": "Auth service is running" }
```

---

### 2.2 Check Email
```
POST /api/auth/check-email
```
Used on the landing page before showing a login/register form — lets the frontend show the correct method (password field vs Google button vs OTP) based on how the user originally signed up.

**Request body**
```json
{ "email": "john@example.com" }
```
| Field | Type | Rules |
|---|---|---|
| email | string | required, valid email format |

**Response 200 — email not registered**
```json
{
  "success": true,
  "message": "Email checked successfully",
  "data": { "exists": false, "provider": null }
}
```

**Response 200 — email registered**
```json
{
  "success": true,
  "message": "Email checked successfully",
  "data": { "exists": true, "provider": "email" }
}
```
`provider` is one of: `"email"`, `"google"`, `"otp"`.

**Errors**: 400 (GENERAL_002) invalid email format. 429 after 20 requests / 15 min from one IP.

---

### 2.3 Register
```
POST /api/auth/register
```
**Request body**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
| Field | Type | Rules |
|---|---|---|
| name | string | required, 2–50 chars |
| email | string | required, valid email, must be unique |
| password | string | required, min 8 chars |

**Response 201**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "_id": "665abc...",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": null,
      "authProvider": "email",
      "isEmailVerified": false
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```
Frontend should immediately store both tokens and the user object, then treat the user as logged in — no separate login call is needed after registration.

**Errors**: 409 (AUTH_002) email already exists. 400 (GENERAL_002) validation failure (each field's message is human-readable, e.g. "Password must be at least 8 characters"). 429 after 10 requests / 15 min.

---

### 2.4 Login
```
POST /api/auth/login
```
**Request body**
```json
{ "email": "john@example.com", "password": "password123" }
```
**Response 200** — identical shape to register's `data` object.

**Errors**:
- 401 (AUTH_001) — wrong password OR email not found (deliberately the same message for both, to avoid leaking which emails are registered during login specifically).
- 400 (AUTH_001) — account exists but uses a different provider (e.g. `"This account uses google login. Please use that method instead."`). Frontend should detect this and offer the Google button.
- 429 after 10 requests / 15 min.

---

### 2.5 OTP Login (Passwordless)
Two-step flow. Step 1 sends a 6-digit code via email; step 2 verifies it and issues tokens. If the email has never been seen before, step 1 **auto-creates** an account with `authProvider: "otp"`.

```
POST /api/auth/otp/send
```
**Request body**
```json
{ "email": "newuser@example.com" }
```
**Response 200**
```json
{ "success": true, "message": "OTP sent successfully. Check your email." }
```
**Errors**: 400 (AUTH_001) if the email belongs to a password-provider account — frontend should redirect to password login instead. 429 after 5 requests / 15 min (stricter limiter — each call sends a real email).

```
POST /api/auth/otp/verify
```
**Request body**
```json
{ "email": "newuser@example.com", "otp": "482910" }
```
| Field | Type | Rules |
|---|---|---|
| otp | string | exactly 6 digits, numeric only |

**Response 200** — same `{ user, accessToken, refreshToken }` shape as login.

**Errors**: 401 (AUTH_001) with one of three messages depending on failure reason — expired, max attempts (5) exceeded, or simply wrong code. The OTP is single-use; verifying it twice with the same code returns 401 on the second attempt. 400 (GENERAL_002) if the format isn't 6 digits.

---

### 2.6 Token Refresh
```
POST /api/auth/refresh
```
**Request body**
```json
{ "refreshToken": "eyJ..." }
```
**Response 200**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
}
```
**Critical detail**: refresh tokens rotate on every use. The old refresh token becomes invalid the instant a new one is issued — store the new one immediately, or the user will be logged out on the next refresh attempt with the stale token (401 AUTH_004, "reuse detected").

This is the endpoint the frontend's HTTP client wrapper should call automatically whenever any request returns 401, before falling back to a forced logout.

---

### 2.7 Logout
```
POST /api/auth/logout
```
**Auth required.** No body.

**Response 204** — no body. Server nulls the stored refresh token, so it can no longer be used even if the client retained it somewhere.

Frontend must clear both tokens and the user object from local state/storage regardless of whether this call succeeds — a failed logout request (e.g. network error) should never block the user from being logged out locally.

---

### 2.8 Get Current User
```
GET /api/auth/me
```
**Auth required.**

**Response 200**
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "user": {
      "_id": "665abc...",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": null,
      "authProvider": "email",
      "isEmailVerified": false
    }
  }
}
```
Frontend calls this once on app boot if a token exists locally, to verify the session is still valid and to get fresh user data (in case the name/avatar changed since the token was issued).

**Errors**: 401 (AUTH_004/AUTH_005) if token invalid/missing.

---

### 2.9 Google OAuth
```
GET /api/auth/google
```
Not an AJAX call — the frontend must do a **full browser redirect** to this URL (`window.location.href = ...`), not a fetch. No auth, no body.

This redirects to Google's consent screen, then Google redirects back to:
```
GET /api/auth/google/callback
```
which the backend handles entirely — it ultimately redirects the **browser** to:
```
{CLIENT_URL}/auth/callback?accessToken=...&refreshToken=...
```

**Frontend responsibility**: create a route at `/auth/callback` that reads `accessToken` and `refreshToken` from the URL query string on mount, stores them, fetches `/auth/me` to get the user object, then redirects into the app and strips the tokens out of the URL (never leave tokens sitting in browser history).

If Google auth fails, the browser is instead redirected to:
```
{CLIENT_URL}/login?error=google_failed
```
Frontend should check for this query param on the login page and show an error banner.
## 3. Workspace Module — `/api/workspaces`

All routes require auth. Most require a minimum role within the workspace, enforced server-side — but the frontend should still hide/disable actions a user can't perform, rather than relying solely on the 403 to communicate this.

### Role Hierarchy
```
OWNER > ADMIN > MEMBER
```
A role check for "MEMBER" passes for OWNER, ADMIN, and MEMBER. A check for "ADMIN" passes for OWNER and ADMIN only.

### 3.1 Create Workspace
```
POST /api/workspaces
```
**Request body**
```json
{ "name": "Acme Corp", "description": "Main company workspace", "logo": null }
```
| Field | Type | Rules |
|---|---|---|
| name | string | required, 2–50 chars |
| description | string | optional, max 200 chars |
| logo | string | optional, valid URL |

**Response 201**
```json
{
  "success": true,
  "message": "Workspace created successfully",
  "data": {
    "workspace": {
      "_id": "665abc...",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "Main company workspace",
      "logo": null,
      "owner": "664xyz...",
      "isInviteOnly": true,
      "createdAt": "2026-06-05T...",
      "updatedAt": "2026-06-05T..."
    }
  }
}
```
**Important for frontend**: `slug` is auto-generated and auto-deduplicated server-side (`acme-corp`, then `acme-corp-2` if the name is reused). Never let the user type their own slug — there is no field for it.

The creator is automatically granted `OWNER` role — no separate "add member" call needed after creating a workspace.

### 3.2 Get My Workspaces
```
GET /api/workspaces
```
**Response 200**
```json
{
  "success": true,
  "message": "Workspaces fetched successfully",
  "data": {
    "workspaces": [
      {
        "_id": "665abc...",
        "name": "Acme Corp",
        "slug": "acme-corp",
        "description": "...",
        "logo": null,
        "owner": { "_id": "...", "name": "John Doe", "email": "..." },
        "role": "OWNER",
        "joinedAt": "2026-06-05T..."
      }
    ]
  }
}
```
This is the list to render on a workspace-switcher / landing page. `role` here is the *current user's* role in that specific workspace — use it to conditionally render admin controls in the UI.

### 3.3 Get Single Workspace
```
GET /api/workspaces/:workspaceId
```
Minimum role: **MEMBER**.

**Response 200** — same workspace shape as above, with `owner` populated as `{ _id, name, email, profilePicture }`.

**Errors**: 404 (WORKSPACE_001) not found. 403 (WORKSPACE_003) not a member.

### 3.4 Update Workspace
```
PATCH /api/workspaces/:workspaceId
```
Minimum role: **ADMIN**.

**Request body** (all fields optional, at least one required)
```json
{ "name": "Acme Corporation", "description": "Updated", "logo": "https://..." }
```
If `name` changes, `slug` regenerates automatically.

**Response 200** — updated workspace object.

**Errors**: 400 (GENERAL_002) if body is empty. 403 if role insufficient.

### 3.5 Delete Workspace
```
DELETE /api/workspaces/:workspaceId
```
Minimum role: **OWNER** only — ADMIN is not sufficient.

**Response 204** — no body.

**Note for frontend**: this currently does not cascade-delete projects/issues/comments belonging to the workspace (flagged as future work on the backend) — show a strong confirmation dialog regardless.

### 3.6 Leave Workspace
```
POST /api/workspaces/:workspaceId/leave
```
Minimum role: **MEMBER** (i.e., any member can call this on themselves).

**Response 204.**

**Errors**: 400 (MEMBER_004) if the caller is the last remaining OWNER — frontend should show "transfer ownership first" messaging rather than a generic error.

---

## 4. Workspace Members — `/api/workspaces/:workspaceId/members`

### 4.1 Get Members
```
GET /api/workspaces/:workspaceId/members
```
Minimum role: MEMBER.

**Response 200**
```json
{
  "success": true,
  "message": "Members fetched successfully",
  "data": {
    "members": [
      {
        "_id": "667def...",
        "userId": { "_id": "...", "name": "John Doe", "email": "...", "profilePicture": null },
        "role": "OWNER",
        "joinedAt": "2026-06-05T..."
      }
    ]
  }
}
```
The `_id` on each entry is the **WorkspaceMember record's ID**, not the user's ID — needed for the update-role and remove-member endpoints below.

### 4.2 Update Member Role
```
PATCH /api/workspaces/:workspaceId/members/:memberId
```
Minimum role: ADMIN. `:memberId` is the **target user's ID** (not the membership record ID, despite the param name pattern elsewhere — this endpoint resolves it internally).

**Request body**
```json
{ "role": "ADMIN" }
```
Valid values: `"ADMIN"`, `"MEMBER"` only — `"OWNER"` cannot be set this way (returns 400 MEMBER_003; ownership transfer is a separate, not-yet-built flow).

**Response 200** — updated membership object.

**Errors**: 400 (MEMBER_003) trying to change your own role, or trying to set OWNER, or demoting the last OWNER (MEMBER_004). 404 (MEMBER_001) target not found.

### 4.3 Remove Member
```
DELETE /api/workspaces/:workspaceId/members/:memberId
```
Minimum role: ADMIN. `:memberId` is the target user's ID.

**Response 204.**

**Errors**: 400 (MEMBER_003) trying to remove yourself (use leave-workspace instead) or trying to remove an OWNER.

---

## 5. Invitations — `/api/workspaces/:workspaceId/invitations`

### 5.1 Send Invitation
```
POST /api/workspaces/:workspaceId/invitations
```
Minimum role: ADMIN.

**Request body**
```json
{ "email": "newuser@example.com", "role": "MEMBER" }
```
`role` optional, defaults to `"MEMBER"`. Valid values: `"ADMIN"`, `"MEMBER"`.

**Response 200**
```json
{ "success": true, "message": "Invitation sent successfully." }
```
No invitation object is returned here — fetch the list (5.3) to get the record/token if needed for UI purposes.

**Errors**: 409 (INVITE_005) invitee already a workspace member. 400 (GENERAL_002) invalid email. Re-inviting the same email auto-revokes the previous pending invite and creates a new one — no error, this is silent and expected.

### 5.2 Accept Invitation
```
POST /api/workspaces/:workspaceId/invitations/accept
```
**Auth required** — the user must be logged in (registered or freshly registered) before calling this.

**Request body**
```json
{ "token": "1eea705eef3bd67eca71f6c87a6f69b7e979e85bb57a1cfd0427ccf355a1c2a0" }
```
The token comes from the invite email link, format: `{CLIENT_URL}/invitations/accept?token=...`.

**Response 200**
```json
{ "success": true, "message": "Invitation accepted successfully", "data": { "workspaceId": "665abc..." } }
```

**Critical frontend flow** — handling invites for users who don't have an account yet:
1. User clicks the email link → frontend route reads `?token=` from the URL.
2. Immediately persist the token (sessionStorage) before anything else.
3. Call `GET .../invitations/details?token=...` (5.5, public, no auth) to show "You've been invited to join X" with a pre-filled email.
4. Route to register (new user) or login (existing user) — pre-fill the email field either way.
5. After successful register/login, read the token back out of sessionStorage and call this accept endpoint.
6. Clear the token from sessionStorage and redirect into the workspace.

**Errors**: 404 (INVITE_001) bad token. 400 (INVITE_002) expired (7 day TTL). 400 (INVITE_003) already accepted. 400 (INVITE_004) revoked. 403 if the logged-in user's email doesn't match the invitation's email (security check — prevents a forwarded link being used by the wrong person).

### 5.3 Get All Invitations
```
GET /api/workspaces/:workspaceId/invitations
```
Minimum role: ADMIN.

**Response 200**
```json
{
  "data": {
    "invitations": [
      {
        "_id": "667def...",
        "email": "newuser@example.com",
        "role": "MEMBER",
        "status": "PENDING",
        "invitedBy": { "name": "John Doe", "email": "..." },
        "expiresAt": "2026-06-12T..."
      }
    ]
  }
}
```
`status` is one of `"PENDING"`, `"ACCEPTED"`, `"REVOKED"`. The hashed token itself is never returned in this list — only usable for management UI (revoke button, expiry display), never for re-sending the actual link.

### 5.4 Revoke Invitation
```
DELETE /api/workspaces/:workspaceId/invitations/:invitationId
```
Minimum role: ADMIN.

**Response 204.**

### 5.5 Get Invitation Details (Public)
```
GET /api/workspaces/:workspaceId/invitations/details?token=...
```
**No auth required** — this is the one invitation endpoint callable before login, used to render the "you've been invited" landing screen.

**Response 200**
```json
{
  "data": {
    "email": "newuser@example.com",
    "role": "MEMBER",
    "workspaceName": "Acme Corporation",
    "workspaceLogo": null,
    "expiresAt": "2026-06-12T..."
  }
}
```
**Errors**: 404/400 with the same invite-state error codes as 5.2 — if the invite is expired/revoked/accepted, show that state instead of a generic form.
## 6. Project Module — `/api/workspaces/:workspaceId/projects`

Project-level roles are **independent** from workspace-level roles: `ADMIN > MEMBER > VIEWER`. A user must first be a workspace member before they can be added to any project inside it — but workspace membership alone grants **zero** project access. Project access is always a separate, explicit step.

### 6.1 Create Project
```
POST /api/workspaces/:workspaceId/projects
```
Minimum **workspace** role: MEMBER (any workspace member can create a project).

**Request body**
```json
{
  "name": "Backend API",
  "key": "BACK",
  "description": "Core backend services",
  "emoji": "⚙️"
}
```
| Field | Type | Rules |
|---|---|---|
| name | string | required, 2–100 chars |
| key | string | required, 2–10 chars, alphanumeric only — auto-uppercased server-side |
| description | string | optional, max 500 chars |
| emoji | string | optional, defaults to 📋 |

**Do not send `workspaceId` in the body** — it comes from the URL path only. Sending it in the body is ignored/redundant since the controller always reads it from `req.params`.

**Response 201**
```json
{
  "data": {
    "project": {
      "_id": "668ghi...",
      "name": "Backend API",
      "key": "BACK",
      "description": "Core backend services",
      "workspaceId": "665abc...",
      "createdBy": "664xyz...",
      "status": "ACTIVE",
      "emoji": "⚙️",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```
The creator is automatically granted **project-level ADMIN** — same auto-membership pattern as workspace creation.

**Errors**: 409 (PROJECT_002) — `key` already used by another project in the *same* workspace (keys can repeat across different workspaces, just not within one).

### 6.2 Get All Projects in Workspace
```
GET /api/workspaces/:workspaceId/projects
```
Minimum workspace role: MEMBER. Returns every project in the workspace regardless of the caller's project-level membership in each one — workspace members can always *see* that a project exists, even before being added to it.

**Response 200**
```json
{
  "data": {
    "projects": [
      {
        "_id": "668ghi...",
        "name": "Backend API",
        "key": "BACK",
        "status": "ACTIVE",
        "emoji": "⚙️",
        "createdBy": { "name": "John Doe", "email": "..." }
      }
    ]
  }
}
```

### 6.3 Get Single Project
```
GET /api/workspaces/:workspaceId/projects/:projectId
```
Minimum **project** role: VIEWER — this is where the rule changes from workspace-scoped to project-scoped. A workspace member who hasn't been added to this specific project gets 403 here even though 6.2 succeeded for them.

**Response 200** — same project shape as creation response.

**Errors**: 404 (PROJECT_001). 403 (PROJECT_003) not a project member.

### 6.4 Update Project
```
PATCH /api/workspaces/:workspaceId/projects/:projectId
```
Minimum project role: ADMIN.

**Request body** (all optional, at least one required)
```json
{ "name": "Backend API v2", "description": "...", "emoji": "🔧", "status": "ARCHIVED" }
```
`status` valid values: `"ACTIVE"`, `"ARCHIVED"`. `key` is **not** updatable via this endpoint (issue codes depend on it being immutable — changing it would orphan every existing `BACK-#` reference).

**Response 200** — updated project.

### 6.5 Delete Project
```
DELETE /api/workspaces/:workspaceId/projects/:projectId
```
Minimum project role: ADMIN.

**Response 204.** Same cascade caveat as workspace deletion — issues/comments/sprints under this project are not currently cleaned up server-side.

---

## 7. Project Members — `/api/workspaces/:workspaceId/projects/:projectId/members`

### 7.1 Get Project Members
```
GET /api/workspaces/:workspaceId/projects/:projectId/members
```
Minimum project role: MEMBER.

**Response 200**
```json
{
  "data": {
    "members": [
      {
        "_id": "...",
        "userId": { "name": "John Doe", "email": "...", "profilePicture": null },
        "projectId": "668ghi...",
        "workspaceId": "665abc...",
        "role": "ADMIN"
      }
    ]
  }
}
```

### 7.2 Add Project Member
```
POST /api/workspaces/:workspaceId/projects/:projectId/members
```
Minimum project role: ADMIN.

**Request body**
```json
{ "userId": "664xyz...", "role": "MEMBER" }
```
`role` optional, defaults to `"MEMBER"`. Valid: `"ADMIN"`, `"MEMBER"`, `"VIEWER"`.

**Response 201** — created membership object.

**Errors**: 400 (MEMBER_001) — target user is not a workspace member yet. **Frontend must therefore drive this UI from the workspace member list, not a free-text user search** — only show users who are already in the workspace as selectable options when adding to a project. 409 (MEMBER_002) already a project member.

### 7.3 Remove Project Member
```
DELETE /api/workspaces/:workspaceId/projects/:projectId/members/:memberId
```
Minimum project role: ADMIN. `:memberId` is the target user's ID.

**Response 204.**

---

## 8. Project Roles Reference

| Role | Can view issues | Can create/edit issues | Can manage members/settings |
|---|---|---|---|
| VIEWER | ✅ | ❌ | ❌ |
| MEMBER | ✅ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ |

Frontend should gate the "Add Issue", "Edit", "Delete", "Settings", "Members" UI affordances based on the current user's project role, fetched once per project and cached (e.g. derive it from the project members list response by finding the entry matching the logged-in user's ID).
## 9. Issue Module — `/api/workspaces/:workspaceId/projects/:projectId/issues`

### Issue Type Hierarchy (mirrors Jira)
```
EPIC                    — never has a parent
 ├── STORY              — parent optional, if set must be EPIC
 ├── TASK                — parent optional, if set must be EPIC
 └── BUG                 — parent optional, if set must be EPIC
      └── SUBTASK        — parent REQUIRED, must be STORY/TASK/BUG (never EPIC)
```
Only `SUBTASK` strictly requires a `parentId`. Everything else is flexible — a `TASK` or `BUG` can be created standalone or nested under an `EPIC`.

### Status Workflow (linear, enforced server-side)
```
TODO → IN_PROGRESS → IN_REVIEW → DONE → TODO (reopen)
```
Skipping stages (e.g. TODO → DONE directly) is rejected with 400 (ISSUE_003). Use the dedicated status endpoint (9.5), not the general update endpoint, to change status — the general update endpoint does not validate transitions.

### Priority Levels
`CRITICAL`, `HIGH`, `MEDIUM` (default), `LOW`, `NONE`

### 9.1 Create Issue
```
POST /api/workspaces/:workspaceId/projects/:projectId/issues
```
Minimum project role: MEMBER.

**Request body**
```json
{
  "title": "User can register with email and password",
  "description": "Optional longer text, up to 50000 chars",
  "type": "STORY",
  "priority": "HIGH",
  "assignees": ["664xyz..."],
  "parentId": "668epic...",
  "sprintId": null,
  "labels": ["frontend", "urgent"],
  "dueDate": "2026-07-01",
  "estimatedHours": 8
}
```
Only `title` and `type` are required. **Do not send `projectId`, `workspaceId`, or `reporter`** — all three are derived server-side from the URL and the logged-in user.

**Response 201**
```json
{
  "data": {
    "issue": {
      "_id": "...",
      "title": "User can register with email and password",
      "description": "...",
      "issueNumber": 2,
      "issueCode": "BACK-2",
      "type": "STORY",
      "status": "TODO",
      "priority": "HIGH",
      "projectId": "668ghi...",
      "workspaceId": "665abc...",
      "parentId": { "_id": "668epic...", "title": "...", "issueCode": "BACK-1", "type": "EPIC", "status": "TODO" },
      "assignees": [{ "_id": "...", "name": "...", "email": "...", "profilePicture": null }],
      "reporter": { "_id": "...", "name": "...", "email": "...", "profilePicture": null },
      "sprintId": null,
      "labels": ["frontend", "urgent"],
      "dueDate": "2026-07-01T00:00:00.000Z",
      "estimatedHours": 8,
      "order": 1,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```
`issueCode` (e.g. `BACK-2`) is what should be displayed everywhere in the UI — `issueNumber` is the raw integer, rarely shown directly. `assignees`, `reporter`, and `parentId` arrive fully populated (not bare IDs) — no extra fetch needed to render assignee avatars.

**Errors**: 400 (ISSUE_002) — invalid parent type combination, or SUBTASK missing parentId, or EPIC given a parentId. Error messages name the exact allowed parent types, safe to show directly.

### 9.2 Get All Issues (List View)
```
GET /api/workspaces/:workspaceId/projects/:projectId/issues
```
Minimum project role: VIEWER.

**Query parameters** (all optional)
| Param | Example | Effect |
|---|---|---|
| status | `TODO` | filter by status |
| type | `BUG` | filter by type |
| priority | `HIGH` | filter by priority |
| assignee | `664xyz...` | filter by assignee user ID |
| sprintId | `66sprint...` | filter by sprint |

Only **top-level issues** are returned by default (subtasks excluded) — fetch subtasks per-parent via 9.6.

**Response 200**
```json
{ "data": { "issues": [ /* array of issue objects, same shape as 9.1 response */ ] } }
```

### 9.3 Get Single Issue
```
GET /api/workspaces/:workspaceId/projects/:projectId/issues/:issueId
```
Minimum project role: VIEWER.

**Response 200** — full issue object, same shape as creation response. This is the endpoint to call when opening an issue detail view/modal.

### 9.4 Update Issue (General Fields)
```
PATCH /api/workspaces/:workspaceId/projects/:projectId/issues/:issueId
```
Minimum project role: MEMBER.

**Request body** (any subset, at least one field required)
```json
{
  "title": "Updated title",
  "description": "...",
  "priority": "CRITICAL",
  "assignees": ["664xyz...", "664abc..."],
  "parentId": "668epic...",
  "sprintId": "66sprint...",
  "labels": ["backend"],
  "dueDate": "2026-08-01",
  "estimatedHours": 12,
  "order": 3
}
```
**Does not accept `status`** — use 9.5 for that. If `assignees` is sent, the backend diffs old vs new and fires `ISSUE_ASSIGNED` / `ISSUE_UNASSIGNED` notifications only to the users actually added/removed, not to everyone in the new array.

**Response 200** — full updated issue.

### 9.5 Update Issue Status
```
PATCH /api/workspaces/:workspaceId/projects/:projectId/issues/:issueId/status
```
Minimum project role: MEMBER.

**Request body**
```json
{ "status": "IN_PROGRESS" }
```
**Response 200** — updated issue, `order` recalculated to place it at the bottom of the new status's column (matters for board rendering — refetch the board, don't assume client-side ordering after this call alone).

**Errors**: 400 (ISSUE_003) — invalid transition, message states exactly which transitions are allowed from the current status.

### 9.6 Get Subtasks
```
GET /api/workspaces/:workspaceId/projects/:projectId/issues/:issueId/subtasks
```
**Response 200** — `{ "data": { "subtasks": [ /* issue objects with parentId === :issueId */ ] } }`. Render this as an expandable section under the parent in list/detail views.

### 9.7 Delete Issue
```
DELETE /api/workspaces/:workspaceId/projects/:projectId/issues/:issueId
```
Minimum project role: ADMIN. **Cascades** — deleting a parent issue also deletes all of its subtasks server-side, no separate cleanup calls needed.

**Response 204.**

---

## 10. Kanban Board — same base path as Issues

### 10.1 Get Board
```
GET /api/workspaces/:workspaceId/projects/:projectId/issues/board
```
Minimum project role: VIEWER.

**Query parameters** (optional): `assignee`, `priority`, `type`, `sprintId` — same filtering as the list endpoint.

**Response 200**
```json
{
  "data": {
    "board": {
      "TODO":        [ /* issue objects, sorted by order */ ],
      "IN_PROGRESS": [ /* ... */ ],
      "IN_REVIEW":   [ /* ... */ ],
      "DONE":        [ /* ... */ ]
    }
  }
}
```
All four keys are **always present**, even if empty — safe to map directly to four columns without existence checks. Subtasks are excluded from the board, same as the list view.

### 10.2 Move Issue (Drag and Drop)
```
PATCH /api/workspaces/:workspaceId/projects/:projectId/issues/board/issues/:issueId/move
```
Minimum project role: MEMBER.

**Request body**
```json
{ "newStatus": "IN_PROGRESS", "newOrder": 2 }
```
`newOrder` is **optional** — omit it to drop the card at the bottom of the target column (most common case for non-drag-and-drop status changes). When provided, it's a 1-based position within the target column.

**Response 200**
```json
{ "data": { "board": { "TODO": [...], "IN_PROGRESS": [...], "IN_REVIEW": [...], "DONE": [...] } } }
```
**This returns the entire updated board**, not just the moved issue — because moving one card reorders others around it (closing the gap in the source column, making space in the destination column). Replace your entire local board state with this response rather than trying to patch just the one card client-side.

**Real-time note**: this same final board state is also broadcast over the `board:updated` Socket.io event to everyone else viewing the project (see Section 16) — if your board UI is socket-connected, you may not even need to use this response directly for other connected clients, only for the user who initiated the drag.

---

## 11. Sprint Module — `/api/workspaces/:workspaceId/projects/:projectId/sprints`

### Sprint Status Lifecycle
```
PLANNED → ACTIVE → COMPLETED
```
Only **one sprint can be ACTIVE per project at a time**. Completed sprints are immutable (no further edits, no adding/removing issues).

### 11.1 Create Sprint
```
POST /api/workspaces/:workspaceId/projects/:projectId/sprints
```
Minimum project role: ADMIN.

**Request body**
```json
{
  "name": "Sprint 1",
  "goal": "Complete authentication and workspace setup",
  "startDate": "2026-06-15",
  "endDate": "2026-06-29"
}
```
Only `name` is required. **Note**: sprint names are intentionally **not** required to be unique (matches real Jira behavior — teams reuse "Sprint 1" across cycles). Do not build a duplicate-name check into the frontend either.

**Response 201**
```json
{
  "data": {
    "sprint": {
      "_id": "66sprint...",
      "name": "Sprint 1",
      "status": "PLANNED",
      "startDate": "2026-06-15T00:00:00.000Z",
      "endDate": "2026-06-29T00:00:00.000Z",
      "startedAt": null,
      "completedAt": null,
      "goal": "...",
      "totalIssues": 0,
      "completedIssues": 0,
      "createdBy": "664xyz...",
      "projectId": "668ghi...",
      "workspaceId": "665abc..."
    }
  }
}
```
**Errors**: 400 (SPRINT_005) if `endDate <= startDate`.

### 11.2 Get All Sprints
```
GET /api/workspaces/:workspaceId/projects/:projectId/sprints
```
**Response 200** — `{ "data": { "sprints": [ /* sorted newest first, createdBy populated */ ] } }`.

### 11.3 Get Single Sprint
```
GET /api/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId
```
**Response 200** — sprint object with `projectId` populated as `{ name, key }` and `createdBy` populated as `{ name, email }`.

### 11.4 Update Sprint
```
PATCH /api/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId
```
Minimum project role: ADMIN. Any subset of `name`, `goal`, `startDate`, `endDate`.

**Errors**: 400 (SPRINT_004) if the sprint is already COMPLETED — frontend should disable all edit controls once `status === "COMPLETED"`.

### 11.5 Delete Sprint
```
DELETE /api/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId
```
Minimum project role: ADMIN. Deleting a PLANNED sprint moves any attached issues back to the backlog (`sprintId: null`) automatically.

**Errors**: 400 (SPRINT_002) — cannot delete an ACTIVE sprint; must complete it first.

### 11.6 Start Sprint
```
POST /api/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/start
```
Minimum project role: ADMIN. No body.

**Response 200** — sprint with `status: "ACTIVE"`, `startedAt` set to now.

**Errors**: 400 (SPRINT_002) — another sprint in this project is already ACTIVE; message names it. 400 (SPRINT_003) — this sprint isn't in PLANNED state.

### 11.7 Complete Sprint
```
POST /api/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/complete
```
Minimum project role: ADMIN. No body.

**Response 200**
```json
{
  "data": {
    "sprint": {
      "status": "COMPLETED",
      "completedAt": "2026-06-29T...",
      "totalIssues": 8,
      "completedIssues": 5
    }
  }
}
```
**Side effect frontend must account for**: every non-DONE issue in this sprint is automatically moved back to the backlog (`sprintId: null`, `status` reset to `TODO`) — refetch both the sprint's issue list and the board after calling this, don't assume the issues stay where they were.

### 11.8 Get Sprint Issues
```
GET /api/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/issues
```
**Response 200** — `{ "data": { "issues": [ /* full issue objects, populated assignees/reporter */ ] } }`.

### 11.9 Add Issue to Sprint
```
POST /api/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/issues
```
Minimum project role: MEMBER.

**Request body**
```json
{ "issueId": "668issue..." }
```
**Response 200** — the updated issue object (now carrying `sprintId`).

**Errors**: 400 (SPRINT_004) — sprint already completed.

### 11.10 Remove Issue from Sprint
```
DELETE /api/workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/issues/:issueId
```
Minimum project role: MEMBER.

**Response 204** — issue returns to backlog (`sprintId: null`).
## 12. Comment Module — `/api/workspaces/:workspaceId/projects/:projectId/issues/:issueId/comments`

### 12.1 Add Comment
```
POST .../comments
```
Minimum project role: MEMBER.

**Request body**
```json
{ "content": "This epic covers all authentication related work." }
```
| Field | Type | Rules |
|---|---|---|
| content | string | required, 1–5000 chars |

**Response 201**
```json
{
  "data": {
    "comment": {
      "_id": "...",
      "content": "...",
      "issueId": "...",
      "projectId": "...",
      "workspaceId": "...",
      "author": { "_id": "...", "name": "...", "email": "...", "profilePicture": null },
      "isEdited": false,
      "editedAt": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### 12.2 Get Comments (Paginated)
```
GET .../comments?page=1&limit=20
```
**Response** — uses the **paginated envelope** described in Section 1, not the standard `data: { comment }` wrapping. `data` is directly an array.
```json
{
  "success": true,
  "message": "Comments fetched successfully",
  "data": [ /* comment objects */ ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false }
}
```
Comments are sorted **oldest first** (natural conversation order, top to bottom) — opposite of Activity/Notification ordering, which is newest first. Don't reuse the same sort assumption across both.

### 12.3 Edit Comment
```
PATCH .../comments/:commentId
```
Minimum project role: MEMBER, **plus** the caller must be the comment's original author — a project ADMIN cannot edit someone else's comment (record-level ownership, stricter than the role check).

**Request body**
```json
{ "content": "Updated text" }
```
**Response 200** — comment with `isEdited: true`, `editedAt` set.

**Errors**: 403 (COMMENT_002) — not the author.

### 12.4 Delete Comment
```
DELETE .../comments/:commentId
```
Minimum project role: MEMBER, but the actual permission check is: **author OR project ADMIN** — broader than edit, since admins need moderation ability.

**Response 204.**

---

## 13. Activity Timeline (read-only — never created directly by the frontend)

Activity records are generated automatically as a side effect of other actions (creating issues, changing status, commenting, sprint lifecycle events). There is no "create activity" endpoint — only read endpoints.

### 13.1 Issue Activity
```
GET /api/workspaces/:workspaceId/projects/:projectId/issues/:issueId/activities?page=1&limit=20
```
### 13.2 Project Activity
```
GET /api/workspaces/:workspaceId/projects/:projectId/activities?page=1&limit=20
```
### 13.3 Workspace Activity
```
GET /api/workspaces/:workspaceId/activities?page=1&limit=20
```

All three share the same **paginated envelope** and item shape:
```json
{
  "data": [
    {
      "_id": "...",
      "actor": { "_id": "...", "name": "...", "email": "...", "profilePicture": null },
      "type": "ISSUE_STATUS_CHANGED",
      "workspaceId": "...",
      "projectId": "...",
      "issueId": "...",
      "metadata": { "issueCode": "BACK-1", "from": "TODO", "to": "IN_PROGRESS" },
      "createdAt": "..."
    }
  ],
  "pagination": { /* ... */ }
}
```
Sorted **newest first**. `metadata` shape varies by `type` — see the table below for what to expect per type so the frontend can render a human-readable sentence.

| Activity type | metadata fields | Suggested rendering |
|---|---|---|
| ISSUE_CREATED | issueCode, title, type | "{actor} created {type} {issueCode}" |
| ISSUE_UPDATED | issueCode, fields (array) | "{actor} updated {issueCode}" |
| ISSUE_DELETED | issueCode, title | "{actor} deleted {issueCode}" |
| ISSUE_STATUS_CHANGED | issueCode, from, to | "{actor} moved {issueCode} from {from} to {to}" |
| COMMENT_ADDED | commentId, preview | "{actor} commented on {issueCode}: \"{preview}\"" |
| COMMENT_UPDATED | commentId | "{actor} edited a comment" |
| COMMENT_DELETED | commentId | "{actor} deleted a comment" |
| SPRINT_CREATED | sprintName | "{actor} created sprint {sprintName}" |
| SPRINT_STARTED | sprintName | "{actor} started sprint {sprintName}" |
| SPRINT_COMPLETED | sprintName, totalIssues, completedIssues | "{actor} completed {sprintName} — {completedIssues}/{totalIssues} done" |

---

## 14. Notifications — `/api/notifications`

Unlike Activity, notifications are **user-scoped** — no `workspaceId`/`projectId` in the URL path at all, since they belong to whoever is logged in, across every workspace they're part of.

### 14.1 Get Notifications
```
GET /api/notifications?page=1&limit=20
```
**Response** — paginated envelope.
```json
{
  "data": [
    {
      "_id": "...",
      "recipient": "664xyz...",
      "sender": { "name": "John Doe", "email": "...", "profilePicture": null },
      "type": "ISSUE_ASSIGNED",
      "message": "You were assigned to BACK-1: User Authentication System",
      "workspaceId": "...",
      "projectId": "...",
      "issueId": "...",
      "link": "/workspaces/665abc.../projects/668ghi.../issues/668issue...",
      "isRead": false,
      "readAt": null,
      "createdAt": "..."
    }
  ],
  "pagination": { /* ... */ }
}
```
`link` is a ready-made relative path — clicking a notification should just navigate the router to this value directly, no construction needed on the frontend. `sender` is `null` for system-generated notifications (e.g. being added to a workspace via invite has no human sender).

### 14.2 Unread Count
```
GET /api/notifications/unread-count
```
**Response 200**
```json
{ "data": { "count": 5 } }
```
Use this to drive a badge on the notification bell icon. Worth polling or refetching after any socket `notification:new` event rather than only on page load.

### 14.3 Mark One as Read
```
PATCH /api/notifications/:notificationId/read
```
**Response 200** — updated notification, `isRead: true`.

### 14.4 Mark All as Read
```
PATCH /api/notifications/read-all
```
No body. **Response 204.**

### 14.5 Delete Notification
```
DELETE /api/notifications/:notificationId
```
**Response 204.**

**Self-notification rule**: the backend never creates a notification where `recipient === sender` — if a user assigns an issue to themselves, no notification is created. Don't build UI that expects to always see a notification after every action you personally take.

**Auto-expiry**: notifications older than 90 days are deleted automatically server-side (MongoDB TTL index) — no frontend action needed, but don't assume notification history is permanent/unlimited.
## 15. Dashboard & Analytics

Read-only aggregation endpoints — no corresponding "model," purely computed from Issue/Sprint/ProjectMember/Activity data at request time.

### 15.1 Project Dashboard
```
GET /api/workspaces/:workspaceId/projects/:projectId/dashboard
```
Minimum project role: VIEWER.

**Response 200**
```json
{
  "data": {
    "dashboard": {
      "project": { "id": "...", "name": "Backend API", "key": "BACK" },
      "summary": { "totalIssues": 7, "totalMembers": 2, "overdueIssues": 0 },
      "issuesByStatus":   { "TODO": 3, "IN_PROGRESS": 1, "IN_REVIEW": 0, "DONE": 3 },
      "issuesByType":     { "EPIC": 1, "STORY": 1, "TASK": 3, "BUG": 1, "SUBTASK": 1 },
      "issuesByPriority": { "CRITICAL": 0, "HIGH": 4, "MEDIUM": 2, "LOW": 1, "NONE": 0 },
      "memberWorkload": [
        { "userId": "...", "name": "Sarah Smith", "email": "...", "openIssueCount": 2 }
      ],
      "sprintVelocity": [
        { "sprintName": "Sprint 1", "totalIssues": 3, "completedIssues": 1, "velocity": 33, "completedAt": "..." }
      ],
      "activeSprint": { "name": "Sprint 2", "startedAt": "...", "endDate": "...", "totalIssues": 4, "completedIssues": 1 },
      "recentActivity": [ /* up to 10 activity objects, same shape as Section 13 */ ]
    }
  }
}
```
**Every breakdown object (`issuesByStatus`, `issuesByType`, `issuesByPriority`) always contains every possible enum key, zero-padded** — safe to map directly onto chart segments without checking for missing keys. `activeSprint` is `null` when no sprint is currently ACTIVE — render an empty/placeholder state rather than expecting an object. `memberWorkload` excludes DONE issues from the count and is sorted highest-workload first.

### 15.2 Workspace Dashboard
```
GET /api/workspaces/:workspaceId/dashboard
```
Minimum workspace role: MEMBER.

**Response 200**
```json
{
  "data": {
    "dashboard": {
      "workspace": { "id": "...", "name": "Acme Corp", "slug": "acme-corp" },
      "summary": { "totalProjects": 3, "totalIssues": 42, "totalMembers": 8 },
      "issuesByStatus": { "TODO": 20, "IN_PROGRESS": 10, "IN_REVIEW": 4, "DONE": 8 },
      "activeSprints": [ { "name": "Sprint 2", "projectId": "..." } ],
      "projects": [ { "_id": "...", "name": "...", "key": "..." } ],
      "recentActivity": [ /* up to 10, across the whole workspace */ ]
    }
  }
}
```
This is the natural landing page after selecting a workspace, before drilling into any specific project.

---

## 16. Real-Time — Socket.io

### Connecting
```javascript
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  auth: { token: `Bearer ${accessToken}` }
});
```
The server validates this token the same way as REST requests (same JWT secret/expiry rules). On connect, the server **automatically joins the socket to every room the user belongs to** — every workspace they're a member of, every project they're a member of, plus a private room scoped to just their own user ID for personal notifications. The frontend does not need to manually join rooms for data the user already has access to.

**Manually joining a project room** is only needed if a user is added to a *new* project mid-session (after their socket already connected):
```javascript
socket.emit("join:project", { projectId: "668ghi..." });
socket.emit("leave:project", { projectId: "668ghi..." }); // when navigating away, optional cleanup
```

### Events to Listen For

| Event | Payload | When it fires |
|---|---|---|
| `issue:created` | `{ issue, projectId, workspaceId }` | Any project member creates an issue |
| `issue:updated` | `{ issueId, updates, projectId }` | General field update (not status) |
| `issue:status_changed` | `{ issueId, issueCode, from, to, projectId }` | Status transition |
| `issue:deleted` | `{ issueId, issueCode, projectId }` | Issue (and its subtasks) removed |
| `board:updated` | `{ board, projectId }` | A Kanban drag-and-drop move — full board state, same shape as Section 10.1's response |
| `comment:added` | `{ comment, issueId, projectId }` | New comment posted |
| `comment:updated` | `{ comment, issueId, projectId }` | Comment edited |
| `comment:deleted` | `{ commentId, issueId, projectId }` | Comment removed |
| `sprint:started` | `{ sprint, projectId }` | Sprint moved to ACTIVE |
| `sprint:completed` | `{ sprint, projectId }` | Sprint moved to COMPLETED |
| `notification:new` | `{ notification }` | Emitted only to the specific recipient's private room |

**Frontend pattern**: for `issue:*` and `comment:*` events, the most robust approach is to invalidate the relevant RTK Query cache tag (e.g. `dispatch(apiSlice.util.invalidateTags(['Issue']))`) rather than manually splicing the socket payload into existing state — this guarantees consistency with whatever filters/pagination are currently applied, at the cost of one extra refetch. For `board:updated`, the payload is complete enough to replace board state directly without a refetch, since drag-and-drop responsiveness matters more there.

---

## 17. Complete Data Model Reference

### User
```
_id, name, email, authProvider ("email"|"google"|"otp"),
profilePicture, isEmailVerified, createdAt, updatedAt
```
Never exposes: `password`, `refreshToken`, `otpCode`, `otpExpiry`.

### Workspace
```
_id, name, slug, description, logo, owner (User ref),
isInviteOnly, createdAt, updatedAt
```

### WorkspaceMember
```
_id, workspaceId, userId, role ("OWNER"|"ADMIN"|"MEMBER"), joinedAt
```

### Project
```
_id, name, key, description, workspaceId, createdBy (User ref),
status ("ACTIVE"|"ARCHIVED"), emoji, createdAt, updatedAt
```

### ProjectMember
```
_id, projectId, userId, workspaceId, role ("ADMIN"|"MEMBER"|"VIEWER")
```

### Invitation
```
_id, workspaceId, email, role, invitedBy (User ref),
status ("PENDING"|"ACCEPTED"|"REVOKED"), expiresAt, createdAt
```
`token` field exists but is never returned by any read endpoint (hashed at rest, only ever sent in the email link).

### Issue
```
_id, title, description, issueNumber, issueCode,
type ("EPIC"|"STORY"|"TASK"|"BUG"|"SUBTASK"),
status ("TODO"|"IN_PROGRESS"|"IN_REVIEW"|"DONE"),
priority ("CRITICAL"|"HIGH"|"MEDIUM"|"LOW"|"NONE"),
projectId, workspaceId, parentId (Issue ref, nullable),
assignees (User ref array), reporter (User ref),
sprintId (nullable), labels (string array),
dueDate, estimatedHours, order, createdAt, updatedAt
```

### Sprint
```
_id, name, projectId, workspaceId,
status ("PLANNED"|"ACTIVE"|"COMPLETED"),
startDate, endDate, startedAt, completedAt, goal,
createdBy (User ref), totalIssues, completedIssues
```
`totalIssues`/`completedIssues` are only populated once a sprint is COMPLETED (zero before that — don't use them to render an in-progress sprint's live counts, query issues by `sprintId` for that instead).

### Comment
```
_id, content, issueId, projectId, workspaceId,
author (User ref), isEdited, editedAt, createdAt, updatedAt
```

### Activity
```
_id, actor (User ref), type, workspaceId,
projectId (nullable), issueId (nullable),
metadata (shape varies by type — see Section 13 table), createdAt
```
No `updatedAt` — activity records are immutable by design.

### Notification
```
_id, recipient (User ref), sender (User ref, nullable),
type, message, workspaceId, projectId, issueId,
link, isRead, readAt, createdAt
```
No `updatedAt`.

---

## 18. Recommended Frontend Route Structure

Mirroring the API's nested resource pattern keeps URL params and API calls trivially aligned:
```
/login
/register
/auth/callback                                          (Google OAuth landing)
/invitations/accept?token=...                            (public invite landing)

/                                                         (workspace list / landing)
/workspaces/:workspaceId                                  (workspace dashboard)
/workspaces/:workspaceId/members
/workspaces/:workspaceId/settings

/workspaces/:workspaceId/projects/:projectId/board        (Kanban — likely default project view)
/workspaces/:workspaceId/projects/:projectId/backlog
/workspaces/:workspaceId/projects/:projectId/sprints
/workspaces/:workspaceId/projects/:projectId/issues/:issueId   (detail view, likely a modal/drawer over the board)
/workspaces/:workspaceId/projects/:projectId/dashboard
/workspaces/:workspaceId/projects/:projectId/settings/members

/notifications
```

## 19. Suggested RTK Query Tag Invalidation Map

| Mutation | Should invalidate |
|---|---|
| createWorkspace | `Workspace` |
| updateWorkspace / deleteWorkspace | `Workspace` |
| addMember / removeMember / updateMemberRole | `WorkspaceMember` |
| acceptInvitation | `Workspace`, `WorkspaceMember`, `Invitation` |
| createProject / updateProject / deleteProject | `Project` |
| addProjectMember / removeProjectMember | `ProjectMember` |
| createIssue / updateIssue / deleteIssue / updateStatus | `Issue`, `Dashboard` |
| moveIssue | `Issue` (board response can be applied directly; still invalidate list/backlog views) |
| createSprint / updateSprint / deleteSprint / startSprint / completeSprint | `Sprint`, `Issue`, `Dashboard` |
| addIssueToSprint / removeIssueFromSprint | `Sprint`, `Issue` |
| createComment / updateComment / deleteComment | `Comment`, `Activity` |
| markAsRead / markAllAsRead / deleteNotification | `Notification` |

This table is the basis for every feature's `*Api.js` file — each mutation's `invalidatesTags` array should match this row, and each query's `providesTags` should match the tag(s) it represents.
