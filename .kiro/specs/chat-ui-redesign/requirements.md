# Requirements Document

## Introduction

This feature is a major redesign of the SentReader chat page UI. The redesign introduces VS Code-style panel layout toggle icons in the header, a fully restructured left sidebar with document navigation (Table of Contents and User Documents), a new collapsible bottom input panel styled like a VS Code terminal with multiple informational tabs, and retains the existing right sidebar structure. The goal is to give users a more powerful, IDE-like interface for interacting with their documents.

## Glossary

- **Chat_UI**: The chat page rendered from `views/chat.pug`, styled by `public/css/chat.css`, and controlled by `public/js/sidebarToggle.js`, `public/js/chatController.js`, and `public/js/index.js`
- **Left_Sidebar**: The `aside#leftSidebar` panel on the left side of the chat layout
- **Right_Sidebar**: The `aside#rightSidebar` panel on the right side of the chat layout
- **Bottom_Panel**: The collapsible panel at the bottom of the main chat area that replaces the static `.chat-input-container`
- **Header**: The `.chat-area-header` bar at the top of the main chat area
- **TOC_View**: The Table of Contents view in the Left_Sidebar body, generated from RAG data showing document structure (headings, sections, chapters)
- **Documents_View**: The User Documents list view in the Left_Sidebar body, available to enterprise subscribers
- **Panel_Icon**: An SVG icon styled after VS Code's panel layout icons (rounded rectangle outlines indicating which panel is active)
- **Bottom_Panel_Tab**: A tab in the Bottom_Panel tab bar (CHAT, ERROR, TOKEN USED, MODEL USED, RAG INFO, USAGE LIMIT, SUBSCRIPTION)
- **Enterprise_User**: A user with an active enterprise subscription plan
- **Non_Enterprise_User**: A user without an enterprise subscription plan

---

## Requirements

### Requirement 1: Header Panel Toggle Icons

**User Story:** As a user, I want VS Code-style panel layout icons on the sidebar toggle buttons, so that I can visually understand which panel each button controls.

#### Acceptance Criteria

1. THE Chat_UI SHALL render three toggle buttons in the Header: a left sidebar toggle, a right sidebar toggle, and a bottom panel toggle.
2. THE Chat_UI SHALL replace the `fa-bars` Font Awesome icon on the left sidebar toggle button with a Panel_Icon SVG representing a left panel layout.
3. THE Chat_UI SHALL replace the `fa-history` Font Awesome icon on the right sidebar toggle button with a Panel_Icon SVG representing a right panel layout.
4. THE Chat_UI SHALL render the bottom panel toggle button with a Panel_Icon SVG representing a bottom panel layout.
5. WHEN a toggle button's corresponding panel is open, THE Chat_UI SHALL render that button's Panel_Icon in an active/highlighted visual state.
6. WHEN a toggle button's corresponding panel is closed, THE Chat_UI SHALL render that button's Panel_Icon in an inactive visual state.

---

### Requirement 2: Left Sidebar Header

**User Story:** As a user, I want a structured header in the left sidebar showing the document title and navigation controls, so that I can quickly identify the active document and switch between views.

#### Acceptance Criteria

1. THE Left_Sidebar SHALL render a header section containing a document title and two icon buttons: a file icon button and a folder icon button.
2. THE Left_Sidebar header SHALL display the active document title truncated to a maximum of two words.
3. IF no document is active, THEN THE Left_Sidebar header SHALL display a placeholder title such as "No Document".
4. THE Chat_UI SHALL remove the SentReader logo (`h1` with `fa-comment-dots`), the "Try for free" button, and the "Recent Chats" section from the Left_Sidebar.

---

### Requirement 3: Left Sidebar Body — TOC View

**User Story:** As a user, I want to see a Table of Contents for my document in the left sidebar, so that I can navigate to specific sections quickly.

#### Acceptance Criteria

1. THE Left_Sidebar SHALL render a body section that displays the TOC_View by default when a document is active.
2. WHEN the file icon button in the Left_Sidebar header is clicked, THE Left_Sidebar SHALL display the TOC_View in the body section.
3. THE TOC_View SHALL render a list of document sections (headings, chapters, or named sections) derived from RAG data associated with the active document.
4. IF no RAG data is available for the active document, THEN THE Left_Sidebar SHALL display a message indicating that no table of contents is available.
5. WHEN a TOC_View item is clicked, THE Chat_UI SHALL scroll the chat messages area to the relevant section or highlight the relevant context.

---

### Requirement 4: Left Sidebar Body — Documents View

**User Story:** As an enterprise user, I want to see a list of my uploaded documents in the left sidebar, so that I can switch between documents without leaving the chat page.

