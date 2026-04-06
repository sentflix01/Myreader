- Middleware is one of those concepts that **looks simple** but is actually **very powerful** once you understand the types and *when to use each*.
    
    I’ll explain it **clearly**, then relate it to **Express, Mongoose, and your SaaS (SentReader)**.
    
    ---
    
    # 🧩 What is Middleware? (1-line)
    
    > Middleware is code that runs between receiving a request and sending a response.
    > 
    
    Think of it as **checkpoints in a pipeline**.
    
    ---
    
    # 🔹 1️⃣ Express Middleware Types (MOST IMPORTANT)
    
    ## 1. Application-level middleware
    
    Runs for **every request** (or every request on a path).
    
    ```jsx
    app.use((req, res, next) => {
      console.log('Request received');
      next();
    });
    
    ```
    
    ✅ Use for:
    
    - Logging
    - Security headers
    - Body parsing
    
    ---
    
    ## 2. Router-level middleware
    
    Runs only for a **specific route or router**.
    
    ```jsx
    router.use(authController.protect);
    
    ```
    
    ✅ Use for:
    
    - Authentication
    - Role-based access
    - Feature protection
    
    ---
    
    ## 3. Built-in middleware (Express)
    
    Provided by Express itself.
    
    Examples:
    
    ```jsx
    express.json()
    express.static('public')
    express.urlencoded({ extended: true })
    
    ```
    
    ✅ Use for:
    
    - Parsing JSON
    - Serving static files
    
    ---
    
    ## 4. Third-party middleware
    
    Installed via npm.
    
    Examples:
    
    ```jsx
    helmet()
    morgan('dev')
    rateLimit()
    cors()
    
    ```
    
    ✅ Use for:
    
    - Security
    - Logging
    - Rate limiting
    - CORS
    
    ---
    
    ## 5. Error-handling middleware ⚠️ (SPECIAL)
    
    Has **4 parameters**.
    
    ```jsx
    app.use((err, req, res, next) => {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message
      });
    });
    
    ```
    
    ✅ Runs **only when an error occurs**
    
    ✅ Must be defined **last**
    
    ---
    
    # 🔹 2️⃣ Mongoose Middleware (Hooks)
    
    Runs **around database actions**, not HTTP requests.
    
    ---
    
    ## 1. Document middleware
    
    Runs on individual documents.
    
    ### Pre-save
    
    ```jsx
    userSchema.pre('save', function (next) {
      this.password = hash(this.password);
      next();
    });
    
    ```
    
    ### Post-save
    
    ```jsx
    userSchema.post('save', function (doc) {
      console.log('User saved:', doc.id);
    });
    
    ```
    
    ✅ Use for:
    
    - Hashing passwords
    - Data normalization
    
    ---
    
    ## 2. Query middleware
    
    Runs before/after queries.
    
    ```jsx
    userSchema.pre(/^find/, function (next) {
      this.find({ active: { $ne: false } });
      next();
    });
    
    ```
    
    ✅ Use for:
    
    - Soft deletes
    - Auto-filtering inactive users
    
    ---
    
    ## 3. Aggregate middleware
    
    Runs before aggregation pipelines.
    
    ```jsx
    schema.pre('aggregate', function (next) {
      this.pipeline().unshift({ $match: { active: true } });
      next();
    });
    
    ```
    
    ⚠️ Advanced but powerful.
    
    ---
    
    ## 4. Model middleware
    
    Runs on model methods like `insertMany`.
    
    ```jsx
    schema.pre('insertMany', function (next, docs) {
      console.log(docs.length);
      next();
    });
    
    ```
    
    ---
    
    # 🔹 3️⃣ Custom Business Middleware (SaaS-level)
    
    These are **your own rules**.
    
    ### Example: Usage limits
    
    ```jsx
    const checkUsageLimit = (req, res, next) => {
      if (req.user.plan === 'free' && req.user.usage > 10) {
        return next(new AppError('Limit reached', 403));
      }
      next();
    };
    
    ```
    
    ✅ Used for:
    
    - Subscription enforcement
    - Feature gating
    - Billing protection
    
    ---
    
    # 🔹 4️⃣ Ordering matters ⚠️
    
    Middleware runs **top → down**.
    
    ```jsx
    app.use(express.json());     // 1
    app.use(authController.protect); // 2
    app.use('/api/files', fileRoutes);
    app.use(globalErrorHandler); // LAST
    
    ```
    
    Wrong order = bugs.
    
    ---
    
    # 🧠 Mental Model (lock this in)
    
    Think of middleware like airport security:
    
    1️⃣ Identity check
    
    2️⃣ Baggage scan
    
    3️⃣ Customs
    
    4️⃣ Boarding
    
    Each step must pass before moving on.
    
    ---
    
    # 🔑 Summary Table
    
    | Type | Runs On | Purpose |
    | --- | --- | --- |
    | App middleware | Every request | Global logic |
    | Router middleware | Specific routes | Auth & access |
    | Built-in | Express | Parsing & static |
    | Third-party | Express | Security & logging |
    | Error middleware | Errors | Central handling |
    | Mongoose hooks | DB actions | Data integrity |
    | Business middleware | App logic | SaaS rules |
    
    ---
    
    # 🎯 For YOUR project (SentReader)
    
    You will definitely need:
    
    - Auth middleware
    - Role middleware
    - Usage limit middleware
    - File size middleware
    - Mongoose pre-save hooks
    - Aggregation middleware (later)
    
    ---
    
    ## 🔜 Want to go deeper?
    
    Next we can:
    
    1️⃣ Build **auth + role middleware**
    
    2️⃣ Create **usage limit middleware** (free vs pro)
    
    3️⃣ Debug common middleware mistakes
    
    4️⃣ Compare middleware vs services
    
    5️⃣ Visualize middleware execution flow
    
    Just tell me the number 🚀