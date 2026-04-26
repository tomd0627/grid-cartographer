export function generateCSS(state) {
  const warnings = [];

  if (state.areas.size === 0) {
    return { css: '', warnings };
  }

  // Validate all areas form valid rectangles
  for (const [name, area] of state.areas) {
    const warning = validateRectangle(name, area);
    if (warning) warnings.push(warning);
  }

  const matrix = buildMatrix(state);
  const areaNames = [...state.areas.keys()];

  const templateAreas = matrix.map((row) => `    "${row.join(' ')}"`).join('\n');

  const lines = [
    `.container {`,
    `  display: grid;`,
    `  grid-template-areas:`,
    templateAreas + ';',
    `  grid-template-columns: repeat(${state.columns}, 1fr);`,
    `  grid-template-rows: repeat(${state.rows}, 1fr);`,
    `}`,
    ``,
    ...areaNames.map((name) => `.${name} { grid-area: ${name}; }`),
  ];

  return { css: lines.join('\n'), warnings };
}

function buildMatrix(state) {
  const { rows, columns, cellAssignments } = state;
  const matrix = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < columns; c++) {
      row.push(cellAssignments.get(`${r},${c}`) ?? '.');
    }
    matrix.push(row);
  }
  return matrix;
}

function validateRectangle(name, area) {
  const cells = [...area.cells].map((key) => {
    const [r, c] = key.split(',').map(Number);
    return { r, c };
  });

  if (cells.length === 0) return null;

  const rows = [...new Set(cells.map((c) => c.r))].sort((a, b) => a - b);
  const cols = [...new Set(cells.map((c) => c.c))].sort((a, b) => a - b);

  const minRow = rows[0];
  const maxRow = rows[rows.length - 1];
  const minCol = cols[0];
  const maxCol = cols[cols.length - 1];

  const expected = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  if (cells.length !== expected) {
    return `"${name}" is not a valid rectangle — CSS grid-template-areas requires each named area to be a contiguous rectangular region.`;
  }

  return null;
}

export function highlight(css) {
  // Escape HTML entities first
  let out = css.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Selector (class names before braces)
  out = out.replace(
    /(\.[\w-]+(?:\s*,\s*\.[\w-]+)*)(\s*\{)/g,
    '<span class="tok-selector">$1</span>$2'
  );

  // String values (content inside double quotes)
  out = out.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="tok-string">$1</span>');

  // Property names (word-characters before colon, inside a rule block)
  out = out.replace(/^(\s+)([\w-]+)(\s*:)/gm, '$1<span class="tok-property">$2</span>$3');

  // Values (after the colon until semicolon or newline)
  out = out.replace(/:\s*([^;{\n<]+)/g, ': <span class="tok-value">$1</span>');

  return out;
}
