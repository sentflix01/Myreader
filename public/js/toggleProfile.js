/* eslint-disable */
// Toggle profile dropdown
// Note: header elements only exist when `user` is logged in.
document.addEventListener('DOMContentLoaded', () => {
  const profileToggle = document.getElementById('profileToggle');
  const profileDropdown = document.getElementById('profileDropdown');
  const dropdownOverlay = document.getElementById('dropdownOverlay');
  const editProfile = document.getElementById('editProfile');
  const contact = document.getElementById('support');
  const logout = document.getElementById('logout');

  // If the profile UI isn't rendered on this page, do nothing.
  if (!profileToggle || !profileDropdown || !dropdownOverlay) return;

  // Close dropdown function
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

  // Close dropdown when clicking outside
  dropdownOverlay.addEventListener('click', () => {
    closeDropdown();
  });

  // // Profile action buttons
  // document.getElementById('editProfile').addEventListener('click', (e) => {
  //   e.preventDefault();
  //   // alert('Opening Edit Profile page...');
  //   closeDropdown();
  // });

  const support = document.getElementById('support');
  if (support) {
    support.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Opening Support Center...');
      closeDropdown();
    });
  }

  // document.getElementById('logout').addEventListener('click', (e) => {
  //   e.preventDefault();
  //   // alert('Logging out... Redirecting to login page.');
  //   closeDropdown();
  // });

  // Close dropdown when clicking Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
    }
  });
});
