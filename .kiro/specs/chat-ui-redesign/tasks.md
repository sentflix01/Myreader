# Implementation Plan: Chat UI Redesign

## Overview

Incrementally transform the SentReader chat page into an IDE-like interface: replace Font Awesome header icons with inline SVG panel-layout icons, restructure the left sidebar with a document-focused head and two-view body (TOC / Documents), replace the static chat input container with a collapsible tabbed bottom panel, and extend the toggle logic to keep icon states in sync. The right sidebar is left untouched.

## Tasks

- [x] 1. Update `views/chat.pug` — header SVG toggle buttons and left sidebar structure
  - Replace `#toggleLeftSidebar` button body: remove `i.fas.fa-bars`, add inline SVG (left-column rect icon); add class `panel-icon-btn`
  - Replace `#toggleRightSidebar` button body: remove `i.fas.fa-history`, add inline SVG (right-column rect icon); add class `panel-icon-btn`
  - Add `#toggleBottomPanel.sidebar-toggle.panel-icon-btn` button with inline SVG (bottom-row rect icon) inside `.header-right`
  - Remove `.chat-logo`, `.chat-try-free`, and `.recent-chats` blocks from `aside#leftSidebar`
  - Add `.sidebar-left-head` containing `span.sidebar-doc-title` ("No Document"), `button#sidebarFileBtn`, and `button#sidebarFolderBtn` (FA or inline SVG icons)
  - Add `.sidebar-left-body` containing `.sidebar-view.toc-view#tocView` (default visible) and `.sidebar-view.docs-view#docsView` (hidden)
  - Replace `.chat-input-container` with `#bottomPanel.bottom-panel` containing `.bottom-panel-tabs` (7 tab buttons with `data-tab` attributes, CHAT active by default) and `.bottom-panel-body` (7 `.bottom-panel-content` panes with `data-content` attributes; CHAT pane contains the existing `form.chat-form`)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 2.4, 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

- [x] 2. Update `public/css/chat.css` — panel icon styles, left sidebar head/body, bottom panel
  - [x] 2.1 Add `.panel-icon-btn` base styles (transparent background, border, cursor, padding, color) and `.panel-icon-btn svg rect:last-child` inactive fill
  - Add `.panel-icon-btn.panel-icon-active svg rect:last-child` active fill (full `currentColor`)
  - _Requirements: 1.5, 1.6, 8.1–8.6_

  - [x] 2.2 Add `.sidebar-left-head` styles (flex row, padding, border-bottom, gap) and `.sidebar-doc-title` (truncate, font-size, color)
  - Add `.sidebar-head-btn-active` highlight class for file/folder buttons
  - _Requirements: 2.1, 2.2, 3.2, 4.1_

  - [x] 2.3 Add `.sidebar-left-body` styles (flex: 1, overflow-y: auto) and `.sidebar-view` base (display: none) with `.sidebar-view` visible override (display: block)
  - Add `.toc-view` list item styles and `.docs-upgrade-prompt` styles
  - _Requirements: 3.1, 3.4, 4.3, 4.4_

  - [x] 2.4 Add `#bottomPanel` styles: `max-height: 300px`, `overflow: hidden`, `transition: max-height 0.3s ease`, `background: #fff`, `border-top`
  - Add `#bottomPanel.panel-collapsed { max-height: 0; }` collapse rule
  - Add `.bottom-panel-tabs` flex row styles and `.bottom-tab` button styles (padding, font-size, border, cursor)
  - Add `.bottom-tab.bottom-tab-active` active state (border-bottom highlight, color)
  - Add `.bottom-panel-body` and `.bottom-panel-content` (display: none) with `.bottom-panel-content.bottom-content-active` (display: block)
  - _Requirements: 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Create `public/js/bottomPanel.js` — tab switching module
  - [x] 3.1 Implement and export `initBottomPanel()`:
    - Query all `.bottom-tab` buttons and all `.bottom-panel-content` panes
    - Return early if none found
    - Add click listener on each tab: remove `bottom-tab-active` from all tabs, add to clicked tab; remove `bottom-content-active` from all panes, add to pane whose `data-content` matches clicked tab's `data-tab`
    - Guard: if no matching content pane exists for a tab's `data-tab`, skip (no-op)
    - _Requirements: 5.3, 5.4_

  - [x] 3.2 Write property test for active tab exclusivity (Property 6)
    - **Property 6: Active tab exclusivity**
    - **Validates: Requirements 5.4**
    - Use fast-check to generate random sequences of tab IDs from `['chat','error','token','model','rag','usage','subscription']`; after each simulated click assert exactly one `.bottom-tab` has `bottom-tab-active` and exactly one `.bottom-panel-content` has `bottom-content-active`, and they share the same ID value
    - `// Feature: chat-ui-redesign, Property 6: exactly one tab and one content pane are active at a time`

