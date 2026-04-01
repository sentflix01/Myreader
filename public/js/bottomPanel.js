/**
 * bottomPanel.js — Tab switching module for the bottom panel.
 * Handles activating tabs and their corresponding content panes.
 */

/**
 * Initialise the bottom panel tab switching behaviour.
 * Queries all `.bottom-tab` buttons and `.bottom-panel-content` panes,
 * then wires click listeners so that clicking a tab makes it (and its
 * matching content pane) the sole active element.
 */
export function initBottomPanel() {
  const tabs = document.querySelectorAll('.bottom-tab');
  const panes = document.querySelectorAll('.bottom-panel-content');

  // Return early if there are no tabs or panes in the DOM
  if (!tabs.length || !panes.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;

      // Find the matching content pane — guard: skip if none found
      const targetPane = document.querySelector(
        `.bottom-panel-content[data-content="${targetId}"]`
      );
      if (!targetPane) return;

      // Deactivate all tabs, then activate the clicked one
      tabs.forEach((t) => t.classList.remove('bottom-tab-active'));
      tab.classList.add('bottom-tab-active');

      // Deactivate all panes, then activate the matching one
      panes.forEach((p) => p.classList.remove('bottom-content-active'));
      targetPane.classList.add('bottom-content-active');
    });
  });
}
