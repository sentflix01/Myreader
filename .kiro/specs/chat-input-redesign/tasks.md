# Implementation Plan: Chat Input Redesign

## Overview

Replace the hidden, basic chat input with a pill-shaped, sentbot-style form that is always visible. Changes are scoped to `views/chat.pug`, `public/css/chat.css`, and a new `public/js/chatInput.js` module wired into `public/js/index.js`.

## Tasks

- [x] 1. Update chat.pug HTML structure
  - Replace `.message-input-wrapper`, `.chat-message-input`, and `.send-message-btn` inside `.chat-input-container` with the sentbot-style form structure
  - Add `form.chat-form` containing `textarea.message-input(required)` and `.chat-controls` with `#emoji-picker-btn` and `#send-message-btn`
  - _Requirements: 1.1, 2.4, 4.1, 5.1, 5.2_

- [x] 2. Update chat.css styles
  - [x] 2.1 Make chat input container always visible and styled
    - Remove `display: none` from `.chat-input-container` (set to `display: block`)
    - Add `background: #fff` and `border-top: 1px solid #e2e8f0` to `.chat-input-container`
    - _Requirements: 1.1, 1.2, 6.4_

  - [ ]* 2.2 Write property test for chat input container visibility
    - **Property 1: Chat input container is visible on page load**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 2.3 Add pill-shaped form styles
    - Add `.chat-form` styles: `display: flex`, `align-items: center`, `border-radius: 32px`, `outline: 1px solid #cccce5`, `background: #fff`
    - Add `.chat-form:focus-within` rule: `outline: 2px solid #5350c4`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_

  - [ ]* 2.4 Write property tests for chat form shape and focus
    - **Property 2: Chat form has pill shape and default border**
    - **Property 3: Chat form focus outline uses brand color**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 6.1**

  - [x] 2.5 Add message input styles
    - Add `.chat-form .message-input` styles: `border: none`, `outline: none`, `height: 47px`, `max-height: 180px`, `resize: none`, `font-size: 0.95rem`, `padding: 14px 0 13px 18px`, `width: 100%`
    - _Requirements: 3.1, 3.3, 3.4, 6.3_

  - [ ]* 2.6 Write property test for message input style invariants
    - **Property 4: Message input style invariants**
    - **Validates: Requirements 3.1, 3.3, 3.4, 6.3**

  - [x] 2.7 Add chat controls and send button styles
    - Add `.chat-form .chat-controls` styles: `display: flex`, `height: 47px`, `gap: 3px`, `align-items: center`, `padding-right: 6px`
    - Add `.chat-controls button` styles: `height: 35px`, `width: 35px`, `border-radius: 50%`, `border: none`, `background: none`, `cursor: pointer`
    - Add `#send-message-btn` styles: `display: none`, `background: #5350c4`, `color: #fff`
    - Add `.message-input:valid ~ .chat-controls #send-message-btn { display: block }` rule
    - Add hover states for send button (`background: #3d39ac`) and other controls (`background: #f1f1ff`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.3, 5.4, 6.1_

  - [ ]* 2.8 Write property tests for send button visibility and controls layout
    - **Property 6: Send button visibility matches input content**
    - **Property 7: Color tokens and container background**
    - **Property 8: Chat controls buttons are circular and minimum sized**
    - **Validates: Requirements 4.1, 4.2, 4.3, 5.3, 6.2, 6.4**

- [x] 3. Checkpoint — Ensure styles render correctly
  - Ensure all CSS is valid and the chat input container is visible with the correct pill shape. Ask the user if questions arise.

- [x] 4. Create chatInput.js module
  - [x] 4.1 Implement initChatInput() with auto-resize logic
    - Create `public/js/chatInput.js` exporting `initChatInput()`
    - Add guard clause: return early if `.message-input` is not found in the DOM
    - On `input` event: reset height to `scrollHeight` of initial height, then set to `scrollHeight`
    - When content exceeds initial height, set `.chat-form` `border-radius` to `15px`; otherwise restore to `32px`
    - _Requirements: 3.2_

  - [ ]* 4.2 Write property test for auto-resize behavior
    - **Property 5: Message input auto-resizes within bounds**
    - **Validates: Requirements 3.2**

  - [ ]* 4.3 Write unit tests for initChatInput()
    - Test that `initChatInput()` returns early without error when `.message-input` is absent
    - Test that typing triggers height recalculation
    - Test that `.chat-form` border-radius changes to `15px` when content overflows initial height
    - _Requirements: 3.2_

- [x] 5. Wire chatInput.js into index.js
  - Import `initChatInput` from `./chatInput.js` in `public/js/index.js`
  - Call `initChatInput()` on chat page load (guard with a page-specific selector check if needed)
  - _Requirements: 1.1, 3.2_

- [x] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass and the full input flow works end-to-end. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The send button show/hide is CSS-only (`:valid` on `required` textarea) — no JS needed for that behavior
- Property tests use fast-check with a minimum of 100 iterations per run
- Each property test is tagged with `// Feature: chat-input-redesign, Property N: <property text>`
