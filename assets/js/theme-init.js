(function () {
  var STORAGE_KEY = 'john-anderson-theme';
  var root = document.documentElement;

  // The site theme uses #FFEAD3 warm parchment background and #D46743 terracotta accent
  root.setAttribute('data-theme', 'light');
  root.style.colorScheme = 'light';
  root.classList.remove('no-js');
  root.classList.add('js');

  try {
    window.localStorage.setItem(STORAGE_KEY, 'light');
  } catch (error) {}
})();
