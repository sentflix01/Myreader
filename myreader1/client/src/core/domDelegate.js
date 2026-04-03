export function delegate(root, eventType, selector, handler, options) {
  if (!root) return () => {};

  const listener = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const match = target.closest(selector);
    if (!match) return;

    if (root !== document && !root.contains(match)) return;
    handler(event, match);
  };

  root.addEventListener(eventType, listener, options);
  return () => root.removeEventListener(eventType, listener, options);
}

