/* eslint-disable */
// Toggle profile dropdown
// Note: header elements only exist when `user` is logged in.
export function initProfileToggle() {
  const profileToggle = document.getElementById('profileToggle');
  const profileDropdown = document.getElementById('profileDropdown');
  const dropdownOverlay = document.getElementById('dropdownOverlay');

  // If the profile UI isn't rendered on this page, do nothing.
  if (!profileToggle || !profileDropdown || !dropdownOverlay) return;

  function closeDropdown() {
    profileToggle.classList.remove('active');
    profileDropdown.classList.remove('active');
    dropdownOverlay.style.display = 'none';
  }

  profileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    profileToggle.classList.toggle('active');
    profileDropdown.classList.toggle('active');
    dropdownOverlay.style.display = profileDropdown.classList.contains('active')
      ? 'block'
      : 'none';
  });

  dropdownOverlay.addEventListener('click', () => closeDropdown());

  const support = document.getElementById('support');
  if (support) {
    support.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Opening Support Center...');
      closeDropdown();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });
}
