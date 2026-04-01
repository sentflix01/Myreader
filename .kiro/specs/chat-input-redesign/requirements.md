# Requirements Document

## Introduction

The chat page input area is currently hidden by default (`display: none`) and uses a basic textarea + button layout that does not match the visual style of the rest of the application. This feature redesigns the chat input area to be always visible and to match the sentbot input area style — a pill-shaped, outlined form with an auto-resizing textarea, emoji picker button, file upload button, and a send button that appears only when there is text input.

## Glossary

- **Chat_Input_Container**: The `.chat-input-container` element at the bottom of the main chat area in the chat page
- **Chat_Form**: The form element inside the Chat_Input_Container that wraps the textarea and control buttons
- **Message_Input**: The `textarea` element inside the Chat_Form where the user types their message
- **Send_Button**: The button inside the Chat_Form that submits the user's message
- **Chat_Controls**: The group of action buttons (emoji, file upload, send) inside the Chat_Form
- **Sentbot_Input**: The `.chat-footer .chat-form` element in the sentbot widget, used as the visual reference for the redesign
- **Chat_Page**: The full-page chat interface rendered by `views/chat.pug` and styled by `public/css/chat.css`

---

## Requirements

### Requirement 1: Chat Input Visibility

**User Story:** As a user, I want the chat input area to always be visible on the chat page, so that I can type a message at any time without needing to trigger a specific action first.

#### Acceptance Criteria

1. THE Chat_Input_Container SHALL be visible by default when the chat page loads, without requiring any user interaction.
2. WHEN the chat page renders, THE Chat_Input_Container SHALL have `display` set to a visible value (not `none`).

---

### Requirement 2: Pill-Shaped Input Form

**User Story:** As a user, I want the chat input form to look like the sentbot input area, so that the interface feels consistent and modern.

#### Acceptance Criteria

1. THE Chat_Form SHALL have a pill-shaped appearance using a `border-radius` of at least `32px`.
2. THE Chat_Form SHALL display a visible outline using a `1px solid` border in a muted color (e.g., `#cccce5`) when not focused.
3. WHEN the Chat_Form receives focus within any of its child elements, THE Chat_Form SHALL display a `2px solid` outline using the primary brand color (e.g., `#5350c4`).
4. THE Chat_Form SHALL use `display: flex` with `align-items: center` to horizontally align the Message_Input and Chat_Controls.

---

### Requirement 3: Auto-Resizing Message Input

**User Story:** As a user, I want the message input to grow as I type longer messages, so that I can see my full message without scrolling inside a tiny box.

#### Acceptance Criteria

1. THE Message_Input SHALL have a minimum height of `47px` and a maximum height of `180px`.
2. WHEN the user types content that exceeds the minimum height, THE Message_Input SHALL expand vertically up to the maximum height.
3. THE Message_Input SHALL have no visible border or outline of its own, inheriting the Chat_Form's outline styling.
4. THE Message_Input SHALL use `resize: none` to prevent manual resizing by the user.

---

### Requirement 4: Send Button Visibility Behavior

**User Story:** As a user, I want the send button to only appear when I have typed something, so that the interface stays clean and uncluttered when the input is empty.

#### Acceptance Criteria

1. THE Send_Button SHALL be hidden (`display: none`) when the Message_Input is empty.
2. WHEN the Message_Input contains valid text input, THE Send_Button SHALL become visible (`display: block`).
3. THE Send_Button SHALL use the primary brand color (e.g., `#5350c4`) as its background and white as its icon color.
4. WHEN the user hovers over the Send_Button, THE Send_Button SHALL darken its background color to provide visual feedback.

---

### Requirement 5: Chat Controls Layout

**User Story:** As a user, I want the emoji and file upload buttons to be accessible inside the input area, so that I can enrich my messages without leaving the input.

#### Acceptance Criteria

1. THE Chat_Controls SHALL be positioned to the right of the Message_Input inside the Chat_Form.
2. THE Chat_Controls SHALL contain at minimum an emoji picker button and a send button, matching the sentbot input control layout.
3. EACH button inside Chat_Controls SHALL have a circular shape (`border-radius: 50%`) with a minimum size of `35px × 35px`.
4. WHEN the user hovers over a Chat_Controls button (excluding the Send_Button), THE button SHALL display a light background highlight.

---

### Requirement 6: Visual Consistency with Sentbot Input

**User Story:** As a developer, I want the chat input styles to reuse the same design tokens as the sentbot input, so that both components look like they belong to the same design system.

#### Acceptance Criteria

1. THE Chat_Form SHALL use the same primary color (`#5350c4`) for focus outline and Send_Button background as the Sentbot_Input.
2. THE Chat_Form background SHALL be white (`#fff`), matching the Sentbot_Input background.
3. THE Message_Input font size SHALL be `0.95rem`, matching the Sentbot_Input message input font size.
4. THE Chat_Input_Container background SHALL be white and include a top border (`1px solid #e2e8f0`) to visually separate it from the messages area.
