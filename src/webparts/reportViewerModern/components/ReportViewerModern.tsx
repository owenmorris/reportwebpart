import * as React from 'react';
import styles from './ReportViewerModern.module.scss';
import type { IReportViewerModernProps } from './IReportViewerModernProps';

const ReportViewerModern: React.FC<IReportViewerModernProps> = (props) => {
  const { reportUrl, showToolbar, showParameters, reportParameters, height, autoFitHeight, zoom, hasTeamsContext } = props;
  const [iframeHeight, setIframeHeight] = React.useState<number>(height);
  const lastHeightRef = React.useRef<number>(height);

  // Track whether we should allow height shrinking (reset when display settings change)
  const allowShrinkRef = React.useRef<boolean>(false);
  const shrinkTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset height tracking when display settings change (zoom, toolbar, params)
  // This allows the height to shrink when these settings legitimately change the content size
  React.useEffect(() => {
    allowShrinkRef.current = true;
    lastHeightRef.current = height;

    // Keep allowing shrinks for 5 seconds after settings change to catch delayed updates
    if (shrinkTimeoutRef.current) {
      clearTimeout(shrinkTimeoutRef.current);
    }
    shrinkTimeoutRef.current = setTimeout(() => {
      allowShrinkRef.current = false;
    }, 5000);

    return () => {
      if (shrinkTimeoutRef.current) {
        clearTimeout(shrinkTimeoutRef.current);
      }
    };
  }, [zoom, showToolbar, showParameters]);

  // Listen for postMessage from SSRS iframe to get content height (only if autoFitHeight is enabled)
  React.useEffect(() => {
    if (!autoFitHeight) {
      return;
    }

    const handlePostMessage = (event: MessageEvent): void => {
      // Handle height messages from the SSRS iframe
      if (event.data && typeof event.data.reportHeight === 'number') {
        const newHeight = event.data.reportHeight;
        const heightDiff = newHeight - lastHeightRef.current;

        console.log('Height update received:', {
          newHeight,
          lastHeight: lastHeightRef.current,
          diff: heightDiff,
          allowShrink: allowShrinkRef.current
        });

        // Ignore large downward changes unless we're expecting a resize (e.g., zoom change)
        if (heightDiff < -50 && !allowShrinkRef.current) {
          console.log('Ignoring large downward height change (likely loading)');
          return;
        }

        // Only update if the height difference is significant (more than 5px)
        // This prevents feedback loops where small changes keep triggering updates
        if (Math.abs(heightDiff) > 5) {
          // Add 25px buffer for any unaccounted margins/borders
          const adjustedHeight = newHeight + 25;
          console.log('Applying height change to:', adjustedHeight);
          lastHeightRef.current = newHeight;
          setIframeHeight(adjustedHeight);
          // allowShrinkRef is managed by the settings change effect with a 5-second timeout
        }
      }
    };

    window.addEventListener('message', handlePostMessage);
    console.log('PostMessage listener attached (autoFitHeight enabled)');
    return () => {
      window.removeEventListener('message', handlePostMessage);
      console.log('PostMessage listener removed');
    };
  }, [autoFitHeight]);

  // Update height if prop changes
  React.useEffect(() => {
    setIframeHeight(height);
    lastHeightRef.current = height;
  }, [height]);

  const buildReportUrl = React.useMemo((): string => {
    if (!reportUrl) {
      return '';
    }

    console.log('Building URL with zoom:', zoom);

    try {
      // Split the URL to handle SSRS format: base?reportPath&params
      const [baseAndPath, ...existingParams] = reportUrl.split('?');

      if (!existingParams.length) {
        // No query string at all, just return the URL with our parameters
        const url = new URL(reportUrl);
        url.searchParams.set('rs:Embed', 'true');
        if (!showToolbar) {
          // Use CSS to hide toolbar instead of rc:Toolbar=false
          url.searchParams.set('rc:stylesheet', 'hideToolBar');
        }
        if (!showParameters) {
          url.searchParams.set('rc:Parameters', 'Collapsed');
        }
        if (zoom) {
          url.searchParams.set('rc:Zoom', zoom);
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
      params.set('rs:Embed', 'true');
      if (!showToolbar) {
        // Use CSS to hide toolbar instead of rc:Toolbar=false
        // rc:Toolbar=false causes SSRS to use a different rendering mode that bypasses ReportViewer.aspx
        params.set('rc:stylesheet', 'hideToolBar');
      }
      if (!showParameters) {
        params.set('rc:Parameters', 'Collapsed');
      }
      if (zoom) {
        console.log('Setting zoom parameter to:', zoom);
        params.set('rc:Zoom', zoom);
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
  }, [reportUrl, showToolbar, showParameters, reportParameters, zoom]);

  if (!reportUrl) {
    return (
      <div className={`${styles.reportViewerModern} ${hasTeamsContext ? styles.teams : ''}`} style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please configure the Report URL in the web part properties.</p>
      </div>
    );
  }

  return (
    <div className={`${styles.reportViewerModern} ${hasTeamsContext ? styles.teams : ''}`} style={{ position: 'relative' }}>
      {/* Height indicator - hidden for now
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
      */}
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
