(function () {
  var STORAGE_KEY = 'john-anderson-theme';
  var PRESET_KEY = 'portfolio2-theme-preset';
  var root = document.documentElement;

  // Global theme variable and switcher API for Portfolio 2
  window.PORTFOLIO_THEME = 'supermemory-blue';
  window.setPortfolioTheme = function (preset) {
    if (!preset) return;
    root.setAttribute('data-theme-preset', preset);
    window.PORTFOLIO_THEME = preset;
    try {
      window.localStorage.setItem(PRESET_KEY, preset);
    } catch (e) {}

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', preset === 'wine-red' ? '#8B1A1A' : '#0284C7');
    }
  };

  // Restore saved preset if present
  var savedPreset = null;
  try {
    savedPreset = window.localStorage.getItem(PRESET_KEY);
  } catch (e) {}

  if (savedPreset) {
    root.setAttribute('data-theme-preset', savedPreset);
    window.PORTFOLIO_THEME = savedPreset;
  } else {
    root.setAttribute('data-theme-preset', 'supermemory-blue');
  }

  root.setAttribute('data-theme', 'light');
  root.style.colorScheme = 'light';
  root.classList.remove('no-js');
  root.classList.add('js');

  var themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', '#0284C7');
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, 'light');
  } catch (error) {}
})();
