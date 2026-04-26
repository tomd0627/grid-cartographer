export function sanitizeName(raw) {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^[^a-z]+/, '')
    .replace(/-+/g, '-')
    .replace(/-$/, '');
  return cleaned || 'area';
}

export function validateName(name, existingNames) {
  if (!name) return 'Name is required.';
  if (!/^[a-z]/.test(name)) return 'Must start with a letter.';
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return 'Use only letters, numbers, and hyphens.';
  if (existingNames.includes(name)) return `"${name}" is already in use.`;
  return null;
}

export function renderAreasList(listEl, emptyEl, state) {
  const areaNames = [...state.areas.keys()];

  if (areaNames.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;

  // Build a set of existing item keys to detect additions/removals
  const existingItems = new Map();
  for (const item of listEl.children) {
    existingItems.set(item.dataset.areaName, item);
  }

  // Remove items no longer in state
  for (const [name, item] of existingItems) {
    if (!state.areas.has(name)) {
      item.remove();
    }
  }

  // Add or update items
  for (const name of areaNames) {
    const area = state.areas.get(name);
    const cellCount = area.cells.size;

    if (existingItems.has(name)) {
      // Update existing
      const item = existingItems.get(name);
      const countEl = item.querySelector('.area-item__cell-count');
      if (countEl) {
        countEl.textContent = `${cellCount} cell${cellCount !== 1 ? 's' : ''}`;
      }
      item.style.setProperty('--area-item-color', area.color);
    } else {
      // Create new
      const item = buildAreaItem(name, area, cellCount);
      listEl.appendChild(item);
    }
  }
}

function buildAreaItem(name, area, cellCount) {
  const li = document.createElement('li');
  li.className = 'area-item';
  li.dataset.areaName = name;
  li.style.setProperty('--area-item-color', area.color);

  const swatch = document.createElement('span');
  swatch.className = 'area-item__swatch';
  swatch.setAttribute('aria-hidden', 'true');

  const nameInput = document.createElement('input');
  nameInput.className = 'area-item__name';
  nameInput.type = 'text';
  nameInput.value = name;
  nameInput.setAttribute('aria-label', `Area name: ${name}`);

  const countEl = document.createElement('span');
  countEl.className = 'area-item__cell-count';
  countEl.textContent = `${cellCount} cell${cellCount !== 1 ? 's' : ''}`;
  countEl.setAttribute('aria-hidden', 'true');

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn--icon btn--icon--danger';
  deleteBtn.setAttribute('aria-label', `Delete area: ${name}`);
  deleteBtn.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>`;

  li.appendChild(swatch);
  li.appendChild(nameInput);
  li.appendChild(countEl);
  li.appendChild(deleteBtn);

  return li;
}
