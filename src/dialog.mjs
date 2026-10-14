/** Make only the active overlay interactive; restore background on close. */
export function setBackgroundInert(overlay, active) {
  for (const element of document.querySelectorAll('.app-sidebar, .workspace-header, main.view')) {
    if (!element.contains(overlay)) element.inert = active;
  }
  if (overlay.id === 'filtersPanel') {
    document.querySelector('#progenyView .content').inert = active;
  }
}
export function trapFocus(event, panel) {
  if (event.key !== 'Tab') return;
  const controls = [...panel.querySelectorAll('button:not([disabled]), a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.hidden && element.getClientRects().length);
  if (!controls.length) { event.preventDefault(); panel.focus(); return; }
  const first = controls[0], last = controls.at(-1), current = document.activeElement;
  if (event.shiftKey && (current === first || current === panel || !panel.contains(current))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (current === last || !panel.contains(current))) {
    event.preventDefault(); first.focus();
  }
}
