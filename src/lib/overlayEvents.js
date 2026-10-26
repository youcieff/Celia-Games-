export function announceOverlayOpen(id) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('celia-overlay-open', { detail: { id } }));
}
