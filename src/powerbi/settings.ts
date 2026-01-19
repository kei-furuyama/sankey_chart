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

function extractColor(obj: any, key: string, fallback: string): string {
  return obj?.[key]?.solid?.color ?? fallback;
}

/**
 * DataViewから設定を解析
 */
export function parseSettings(dataView: any): VisualSettings {
  const settings = new VisualSettings();
  const objects = dataView?.metadata?.objects;

  if (!objects) {
    return settings;
  }

  const { nodeSettings: node, linkSettings: link, labelSettings: label, animationSettings: animation } = objects;

  if (node) {
    settings.nodeSettings.width = node.width ?? settings.nodeSettings.width;
    settings.nodeSettings.padding = node.padding ?? settings.nodeSettings.padding;
    settings.nodeSettings.defaultColor = extractColor(node, 'defaultColor', settings.nodeSettings.defaultColor);
  }

  if (link) {
    settings.linkSettings.colorMode = link.colorMode ?? settings.linkSettings.colorMode;
    settings.linkSettings.opacity = link.opacity ?? settings.linkSettings.opacity;
  }

  if (label) {
    settings.labelSettings.show = label.show ?? settings.labelSettings.show;
    settings.labelSettings.fontSize = label.fontSize ?? settings.labelSettings.fontSize;
    settings.labelSettings.color = extractColor(label, 'color', settings.labelSettings.color);
  }

  if (animation) {
    settings.animationSettings.enabled = animation.enabled ?? settings.animationSettings.enabled;
    settings.animationSettings.duration = animation.duration ?? settings.animationSettings.duration;
  }

  return settings;
}