- [x] 4. Update `public/js/sidebarToggle.js` — bottom panel toggle and icon sync
  - [x] 4.1 Extend `initSidebarToggle()`:
    - Query `#toggleBottomPanel` and `#bottomPanel`; extend the existing guard to also return early if either is missing
    - Add click listener on `#toggleBottomPanel` that toggles `.panel-collapsed` on `#bottomPanel` then calls `syncPanelIconStates()`
    - Update left and right toggle click handlers to call `syncPanelIconStates()` after each toggle action
    - Implement `syncPanelIconStates()` (local function): set/remove `panel-icon-active` on `leftToggle`, `rightToggle`, and `bottomToggle` based on `isOpen(leftSidebar)`, `isOpen(rightSidebar)`, and `!bottomPanel.classList.contains('panel-collapsed')` respectively
    - Call `syncPanelIconStates()` once at the end of `initSidebarToggle()` to set correct initial state (bottom panel open → bottom toggle active)
    - _Requirements: 1.5, 1.6, 6.1, 6.2, 6.3, 8.1–8.6_

  - [x] 4.2 Write property test for panel icon state mirroring (Property 1)
    - **Property 1: Panel icon active class mirrors panel open/closed state**
    - **Validates: Requirements 1.5, 1.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**
    - Use fast-check to generate random sequences of toggle actions (`'left' | 'right' | 'bottom'`); after each action assert `panel-icon-active` is present on a button if and only if its panel is open
    - `// Feature: chat-ui-redesign, Property 1: panel icon active class mirrors panel open state`

  - [x] 4.3 Write property test for bottom panel toggle round trip (Property 2)
    - **Property 2: Bottom panel toggle is a round trip**
    - **Validates: Requirements 6.2, 6.3**
    - Use fast-check to generate a random initial state (open or collapsed); apply the toggle twice; assert final state equals initial state
    - `// Feature: chat-ui-redesign, Property 2: bottom panel toggle is a round trip`

  - [x] 4.4 Write property test for collapsed panel height (Property 8)
    - **Property 8: Collapsed bottom panel has zero effective height**
    - **Validates: Requirements 6.4**
    - Use fast-check to generate random panel states; when `.panel-collapsed` is applied assert `#bottomPanel` computed `max-height` is `"0px"` (or class presence check)
    - `// Feature: chat-ui-redesign, Property 8: collapsed bottom panel has zero effective height`

