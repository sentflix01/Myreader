## ✅ Recommended `.gitignore` for Your Project

Your current `.gitignore` is missing many important entries. A proper `.gitignore` prevents accidentally committing sensitive data (like `.env`), build artifacts, and unnecessary files.  
Here’s a comprehensive list – **copy and paste** this into your `.gitignore`:

```
# Dependencies
node_modules/

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
public/dist/
dist/
build/
.cache/
.parcel-cache/
coverage/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# IDE / editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Optional: if you have a separate folder for temporary files
tmp/
temp/
```

### 🧠 Why each group matters

| Group                       | Explanation                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `node_modules/`             | Huge folder, never commit – always install via `npm install`.                   |
| `.env` files                | Contain secrets (DB password, JWT secret, Brevo credentials). **Never commit**. |
| `public/dist/`              | Your Parcel build output – generated code, not source.                          |
| `.cache/` / `.parcel-cache` | Parcel’s cache – can be large and system‑specific.                              |
| `logs/`, `*.log`            | Log files – not needed in repo.                                                 |
| IDE folders                 | Editor settings differ per developer.                                           |
| OS files                    | `.DS_Store` (macOS), `Thumbs.db` (Windows) – clutter.                           |
| `coverage/`                 | Test coverage reports.                                                          |

### 📌 Special note on `out of app/` and `niche/`

- If `out of app/` was meant to be your **build output folder** (e.g., `dist/`, `public/dist/`), replace it with the correct path.
- If `niche/` is a personal scratch folder, you can keep it ignored – but ensure it’s not needed for the app.

### 🔐 Commit a `.env.example` instead

Create a file `.env.example` with **placeholder values** and commit it:

```
DATABASE=mongodb+srv://<USER>:<PASSWORD>@cluster...
DATABASE_PASSWORD=yourpassword
JWT_SECRET=my-super-secret-key
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
BREVO_HOST=smtp-relay.brevo.com
BREVO_PORT=587
BREVO_USER=your-email@example.com
BREVO_PASS=your-smtp-key
```

This helps other developers (or your future self) set up the project quickly without exposing secrets.

---

## 🚀 After updating `.gitignore`, run:

```bash
git rm -r --cached .   # clear git cache
git add .
git commit -m "Update .gitignore"
```

Now your repo is clean and secure. ✅
