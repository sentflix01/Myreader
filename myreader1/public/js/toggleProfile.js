/* eslint-disable */
export function initProfileToggle() {
  const profileToggle = document.getElementById('profileToggle');
  const profileDropdown = document.getElementById('profileDropdown');
  const dropdownOverlay = document.getElementById('dropdownOverlay');

  if (!profileToggle || !profileDropdown) return;

  function closeDropdown() {
    profileToggle.classList.remove('active');
    profileDropdown.classList.remove('active');
    if (dropdownOverlay) dropdownOverlay.style.display = 'none';
  }

  function openDropdown() {
    profileToggle.classList.add('active');
    profileDropdown.classList.add('active');
    if (dropdownOverlay) dropdownOverlay.style.display = 'block';
  }

  profileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.contains('active') ? closeDropdown() : openDropdown();
  });

  if (dropdownOverlay) {
    dropdownOverlay.addEventListener('click', closeDropdown);
  }

  document.addEventListener('click', (e) => {
    if (!profileDropdown.classList.contains('active')) return;
    if (profileDropdown.contains(e.target)) return;
    if (profileToggle.contains(e.target)) return;
    closeDropdown();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });

  profileDropdown.querySelectorAll('.action-item').forEach((item) => {
    item.addEventListener('click', closeDropdown);
  });
}
