Perfect — the UI you shared clearly shows **SentReader is not just a file upload app**, it’s a **Chat-with-Documents SaaS** (very similar to ChatPDF / AskYourPDF / Humata).

Based on that page, here is a **clean, scalable BACKEND API MODEL SCHEMA STRUCTURE**, **Jonas Schmedtmann–style**, ready for:

* files
* chat with documents
* pricing plans
* usage limits
* AI queries
* analytics
* enterprise scaling

---

# 🧠 SentReader – Backend Data Model Architecture

## 🔗 High-level Entity Relationship

```
User
 ├── Subscription
 ├── Usage
 ├── Files
 │    ├── Chunks (for AI/RAG)
 │    └── FileAccess
 └── Chats
      └── Messages
```

---

# 1️⃣ User Model

Already mostly done, but adjusted to SaaS needs.

```js
User
- name
- email
- password
- role (user | admin)
- plan (free | starter | enterprise)
- storageUsed
- storageLimit
- active
- createdAt
```

Purpose:

* authentication
* ownership
* plan enforcement

---

# 2️⃣ Subscription / Plan Model

Reflects pricing section in UI.

```js
Subscription
- user (ref User)
- plan (free | starter | enterprise)
- price
- billingCycle (monthly | yearly)
- status (active | canceled | trial)
- startDate
- endDate
```

Used for:

* billing logic
* feature access
* upgrades/downgrades

---

# 3️⃣ Usage Model (VERY IMPORTANT)

This matches:

> “5 questions per day”, “files up to 10MB”, etc.

```js
Usage
- user (ref User)
- dailyQuestionsUsed
- dailyQuestionsLimit
- filesUploaded
- totalFileSize
- resetAt (daily cron)
```

Used to:

* block free users
* enforce fair usage
* analytics

---

# 4️⃣ File Model (Document Library)

```js
File
- name
- originalName
- type (pdf, docx, txt, image)
- mimeType
- size
- path
- owner (ref User)
- pages
- language
- processed (boolean)
- createdAt
```

UI reference:

> “Works with PDF, Word, PPT, Excel…”

---

# 5️⃣ FileChunk Model (Core for AI / RAG)

This is **what enables “Ask questions”**.

```js
FileChunk
- file (ref File)
- content (text)
- embedding (vector)
- chunkIndex
- pageNumber
```

Used by:

* vector search
* similarity matching
* AI answers

---

# 6️⃣ Chat Model

Each document has chats.

```js
Chat
- user (ref User)
- file (ref File)
- title
- createdAt
```

UI reference:

> “Chat with your documents”

---

# 7️⃣ Message Model

```js
Message
- chat (ref Chat)
- sender (user | ai)
- content
- tokensUsed
- createdAt
```

Used for:

* chat history
* token accounting
* AI cost control

---

# 8️⃣ FileAccess Model (Already Done)

```js
FileAccess
- file
- user
- action (read | download | preview)
- accessedAt
```

Used for:

* recent files
* analytics
* security

---

# 9️⃣ AI Query / Analytics Model

Tracks AI usage (important for cost).

```js
AIQuery
- user
- file
- question
- answer
- tokensUsed
- model (gpt-4, gpt-4o, etc)
- createdAt
```

Used for:

* billing
* optimization
* abuse prevention

---

# 🔐 Feature Mapping (UI → Backend)

| UI Feature     | Backend Model        |
| -------------- | -------------------- |
| Upload file    | File                 |
| Chat with file | Chat + Message       |
| Ask questions  | FileChunk + AIQuery  |
| Pricing plans  | Subscription         |
| Daily limits   | Usage                |
| Analytics      | FileAccess + AIQuery |
| Enterprise     | Role + Plan          |

---

# 📁 Recommended Folder Structure

```
models/
 ├── userModel.js
 ├── subscriptionModel.js
 ├── usageModel.js
 ├── fileModel.js
 ├── fileChunkModel.js
 ├── chatModel.js
 ├── messageModel.js
 ├── fileAccessModel.js
 └── aiQueryModel.js
```

---

# 🚀 What You Have Now

You now have:

* ✅ SaaS-grade schema design
* ✅ AI/RAG-ready backend
* ✅ Pricing & limits enforced
* ✅ Enterprise-scalable architecture

---

## 🔜 Next (Very Important – choose one)

1️⃣ **Exact Mongoose schema code for ALL models**
2️⃣ **RAG pipeline (chunk → embed → search → answer)**
3️⃣ **Usage limit middleware (free vs paid)**
4️⃣ **Chat controller (Ask document questions)**
5️⃣ **Production-ready API routes**

👉 Just say the number.
