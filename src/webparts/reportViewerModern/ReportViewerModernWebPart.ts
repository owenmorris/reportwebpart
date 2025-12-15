import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneSlider,
  PropertyPaneDropdown
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import ReportViewerModern from './components/ReportViewerModern';
import { IReportViewerModernProps } from './components/IReportViewerModernProps';

export interface IReportViewerModernWebPartProps {
  reportUrl: string;
  showToolbar: boolean;
  showParameters: boolean;
  reportParameters: string; // JSON string of key-value pairs
  height: number; // pixels
  zoom: string; // SSRS zoom value: percentage or 'Page Width' or 'Whole Page'
}

export default class ReportViewerModernWebPart extends BaseClientSideWebPart<IReportViewerModernWebPartProps> {

  private _isDarkTheme: boolean = false;

  public render(): void {
    // Prevent webpart container from showing scrollbars
    this.domElement.style.overflow = 'hidden';

    const element: React.ReactElement<IReportViewerModernProps> = React.createElement(
      ReportViewerModern,
      {
        reportUrl: this.properties.reportUrl,
        showToolbar: this.properties.showToolbar,
        showParameters: this.properties.showParameters,
        reportParameters: this.properties.reportParameters,
        height: this.properties.height || 800,
        zoom: this.properties.zoom || '100',
        isDarkTheme: this._isDarkTheme,
        hasTeamsContext: !!this.context.sdks.microsoftTeams
      }
    );

    ReactDom.render(element, this.domElement);
  }


  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: 'Configure the SSRS Report Viewer'
          },
          groups: [
            {
              groupName: 'Report Settings',
              groupFields: [
                PropertyPaneTextField('reportUrl', {
                  label: 'Report URL',
                  placeholder: 'https://reportserver/ReportServer/Pages/ReportViewer.aspx?/FolderName/ReportName',
                  description: 'Full URL to the SSRS report',
                  multiline: false
                }),
                PropertyPaneTextField('reportParameters', {
                  label: 'Report Parameters (JSON)',
                  placeholder: '{"Year":"2024","Month":"12"}',
                  description: 'Optional: JSON object with report parameters',
                  multiline: true,
                  rows: 3
                })
              ]
            },
            {
              groupName: 'Display Options',
              groupFields: [
                PropertyPaneToggle('showToolbar', {
                  label: 'Show Toolbar',
                  onText: 'Visible',
                  offText: 'Hidden'
                }),
                PropertyPaneToggle('showParameters', {
                  label: 'Show Parameters Area',
                  onText: 'Visible',
                  offText: 'Collapsed'
                }),
                PropertyPaneDropdown('zoom', {
                  label: 'Zoom Level',
                  options: [
                    { key: 'Page Width', text: 'Page Width' },
                    { key: 'Whole Page', text: 'Whole Page' },
                    { key: '50', text: '50%' },
                    { key: '75', text: '75%' },
                    { key: '100', text: '100%' },
                    { key: '125', text: '125%' },
                    { key: '150', text: '150%' },
                    { key: '200', text: '200%' }
                  ]
                }),
                PropertyPaneSlider('height', {
                  label: 'Height (pixels)',
                  min: 400,
                  max: 2000,
                  step: 50,
                  showValue: true
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
