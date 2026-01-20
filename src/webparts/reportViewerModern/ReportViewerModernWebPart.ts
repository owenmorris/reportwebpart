import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneSlider,
  PropertyPaneDropdown
} from '@microsoft/sp-webpart-base';

import ReportViewerModern from './components/ReportViewerModern';
import { IReportViewerModernProps } from './components/IReportViewerModernProps';

export interface IReportViewerModernWebPartProps {
  reportUrl: string;
  showToolbar: boolean;
  showParameters: boolean;
  reportParameters: string; // JSON string of key-value pairs
  height: number; // pixels
  autoFitHeight: boolean; // auto-fit height based on report content
  zoom: string; // SSRS zoom value: percentage or 'Page Width' or 'Whole Page'
}

export default class ReportViewerModernWebPart extends BaseClientSideWebPart<IReportViewerModernWebPartProps> {

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
        autoFitHeight: this.properties.autoFitHeight !== undefined ? this.properties.autoFitHeight : true,
        zoom: this.properties.zoom || '100',
        isDarkTheme: false,
        hasTeamsContext: false
      }
    );

    ReactDom.render(element, this.domElement);
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
                PropertyPaneToggle('autoFitHeight', {
                  label: 'Auto-fit Height',
                  onText: 'On',
                  offText: 'Off'
                }),
                PropertyPaneSlider('height', {
                  label: this.properties.autoFitHeight ? 'Initial Height (pixels)' : 'Height (pixels)',
                  min: 400,
                  max: 3000,
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
