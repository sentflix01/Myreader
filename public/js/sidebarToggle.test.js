// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// We import the helpers directly since they are exported for testing
import {
  isDesktop,
  openSidebar,
  closeSidebar,
  isOpen,
} from './sidebarToggle.js';

// Helper: create a minimal mock sidebar element with a real classList-like interface
function makeSidebar() {
  const classes = new Set();
  return {
    classList: {
      add: (cls) => classes.add(cls),
      remove: (cls) => classes.delete(cls),
      contains: (cls) => classes.has(cls),
    },
    contains: () => false, // for e.target checks
    _classes: classes,
  };
}

// Helper: set viewport width
function setViewport(width) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
}

// Desktop width > 1200, mobile width <= 1200
const DESKTOP_WIDTH = 1440;
const MOBILE_WIDTH = 768;

describe('sidebarToggle helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: sidebar-toggle-buttons, Property 1: toggle is a round-trip
  it('Property 1: toggle is a round-trip (idempotence over two operations)', () => {
    // Validates: Requirements 2.1, 2.2, 3.2, 3.3, 4.2, 4.3
    fc.assert(
      fc.property(
        fc.boolean(), // true = desktop, false = mobile
        fc.boolean(), // true = initially open, false = initially closed
        (desktop, initiallyOpen) => {
          setViewport(desktop ? DESKTOP_WIDTH : MOBILE_WIDTH);
          const sidebar = makeSidebar();

          // Set initial state
          if (desktop) {
            if (!initiallyOpen) sidebar.classList.add('sidebar-collapsed');
          } else {
            if (initiallyOpen) sidebar.classList.add('show-sidebar');
          }

          // Record initial state
          const initialOpen = isOpen(sidebar);

          // Toggle twice (open then close, or close then open)
          if (initialOpen) {
            closeSidebar(sidebar);
            openSidebar(sidebar);
          } else {
            openSidebar(sidebar);
            closeSidebar(sidebar);
          }

          // Final state must equal initial state
          expect(isOpen(sidebar)).toBe(initialOpen);
        }
      )
    );
  });

  // Feature: sidebar-toggle-buttons, Property 2: mutual exclusion on mobile
  it('Property 2: mutual exclusion on mobile', () => {
    // Validates: Requirements 2.3, 2.4
    fc.assert(
      fc.property(
        fc.boolean(), // left initially open
        fc.boolean(), // right initially open
        (leftOpen, rightOpen) => {
          setViewport(MOBILE_WIDTH);
          const leftSidebar = makeSidebar();
          const rightSidebar = makeSidebar();

          // Set initial state
          if (leftOpen) leftSidebar.classList.add('show-sidebar');
          if (rightOpen) rightSidebar.classList.add('show-sidebar');

          // Simulate clicking left toggle: close right, then toggle left
          if (isOpen(rightSidebar)) closeSidebar(rightSidebar);
          if (isOpen(leftSidebar)) {
            closeSidebar(leftSidebar);
          } else {
            openSidebar(leftSidebar);
          }

          // Right sidebar must NOT be open after clicking left toggle
          expect(rightSidebar.classList.contains('show-sidebar')).toBe(false);
        }
      )
    );
  });

  // Feature: sidebar-toggle-buttons, Property 3: outside-click dismissal on mobile
  it('Property 3: outside-click dismissal on mobile', () => {
    // Validates: Requirements 4.4
    fc.assert(
      fc.property(
        fc.constant(true), // sidebar is open
        (_open) => {
          setViewport(MOBILE_WIDTH);
          const sidebar = makeSidebar();
          sidebar.classList.add('show-sidebar');

          // Simulate outside-click logic: target is outside sidebar and not the toggle
          const outsideElement = { nodeType: 1 };
          const toggleButton = { contains: () => false };

          // Replicate the outside-click handler logic
          const isOutside =
            !sidebar.contains(outsideElement) &&
            !toggleButton.contains(outsideElement);

          if (!isDesktop() && isOpen(sidebar) && isOutside) {
            closeSidebar(sidebar);
          }

          expect(sidebar.classList.contains('show-sidebar')).toBe(false);
        }
      )
    );
  });

  // Feature: sidebar-toggle-buttons, Property 4: desktop collapse applies correct class
  it('Property 4: desktop collapse applies correct class', () => {
    // Validates: Requirements 3.2
    fc.assert(
      fc.property(
        fc.constant(null), // no meaningful generator needed
        () => {
          setViewport(DESKTOP_WIDTH);
          const sidebar = makeSidebar();
          // Sidebar starts without sidebar-collapsed (visible on desktop)
          expect(sidebar.classList.contains('sidebar-collapsed')).toBe(false);

          closeSidebar(sidebar);

          expect(sidebar.classList.contains('sidebar-collapsed')).toBe(true);
        }
      )
    );
  });

  // Feature: sidebar-toggle-buttons, Property 5: mobile show applies correct class
  it('Property 5: mobile show applies correct class', () => {
    // Validates: Requirements 4.2
    fc.assert(
      fc.property(
        fc.constant(null), // no meaningful generator needed
        () => {
          setViewport(MOBILE_WIDTH);
          const sidebar = makeSidebar();
          // Sidebar starts without show-sidebar (hidden on mobile)
          expect(sidebar.classList.contains('show-sidebar')).toBe(false);

          openSidebar(sidebar);

          expect(sidebar.classList.contains('show-sidebar')).toBe(true);
        }
      )
    );
  });
});
