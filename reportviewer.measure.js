
  (function() {
    function sendHeightToParent() {
      // Measure the actual report div
      var reportDiv = document.getElementById('oReportDiv');
      var height;

      if (reportDiv) {
        height = Math.max(
          reportDiv.scrollHeight,
          reportDiv.offsetHeight,
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
      } else {
        height = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
      }

      console.log('Report height:', height, 'from oReportDiv:', reportDiv ? reportDiv.scrollHeight : 'not found');
      window.parent.postMessage({ reportHeight: height }, '*');
    }
    if (window.self !== window.top) {
      window.addEventListener('load', sendHeightToParent);
      setInterval(sendHeightToParent, 1000);
    }
  })();