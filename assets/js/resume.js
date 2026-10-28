(function () {
  var printButton = document.querySelector('[data-print-resume]');
  if (printButton) {
    printButton.addEventListener('click', function () {
      window.print();
    });
  }

  var year = document.querySelector('[data-current-year]');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
})();
