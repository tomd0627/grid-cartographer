export function renderGrid(container, state) {
  container.innerHTML = '';
  container.style.setProperty('--gc-cols', state.columns);
  container.style.setProperty('--gc-rows', state.rows);

  const fragment = document.createDocumentFragment();
  const colorMap = buildColorMap(state);

  for (let r = 0; r < state.rows; r++) {
    const rowEl = document.createElement('div');
    rowEl.setAttribute('role', 'row');
    rowEl.style.display = 'contents';

    for (let c = 0; c < state.columns; c++) {
      rowEl.appendChild(createCell(r, c, state, colorMap));
    }

    fragment.appendChild(rowEl);
  }

  container.appendChild(fragment);
}

export function updateCellStates(container, state) {
  // Update CSS custom prop on container (handles dimension changes from setDimensions)
  container.style.setProperty('--gc-cols', state.columns);
  container.style.setProperty('--gc-rows', state.rows);

  const cells = container.querySelectorAll('.grid-cell');
  const colorMap = buildColorMap(state);

  // If count doesn't match, do a full re-render
  if (cells.length !== state.columns * state.rows) {
    renderGrid(container, state);
    return;
  }

  for (const cell of cells) {
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);
    const key = `${row},${col}`;

    const areaName = state.cellAssignments.get(key);
    const isSelecting = state.selectedCells.has(key);
    const isConflict = state.conflictCells.has(key);

    // Area assignment
    if (areaName) {
      cell.setAttribute('data-area', areaName);
      cell.style.setProperty('--cell-color', colorMap[areaName] ?? '#3b82f6');
    } else {
      cell.removeAttribute('data-area');
      cell.style.removeProperty('--cell-color');
    }

    // Selection state
    if (isSelecting) {
      cell.setAttribute('data-selecting', '');
    } else {
      cell.removeAttribute('data-selecting');
    }

    // Conflict state
    if (isConflict) {
      cell.setAttribute('data-conflict', '');
    } else {
      cell.removeAttribute('data-conflict');
    }

    cell.setAttribute('aria-selected', isSelecting ? 'true' : 'false');

    // Label cell (top-left of area bounding box)
    const labelCell = cell.querySelector('.grid-cell__label');
    if (labelCell) {
      updateLabelCell(cell, labelCell, row, col, areaName, state);
    }
  }
}

function createCell(row, col, state, colorMap) {
  const key = `${row},${col}`;
  const areaName = state.cellAssignments.get(key);
  const isSelecting = state.selectedCells.has(key);
  const isConflict = state.conflictCells.has(key);

  const cell = document.createElement('div');
  cell.className = 'grid-cell';
  cell.dataset.row = row;
  cell.dataset.col = col;
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('tabindex', '0');
  cell.setAttribute('aria-selected', isSelecting ? 'true' : 'false');

  if (areaName) {
    cell.setAttribute('data-area', areaName);
    cell.setAttribute('aria-label', `Cell row ${row + 1}, column ${col + 1}, area: ${areaName}`);
    cell.style.setProperty('--cell-color', colorMap[areaName] ?? '#3b82f6');
  } else {
    cell.setAttribute('aria-label', `Cell row ${row + 1}, column ${col + 1}, unassigned`);
  }

  if (isSelecting) cell.setAttribute('data-selecting', '');
  if (isConflict) cell.setAttribute('data-conflict', '');

  // Area label span (visible on top-left cell of each area)
  const label = document.createElement('span');
  label.className = 'grid-cell__label';
  label.setAttribute('aria-hidden', 'true');
  updateLabelCell(cell, label, row, col, areaName, state);
  cell.appendChild(label);

  return cell;
}

function updateLabelCell(cell, labelEl, row, col, areaName, state) {
  if (!areaName) {
    cell.removeAttribute('data-label-cell');
    cell.style.removeProperty('--label-col-span');
    labelEl.textContent = '';
    return;
  }

  const area = state.areas.get(areaName);
  if (!area) return;

  // Find the bounding box of the area
  let minRow = Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  for (const key of area.cells) {
    const [r, c] = key.split(',').map(Number);
    if (r < minRow || (r === minRow && c < minCol)) {
      minRow = r;
      minCol = c;
    }
    if (c > maxCol) maxCol = c;
  }

  if (row === minRow && col === minCol) {
    cell.setAttribute('data-label-cell', '');
    cell.style.setProperty('--label-col-span', maxCol - minCol + 1);
    labelEl.textContent = areaName;
  } else {
    cell.removeAttribute('data-label-cell');
    cell.style.removeProperty('--label-col-span');
    labelEl.textContent = '';
  }
}

function buildColorMap(state) {
  const map = {};
  for (const [name, area] of state.areas) {
    map[name] = area.color;
  }
  return map;
}
