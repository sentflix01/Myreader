{
"name": "Myreader",
"version": "1.0.0",
"description": "PDF reader ",
"homepage": "https://github.com/sentflix01/Myreader#readme",
"bugs": {
"url": "https://github.com/sentflix01/Myreader/issues"
},
"repository": {
"type": "git",
"url": "git+https://github.com/sentflix01/Myreader.git"
},
"license": "ISC",
"author": "Sintayehu.M",
"scripts": {
"start:dev": "nodemon server.js",
"start:prod": "cross-env NODE_ENV=production nodemon server.js",
"debug": "node --inspect server.js",
"clean": "rimraf public/dist",
"watch:js": "npx parcel watch public/js/index.js --dist-dir public/dist/js --no-content-hash",
"build:js": "npx parcel build public/js/index.js --dist-dir public/dist/js --no-content-hash"
},
"dependencies": {
"@babel/polyfill": "^7.12.1",
"@faker-js/faker": "^10.1.0",
"axios": "^1.13.4",
"bcryptjs": "^3.0.3",
"cookie-parser": "^1.4.7",
"dotenv": "^16.6.1",
"express": "^5.2.1",
"express-rate-limit": "^8.2.1",
"express-xss-sanitizer": "^2.0.1",
"helmet": "^8.1.0",
"html-to-text": "^9.0.5",
"jsonwebtoken": "^9.0.3",
"mongodb": "7.0",
"mongoose": "^9.0.2",
"morgan": "^1.10.1",
"multer": "^2.0.2",
"nodemailer": "^8.0.1",
"pug": "^3.0.3",
"sharp": "^0.34.5",
"slugify": "^1.6.6",
"uuid": "^13.0.0",
"validator": "^13.15.26"
},
"devDependencies": {
"@prettier/plugin-pug": "^3.4.2",
"@types/jsonwebtoken": "^9.0.10",
"buffer": "^6.0.3",
"cross-env": "^10.1.0",
"eslint": "^8.57.1",
"eslint-config-airbnb": "^19.0.4",
"eslint-config-airbnb-base": "^15.0.0",
"eslint-config-prettier": "^10.1.8",
"eslint-plugin-import": "^2.32.0",
"eslint-plugin-jsx-a11y": "^6.10.2",
"eslint-plugin-n": "^17.23.2",
"eslint-plugin-prettier": "^5.5.5",
"eslint-plugin-react": "^7.37.5",
"nodemon": "^3.1.11",
"parcel": "^2.16.4",
"prettier": "^3.8.1",
"rimraf": "^6.1.2"
}
}
