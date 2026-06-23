// ============================================
// SCRIPTUREQUEST V5 — utils/passwordToggle.js
// Small reusable helper for password visibility
// toggles. Works on any input + adjacent toggle
// button pair, identified by element IDs.
//
// Does NOT clear or modify the entered password —
// only flips the input's type attribute between
// 'password' and 'text', exactly per the spec.
// ============================================

export function wirePasswordToggle(inputId, toggleBtnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(toggleBtnId);
  if (!input || !btn) return;

  btn.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';

    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-eye', !isHidden);
      icon.classList.toggle('fa-eye-slash', isHidden);
    }

    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });
}

export default { wirePasswordToggle };

