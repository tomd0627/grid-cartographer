import {
  subscribe,
  getState,
  setDimensions,
  createArea,
  deleteArea,
  renameArea,
  cancelDrag,
  reset,
  getCellAssignment,
} from './state.js';
import { renderGrid, updateCellStates } from './grid.js';
import { initDrag } from './drag.js';
import { sanitizeName, validateName, renderAreasList } from './areas.js';
import { generateCSS, highlight } from './output.js';
import { copyToClipboard } from './clipboard.js';

// ─── DOM references ─────────────────────────────────────────────

const gridEl = document.getElementById('grid-workspace');
const areasListEl = document.getElementById('areas-list');
const areasEmptyEl = document.getElementById('areas-empty');
const outputCodeEl = document.getElementById('output-code');
const outputWarningsEl = document.getElementById('output-warnings');
const copyBtn = document.getElementById('btn-copy');
const resetBtn = document.getElementById('btn-reset');
const gridHintEl = document.getElementById('grid-hint');
const colsInput = document.getElementById('input-columns');
const rowsInput = document.getElementById('input-rows');
const colsDecBtn = document.getElementById('btn-cols-dec');
const colsIncBtn = document.getElementById('btn-cols-inc');
const rowsDecBtn = document.getElementById('btn-rows-dec');
const rowsIncBtn = document.getElementById('btn-rows-inc');

// Name overlay
const nameOverlay = document.getElementById('name-overlay');
const nameInput = document.getElementById('name-overlay-input');
const nameError = document.getElementById('name-overlay-error');
const nameConfirmBtn = document.getElementById('name-overlay-confirm');
const nameCancelBtn = document.getElementById('name-overlay-cancel');

// Context menu
const contextMenu = document.getElementById('context-menu');
const contextMenuDelete = document.getElementById('context-menu-delete');
const contextMenuLabel = document.getElementById('context-menu-label');

let pendingSelectionCells = null;
let pendingEdit = null; // { name, color, cells } while an area is being redrawn
let contextTargetArea = null;

// ─── Init ────────────────────────────────────────────────────────

function init() {
  renderGrid(gridEl, getState());
  renderAreasList(areasListEl, areasEmptyEl, getState());

  initDrag(gridEl, onSelectionComplete, onEditCancel);

  // Subscribe to state changes
  subscribe(onStateChange);

  // Dimension controls
  colsInput.addEventListener('change', onColsChange);
  rowsInput.addEventListener('change', onRowsChange);
  colsDecBtn.addEventListener('click', () => stepInput(colsInput, -1));
  colsIncBtn.addEventListener('click', () => stepInput(colsInput, 1));
  rowsDecBtn.addEventListener('click', () => stepInput(rowsInput, -1));
  rowsIncBtn.addEventListener('click', () => stepInput(rowsInput, 1));

  // Reset
  resetBtn.addEventListener('click', () => {
    reset();
  });

  // Copy
  copyBtn.addEventListener('click', () => {
    const { css } = generateCSS(getState());
    if (css) copyToClipboard(css, copyBtn);
  });

  // Name overlay events
  nameInput.addEventListener('input', onNameInput);
  nameInput.addEventListener('keydown', onNameKeyDown);
  nameConfirmBtn.addEventListener('click', confirmAreaName);
  nameCancelBtn.addEventListener('click', dismissNameOverlay);

  // Area list delegated events (rename, edit, delete)
  areasListEl.addEventListener('change', onAreaNameChange);
  areasListEl.addEventListener('click', onAreaListClick);

  // Context menu on grid cells
  gridEl.addEventListener('contextmenu', onGridContextMenu);
  contextMenuDelete.addEventListener('click', onContextMenuDelete);

  // Dismiss context menu + overlay on outside interactions
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeyDown);
}

// ─── State subscription ─────────────────────────────────────────