#### Acceptance Criteria

1. WHEN the folder icon button in the Left_Sidebar header is clicked, THE Left_Sidebar SHALL display the Documents_View in the body section.
2. WHERE the user is an Enterprise_User, THE Documents_View SHALL render a list of the user's uploaded documents.
3. WHERE the user is a Non_Enterprise_User, THE Documents_View SHALL render a locked/upgrade prompt instead of the documents list.
4. THE upgrade prompt SHALL include a message indicating that the Documents_View is an enterprise feature and a call-to-action to upgrade the subscription.

---

### Requirement 5: Bottom Panel Structure

**User Story:** As a user, I want a collapsible bottom panel with multiple informational tabs, so that I can access chat input, error logs, token usage, model info, RAG details, usage limits, and subscription info in one place.

#### Acceptance Criteria

1. THE Chat_UI SHALL replace the static `.chat-input-container` element with the Bottom_Panel.
2. THE Bottom_Panel SHALL render a tab bar containing the following tabs in order: CHAT, ERROR, TOKEN USED, MODEL USED, RAG INFO, USAGE LIMIT, SUBSCRIPTION.
3. THE Bottom_Panel SHALL display the CHAT tab as the active tab by default.
4. WHEN a Bottom_Panel_Tab is clicked, THE Bottom_Panel SHALL display the content corresponding to that tab and mark it as active.
5. THE Bottom_Panel CHAT tab body SHALL render the existing chat input form (textarea and send button).
6. THE Bottom_Panel ERROR tab body SHALL render a scrollable log of error messages.
7. THE Bottom_Panel TOKEN USED tab body SHALL render token consumption information for the current session.
8. THE Bottom_Panel MODEL USED tab body SHALL render the name and details of the current AI model in use.
9. THE Bottom_Panel RAG INFO tab body SHALL render retrieval details from the most recent RAG query.
10. THE Bottom_Panel USAGE LIMIT tab body SHALL render the user's current usage quota and remaining allowance.
11. THE Bottom_Panel SUBSCRIPTION tab body SHALL render the user's current subscription plan details.

---

### Requirement 6: Bottom Panel Toggle Behavior

**User Story:** As a user, I want to collapse and expand the bottom panel using the toggle button in the header, so that I can maximize the chat messages area when I don't need the input panel.

#### Acceptance Criteria

1. THE Bottom_Panel SHALL be open (expanded) by default when the chat page loads.
2. WHEN the bottom panel toggle button in the Header is clicked and the Bottom_Panel is open, THE Chat_UI SHALL collapse the Bottom_Panel with a slide-down animation.
3. WHEN the bottom panel toggle button in the Header is clicked and the Bottom_Panel is collapsed, THE Chat_UI SHALL expand the Bottom_Panel with a slide-up animation.
4. WHILE the Bottom_Panel is collapsed, THE Chat_UI SHALL expand the chat messages area to fill the space previously occupied by the Bottom_Panel.
5. THE Bottom_Panel collapse and expand transitions SHALL complete within 300 milliseconds.

---

### Requirement 7: Right Sidebar Preservation

**User Story:** As a user, I want the right sidebar to remain unchanged, so that my Upload History and Conversation Topics are still accessible.

#### Acceptance Criteria

1. THE Right_Sidebar SHALL retain its existing structure including the Upload History section and the Conversation Topics section.
2. THE Right_Sidebar SHALL retain its existing toggle behavior controlled by the right sidebar toggle button in the Header.
3. THE Chat_UI SHALL not modify any existing CSS classes, IDs, or JavaScript event bindings associated with the Right_Sidebar.

---

### Requirement 8: Sidebar Toggle State Consistency

**User Story:** As a user, I want the toggle button icons to reflect the current open/closed state of each panel, so that I always know what will happen when I click a toggle.

#### Acceptance Criteria

1. WHEN the Left_Sidebar is open, THE Chat_UI SHALL render the left panel Panel_Icon in an active state.
2. WHEN the Left_Sidebar is collapsed, THE Chat_UI SHALL render the left panel Panel_Icon in an inactive state.
3. WHEN the Right_Sidebar is open, THE Chat_UI SHALL render the right panel Panel_Icon in an active state.
4. WHEN the Right_Sidebar is collapsed, THE Chat_UI SHALL render the right panel Panel_Icon in an inactive state.
5. WHEN the Bottom_Panel is open, THE Chat_UI SHALL render the bottom panel Panel_Icon in an active state.
6. WHEN the Bottom_Panel is collapsed, THE Chat_UI SHALL render the bottom panel Panel_Icon in an inactive state.
