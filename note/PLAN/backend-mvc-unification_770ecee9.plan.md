---
name: backend-mvc-unification
overview: "Unify the app into a single scalable backend MVC: all workflows (auth, chat, sentbot, billing, views) flow through `routes/ → controllers/ → model/`, with `public/js/*` kept as thin UI-only callers. Avoid duplicated controller/model logic across folders and add CORS support."
todos:
  - id: inventory-and-normalize-routes
    content: Audit `routes/*.js` to ensure each route imports the canonical `controllers/*` modules (no missing/deleted files, no duplicates).
    status: completed
  - id: sentbot-backend-agent
    content: Implement/normalize `routes/sentbotRoutes.js` + `controllers/sentbotController.js` so sentbot runs server-side, retrieves DB context, calls AI provider, and returns responses.
    status: completed
  - id: chat-hybrid-authoritative
    content: Normalize chat endpoints/controllers/models so the backend is authoritative while the frontend keeps only UI state (hybrid sync).
    status: completed
  - id: billing-api-boundary
    content: Normalize billing endpoints under `routes/billingRoutes.js` + `controllers/billingController.js` with a single backend checkout flow.
    status: completed
  - id: cors-support
    content: Add and configure CORS in `app.js` (origins, credentials, OPTIONS handling) to support cross-origin usage safely.
    status: completed
  - id: frontend-thin-ui
    content: Refactor `public/js/*` to be thin UI event binders that call backend APIs; remove duplicated logic patterns and centralize request helper if needed.
    status: completed
  - id: smoke-test
    content: Run dev server and exercise auth/chat/sentbot/billing flows; verify CORS behavior and no frontend console errors.
    status: completed
isProject: false
---

## Backend MVC unification (no `public/js/features/`)

### Target outcome

- **Single source of truth** for application logic lives in backend MVC folders:
  - **Routes**: `routes/*.js` define endpoints and mount middleware.
  - **Controllers**: `controllers/*.js` hold request/response orchestration.
  - **Models**: `model/*.js` hold persistence (Mongoose) + domain methods.
  - **Views**: `views/*.pug` for rendered pages; `controllers/viewsController.js` remains the entry for page rendering.
- **Frontend JS stays minimal**: `public/js/*` only wires DOM events and calls backend endpoints (no duplicate “controllers/models” in frontend folders).

### Key constraints from you

- **No `public/js/features/`** folder.
- **No repeating the same function** in different folders: one controller implementation per domain in `controllers/`, one model per collection/domain in `model/`.
- **Chat + Sentbot** should be **hybrid** (some client state/cache allowed) but still backed by server APIs.
- **Sentbot acts like customer service/agent**: responses should be driven by your database/API (RAG-like retrieval from stored docs/chats) rather than purely client-side calls.
- Add **CORS**.

### 1. Inventory and normalize the backend MVC surface

- **Inspect and fix routing imports** so every route points to the canonical controller file in `controllers/` (e.g. `routes/userRoutes.js` → `controllers/authController.js`, `controllers/userController.js`).
- **Remove/stop using** any backend logic that currently lives in `public/js/`* as “models/controllers” (frontend must call backend endpoints instead).
- **Decide canonical names** and stick to them:
  - `routes/chatRoutes.js` → `controllers/chatController.js`.
  - `routes/billingRoutes.js` → `controllers/billingController.js`.
  - (New or normalized) `routes/sentbotRoutes.js` → `controllers/sentbotController.js`.

### 2. Define clean API boundaries (scalable contracts)

- **Auth/User** (`/api/v1/users/...`)
  - Keep: signup/login/logout, protect/restrictTo, forgot/reset password, update password, update user profile.
- **Chat** (`/api/v1/chats/...`)
  - Canonical endpoints for: create chat, append message, list chats, fetch chat, delete chat/message, and any “hybrid sync” endpoints you already use.
- **Sentbot** (`/api/v1/sentbot/...`)
  - Add a single canonical controller entry (e.g. `POST /api/v1/sentbot/respond`) that:
    - Accepts user prompt + optional chat context identifiers.
    - Retrieves relevant context from DB (documents, prior chats, FAQs).
    - Calls the AI provider (Gemini) **server-side** (avoid exposing `API_KEY` in browser).
    - Stores interaction results if needed (for analytics/history).
- **Billing** (`/api/v1/billing/...`)
  - Canonical endpoints for: create checkout session, webhook (if used), subscription status.

### 3. Make Sentbot “agent/customer service” backed by DB

- **Model layer** (`model/`): ensure you have (or add) schema(s) representing:
  - Knowledge base sources (documents/FAQs) and chat logs.
  - Any embeddings/indexing strategy if present; otherwise start with basic keyword search and upgrade later.
- **Controller flow** (`controllers/sentbotController.js`):
  - Validate input.
  - Query DB for relevant context (documents/snippets/user profile/subscription tier).
  - Build a prompt with citations/snippets.
  - Call AI provider (Gemini) via server.
  - Return response payload to frontend.

### 4. Hybrid client strategy (but backend authoritative)

- Keep frontend-only state limited to:
  - Temporary UI state (open/closed widgets, optimistic message rendering, pagination cursor).
- Make backend authoritative for:
  - Saved chats, final sentbot responses, document context selection.

### 5. CORS

- Add CORS middleware in `app.js`:
  - Use the `cors` package.
  - Configure allowed origins (dev + prod) and `credentials: true` so cookies/JWT can work cross-origin.
  - Ensure preflight requests are handled (`OPTIONS `*).

### 6. Frontend JS cleanup (thin UI callers)

- Refactor `public/js/*` files so they:
  - Only bind DOM events and call backend endpoints.
  - Do **not** duplicate backend controller/model logic.
  - Use one shared client helper (e.g. `public/js/apiClient.js`) if needed for fetch/axios wrappers.

### 7. Verification checklist

- **Server starts** without missing-module errors.
- **Auth**: signup/login/logout, protect routes, password reset.
- **Chat**: create/send/list/delete works; hybrid sync is stable.
- **Sentbot**: browser calls backend; backend fetches DB context; server calls AI; response renders.
- **Billing**: plan click hits backend and redirects/returns session.
- **CORS**: cross-origin calls succeed with cookies/authorization as intended.

```mermaid
flowchart TD
  browser[Browser_UI_public_js] --> api[/api_v1_*_routes/]
  api --> controllers[controllers_*]
  controllers --> models[model_*]
  controllers --> ai[AI_provider_server_side]
  models --> db[(MongoDB)]
  controllers --> browser

  subgraph mvc [Backend_MVC]
    api
    controllers
    models
  end
```



