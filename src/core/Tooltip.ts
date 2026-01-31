/**
 * Sankey Chart Tooltip
 *
 * - Rendered as a standalone DOM element (outside SVG)
 * - Follows mouse with smooth transitions
 * - Auto-corrects position at container edges
 * - Supports custom content formatters
 */

import type { ComputedNode, ComputedLink } from '../types';

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
  offsetX: 12,
  offsetY: 12,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  textColor: '#fff',
  borderColor: 'rgba(255, 255, 255, 0.2)',
  fontSize: 13,
  padding: 10,
  borderRadius: 4,
  maxWidth: 300,
  fadeDuration: 150,
};

// Reusable inline style fragments for tooltip HTML content
const STYLE_ROW = 'display: flex; justify-content: space-between; gap: 16px;';
const STYLE_LABEL = 'opacity: 0.8;';
const STYLE_HEADER_NODE =
  'font-weight: 600; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;';
const STYLE_HEADER_LINK =
  'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';

export class Tooltip {
  private element: HTMLDivElement;
  private config: TooltipConfig;
  private nodeFormatter: TooltipFormatter<ComputedNode>;
  private linkFormatter: TooltipFormatter<ComputedLink>;
  private isVisible: boolean = false;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

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
      'z-index: 1000',
      'pointer-events: none',
      'opacity: 0',
      `background-color: ${backgroundColor}`,
      `color: ${textColor}`,
      `border: 1px solid ${borderColor}`,
      `font-size: ${fontSize}px`,
      `padding: ${padding}px`,
      `border-radius: ${borderRadius}px`,
      `max-width: ${maxWidth}px`,
      'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)',
      `transition: opacity ${fadeDuration}ms ease-out`,
      "font-family: 'Segoe UI', system-ui, sans-serif",
      'line-height: 1.4',
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
    this.updatePosition(event);
    this.element.style.opacity = '1';
  }

  updatePosition(event: MouseEvent): void {
    if (!this.isVisible) return;

    const container = this.element.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
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
    }, 50);
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
    const source = link.source as ComputedNode;
    const target = link.target as ComputedNode;
    const formattedValue = this.formatNumber(link.value);

    return `
      <div style="${STYLE_HEADER_LINK}">
        <span style="font-weight: 600;">${this.escapeHtml(source.name)}</span>
        <span style="opacity: 0.6;">\u2192</span>
        <span style="font-weight: 600;">${this.escapeHtml(target.name)}</span>
      </div>
      <div style="${STYLE_ROW}">
        <span style="${STYLE_LABEL}">Value:</span>
        <span style="font-weight: 500;">${formattedValue}</span>
      </div>`;
  }

  private formatNumber(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
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
