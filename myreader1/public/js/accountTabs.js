export const initAccountTabs = () => {
  const menu = document.querySelector('.user-view__menu');
  if (!menu) return;

  const navLinks = menu.querySelectorAll('.side-nav a[data-section]');
  const sections = document.querySelectorAll('.user-view__section');

  if (!navLinks.length || !sections.length) return;

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (!section) return;

      menu
        .querySelectorAll('.side-nav li')
        .forEach((li) => li.classList.remove('side-nav--active'));
      const parentLi = link.closest('li');
      if (parentLi) parentLi.classList.add('side-nav--active');

      sections.forEach((sec) => {
        if (sec.dataset.sectionContent === section) {
          sec.classList.add('user-view__section--active');
        } else {
          sec.classList.remove('user-view__section--active');
        }
      });
    });
  });
};

