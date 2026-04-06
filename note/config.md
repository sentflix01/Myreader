NODE_ENV=development
PORT=8000

# DATABASE CONFIGURATION

# -----------------------------------------------

DATABASE=mongodb+srv://Sentflix:<PASSWORD>@cluster0.lzsy164.mongodb.net/sentreader?appName=Cluster0
DATABASE_LOCAL=mongodb://localhost:27017/sentreader
DATABASE_USERNAME=sentflix1
DATABASE_PASSWORD=sintayehumulugeta

# jwt

JWT_SECRET=my-sentreader-app-working-for-differnt-option
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# -----------------------------------------------

# PRIMARY EMAIL SERVICE — BREVO (Production)

# -----------------------------------------------

BREVO_USER=your-smtp-user@smtp-brevo.com
BREVO_PASS=your-brevo-smtp-key
BREVO_API_KEY=your-brevo-api-key
EMAIL_FROM=your-email@gmail.com
EMAIL_PORT=587
