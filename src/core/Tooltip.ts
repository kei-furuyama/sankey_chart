/**
 * Sankey Chart Tooltip
 *
 * - Rendered as a standalone DOM element (outside SVG)
 * - Follows mouse with smooth transitions
 * - Auto-corrects position at container edges
 * - Supports custom content formatters
 */

import type { ComputedNode, ComputedLink } from '../types';
import { resolveNodeFromLink } from '../types';
import {
  NUMBER_FORMAT_MILLION,
  NUMBER_FORMAT_THOUSAND,
  TOOLTIP_ARROW_OPACITY,
  TOOLTIP_BACKGROUND_COLOR,
  TOOLTIP_BORDER_COLOR,
  TOOLTIP_BORDER_RADIUS,
  TOOLTIP_BOX_SHADOW,
  TOOLTIP_FADE_DURATION,
  TOOLTIP_FONT_FAMILY,
  TOOLTIP_FONT_SIZE,
  TOOLTIP_HEADER_BORDER,
  TOOLTIP_HIDE_DELAY,
  TOOLTIP_LINE_HEIGHT,
  TOOLTIP_MAX_WIDTH,
  TOOLTIP_MUTED_OPACITY,
  TOOLTIP_OFFSET_X,
  TOOLTIP_OFFSET_Y,
  TOOLTIP_PADDING,
  TOOLTIP_ROW_GAP,
  TOOLTIP_TEXT_COLOR,
  TOOLTIP_Z_INDEX,
} from './constants';

export interface TooltipConfig {
  offsetX: number;
  offsetY: number;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontSize: number;
  padding: number;
  borderRadius: number;
  maxWidth: number;
  fadeDuration: number;
}

export type TooltipFormatter<T> = (data: T) => string | HTMLElement;

const DEFAULT_TOOLTIP_CONFIG: TooltipConfig = {
  offsetX: TOOLTIP_OFFSET_X,
  offsetY: TOOLTIP_OFFSET_Y,
  backgroundColor: TOOLTIP_BACKGROUND_COLOR,
  textColor: TOOLTIP_TEXT_COLOR,
  borderColor: TOOLTIP_BORDER_COLOR,
  fontSize: TOOLTIP_FONT_SIZE,
  padding: TOOLTIP_PADDING,
  borderRadius: TOOLTIP_BORDER_RADIUS,
  maxWidth: TOOLTIP_MAX_WIDTH,
  fadeDuration: TOOLTIP_FADE_DURATION,
};

// Reusable inline style fragments for tooltip HTML content
const STYLE_ROW = `display: flex; justify-content: space-between; gap: ${TOOLTIP_ROW_GAP};`;
const STYLE_LABEL = `opacity: ${TOOLTIP_MUTED_OPACITY};`;
const STYLE_HEADER_NODE =
  `font-weight: 600; margin-bottom: 4px; border-bottom: ${TOOLTIP_HEADER_BORDER}; padding-bottom: 4px;`;
const STYLE_HEADER_LINK =
  'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';

export class Tooltip {
  private element: HTMLDivElement;
  private config: TooltipConfig;
  private nodeFormatter: TooltipFormatter<ComputedNode>;
  private linkFormatter: TooltipFormatter<ComputedLink>;
  private isVisible: boolean = false;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private cachedContainerRect: DOMRect | null = null;

  constructor(container: HTMLElement, config: Partial<TooltipConfig> = {}) {
    this.config = { ...DEFAULT_TOOLTIP_CONFIG, ...config };
    this.element = this.createElement(container);
    this.nodeFormatter = this.defaultNodeFormatter.bind(this);
    this.linkFormatter = this.defaultLinkFormatter.bind(this);
  }

  private createElement(container: HTMLElement): HTMLDivElement {
    const {
      backgroundColor, textColor, borderColor,
      fontSize, padding, borderRadius, maxWidth, fadeDuration,
    } = this.config;

    const tooltip = document.createElement('div');
    tooltip.className = 'sankey-tooltip';
    tooltip.style.cssText = [
      'position: absolute',
      `z-index: ${TOOLTIP_Z_INDEX}`,
      'pointer-events: none',
      'opacity: 0',
      `background-color: ${backgroundColor}`,
      `color: ${textColor}`,
      `border: 1px solid ${borderColor}`,
      `font-size: ${fontSize}px`,
      `padding: ${padding}px`,
      `border-radius: ${borderRadius}px`,
      `max-width: ${maxWidth}px`,
      `box-shadow: ${TOOLTIP_BOX_SHADOW}`,
      `transition: opacity ${fadeDuration}ms ease-out`,
      `font-family: ${TOOLTIP_FONT_FAMILY}`,
      `line-height: ${TOOLTIP_LINE_HEIGHT}`,
    ].join('; ');

    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(tooltip);
    return tooltip;
  }

