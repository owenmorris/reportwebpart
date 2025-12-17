
  (function() {
    function sendHeightToParent() {
      var height = 0;
      var oReportDiv = document.getElementById('oReportDiv');

      if (oReportDiv) {
        // Toolbar=false: simple structure, oReportDiv directly in body
        height = oReportDiv.scrollHeight;
        console.log('oReportDiv scrollHeight:', height);
      } else {
        // Toolbar=true: fixedTable with toolbar/params rows + VisibleReportContent
        var fixedTable = document.getElementById('ReportViewerControl_fixedTable');
        var visibleContent = document.querySelector('[id^="VisibleReportContent"]');

        if (fixedTable && visibleContent) {
          var visibleContentRow = visibleContent.closest('tr');
          var rows = fixedTable.querySelectorAll(':scope > tbody > tr');
          var otherRowsHeight = 0;

          rows.forEach(function(row) {
            if (row !== visibleContentRow) {
              otherRowsHeight += row.offsetHeight;
            }
          });

          height = otherRowsHeight + visibleContent.scrollHeight;
          console.log('Toolbar rows:', otherRowsHeight, 'Report:', visibleContent.scrollHeight, 'Total:', height);
        }
      }

      if (height > 0) {
        window.parent.postMessage({ reportHeight: height }, '*');
      }
    }
    if (window.self !== window.top) {
      window.addEventListener('load', sendHeightToParent);
      setInterval(sendHeightToParent, 1000);
    }
  })();