function onStateChange(state) {
  updateCellStates(gridEl, state);
  renderAreasList(areasListEl, areasEmptyEl, state);

  // Only re-generate CSS when not mid-drag (expensive string work)
  if (!state.dragActive) {
    renderOutput(state);
  }

  // Sync dimension inputs if they got clamped
  if (parseInt(colsInput.value, 10) !== state.columns) {
    colsInput.value = state.columns;
    document
      .querySelector('.number-input:has(#input-columns)')
      .setAttribute('aria-valuenow', state.columns);
  }
  if (parseInt(rowsInput.value, 10) !== state.rows) {
    rowsInput.value = state.rows;
    document
      .querySelector('.number-input:has(#input-rows)')
      .setAttribute('aria-valuenow', state.rows);
  }
}

function renderOutput(state) {
  const { css, warnings } = generateCSS(state);

  // Warnings
  outputWarningsEl.innerHTML = '';
  for (const msg of warnings) {
    const div = document.createElement('div');
    div.className = 'output-warning';
    div.setAttribute('role', 'alert');
    div.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path d="M12 9v4M12 17h.01"/>
      </svg>
      <span>${escapeHtml(msg)}</span>
    `;
    outputWarningsEl.appendChild(div);
  }

  // Code output
  if (!css) {
    outputCodeEl.innerHTML = `<span class="output-empty" aria-hidden="true">
  <span class="output-placeholder-line" style="inline-size: 60%; display: inline-block;"></span>
  <span class="output-placeholder-line" style="inline-size: 80%; display: inline-block; margin-block-start: 8px;"></span>
  <span class="output-placeholder-line" style="inline-size: 50%; display: inline-block; margin-block-start: 8px;"></span>
</span>`;
    copyBtn.disabled = true;
    copyBtn.setAttribute('aria-disabled', 'true');
  } else {
    outputCodeEl.innerHTML = highlight(css);
    copyBtn.disabled = false;
    copyBtn.removeAttribute('aria-disabled');
  }
}

// ─── Dimension controls ─────────────────────────────────────────

function onColsChange(e) {
  const val = parseInt(e.target.value, 10);
  if (!Number.isNaN(val)) setDimensions(val, getState().rows);
}

function onRowsChange(e) {
  const val = parseInt(e.target.value, 10);
  if (!Number.isNaN(val)) setDimensions(getState().columns, val);
}

function stepInput(input, delta) {
  const current = parseInt(input.value, 10) || 1;
  const next = Math.max(1, Math.min(12, current + delta));
  input.value = next;
  input.dispatchEvent(new Event('change'));
}

// ─── Edit mode ──────────────────────────────────────────────────

function onAreaEditClick(areaName) {
  // If already in an edit, restore the previous area first
  if (pendingEdit) restoreEditArea();

  const area = getState().areas.get(areaName);
  if (!area) return;

  pendingEdit = { name: areaName, color: area.color, cells: new Set(area.cells) };
  deleteArea(areaName);
  gridHintEl.textContent = `Redraw "${areaName}" — or press Escape to cancel`;
  gridEl.querySelector('.grid-cell')?.focus();
}

function restoreEditArea() {
  if (!pendingEdit) return;
  createArea(pendingEdit.name, pendingEdit.cells, pendingEdit.color);
  pendingEdit = null;
  gridHintEl.textContent = 'Click and drag to define a named grid area';
}

function onEditCancel() {
  restoreEditArea();
}

// ─── Selection complete → show name overlay ──────────────────────

function onSelectionComplete(cells, position) {
  pendingSelectionCells = cells;

  nameInput.value = pendingEdit?.name ?? '';
  nameError.textContent = '';
  nameInput.removeAttribute('aria-invalid');

  // Position the overlay near the selection
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const overlayW = 220;
  const overlayH = 130;

  let left = Math.min(position.x, vw - overlayW - 8);
  let top = Math.min(position.y, vh - overlayH - 8);
  if (left < 8) left = 8;
  if (top < 8) top = 8;

  nameOverlay.style.left = `${left}px`;
  nameOverlay.style.top = `${top}px`;
  nameOverlay.hidden = false;
  nameInput.focus();
  nameInput.select();
}

function confirmAreaName() {
  if (!pendingSelectionCells) return;

  const raw = nameInput.value;
  const sanitized = sanitizeName(raw);
  const existingNames = [...getState().areas.keys()];
  const error = validateName(sanitized, existingNames);

  if (error) {
    nameError.textContent = error;
    nameInput.setAttribute('aria-invalid', 'true');
    nameInput.focus();
    return;
  }

  const preservedColor = pendingEdit?.color;
  pendingEdit = null; // clear before dismiss so restore is not triggered
  createArea(sanitized, pendingSelectionCells, preservedColor);
  gridHintEl.textContent = 'Click and drag to define a named grid area';
  dismissNameOverlay();
}

function dismissNameOverlay() {
  nameOverlay.hidden = true;
  pendingSelectionCells = null;
  // If edit was cancelled (pendingEdit still set), restore the original area
  if (pendingEdit) restoreEditArea();
  nameError.textContent = '';
  nameInput.value = '';
  nameInput.removeAttribute('aria-invalid');
  // Return focus to the grid
  gridEl.querySelector('.grid-cell')?.focus();
}

function onNameInput() {
  const sanitized = sanitizeName(nameInput.value);
  if (nameInput.value) {
    nameInput.value = sanitized;
  }
  nameError.textContent = '';
  nameInput.removeAttribute('aria-invalid');
}

function onNameKeyDown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    confirmAreaName();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelDrag();
    dismissNameOverlay();
  }
}

// ─── Area list interactions ─────────────────────────────────────

function onAreaNameChange(e) {
  const input = e.target.closest('.area-item__name');
  if (!input) return;

  const li = input.closest('.area-item');
  const oldName = li.dataset.areaName;
  const raw = input.value;
  const sanitized = sanitizeName(raw);
  const existingNames = [...getState().areas.keys()].filter((n) => n !== oldName);
  const error = validateName(sanitized, existingNames);

  if (error) {
    input.setAttribute('aria-invalid', 'true');
    input.value = oldName;
    return;
  }

  input.removeAttribute('aria-invalid');
  if (sanitized !== oldName) {
    renameArea(oldName, sanitized);
    li.dataset.areaName = sanitized;
    input.setAttribute('aria-label', `Area name: ${sanitized}`);
    input
      .closest('.area-item')
      .querySelector('.btn--icon')
      ?.setAttribute('aria-label', `Delete area: ${sanitized}`);
  }
}

function onAreaListClick(e) {
  const li = e.target.closest('.area-item');
  if (!li) return;

  if (e.target.closest('.btn--icon--danger')) {
    deleteArea(li.dataset.areaName);
    return;
  }

  if (e.target.closest('.btn--icon--edit')) {
    onAreaEditClick(li.dataset.areaName);
  }
}

// ─── Context menu ───────────────────────────────────────────────

function onGridContextMenu(e) {
  e.preventDefault();
  const cell = e.target.closest('.grid-cell');
  if (!cell) return;

  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  const areaName = getCellAssignment(row, col);
  if (!areaName) return;

  contextTargetArea = areaName;
  contextMenuLabel.textContent = `Remove "${areaName}"`;
  contextMenuDelete.setAttribute('aria-label', `Remove area: ${areaName}`);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuW = 200;
  const menuH = 60;

  let left = Math.min(e.clientX, vw - menuW - 8);
  let top = Math.min(e.clientY, vh - menuH - 8);
  if (left < 8) left = 8;
  if (top < 8) top = 8;

  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
  contextMenu.hidden = false;
  contextMenuDelete.focus();
}

function onContextMenuDelete() {
  if (contextTargetArea) {
    deleteArea(contextTargetArea);
    contextTargetArea = null;
  }
  contextMenu.hidden = true;
}

// ─── Global dismiss handlers ────────────────────────────────────

function onDocumentClick(e) {
  if (!contextMenu.hidden && !contextMenu.contains(e.target)) {
    contextMenu.hidden = true;
    contextTargetArea = null;
  }
  if (!nameOverlay.hidden && !nameOverlay.contains(e.target) && !gridEl.contains(e.target)) {
    cancelDrag();
    dismissNameOverlay();
  }
}

function onDocumentKeyDown(e) {
  if (e.key === 'Escape') {
    if (!contextMenu.hidden) {
      contextMenu.hidden = true;
      contextTargetArea = null;
    }
    // Cancel edit mode when no drag or overlay is consuming Escape
    if (pendingEdit && nameOverlay.hidden) {
      restoreEditArea();
    }
  }
}

// ─── Utility ────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Bootstrap ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
