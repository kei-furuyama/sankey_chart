/**
 * Power BI Visual Settings
 *
 * Defines settings displayed in the Power BI Format Pane.
 * Corresponds to objects in capabilities.json.
 */

export class NodeSettings {
  width: number = 24;
  padding: number = 16;
  defaultColor: string = '#1f77b4';
  useDataColors: boolean = true;
}

export class LinkSettings {
  colorMode: 'source' | 'target' | 'gradient' | 'fixed' = 'source';
  opacity: number = 50;
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

export class VisualSettings {
  nodeSettings: NodeSettings = new NodeSettings();
  linkSettings: LinkSettings = new LinkSettings();
  labelSettings: LabelSettings = new LabelSettings();
  animationSettings: AnimationSettings = new AnimationSettings();

  toFormattingModel(): FormattingModel {
    return {
      cards: [
        createCard('nodeSettings', 'Nodes', [
          createNumUpDown('nodeWidth', 'Width', this.nodeSettings.width, 5, 100),
          createNumUpDown('nodePadding', 'Padding', this.nodeSettings.padding, 0, 50),
          createColorPicker('nodeColor', 'Default Color', this.nodeSettings.defaultColor),
        ]),
        createCard('linkSettings', 'Links', [
          createDropdown('linkColorMode', 'Color Mode', this.linkSettings.colorMode, [
            { value: 'source', displayName: 'Source' },
            { value: 'target', displayName: 'Target' },
            { value: 'gradient', displayName: 'Gradient' },
            { value: 'fixed', displayName: 'Fixed' },
          ]),
          createNumUpDown('linkOpacity', 'Opacity (%)', this.linkSettings.opacity, 0, 100),
        ]),
        createCard('labelSettings', 'Labels', [
          createToggle('showLabels', 'Show Labels', this.labelSettings.show),
          createNumUpDown('labelFontSize', 'Font Size', this.labelSettings.fontSize, 8, 24),
          createColorPicker('labelColor', 'Color', this.labelSettings.color),
        ]),
      ],
    };
  }
}

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

function createCard(name: string, displayName: string, slices: FormattingSlice[]): FormattingCard {
  return {
    uid: `${name}_card`,
    displayName,
    groups: [{
      uid: `${name}_group`,
      displayName: `${displayName} Settings`,
      slices,
    }],
  };
}

function createNumUpDown(uid: string, displayName: string, value: number, min: number, max: number): FormattingSlice {
  return {
    uid,
    displayName,
    control: { type: 'NumUpDown', properties: { value, min, max } },
  };
}

function createColorPicker(uid: string, displayName: string, color: string): FormattingSlice {
  return {
    uid,
    displayName,
    control: { type: 'ColorPicker', properties: { value: { value: color } } },
  };
}

function createToggle(uid: string, displayName: string, value: boolean): FormattingSlice {
  return {
    uid,
    displayName,
    control: { type: 'ToggleSwitch', properties: { value } },
  };
}

function createDropdown(
  uid: string,
  displayName: string,
  value: string,
  items: Array<{ value: string; displayName: string }>
): FormattingSlice {
  return {
    uid,
    displayName,
    control: { type: 'Dropdown', properties: { value, items } },
  };
}

function extractColor(obj: any, key: string, fallback: string): string {
  return obj?.[key]?.solid?.color ?? fallback;
}

/**
 * Parse visual settings from a Power BI DataView.
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
