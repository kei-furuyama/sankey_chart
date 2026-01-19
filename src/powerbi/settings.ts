/**
 * Power BI Visual Settings
 *
 * Power BIの設定パネル（Format Pane）で表示される設定を定義します。
 * capabilities.jsonのobjectsと対応しています。
 */

// =============================================================================
// Settings Classes
// =============================================================================

export class NodeSettings {
  width: number = 24;
  padding: number = 16;
  defaultColor: string = '#1f77b4';
  useDataColors: boolean = true;
}

export class LinkSettings {
  colorMode: 'source' | 'target' | 'gradient' | 'fixed' = 'source';
  opacity: number = 50; // 0-100
  defaultColor: string = '#aaaaaa';
}

export class LabelSettings {
  show: boolean = true;
  fontSize: number = 12;
  fontFamily: string = 'Segoe UI, sans-serif';
  color: string = '#333333';
  position: 'inside' | 'outside' = 'outside';
}

export class AnimationSettings {
  enabled: boolean = true;
  duration: number = 500;
}

/**
 * 全設定をまとめたクラス
 */
export class VisualSettings {
  nodeSettings: NodeSettings = new NodeSettings();
  linkSettings: LinkSettings = new LinkSettings();
  labelSettings: LabelSettings = new LabelSettings();
  animationSettings: AnimationSettings = new AnimationSettings();

  /**
   * Power BI 5.1+ Formatting Model用の変換
   */
  toFormattingModel(): FormattingModel {
    return {
      cards: [
        {
          uid: 'nodeSettings_card',
          displayName: 'Nodes',
          groups: [{
            uid: 'nodeSettings_group',
            displayName: 'Node Settings',
            slices: [
              {
                uid: 'nodeWidth',
                displayName: 'Width',
                control: {
                  type: 'NumUpDown',
                  properties: {
                    value: this.nodeSettings.width,
                    min: 5,
                    max: 100,
                  },
                },
              },
              {
                uid: 'nodePadding',
                displayName: 'Padding',
                control: {
                  type: 'NumUpDown',
                  properties: {
                    value: this.nodeSettings.padding,
                    min: 0,
                    max: 50,
                  },
                },
              },
              {
                uid: 'nodeColor',
                displayName: 'Default Color',
                control: {
                  type: 'ColorPicker',
                  properties: {
                    value: { value: this.nodeSettings.defaultColor },
                  },
                },
              },
            ],
          }],
        },
        {
          uid: 'linkSettings_card',
          displayName: 'Links',
          groups: [{
            uid: 'linkSettings_group',
            displayName: 'Link Settings',
            slices: [
              {
                uid: 'linkColorMode',
                displayName: 'Color Mode',
                control: {
                  type: 'Dropdown',
                  properties: {
                    value: this.linkSettings.colorMode,
                    items: [
                      { value: 'source', displayName: 'Source' },
                      { value: 'target', displayName: 'Target' },
                      { value: 'gradient', displayName: 'Gradient' },
                      { value: 'fixed', displayName: 'Fixed' },
                    ],
                  },
                },
              },
              {
                uid: 'linkOpacity',
                displayName: 'Opacity (%)',
                control: {
                  type: 'NumUpDown',
                  properties: {
                    value: this.linkSettings.opacity,
                    min: 0,
                    max: 100,
                  },
                },
              },
            ],
          }],
        },
        {
          uid: 'labelSettings_card',
          displayName: 'Labels',
          groups: [{
            uid: 'labelSettings_group',
            displayName: 'Label Settings',
            slices: [
              {
                uid: 'showLabels',
                displayName: 'Show Labels',
                control: {
                  type: 'ToggleSwitch',
                  properties: {
                    value: this.labelSettings.show,
                  },
                },
              },
              {
                uid: 'labelFontSize',
                displayName: 'Font Size',
                control: {
                  type: 'NumUpDown',
                  properties: {
                    value: this.labelSettings.fontSize,
                    min: 8,
                    max: 24,
                  },
                },
              },
              {
                uid: 'labelColor',
                displayName: 'Color',
                control: {
                  type: 'ColorPicker',
                  properties: {
                    value: { value: this.labelSettings.color },
                  },
                },
              },
            ],
          }],
        },
      ],
    };
  }
}

// =============================================================================
// Formatting Model Types (Power BI 5.1+)
// =============================================================================

interface FormattingModel {
  cards: FormattingCard[];
}

interface FormattingCard {
  uid: string;
  displayName: string;
  groups: FormattingGroup[];
}

interface FormattingGroup {
  uid: string;
  displayName: string;
  slices: FormattingSlice[];
}

interface FormattingSlice {
  uid: string;
  displayName: string;
  control: any;
}

// =============================================================================
// Parse Settings from DataView
// =============================================================================

/**
 * DataViewから設定を解析
 */
export function parseSettings(dataView: any): VisualSettings {
  const settings = new VisualSettings();

  if (!dataView?.metadata?.objects) {
    return settings;
  }

  const objects = dataView.metadata.objects;

  // Node settings
  if (objects.nodeSettings) {
    settings.nodeSettings.width = objects.nodeSettings.width ?? settings.nodeSettings.width;
    settings.nodeSettings.padding = objects.nodeSettings.padding ?? settings.nodeSettings.padding;
    settings.nodeSettings.defaultColor = objects.nodeSettings.defaultColor?.solid?.color ?? settings.nodeSettings.defaultColor;
  }

  // Link settings
  if (objects.linkSettings) {
    settings.linkSettings.colorMode = objects.linkSettings.colorMode ?? settings.linkSettings.colorMode;
    settings.linkSettings.opacity = objects.linkSettings.opacity ?? settings.linkSettings.opacity;
  }

  // Label settings
  if (objects.labelSettings) {
    settings.labelSettings.show = objects.labelSettings.show ?? settings.labelSettings.show;
    settings.labelSettings.fontSize = objects.labelSettings.fontSize ?? settings.labelSettings.fontSize;
    settings.labelSettings.color = objects.labelSettings.color?.solid?.color ?? settings.labelSettings.color;
  }

  // Animation settings
  if (objects.animationSettings) {
    settings.animationSettings.enabled = objects.animationSettings.enabled ?? settings.animationSettings.enabled;
    settings.animationSettings.duration = objects.animationSettings.duration ?? settings.animationSettings.duration;
  }

  return settings;
}
