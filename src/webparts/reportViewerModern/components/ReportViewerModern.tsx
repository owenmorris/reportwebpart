import * as React from 'react';
import styles from './ReportViewerModern.module.scss';
import type { IReportViewerModernProps } from './IReportViewerModernProps';

const ReportViewerModern: React.FC<IReportViewerModernProps> = (props) => {
  const { reportUrl, showToolbar, showParameters, reportParameters, height, hasTeamsContext } = props;
  const [iframeHeight, setIframeHeight] = React.useState<number>(height);
  const [flash, setFlash] = React.useState<boolean>(false);
  const lastHeightRef = React.useRef<number>(height);

  // Listen for postMessage from SSRS iframe to get content height
  React.useEffect(() => {
    const handlePostMessage = (event: MessageEvent): void => {
      // Log all messages for debugging
      console.log('Received postMessage:', {
        origin: event.origin,
        data: event.data,
        source: event.source
      });

      // Handle height messages from the SSRS iframe
      if (event.data && typeof event.data.reportHeight === 'number') {
        const newHeight = event.data.reportHeight;
        const heightDiff = Math.abs(newHeight - lastHeightRef.current);

        console.log('Height update received:', {
          newHeight,
          lastHeight: lastHeightRef.current,
          diff: heightDiff
        });

        // Only update if the height difference is significant (more than 5px)
        // This prevents feedback loops where small changes keep triggering updates
        if (heightDiff > 5) {
          console.log('Applying height change to:', newHeight);
          lastHeightRef.current = newHeight;
          setIframeHeight(newHeight);
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
        } else {
          console.log('Ignoring small height change (threshold: 5px)');
        }
      } else {
        console.log('Message does not contain valid reportHeight property');
      }
    };

    window.addEventListener('message', handlePostMessage);
    console.log('PostMessage listener attached');
    return () => {
      window.removeEventListener('message', handlePostMessage);
      console.log('PostMessage listener removed');
    };
  }, []);

  // Update height if prop changes
  React.useEffect(() => {
    setIframeHeight(height);
    lastHeightRef.current = height;
  }, [height]);

  const buildReportUrl = React.useMemo((): string => {
    if (!reportUrl) {
      return '';
    }

    try {
      // Split the URL to handle SSRS format: base?reportPath&params
      const [baseAndPath, ...existingParams] = reportUrl.split('?');

      if (!existingParams.length) {
        // No query string at all, just return the URL with our parameters
        const url = new URL(reportUrl);
        url.searchParams.set('rs:Embed', 'true');
        if (!showToolbar) {
          url.searchParams.set('rc:Toolbar', 'false');
        }
        if (!showParameters) {
          url.searchParams.set('rc:Parameters', 'Collapsed');
        }

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

        console.log('Built report URL:', url.toString());
        return url.toString();
      }

      // Handle SSRS format where report path comes after ?
      const queryString = existingParams.join('?');
      const firstParam = queryString.split('&')[0];

      // Check if the first parameter is a report path (starts with /)
      let reportPath = '';
      let existingParamsStr = '';

      if (firstParam.charAt(0) === '/') {
        // First parameter is the report path
        reportPath = firstParam;
        const remainingParams = queryString.substring(firstParam.length);
        existingParamsStr = remainingParams.charAt(0) === '&' ? remainingParams.substring(1) : remainingParams;
      } else {
        // No report path, just regular query parameters
        existingParamsStr = queryString;
      }

      // Build the new URL with all parameters
      const params = new URLSearchParams(existingParamsStr);

      // Add SSRS control parameters
      // Note: We don't set rs:Command=Render because we want the full ReportViewer.aspx page
      // to load (with its JavaScript), not just the raw report rendering
      // Note: We don't set rc:Zoom=Whole Page because it would scale the report to fit the viewport,
      // which prevents us from measuring the true content height for auto-sizing
      params.set('rs:Embed', 'true');
      if (!showToolbar) {
        params.set('rc:Toolbar', 'false');
      }
      if (!showParameters) {
        params.set('rc:Parameters', 'Collapsed');
      }

      // Add report parameters from props
      if (reportParameters) {
        try {
          const customParams = JSON.parse(reportParameters);
          Object.keys(customParams).forEach(key => {
            params.set(key, customParams[key]);
          });
        } catch (e) {
          console.warn('Invalid report parameters JSON:', e);
        }
      }

      // Construct final URL
      const paramString = params.toString();
      if (reportPath) {
        // URL-encode the report path (encode each segment to preserve the structure)
        // SSRS expects paths like %2fFolder%2fReport or /Folder/Report depending on server config
        // We'll encode the entire path to be safe
        const encodedReportPath = reportPath.split('/').map(segment =>
          segment ? encodeURIComponent(segment) : ''
        ).join('%2f');

        // SSRS format: base?reportPath&params
        const finalUrl = `${baseAndPath}?${encodedReportPath}${paramString ? '&' + paramString : ''}`;
        console.log('Built report URL:', finalUrl);
        return finalUrl;
      } else {
        // Standard format: base?params
        const finalUrl = `${baseAndPath}${paramString ? '?' + paramString : ''}`;
        console.log('Built report URL:', finalUrl);
        return finalUrl;
      }
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
        key={buildReportUrl}
        src={buildReportUrl}
        className={styles.iframe}
        style={{ height: `${iframeHeight}px` }}
        title="SSRS Report Viewer"
      />
    </div>
  );
};

export default ReportViewerModern;
