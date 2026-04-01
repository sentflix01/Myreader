# Implementation Plan: Sidebar Toggle Buttons

## Overview

Implement persistent sidebar toggle buttons visible at all viewport widths. The work spans four files: update the Pug template to swap `.mobile-toggle` for `.sidebar-toggle`, add CSS rules for always-visible buttons and desktop collapse, create a new `sidebarToggle.js` module with viewport-aware toggle logic, wire it into `index.js`, and remove the now-duplicate toggle listeners from `chatController.js`.

## Tasks

- [x] 1. Update `views/chat.pug` — replace `.mobile-toggle` with `.sidebar-toggle`
  - On `button#toggleLeftSidebar`, replace class `mobile-toggle` with `sidebar-toggle`
  - On `button#toggleRightSidebar`, replace class `mobile-toggle` with `sidebar-toggle`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1_

- [x] 2. Update `public/css/chat.css` — add `.sidebar-toggle` and `.sidebar-collapsed` rules
  - [x] 2.1 Add `.sidebar-toggle` rule block (always-visible, same visual style as `.mobile-toggle`)
    - `display: block`, transparent background, correct color, font-size, cursor, padding, hover transition
    - _Requirements: 1.4, 5.1, 6.1, 6.4_
  - [x] 2.2 Add `.sidebar-collapsed` rule block for desktop collapse
    - `width: 0 !important`, `overflow: hidden`, `padding: 0`
    - _Requirements: 3.2, 3.3_

- [x] 3. Create `public/js/sidebarToggle.js` — new toggle module
  - [x] 3.1 Implement `isDesktop()`, `openSidebar()`, `closeSidebar()`, `isOpen()` helpers
    - `isDesktop`: `window.innerWidth > 1200`
    - `openSidebar`: desktop → remove `.sidebar-collapsed`; mobile → add `.show-sidebar`
    - `closeSidebar`: desktop → add `.sidebar-collapsed`; mobile → remove `.show-sidebar`
    - `isOpen`: desktop → `!el.classList.contains('sidebar-collapsed')`; mobile → `el.classList.contains('show-sidebar')`
    - _Requirements: 3.2, 3.3, 4.2, 4.3_
  - [x] 3.2 Implement `initSidebarToggle()` — guard, left-toggle click, right-toggle click
    - Return early if any of the four DOM elements are missing
    - Left click: close right if open, then toggle left
    - Right click: close left if open, then toggle right
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 3.3 Add outside-click dismissal listener (mobile only)
    - On `document` click, if mobile and click is outside sidebar and not on its toggle button, close that sidebar
    - _Requirements: 4.4_
  - [x] 3.4 Write property test for toggle round-trip (Property 1)
    - **Property 1: Toggle is a round-trip (idempotence over two clicks)**
    - **Validates: Requirements 2.1, 2.2, 3.2, 3.3, 4.2, 4.3**
    - Use fast-check; generate random sidebar mock and viewport mode; call toggle twice; assert final state equals initial state
    - `// Feature: sidebar-toggle-buttons, Property 1: toggle is a round-trip`
  - [x] 3.5 Write property test for mutual exclusion on mobile (Property 2)
    - **Property 2: Mutual exclusion on mobile**
    - **Validates: Requirements 2.3, 2.4**
    - Generate random initial state; simulate clicking one toggle; assert other sidebar is closed
    - `// Feature: sidebar-toggle-buttons, Property 2: mutual exclusion on mobile`
  - [x] 3.6 Write property test for outside-click dismissal (Property 3)
    - **Property 3: Outside-click dismissal on mobile**
    - **Validates: Requirements 4.4**
    - Generate random open sidebar and random outside target element; dispatch click; assert sidebar loses `show-sidebar`
    - `// Feature: sidebar-toggle-buttons, Property 3: outside-click dismissal on mobile`
  - [x] 3.7 Write property test for desktop collapse class (Property 4)
    - **Property 4: Desktop collapse applies correct class**
    - **Validates: Requirements 3.2**
    - Generate sidebar without `sidebar-collapsed`; simulate toggle click in desktop mode; assert `sidebar-collapsed` is present
    - `// Feature: sidebar-toggle-buttons, Property 4: desktop collapse applies correct class`
  - [x] 3.8 Write property test for mobile show class (Property 5)
    - **Property 5: Mobile show applies correct class**
    - **Validates: Requirements 4.2**
    - Generate sidebar without `show-sidebar`; simulate toggle click in mobile mode; assert `show-sidebar` is present
    - `// Feature: sidebar-toggle-buttons, Property 5: mobile show applies correct class`

- [x] 4. Checkpoint — verify toggle module works in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update `public/js/index.js` — wire in `initSidebarToggle`
  - Add `import { initSidebarToggle } from './sidebarToggle';` at the top with other imports
  - Call `initSidebarToggle()` inside the `DOMContentLoaded` handler
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 6. Clean up `public/js/chatController.js` — remove duplicate toggle listeners
  - Remove the `dom.toggleLeftBtn?.addEventListener('click', ...)` block (lines ~265–271)
  - Remove the `dom.toggleRightBtn?.addEventListener('click', ...)` block (lines ~272–278)
  - Remove the `document.addEventListener('click', ...)` outside-click handler that references `toggleLeftBtn`/`toggleRightBtn` (lines ~280–293)
  - Keep the `dom.leftSidebar?.classList.remove('show-sidebar')` calls inside chat-selection handlers — those are unrelated and still needed
  - _Requirements: 2.1, 2.2, 4.4_

- [x] 7. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests require `fast-check` (`npm install --save-dev fast-check`)
- The `dom.toggleLeftBtn` / `dom.toggleRightBtn` references in `chatView.js` can stay — they are harmless and may still be used by other parts of `chatController.js`
- The existing `.mobile-toggle { display: none }` rule in `chat.css` is intentionally left untouched; it only affects elements that still carry that class
