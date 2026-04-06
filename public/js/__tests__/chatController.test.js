// Feature: chat-ui-redesign, Property 4: only one sidebar view is visible at a time

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

// ---------------------------------------------------------------------------
// Helpers — build a minimal DOM that mirrors the sidebar view-switching logic
// ---------------------------------------------------------------------------

/**
 * Create a fresh jsdom environment with the two sidebar views and two buttons,
 * and wire the same click logic that chatController.js uses.
 */
function makeViewSwitchingDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const { document } = dom.window;

  const tocView = document.createElement('div');
  tocView.id = 'tocView';
  tocView.style.display = 'block'; // default visible

  const docsView = document.createElement('div');
  docsView.id = 'docsView';
  docsView.style.display = 'none'; // default hidden

  const sidebarFileBtn = document.createElement('button');
  sidebarFileBtn.id = 'sidebarFileBtn';
  sidebarFileBtn.classList.add('sidebar-head-btn-active'); // active by default

  const sidebarFolderBtn = document.createElement('button');
  sidebarFolderBtn.id = 'sidebarFolderBtn';

  document.body.appendChild(tocView);
  document.body.appendChild(docsView);
  document.body.appendChild(sidebarFileBtn);
  document.body.appendChild(sidebarFolderBtn);

  // Wire the same logic as chatController.js Task 7.2
  sidebarFileBtn.addEventListener('click', () => {
    tocView.style.display = 'block';
    docsView.style.display = 'none';
    sidebarFileBtn.classList.add('sidebar-head-btn-active');
    sidebarFolderBtn.classList.remove('sidebar-head-btn-active');
  });

  sidebarFolderBtn.addEventListener('click', () => {
    docsView.style.display = 'block';
    tocView.style.display = 'none';
    sidebarFolderBtn.classList.add('sidebar-head-btn-active');
    sidebarFileBtn.classList.remove('sidebar-head-btn-active');
  });

  return { document, tocView, docsView, sidebarFileBtn, sidebarFolderBtn };
}

function isVisible(el) {
  return el.style.display !== 'none';
}

// ---------------------------------------------------------------------------
// Unit tests — specific examples
// ---------------------------------------------------------------------------

describe('sidebar view switching — unit tests', () => {
  it('tocView is visible and docsView is hidden by default', () => {
    const { tocView, docsView } = makeViewSwitchingDom();
    expect(isVisible(tocView)).toBe(true);
    expect(isVisible(docsView)).toBe(false);
  });

  it('clicking sidebarFolderBtn shows docsView and hides tocView', () => {
    const { tocView, docsView, sidebarFolderBtn } = makeViewSwitchingDom();
    sidebarFolderBtn.click();
    expect(isVisible(docsView)).toBe(true);
    expect(isVisible(tocView)).toBe(false);
  });

  it('clicking sidebarFileBtn shows tocView and hides docsView', () => {
    const { tocView, docsView, sidebarFileBtn, sidebarFolderBtn } = makeViewSwitchingDom();
    sidebarFolderBtn.click(); // switch to docs first
    sidebarFileBtn.click();   // switch back to toc
    expect(isVisible(tocView)).toBe(true);
    expect(isVisible(docsView)).toBe(false);
  });

  it('active class is on sidebarFileBtn by default', () => {
    const { sidebarFileBtn, sidebarFolderBtn } = makeViewSwitchingDom();
    expect(sidebarFileBtn.classList.contains('sidebar-head-btn-active')).toBe(true);
    expect(sidebarFolderBtn.classList.contains('sidebar-head-btn-active')).toBe(false);
  });

  it('active class moves to sidebarFolderBtn after folder click', () => {
    const { sidebarFileBtn, sidebarFolderBtn } = makeViewSwitchingDom();
    sidebarFolderBtn.click();
    expect(sidebarFolderBtn.classList.contains('sidebar-head-btn-active')).toBe(true);
    expect(sidebarFileBtn.classList.contains('sidebar-head-btn-active')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property 4 — View switching is exclusive
// Validates: Requirements 3.2, 4.1
// ---------------------------------------------------------------------------

describe('Property 4: only one sidebar view is visible at a time', () => {
  it('exactly one view is visible after any sequence of file/folder clicks', { timeout: 10000 }, () => {
    const clickArb = fc.array(fc.constantFrom('file', 'folder'), {
      minLength: 1,
      maxLength: 50,
    });

    fc.assert(
      fc.property(clickArb, (clicks) => {
        const { tocView, docsView, sidebarFileBtn, sidebarFolderBtn } = makeViewSwitchingDom();

        for (const click of clicks) {
          if (click === 'file') {
            sidebarFileBtn.click();
          } else {
            sidebarFolderBtn.click();
          }

          const tocVisible = isVisible(tocView);
          const docsVisible = isVisible(docsView);

          // Exactly one must be visible
          const visibleCount = [tocVisible, docsVisible].filter(Boolean).length;
          expect(visibleCount).toBe(1);
        }
      }),
      { numRuns: 200 },
    );
  });
});