  setNodeFormatter(formatter: TooltipFormatter<ComputedNode>): void {
    this.nodeFormatter = formatter;
  }

  setLinkFormatter(formatter: TooltipFormatter<ComputedLink>): void {
    this.linkFormatter = formatter;
  }

  showForNode(node: ComputedNode, event: MouseEvent): void {
    this.show(this.nodeFormatter(node), event);
  }

  showForLink(link: ComputedLink, event: MouseEvent): void {
    this.show(this.linkFormatter(link), event);
  }

  private show(content: string | HTMLElement, event: MouseEvent): void {
    this.clearHideTimeout();

    if (typeof content === 'string') {
      this.element.innerHTML = content;
    } else {
      this.element.innerHTML = '';
      this.element.appendChild(content);
    }

    this.isVisible = true;
    this.cachedContainerRect = null;
    this.updatePosition(event);
    this.element.style.opacity = '1';
  }

  updatePosition(event: MouseEvent): void {
    if (!this.isVisible) return;

    const container = this.element.parentElement;
    if (!container) return;

    const containerRect = this.cachedContainerRect ?? container.getBoundingClientRect();
    this.cachedContainerRect = containerRect;
    const tooltipRect = this.element.getBoundingClientRect();
    const { offsetX, offsetY } = this.config;

    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;

    let x = mouseX + offsetX;
    let y = mouseY + offsetY;

    // Flip to opposite side if overflowing right or bottom
    if (x + tooltipRect.width > containerRect.width) {
      x = mouseX - tooltipRect.width - offsetX;
    }
    if (y + tooltipRect.height > containerRect.height) {
      y = mouseY - tooltipRect.height - offsetY;
    }

    // Clamp to container edges
    if (x < 0) x = offsetX;
    if (y < 0) y = offsetY;

    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

  hide(): void {
    this.hideTimeout = setTimeout(() => {
      this.element.style.opacity = '0';
      this.isVisible = false;
    }, TOOLTIP_HIDE_DELAY);
  }

  private defaultNodeFormatter(node: ComputedNode): string {
    const formattedValue = this.formatNumber(node.value ?? 0);
    const outgoing = node.sourceLinks?.length ?? 0;
    const incoming = node.targetLinks?.length ?? 0;

    let html = `
      <div style="${STYLE_HEADER_NODE}">${this.escapeHtml(node.name)}</div>
      <div style="${STYLE_ROW}">
        <span style="${STYLE_LABEL}">Total Flow:</span>
        <span style="font-weight: 500;">${formattedValue}</span>
      </div>`;

    if (outgoing > 0) {
      html += `
      <div style="${STYLE_ROW}">
        <span style="${STYLE_LABEL}">Outgoing:</span>
        <span>${outgoing} links</span>
      </div>`;
    }

    if (incoming > 0) {
      html += `
      <div style="${STYLE_ROW}">
        <span style="${STYLE_LABEL}">Incoming:</span>
        <span>${incoming} links</span>
      </div>`;
    }

    return html;
  }

  private defaultLinkFormatter(link: ComputedLink): string {
    const source = resolveNodeFromLink(link.source);
    const target = resolveNodeFromLink(link.target);
    const formattedValue = this.formatNumber(link.value);

    return `
      <div style="${STYLE_HEADER_LINK}">
        <span style="font-weight: 600;">${this.escapeHtml(source.name)}</span>
        <span style="opacity: ${TOOLTIP_ARROW_OPACITY};">\u2192</span>
        <span style="font-weight: 600;">${this.escapeHtml(target.name)}</span>
      </div>
      <div style="${STYLE_ROW}">
        <span style="${STYLE_LABEL}">Value:</span>
        <span style="font-weight: 500;">${formattedValue}</span>
      </div>`;
  }

  private formatNumber(value: number): string {
    if (value >= NUMBER_FORMAT_MILLION) {
      return (value / NUMBER_FORMAT_MILLION).toFixed(1) + 'M';
    }
    if (value >= NUMBER_FORMAT_THOUSAND) {
      return (value / NUMBER_FORMAT_THOUSAND).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private clearHideTimeout(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  destroy(): void {
    this.clearHideTimeout();
    this.element.remove();
  }
}

export function createTooltip(
  container: HTMLElement,
  config?: Partial<TooltipConfig>
): Tooltip {
  return new Tooltip(container, config);
}
