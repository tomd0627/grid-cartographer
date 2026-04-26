const AREA_COLORS = [
  '#3b82f6',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#ca8a04',
  '#ef4444',
  '#14b8a6',
];

const state = {
  columns: 4,
  rows: 4,
  areas: new Map(),
  cellAssignments: new Map(),
  colorIndex: 0,
  dragActive: false,
  dragStart: null,
  selectedCells: new Set(),
  conflictCells: new Set(),
};

const subscribers = new Set();

function notify() {
  const snapshot = getState();
  for (const fn of subscribers) {
    fn(snapshot);
  }
}

export function getState() {
  return {
    columns: state.columns,
    rows: state.rows,
    areas: new Map(state.areas),
    cellAssignments: new Map(state.cellAssignments),
    colorIndex: state.colorIndex,
    dragActive: state.dragActive,
    dragStart: state.dragStart,
    selectedCells: new Set(state.selectedCells),
    conflictCells: new Set(state.conflictCells),
  };
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function setDimensions(columns, rows) {
  const cols = Math.max(1, Math.min(12, columns));
  const rws = Math.max(1, Math.min(12, rows));

  if (cols === state.columns && rws === state.rows) return;

  state.columns = cols;
  state.rows = rws;

  // Remove cells and areas that fall outside the new bounds
  for (const [key] of state.cellAssignments) {
    const [r, c] = key.split(',').map(Number);
    if (r >= rws || c >= cols) {
      const areaName = state.cellAssignments.get(key);
      state.cellAssignments.delete(key);
      if (areaName && state.areas.has(areaName)) {
        state.areas.get(areaName).cells.delete(key);
      }
    }
  }

  // Prune empty areas
  for (const [name, area] of state.areas) {
    if (area.cells.size === 0) {
      state.areas.delete(name);
    }
  }

  cancelDrag();
  notify();
}

export function createArea(name, cells) {
  const color = AREA_COLORS[state.colorIndex % AREA_COLORS.length];
  state.colorIndex += 1;
  state.areas.set(name, { name, color, cells: new Set(cells) });
  for (const key of cells) {
    state.cellAssignments.set(key, name);
  }
  notify();
}

export function deleteArea(name) {
  const area = state.areas.get(name);
  if (!area) return;
  for (const key of area.cells) {
    state.cellAssignments.delete(key);
  }
  state.areas.delete(name);
  notify();
}

export function renameArea(oldName, newName) {
  if (oldName === newName) return;
  if (state.areas.has(newName)) return;
  const area = state.areas.get(oldName);
  if (!area) return;

  area.name = newName;
  state.areas.set(newName, area);
  state.areas.delete(oldName);

  for (const [key, val] of state.cellAssignments) {
    if (val === oldName) {
      state.cellAssignments.set(key, newName);
    }
  }

  notify();
}

export function beginDrag(row, col) {
  state.dragActive = true;
  state.dragStart = { row, col };
  state.selectedCells = new Set([`${row},${col}`]);
  state.conflictCells = computeConflicts(state.selectedCells);
  notify();
}

export function updateDrag(row, col) {
  if (!state.dragActive || !state.dragStart) return;

  const { row: sr, col: sc } = state.dragStart;
  const minRow = Math.min(sr, row);
  const maxRow = Math.max(sr, row);
  const minCol = Math.min(sc, col);
  const maxCol = Math.max(sc, col);

  const cells = new Set();
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      cells.add(`${r},${c}`);
    }
  }

  state.selectedCells = cells;
  state.conflictCells = computeConflicts(cells);
  notify();
}

export function endDrag() {
  const result = {
    cells: new Set(state.selectedCells),
    hasConflict: state.conflictCells.size > 0,
  };
  state.dragActive = false;
  state.dragStart = null;
  state.selectedCells = new Set();
  state.conflictCells = new Set();
  return result;
}

export function cancelDrag() {
  state.dragActive = false;
  state.dragStart = null;
  state.selectedCells = new Set();
  state.conflictCells = new Set();
  notify();
}

export function reset() {
  state.areas = new Map();
  state.cellAssignments = new Map();
  state.colorIndex = 0;
  cancelDrag();
  notify();
}

export function getCellAssignment(row, col) {
  return state.cellAssignments.get(`${row},${col}`) ?? null;
}

export function getAreaColors() {
  const map = {};
  for (const [name, area] of state.areas) {
    map[name] = area.color;
  }
  return map;
}

function computeConflicts(cells) {
  const conflicts = new Set();

  // Gather all area names in the current selection
  const selectionAreaNames = new Set();
  for (const key of cells) {
    const name = state.cellAssignments.get(key);
    if (name) selectionAreaNames.add(name);
  }

  // If selection spans more than one existing area, all of those cells conflict
  if (selectionAreaNames.size > 1) {
    for (const key of cells) {
      if (state.cellAssignments.has(key)) conflicts.add(key);
    }
  }

  return conflicts;
}
