// Feature: chat-ui-redesign, Property 6: exactly one tab and one content pane are active at a time

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { initBottomPanel } from '../bottomPanel.js';

const TAB_IDS = ['chat', 'error', 'token', 'model', 'rag', 'usage', 'subscription'];

/**
 * Build a minimal DOM containing the bottom panel structure and return
 * a reference to the document so initBottomPanel can be called against it.
 */
function buildDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const { document } = dom.window;

  const panel = document.createElement('div');
  panel.id = 'bottomPanel';

  const tabBar = document.createElement('div');
  tabBar.className = 'bottom-panel-tabs';

  const body = document.createElement('div');
  body.className = 'bottom-panel-body';

  TAB_IDS.forEach((id, i) => {
    const btn = document.createElement('button');
    btn.className = i === 0 ? 'bottom-tab bottom-tab-active' : 'bottom-tab';
    btn.dataset.tab = id;
    tabBar.appendChild(btn);

    const pane = document.createElement('div');
    pane.className =
      i === 0
        ? 'bottom-panel-content bottom-content-active'
        : 'bottom-panel-content';
    pane.dataset.content = id;
    body.appendChild(pane);
  });

  panel.appendChild(tabBar);
  panel.appendChild(body);
  document.body.appendChild(panel);

  return document;
}

/**
 * Patch the global document so that initBottomPanel (which calls
 * document.querySelectorAll / document.querySelector) operates on our
 * test DOM rather than the jsdom default.
 */
function withDocument(testDoc, fn) {
  const original = global.document;
  global.document = testDoc;
  try {
    fn();
  } finally {
    global.document = original;
  }
}

describe('bottomPanel — initBottomPanel()', () => {
  it('returns early when no tabs are present', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    withDocument(dom.window.document, () => {
      // Should not throw
      expect(() => initBottomPanel()).not.toThrow();
    });
  });

  it('activates the clicked tab and its content pane', () => {
    const testDoc = buildDom();
    withDocument(testDoc, () => {
      initBottomPanel();

      const errorTab = testDoc.querySelector('.bottom-tab[data-tab="error"]');
      errorTab.click();

      const activeTabs = testDoc.querySelectorAll('.bottom-tab-active');
      const activePanes = testDoc.querySelectorAll('.bottom-content-active');

      expect(activeTabs).toHaveLength(1);
      expect(activePanes).toHaveLength(1);
      expect(activeTabs[0].dataset.tab).toBe('error');
      expect(activePanes[0].dataset.content).toBe('error');
    });
  });

  // Validates: Requirements 5.4
  it('Property 6: exactly one tab and one content pane are active at a time', () => {
    fc.assert(
      fc.property(
        // Generate a non-empty sequence of tab IDs to click in order
        fc.array(fc.constantFrom(...TAB_IDS), { minLength: 1, maxLength: 30 }),
        (clickSequence) => {
          const testDoc = buildDom();

          withDocument(testDoc, () => {
            initBottomPanel();

            for (const tabId of clickSequence) {
              const tab = testDoc.querySelector(`.bottom-tab[data-tab="${tabId}"]`);
              tab.click();

              const activeTabs = testDoc.querySelectorAll('.bottom-tab-active');
              const activePanes = testDoc.querySelectorAll('.bottom-content-active');

              // Exactly one tab active
              expect(activeTabs).toHaveLength(1);
              // Exactly one pane active
              expect(activePanes).toHaveLength(1);
              // They share the same ID value
              expect(activeTabs[0].dataset.tab).toBe(
                activePanes[0].dataset.content
              );
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
