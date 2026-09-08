const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const explorerTabs = document.querySelectorAll('[data-degree-view]');
const rankingPanels = document.querySelectorAll('[data-ranking-panel]');

explorerTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const selectedView = tab.dataset.degreeView;

    explorerTabs.forEach((item) => {
      const isSelected = item === tab;
      item.classList.toggle('is-active', isSelected);
      item.setAttribute('aria-selected', String(isSelected));
    });

    rankingPanels.forEach((panel) => {
      panel.classList.toggle('is-hidden', panel.dataset.rankingPanel !== selectedView);
    });
  });
});
