import * as React from 'react';
import styles from './ReportViewerModern.module.scss';
import { IReportViewerModernProps } from './IReportViewerModernProps';

export interface IReportViewerModernState {
  iframeHeight: number;
}

export default class ReportViewerModern extends React.Component<IReportViewerModernProps, IReportViewerModernState> {
  private lastHeight: number;
  private allowShrink: boolean;
  private shrinkTimeout: number | undefined;

  constructor(props: IReportViewerModernProps) {
    super(props);

    this.state = {
      iframeHeight: props.height
    };

    this.lastHeight = props.height;
    this.allowShrink = false;
    this.shrinkTimeout = undefined;

    this.handlePostMessage = this.handlePostMessage.bind(this);
  }

  public componentDidMount(): void {
    const { autoFitHeight, height } = this.props;

    // Initialize allowShrink settings
    this.resetShrinkTracking(height);

    // Attach postMessage listener if autoFitHeight is enabled
    if (autoFitHeight) {
      window.addEventListener('message', this.handlePostMessage);
      console.log('PostMessage listener attached (autoFitHeight enabled)');
    }
  }

  public componentWillUnmount(): void {
    // Clean up event listener
    window.removeEventListener('message', this.handlePostMessage);
    console.log('PostMessage listener removed');

    // Clean up timeout
    if (this.shrinkTimeout !== undefined) {
      clearTimeout(this.shrinkTimeout);
    }
  }

  public componentDidUpdate(prevProps: IReportViewerModernProps): void {
    const { zoom, showToolbar, showParameters, height, autoFitHeight } = this.props;

    // Reset height tracking when display settings change
    if (prevProps.zoom !== zoom || prevProps.showToolbar !== showToolbar ||
        prevProps.showParameters !== showParameters) {
      this.resetShrinkTracking(height);
    }

    // Update height if prop changes
    if (prevProps.height !== height) {
      this.setState({ iframeHeight: height });
      this.lastHeight = height;
    }

    // Handle autoFitHeight toggle
    if (prevProps.autoFitHeight !== autoFitHeight) {
      if (autoFitHeight) {
        window.addEventListener('message', this.handlePostMessage);
        console.log('PostMessage listener attached (autoFitHeight enabled)');
      } else {
        window.removeEventListener('message', this.handlePostMessage);
        console.log('PostMessage listener removed');
      }
    }
  }

  public render(): JSX.Element {
    const { reportUrl, hasTeamsContext } = this.props;
    const { iframeHeight } = this.state;

    if (!reportUrl) {
      return (
        <div
          className={`${styles.reportViewerModern} ${hasTeamsContext ? styles.teams : ''}`}
          style={{ padding: '20px', textAlign: 'center' }}>
          <p>Please configure the Report URL in the web part properties.</p>
        </div>
      );
    }

    const builtUrl: string = this.buildReportUrl();

    return (
      <div
        className={`${styles.reportViewerModern} ${hasTeamsContext ? styles.teams : ''}`}
        style={{ position: 'relative' }}>
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
          key={builtUrl}
          src={builtUrl}
          className={styles.iframe}
          style={{ height: `${iframeHeight}px` }}
          title='SSRS Report Viewer'
        />
      </div>
    );
  }

  private resetShrinkTracking(height: number): void {
    this.allowShrink = true;
    this.lastHeight = height;

    // Keep allowing shrinks for 5 seconds after settings change to catch delayed updates
    if (this.shrinkTimeout !== undefined) {
      clearTimeout(this.shrinkTimeout);
    }
    this.shrinkTimeout = window.setTimeout(() => {
      this.allowShrink = false;
    }, 5000);
  }

  private handlePostMessage(event: MessageEvent): void {
    // Handle height messages from the SSRS iframe
    if (event.data && typeof event.data.reportHeight === 'number') {
      const newHeight: number = event.data.reportHeight;
      const heightDiff: number = newHeight - this.lastHeight;

      console.log('Height update received:', {
        newHeight,
        lastHeight: this.lastHeight,
        diff: heightDiff,
        allowShrink: this.allowShrink
      });

      // Ignore large downward changes unless we're expecting a resize (e.g., zoom change)
      if (heightDiff < -50 && !this.allowShrink) {
        console.log('Ignoring large downward height change (likely loading)');
        return;
      }

      // Only update if the height difference is significant (more than 5px)
      // This prevents feedback loops where small changes keep triggering updates
      if (Math.abs(heightDiff) > 5) {
        // Add 25px buffer for any unaccounted margins/borders
        const adjustedHeight: number = newHeight + 25;
        console.log('Applying height change to:', adjustedHeight);
        this.lastHeight = newHeight;
        this.setState({ iframeHeight: adjustedHeight });
        // allowShrink is managed by resetShrinkTracking with a 5-second timeout
      }
    }
  }

