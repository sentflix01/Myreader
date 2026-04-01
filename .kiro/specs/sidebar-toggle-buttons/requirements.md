# Requirements Document

## Introduction

This feature adds persistent sidebar toggle buttons to the chat page header, visible at all screen sizes. Two buttons — one for the left sidebar and one for the right sidebar — will sit next to the "New Chat" button in the header. Clicking a button toggles the corresponding sidebar open or closed. On desktop the sidebars are visible by default; on tablet/mobile they are hidden by default (via `translateX`). The toggle buttons must work consistently across all breakpoints and must not conflict with the existing `.mobile-toggle` buttons, which will be replaced or unified by this feature.

## Glossary

- **Chat_Page**: The page rendered by `views/chat.pug` that contains the chat interface.
- **Header**: The `.chat-area-header` element at the top of the main chat area.
- **Left_Sidebar**: The `aside.chat-sidebar-left#leftSidebar` element containing recent chats.
- **Right_Sidebar**: The `aside.chat-sidebar-right#rightSidebar` element containing upload history and conversation topics.
- **Toggle_Button**: A button in the Header that shows or hides a sidebar.
- **Sidebar_Toggle_Controller**: The JavaScript logic (in `chatController.js`) that handles toggle button click events and sidebar visibility state.
- **show-sidebar**: The CSS class added to a sidebar element to make it visible when it is in its off-canvas (mobile/tablet) state.
- **Desktop**: Viewport width greater than 75em (1200px).
- **Mobile_Tablet**: Viewport width of 75em (1200px) or less, where sidebars are positioned off-canvas.

---

## Requirements

### Requirement 1: Persistent Toggle Buttons in Header

**User Story:** As a user, I want toggle buttons for both sidebars always visible in the header, so that I can show or hide either sidebar regardless of my device or screen size.

#### Acceptance Criteria

1. THE Chat_Page SHALL render a Left_Sidebar Toggle_Button and a Right_Sidebar Toggle_Button inside the Header at all viewport widths.
2. THE Left_Sidebar Toggle_Button SHALL be positioned in the `.header-left` group, adjacent to the "New Chat" button area.
3. THE Right_Sidebar Toggle_Button SHALL be positioned in the `.header-right` group, adjacent to the "New Chat" button.
4. THE Toggle_Button elements SHALL be visible (`display` not `none`) at all viewport widths, including Desktop and Mobile_Tablet.

---

### Requirement 2: Toggle Sidebar Visibility on Click

**User Story:** As a user, I want clicking a toggle button to show or hide the corresponding sidebar, so that I can control my workspace layout.

#### Acceptance Criteria

1. WHEN the Left_Sidebar Toggle_Button is clicked, THE Sidebar_Toggle_Controller SHALL toggle the Left_Sidebar between its visible and hidden states.
2. WHEN the Right_Sidebar Toggle_Button is clicked, THE Sidebar_Toggle_Controller SHALL toggle the Right_Sidebar between its visible and hidden states.
3. WHEN the Left_Sidebar Toggle_Button is clicked and the Right_Sidebar is currently visible, THE Sidebar_Toggle_Controller SHALL hide the Right_Sidebar before showing the Left_Sidebar.
4. WHEN the Right_Sidebar Toggle_Button is clicked and the Left_Sidebar is currently visible, THE Sidebar_Toggle_Controller SHALL hide the Left_Sidebar before showing the Right_Sidebar.

---

### Requirement 3: Desktop Sidebar State

**User Story:** As a desktop user, I want the sidebars to be visible by default and togglable, so that I can collapse them to gain more space when needed.

#### Acceptance Criteria

1. WHILE the viewport width is greater than 75em, THE Chat_Page SHALL render both sidebars in their visible (inline) state by default on page load.
2. WHEN a Toggle_Button is clicked on Desktop, THE Sidebar_Toggle_Controller SHALL hide the corresponding sidebar by applying a collapsed CSS state.
3. WHEN a Toggle_Button is clicked again on Desktop while the sidebar is collapsed, THE Sidebar_Toggle_Controller SHALL restore the sidebar to its visible state.

---

### Requirement 4: Mobile and Tablet Sidebar State

**User Story:** As a mobile or tablet user, I want the sidebars hidden by default and openable via toggle buttons, so that the chat area uses the full screen width.

#### Acceptance Criteria

1. WHILE the viewport width is 75em or less, THE Chat_Page SHALL render both sidebars in their hidden (off-canvas) state by default on page load.
2. WHEN a Toggle_Button is clicked on Mobile_Tablet, THE Sidebar_Toggle_Controller SHALL add the `show-sidebar` class to the corresponding sidebar to slide it into view.
3. WHEN a Toggle_Button is clicked again on Mobile_Tablet while the sidebar is visible, THE Sidebar_Toggle_Controller SHALL remove the `show-sidebar` class to slide the sidebar out of view.
4. WHEN a user clicks outside an open sidebar on Mobile_Tablet, THE Sidebar_Toggle_Controller SHALL close that sidebar by removing the `show-sidebar` class.

---

### Requirement 5: Removal of Mobile-Only Toggle Restriction

**User Story:** As a developer, I want the existing `.mobile-toggle` CSS class restriction removed from the new toggle buttons, so that the buttons are not hidden on desktop by the existing `display: none` rule.

#### Acceptance Criteria

1. THE Chat_Page SHALL NOT apply the `.mobile-toggle` class to the persistent Toggle_Buttons, OR THE Chat_Page SHALL update the `.mobile-toggle` CSS rule so it no longer hides the Toggle_Buttons on Desktop.
2. THE Header SHALL retain correct layout and alignment of all buttons at all viewport widths after the change.

---

### Requirement 6: Visual Consistency

**User Story:** As a user, I want the toggle buttons to look consistent with the existing header button style, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE Toggle_Button elements SHALL use the same icon style (Font Awesome) as the existing header action buttons.
2. THE Left_Sidebar Toggle_Button SHALL display a menu/bars icon (`fa-bars` or equivalent) to indicate the left sidebar.
3. THE Right_Sidebar Toggle_Button SHALL display a history/panel icon (`fa-history` or equivalent) to indicate the right sidebar.
4. THE Toggle_Button elements SHALL apply the same hover color transition as `.chat-header-actions button` (color change on hover).
