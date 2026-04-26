export async function copyToClipboard(text, buttonEl) {
  try {
    await navigator.clipboard.writeText(text);
    showCopySuccess(buttonEl);
  } catch {
    // Fallback for HTTP contexts or permission denied
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'absolute';
    textarea.style.opacity = '0';
    textarea.style.insetBlockStart = '-9999px';
    textarea.style.insetInlineStart = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showCopySuccess(buttonEl);
  }
}

function showCopySuccess(buttonEl) {
  const labelEl = buttonEl.querySelector('.btn-copy-label');

  buttonEl.setAttribute('data-state', 'success');
  buttonEl.setAttribute('aria-label', 'CSS copied to clipboard!');
  if (labelEl) labelEl.textContent = 'Copied!';

  // Swap icon to checkmark
  const svg = buttonEl.querySelector('svg');
  if (svg) {
    svg.innerHTML =
      '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  setTimeout(() => {
    buttonEl.removeAttribute('data-state');
    buttonEl.setAttribute('aria-label', 'Copy generated CSS to clipboard');
    if (labelEl) labelEl.textContent = 'Copy CSS';
    if (svg) {
      svg.innerHTML = `
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      `;
    }
  }, 2000);
}
