---
name: account-nav-and-photo-fix
overview: Implement tab-style navigation in the Account settings page with Edit Profile as the default tab and fix user photo upload so that profile pictures persist after refresh.
todos: []
isProject: false
---

## Goal

Implement **tabbed navigation** within the Account settings view (single `/editProfile` route) where **Edit Profile is the default active tab**, and **fix profile photo upload** so that the new avatar is saved and displayed after a page refresh.

## Files to touch

- **Views**
  - `[views/account.pug](views/account.pug)`
  - `[views/_header.pug](views/_header.pug)` (only if we later decide to show the real photo instead of initials; not required for core fix)
- **Frontend JS**
  - `[public/js/index.js](public/js/index.js)`
  - `[public/js/updateSettings.js](public/js/updateSettings.js)`
  - Add `[public/js/accountTabs.js](public/js/accountTabs.js)` for tab/nav behavior
- **Backend**
  - `[controllers/userController.js](controllers/userController.js)`
  - `[routes/userRoutes.js](routes/userRoutes.js)`

## High-level design

- **Account as a single tabbed page**: The `/editProfile` route will continue to render `account.pug`, which will contain multiple **tab sections** (Edit Profile, Subscription, My Reviews, Billing). Clicking each side-nav item will **not change the URL**, but will show/hide corresponding content sections.
- **Default behavior**: On initial load, the **Edit Profile** tab is active, its content section is visible, and its nav item is visually highlighted (and arrow state reflects this).
- **Photo upload pipeline**: The profile form will submit using `**FormData` over `PATCH /api/v1/users/updateMe`**, with the backend using **Multer + Sharp** to process and save the image file to `public/img/users` and update `user.photo` in MongoDB.

```mermaid
flowchart LR
  user[User] -->|submits form with name/email/photo| frontEnd[FrontEnd JS]
  frontEnd -->|FormData PATCH /api/v1/users/updateMe| backEnd[Express userRoutes]
  backEnd -->|multer parses file| upload[userController.uploadUserPhoto]
  upload -->|sharp resizes & saves file| resize[userController.resizeUserPhoto]
  resize -->|updates user.photo field| updateMe[userController.updateMe]
  updateMe --> db[(MongoDB User)]
  db --> view[account.pug]
  view -->|renders /img/users/{user.photo}| browser[Browser]
```



## Step-by-step plan

### 1) Account view: structure nav items and tab sections

- **Update `account.pug` nav mixin and items**:
  - Extend the `mixin navItem` signature to include a `section` key.
  - Render `a` tags with `href="#"` and a `data-section` attribute (e.g., `data-section="profile"`, `data-section="subscription"`, `data-section="reviews"`, `data-section="billing"`).
  - Ensure the **Edit Profile** item is marked active by default (`side-nav--active`).
  - Optionally add a small arrow icon inside each nav item (e.g., `<i class="fas fa-chevron-right side-nav__arrow"></i>`) if not already styled, to visually represent the toggle-arrow.
- **Wrap content into labeled sections**:
  - Wrap the existing "Your account settings" + "Password change" blocks inside a container tagged as the **profile** section (e.g., `.user-view__section(data-section-content="profile")`).
  - Add new section containers for **Subscription**, **My Reviews**, and **Billing** (e.g., `.user-view__section(data-section-content="subscription")` etc.), initially with placeholder headings/text so tabs have content to toggle between.
  - Set only the `profile` section visible by default (via a class like `user-view__section--active` that CSS will show).
- **(Optional) minor CSS adjustments** in `public/css/style.css` or `public/css/general.css`:
  - Add styles to show/hide `.user-view__section` based on an `--active` modifier class.
  - Style `.side-nav--active` to visually align with the desired toggle-arrow behavior (e.g., arrow rotation or highlight).

### 2) Frontend JS: implement tab behavior in Account page

- **Create `public/js/accountTabs.js`**:
  - Export an `initAccountTabs()` function that:
    - Selects all side-nav links under `.user-view__menu .side-nav a`.
    - Selects all `.user-view__section` content blocks.
    - Attaches click handlers to each nav link that:
      - `preventDefault()` to avoid navigation.
      - Read `data-section` from the clicked link.
      - Remove `side-nav--active` from all nav `<li>` elements, then add it to the clicked link's parent.
      - Remove the active-class (e.g., `user-view__section--active`) from all sections and add it only to the matching `data-section-content` section.
      - Optionally toggle an arrow class (e.g., add/remove `side-nav__arrow--active`) to visually indicate the selected nav item.
  - Ensure it **only runs when the Account page DOM is present**, by checking for `.user-view__menu` or similar.