  private addOrUpdateParam(paramsMap: { [key: string]: string }, key: string, value: string): void {
    paramsMap[key] = value;
  }

  private buildQueryString(paramsMap: { [key: string]: string }): string {
    const pairs: string[] = [];
    Object.keys(paramsMap).forEach((key: string) => {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(paramsMap[key])}`);
    });
    return pairs.join('&');
  }

  private parseQueryString(queryString: string): { [key: string]: string } {
    const paramsMap: { [key: string]: string } = {};
    if (!queryString) {
      return paramsMap;
    }
    const pairs: string[] = queryString.split('&');
    pairs.forEach((pair: string) => {
      const [key, value] = pair.split('=');
      if (key) {
        paramsMap[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    });
    return paramsMap;
  }

  private buildReportUrl(): string {
    const { reportUrl, showToolbar, showParameters, reportParameters, zoom } = this.props;

    if (!reportUrl) {
      return '';
    }

    console.log('Building URL with zoom:', zoom);

    // Translate old ReportViewer.aspx format to /reports/report format
    let translatedUrl: string = reportUrl;
    const reportViewerPattern: RegExp = /(.*)\/ReportServer\/Pages\/ReportViewer\.aspx\?(.+)/i;
    const match: RegExpMatchArray | null = reportUrl.match(reportViewerPattern);

    if (match) {
      const baseUrl: string = match[1]; // Everything before /ReportServer
      const reportPath: string = match[2]; // Everything after the ?
      translatedUrl = `${baseUrl}/reports/report${reportPath}`;
      console.log('Translated URL from ReportViewer.aspx format:', translatedUrl);
    }

    try {
      const parts: string[] = translatedUrl.split('?');
      const baseAndPath: string = parts[0];
      const existingQuery: string = parts.slice(1).join('?');

      let reportPath: string = '';
      let existingParamsStr: string = '';

      if (existingQuery) {
        const firstParam: string = existingQuery.split('&')[0];
        if (firstParam.charAt(0) === '/') {
          reportPath = firstParam;
          const remainingParams: string = existingQuery.substring(firstParam.length);
          existingParamsStr = remainingParams.charAt(0) === '&' ?
            remainingParams.substring(1) : remainingParams;
        } else {
          existingParamsStr = existingQuery;
        }
      }

      const paramsMap: { [key: string]: string } = this.parseQueryString(existingParamsStr);

      this.addOrUpdateParam(paramsMap, 'rs:Embed', 'true');
      if (!showToolbar) {
        this.addOrUpdateParam(paramsMap, 'rc:stylesheet', 'hideToolBar');
      }
      if (!showParameters) {
        this.addOrUpdateParam(paramsMap, 'rc:Parameters', 'Collapsed');
      }
      if (zoom) {
        console.log('Setting zoom parameter to:', zoom);
        this.addOrUpdateParam(paramsMap, 'rc:Zoom', zoom);
      }

      if (reportParameters) {
        try {
          const customParams: { [key: string]: string } = JSON.parse(reportParameters);
          Object.keys(customParams).forEach((key: string) => {
            this.addOrUpdateParam(paramsMap, key, customParams[key]);
          });
        } catch (e) {
          console.warn('Invalid report parameters JSON:', e);
        }
      }

      const paramString: string = this.buildQueryString(paramsMap);
      let finalUrl: string;

      if (reportPath) {
        const encodedReportPath: string = reportPath.split('/').map((segment: string) =>
          segment ? encodeURIComponent(segment) : ''
        ).join('%2f');
        finalUrl = `${baseAndPath}?${encodedReportPath}${paramString ? '&' + paramString : ''}`;
      } else {
        finalUrl = `${baseAndPath}${paramString ? '?' + paramString : ''}`;
      }

      console.log('Built report URL:', finalUrl);
      return finalUrl;
    } catch (e) {
      console.error('Invalid report URL:', e);
      return reportUrl;
    }
  }
}
