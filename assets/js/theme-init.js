(function () {
  var STORAGE_KEY = 'john-anderson-theme';
  var root = document.documentElement;
  var theme = '';

  try {
    var params = new URLSearchParams(window.location.search);
    var requested = params.get('theme');
    if (requested === 'dark' || requested === 'light') {
      theme = requested;
    } else {
      theme = window.localStorage.getItem(STORAGE_KEY) || '';
    }
    if (theme !== 'dark' && theme !== 'light') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch (error) {
    theme = 'light';
  }

  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  root.classList.remove('no-js');
  root.classList.add('js');
})();
