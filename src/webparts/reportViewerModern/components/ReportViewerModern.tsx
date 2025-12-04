import * as React from 'react';
import styles from './ReportViewerModern.module.scss';
import type { IReportViewerModernProps } from './IReportViewerModernProps';

const ReportViewerModern: React.FC<IReportViewerModernProps> = (props) => {
  const { reportUrl, showToolbar, showParameters, reportParameters, height, hasTeamsContext } = props;
  const [iframeHeight, setIframeHeight] = React.useState<number>(height);
  const [flash, setFlash] = React.useState<boolean>(false);

  // Listen for postMessage from SSRS iframe to get content height
  React.useEffect(() => {
    const handlePostMessage = (event: MessageEvent): void => {
      // Handle height messages from the SSRS iframe
      if (event.data && typeof event.data.reportHeight === 'number') {
        setIframeHeight(event.data.reportHeight);
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
      }
    };

    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, []);

  // Update height if prop changes
  React.useEffect(() => {
    setIframeHeight(height);
  }, [height]);

  const buildReportUrl = React.useMemo((): string => {
    if (!reportUrl) {
      return '';
    }

    try {
      const url = new URL(reportUrl);

      // Add rs:Embed=true for iframe embedding
      url.searchParams.set('rs:Embed', 'true');

      // Hide toolbar (always hide in embed mode unless explicitly shown)
      if (!showToolbar) {
        url.searchParams.set('rc:Toolbar', 'false');
      }

      // Hide parameters area
      if (!showParameters) {
        url.searchParams.set('rc:Parameters', 'Collapsed');
      }

      // Set zoom to fit page width
      url.searchParams.set('rc:Zoom', 'Page Width');

      // Additional embed cleanup
      url.searchParams.set('rs:Command', 'Render');

      // Parse and add report parameters
      if (reportParameters) {
        try {
          const params = JSON.parse(reportParameters);
          Object.keys(params).forEach(key => {
            url.searchParams.set(key, params[key]);
          });
        } catch (e) {
          console.warn('Invalid report parameters JSON:', e);
        }
      }

      return url.toString();
    } catch (e) {
      console.error('Invalid report URL:', e);
      return reportUrl;
    }
  }, [reportUrl, showToolbar, showParameters, reportParameters]);

  if (!reportUrl) {
    return (
      <div className={`${styles.reportViewerModern} ${hasTeamsContext ? styles.teams : ''}`} style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please configure the Report URL in the web part properties.</p>
      </div>
    );
  }

  return (
    <div className={`${styles.reportViewerModern} ${hasTeamsContext ? styles.teams : ''}`} style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 4,
        left: 4,
        padding: '4px 8px',
        backgroundColor: flash ? '#4caf50' : 'rgba(0,0,0,0.7)',
        color: 'white',
        fontSize: '12px',
        borderRadius: '4px',
        zIndex: 1000,
        transition: 'background-color 0.3s'
      }}>
        Height: {iframeHeight}px
      </div>
      <iframe
        src={buildReportUrl}
        className={styles.iframe}
        style={{ height: `${iframeHeight}px` }}
        title="SSRS Report Viewer"
      />
    </div>
  );
};

export default ReportViewerModern;