- **Wire it up from `public/js/index.js`**:
  - Import `initAccountTabs` at the top: `import { initAccountTabs } from './accountTabs';`.
  - In the `DOMContentLoaded` handler, after other initializers, call `initAccountTabs();` so tab behavior is set up whenever the account page is loaded.

### 3) Frontend JS: send photo via FormData

- **Update the user data form handler in `public/js/index.js`**:
  - In the `userDataForm` submit listener:
    - Replace the plain object `{ name, email }` with a `FormData` instance.
    - Collect values:
      - `const name = document.getElementById('name').value;`
      - `const email = document.getElementById('email').value;`
      - `const photo = document.getElementById('photo').files[0];`
    - Build `const form = new FormData();` and `form.append('name', name); form.append('email', email);` and, if `photo` is present, `form.append('photo', photo);`.
    - Call `updateSettings(form, 'data');`.
- **Enhance `public/js/updateSettings.js`** to support FormData:
  - Keep the URL logic the same (`/updateMyPassword` vs `/updateMe`).
  - When `type === 'data'` and `data` is a `FormData` instance, pass it directly to axios and set `headers: { 'Content-Type': 'multipart/form-data' }` so the backend receives a `multipart/form-data` request.
  - Leave the password-update branch using JSON as-is.

### 4) Backend: handle user photo upload and persistence

- **Extend `controllers/userController.js` with image-upload middleware**:
  - Import `multer` and `sharp` at the top.
  - Configure a Multer memory storage and a file filter that only accepts images.
  - Create an `upload` instance (e.g., `const upload = multer({ storage: multerStorage, fileFilter: multerFilter });`).
  - Export `uploadUserPhoto = upload.single('photo');` so the route can parse the file from the `photo` field.
  - Export `resizeUserPhoto` using `sharp` to:
    - Skip if `!req.file`.
    - Generate a filename like `user-${req.user.id}-${Date.now()}.jpeg`.
    - Resize and convert the buffer, saving to `public/img/users/<filename>`.
    - Set `req.body.photo = filename;` so the subsequent `updateMe` call sees the new value.
- **Update `updateMe` to accept the `photo` field**:
  - Keep the password-guard logic as-is.
  - In the filter step, include `'photo'` alongside `'name'` and `'email'` (e.g., `filterObj(req.body, 'name', 'email', 'photo')`).
  - Use `findByIdAndUpdate` as currently done so that `user.photo` is updated if present.
- **Wire the middlewares into `routes/userRoutes.js`**:
  - For the `/updateMe` route, change it to use the new middlewares, e.g.:
    - `router.patch('/updateMe', userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);`
  - Keep the auth protection (`router.use(authController.protect);`) above this route so `req.user` is always defined.

### 5) Verify behavior end-to-end

- **Nav/tab behavior**:
  - Load `/editProfile`.
  - Confirm **Edit Profile** is highlighted, its section is visible, and other sections are hidden.
  - Click each nav item and confirm:
    - The clicked item becomes the only one with `side-nav--active`.
    - Corresponding section content becomes visible.
    - Arrow/indicator reflects the current selection.
    - The URL remains on `/editProfile` (no page reloads).
- **Photo upload and persistence**:
  - On `/editProfile`, change name/email and upload a new photo.
  - Submit the form and ensure the success alert appears.
  - Confirm the `<img class="form__user-photo">` shows the new image.
  - Refresh the page and confirm the updated image persists (file exists in `public/img/users` and `user.photo` is updated in the database).

## Todos

- **account-tabs**: Implement account tab structure and side-nav behavior in `account.pug` and `accountTabs.js`.
- **photo-upload-frontend**: Update `index.js` and `updateSettings.js` to send profile updates (including photo) via `FormData`.
- **photo-upload-backend**: Add Multer/Sharp-based photo upload handling in `userController.js` and wire it into `userRoutes.js`.
- **manual-test-account**: Manually test Account nav toggling and photo upload with page refresh to confirm it works as expected.

