// Reports whether a horizontally scrolling table wrapper has content beyond
// either edge. The wrapper carries `data-overflow-start` and
// `data-overflow-end`, which the shared `.table-scroll-shell` styles use to draw
// a gradient-and-shadow edge. The scroller itself stays the region that carries
// the accessible name and the keyboard focus.
//
// The width can change when the table's rows or columns change, so a
// ResizeObserver watches both the scroller and its table. A scroll listener
// updates the attributes as the reader moves. The update is deferred to an
// animation frame so a fast scroll does not write the DOM on every event.
export type TableOverflow = {
  update: () => void;
  disconnect: () => void;
};

export function observeTableOverflow(
  shell: HTMLElement,
  scroller: HTMLElement,
): TableOverflow {
  let frame: number | null = null;

  function write(): void {
    frame = null;
    const maximum = scroller.scrollWidth - scroller.clientWidth;
    shell.dataset.overflowStart = scroller.scrollLeft > 1 ? 'true' : 'false';
    shell.dataset.overflowEnd = maximum > 1 && scroller.scrollLeft < maximum - 1
      ? 'true'
      : 'false';
  }

  function update(): void {
    if (frame !== null) {
      return;
    }
    if (typeof requestAnimationFrame !== 'function') {
      write();
      return;
    }
    frame = requestAnimationFrame(write);
  }

  scroller.addEventListener('scroll', update, { passive: true });
  const observer = typeof ResizeObserver === 'function'
    ? new ResizeObserver(update)
    : null;
  observer?.observe(scroller);
  const table = scroller.firstElementChild;
  if (table !== null) {
    observer?.observe(table);
  }
  update();

  return {
    update,
    disconnect() {
      scroller.removeEventListener('scroll', update);
      observer?.disconnect();
      if (frame !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frame);
      }
      frame = null;
    },
  };
}
