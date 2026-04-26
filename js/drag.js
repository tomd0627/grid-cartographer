import { beginDrag, cancelDrag, endDrag, getState, updateDrag } from './state.js';

let onDragEnd = null;
let onDragCancel = null;
let isMouseDown = false;

export function initDrag(gridEl, onSelectionComplete, onCancel) {
  onDragEnd = onSelectionComplete;
  onDragCancel = onCancel;

  // Mouse events — mousemove/mouseup are document-level so dragging outside the
  // grid doesn't break state.
  gridEl.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // Touch events — passive: false required so we can call preventDefault to
  // suppress scroll during grid interaction.
  gridEl.addEventListener('touchstart', handleTouchStart, { passive: false });
  gridEl.addEventListener('touchmove', handleTouchMove, { passive: false });
  gridEl.addEventListener('touchend', handleTouchEnd);
  gridEl.addEventListener('touchcancel', handleTouchCancel);

  // Keyboard
  gridEl.addEventListener('keydown', handleKeyDown);

  // Context menu suppressed on grid (handled separately)
  gridEl.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ─── Mouse ─────────────────────────────────────────────────────

function handleMouseDown(e) {
  if (e.button !== 0) return;
  const cell = e.target.closest('.grid-cell');
  if (!cell) return;

  e.preventDefault();
  isMouseDown = true;
  const { row, col } = cellCoords(cell);
  beginDrag(row, col);
}

function handleMouseMove(e) {
  if (!isMouseDown) return;
  const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.grid-cell');
  if (!cell) return;
  const { row, col } = cellCoords(cell);
  updateDrag(row, col);
}

function handleMouseUp(e) {
  if (!isMouseDown) return;
  isMouseDown = false;

  if (e.button !== 0) return;

  const result = endDrag();
  if (result && !result.hasConflict && result.cells.size > 0) {
    onDragEnd?.(result.cells, getPositionForCells(result.cells));
  } else if (result?.hasConflict) {
    cancelDrag();
  }
}

// ─── Touch ─────────────────────────────────────────────────────

function handleTouchStart(e) {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  const touch = e.touches[0];
  const cell = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.grid-cell');
  if (!cell) return;
  const { row, col } = cellCoords(cell);
  beginDrag(row, col);
}

function handleTouchMove(e) {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  const touch = e.touches[0];
  const cell = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.grid-cell');
  if (!cell) return;
  const { row, col } = cellCoords(cell);
  updateDrag(row, col);
}

function handleTouchEnd() {
  const result = endDrag();
  if (result && !result.hasConflict && result.cells.size > 0) {
    onDragEnd?.(result.cells, getPositionForCells(result.cells));
  } else if (result?.hasConflict) {
    cancelDrag();
  }
}

function handleTouchCancel() {
  cancelDrag();
}

// ─── Keyboard ──────────────────────────────────────────────────

function handleKeyDown(e) {
  const cell = e.target.closest('.grid-cell');
  if (!cell) return;

  const state = getState();
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);

  switch (e.key) {
    case ' ':
    case 'Enter':
      e.preventDefault();
      if (!state.dragActive) {
        beginDrag(row, col);
      } else {
        const result = endDrag();
        if (result && !result.hasConflict && result.cells.size > 0) {
          onDragEnd?.(result.cells, getPositionForCells(result.cells));
        }
      }
      break;

    case 'Escape':
      if (state.dragActive) {
        e.preventDefault();
        cancelDrag();
        onDragCancel?.();
      }
      break;

    case 'ArrowRight':
      if (state.dragActive && e.shiftKey) {
        e.preventDefault();
        updateDrag(row, Math.min(col + 1, state.columns - 1));
      }
      break;

    case 'ArrowLeft':
      if (state.dragActive && e.shiftKey) {
        e.preventDefault();
        updateDrag(row, Math.max(col - 1, 0));
      }
      break;

    case 'ArrowDown':
      if (state.dragActive && e.shiftKey) {
        e.preventDefault();
        updateDrag(Math.min(row + 1, state.rows - 1), col);
      }
      break;

    case 'ArrowUp':
      if (state.dragActive && e.shiftKey) {
        e.preventDefault();
        updateDrag(Math.max(row - 1, 0), col);
      }
      break;
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function cellCoords(cell) {
  return {
    row: parseInt(cell.dataset.row, 10),
    col: parseInt(cell.dataset.col, 10),
  };
}

function getPositionForCells(cells) {
  // Returns viewport coordinates for the name overlay anchor
  let minRow = Infinity;
  let minCol = Infinity;
  for (const key of cells) {
    const [r, c] = key.split(',').map(Number);
    if (r < minRow) minRow = r;
    if (c < minCol) minCol = c;
  }

  const cellEl = document.querySelector(`.grid-cell[data-row="${minRow}"][data-col="${minCol}"]`);
  if (!cellEl) return { x: 0, y: 0 };

  const rect = cellEl.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom + 8 };
}

export function getCellUnderPoint(x, y) {
  return document.elementFromPoint(x, y)?.closest('.grid-cell') ?? null;
}