- [x] 5. Checkpoint — verify structure and toggle behavior
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add helpers to `public/js/chatView.js` — `renderTocView`, `renderDocsView`, `truncateToTwoWords`
  - [x] 6.1 Implement `truncateToTwoWords(title)`:
    - Split on whitespace, take first two tokens, join with a space
    - Return `"No Document"` if input is falsy or empty after trim
    - Export the function
    - _Requirements: 2.2, 2.3_

  - [x] 6.2 Write property test for document title truncation (Property 3)
    - **Property 3: Document title truncated to at most two words**
    - **Validates: Requirements 2.2**
    - Use fast-check to generate random strings with 0–20 whitespace-separated words; pass each to `truncateToTwoWords`; assert the result contains at most 2 whitespace-separated words
    - `// Feature: chat-ui-redesign, Property 3: document title truncated to at most two words`

  - [x] 6.3 Implement `renderTocView(dom, ragData)`:
    - Accept `dom` (object with `tocView` node) and `ragData` (array of `TocItem` or null/empty)
    - If `ragData` is null or empty, render a `<p>` with "No table of contents available" inside `#tocView`
    - Otherwise render a `<ul>` with one `<li data-section-id="{item.id}">` per item containing the item's `label`
    - Export the function
    - _Requirements: 3.3, 3.4_

  - [x] 6.4 Write property test for TOC rendering from RAG data (Property 7)
    - **Property 7: TOC list item count matches RAG data input**
    - **Validates: Requirements 3.3**
    - Use fast-check to generate random arrays of `TocItem` objects (0–50 items); pass to `renderTocView`; assert rendered `<li>` count equals input array length and each `data-section-id` matches the corresponding item's `id`
    - `// Feature: chat-ui-redesign, Property 7: TOC list item count matches RAG data input`

  - [x] 6.5 Implement `renderDocsView(dom, { isEnterprise, documents })`:
    - Accept `dom` (object with `docsView` node), `isEnterprise` boolean, and `documents` array
    - If `isEnterprise` is true, render a `<ul>` listing each document's `name`, `fileType`, and `fileSize`
    - If `isEnterprise` is false, render a `<div class="docs-upgrade-prompt">` with an upgrade message and CTA
    - Export the function
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 6.6 Write property test for enterprise gate on Documents view (Property 5)
    - **Property 5: Enterprise gate controls documents view content**
    - **Validates: Requirements 4.2, 4.3**
    - Use fast-check to generate random `isEnterprise` booleans and random document arrays; assert rendered output contains the documents list iff `isEnterprise` is true, and `.docs-upgrade-prompt` iff `isEnterprise` is false
    - `// Feature: chat-ui-redesign, Property 5: enterprise gate controls documents view content`

- [x] 7. Update `public/js/chatController.js` — wire new DOM nodes
  - [x] 7.1 Extend `getChatDom()` in `chatView.js` (or inline in `chatController.js`) to include new nodes:
    - `sidebarFileBtn: document.getElementById('sidebarFileBtn')`
    - `sidebarFolderBtn: document.getElementById('sidebarFolderBtn')`
    - `sidebarDocTitle: document.querySelector('.sidebar-doc-title')`
    - `tocView: document.getElementById('tocView')`
    - `docsView: document.getElementById('docsView')`
    - _Requirements: 2.1, 3.2, 4.1_

  - [x] 7.2 Wire view-switching in `initChat()`:
    - `#sidebarFileBtn` click: show `#tocView`, hide `#docsView`, toggle `sidebar-head-btn-active` on both buttons
    - `#sidebarFolderBtn` click: show `#docsView`, hide `#tocView`, toggle `sidebar-head-btn-active` on both buttons
    - _Requirements: 3.2, 4.1_

  - [x] 7.3 Write property test for view switching exclusivity (Property 4)
    - **Property 4: Only one sidebar view is visible at a time**
    - **Validates: Requirements 3.2, 4.1**
    - Use fast-check to generate random sequences of `'file' | 'folder'` button clicks; after each click assert exactly one of `#tocView` / `#docsView` is visible (not `display: none`)
    - `// Feature: chat-ui-redesign, Property 4: only one sidebar view is visible at a time`

  - [x] 7.4 Update `setCurrentChat()` and `startNewChat()` to call `truncateToTwoWords(chat.name)` and set `dom.sidebarDocTitle.textContent` accordingly
    - Also update `resetToInitialState()` to reset `dom.sidebarDocTitle.textContent` to `"No Document"`
    - _Requirements: 2.2, 2.3_

- [x] 8. Update `public/js/index.js` — import and initialise `bottomPanel`
  - Add `import { initBottomPanel } from './bottomPanel';` at the top
  - Call `initBottomPanel()` inside the `DOMContentLoaded` handler (after `initSidebarToggle()`)
  - Remove the `if (document.querySelector('.chat-input-container')) { initChatInput(); }` guard (the container is replaced by `#bottomPanel`)
  - _Requirements: 5.3, 5.4, 6.1_

- [x] 9. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** (`npm install --save-dev fast-check`)
- The right sidebar (`#rightSidebar`, `#uploadHistoryList`, `#conversationTopicsList`) must not be modified at any point — Requirements 7.1, 7.2, 7.3
- `syncPanelIconStates()` must be called after every toggle action and once on init to satisfy Requirements 8.1–8.6
