You’re **still in PowerShell**, not in MongoDB — that’s why this keeps happening.
Let’s fix it **once and for all**, very clearly 👇

---

## 🔴 Why this error keeps happening

```powershell
use sentreader
```

❌ `use` is **NOT** a PowerShell command
✅ `use` is a **MongoDB shell command**

PowerShell has no idea what `use` means.

---

## ✅ The ONLY correct ways to use `use sentreader`

### ✅ WAY 1 (RECOMMENDED): **You don’t need `use` at all**

If you’re building a Node.js app:

```env
DATABASE=mongodb://127.0.0.1:27017/sentreader
```

Run your app → MongoDB creates `sentreader` automatically.

🚀 **This is the correct professional workflow.**

---

### ✅ WAY 2: Enter MongoDB shell FIRST

#### Step 1: Start MongoDB shell

In PowerShell:

```powershell
mongosh
```

If successful, you’ll see:

```
test>
```

#### Step 2: Now run MongoDB commands

```js
use sentreader
```

✔ Works here
❌ Never works in PowerShell

---

### ❌ WRONG (what you’re doing now)

```powershell
use sentreader   ❌
```

---

## 🔍 If `mongosh` is NOT recognized

That means MongoDB Shell is **not installed or not in PATH**.

### Fix:

1️⃣ Install **MongoDB Shell (mongosh)**
👉 [https://www.mongodb.com/try/download/shell](https://www.mongodb.com/try/download/shell)

2️⃣ Restart PowerShell

3️⃣ Run:

```powershell
mongosh
```

---

## 🌐 If you’re using MongoDB Atlas

Connect like this:

```powershell
mongosh "mongodb+srv://USERNAME:PASSWORD@cluster0.mongodb.net/"
```

Then:

```js
use sentreader
```

---

## 🧠 Final takeaway (IMPORTANT)

> **MongoDB databases are not created manually**
> They are created when your app inserts data.

So for you:

- Change DB name in `.env`
- Start Node.js
- Done

---

## 🔜 Next recommended step

Since you’re developing `sentreader`, I strongly recommend:

➡️ Skip shell commands
➡️ Use **Mongoose + Compass**
➡️ Focus on API & auth logic

If you want, I can:

- Verify your MongoDB install
- Fix Atlas connection
- Set up sentreader DB properly
- Convert your controllers to MongoDB

Just say **what you want next** 👍
