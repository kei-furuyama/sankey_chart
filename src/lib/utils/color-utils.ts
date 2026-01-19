/**
 * Color utilities for Sankey Chart
 */

import { scaleOrdinal, scaleSequential } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';
import type { ColorScale } from '../types';

/**
 * Refined color palette - sophisticated, modern, harmonious
 * Inspired by premium data visualization tools
 */
export const defaultColorPalette = [
  '#6366F1', // Indigo - Primary, elegant purple-blue
  '#8B5CF6', // Violet - Rich purple
  '#EC4899', // Pink - Vibrant accent
  '#14B8A6', // Teal - Fresh, modern
  '#F59E0B', // Amber - Warm accent
  '#3B82F6', // Blue - Classic, trustworthy
  '#10B981', // Emerald - Natural, growth
  '#F97316', // Orange - Energy
  '#06B6D4', // Cyan - Cool, tech
  '#EF4444', // Red - Attention
  '#84CC16', // Lime - Fresh
  '#A855F7', // Purple - Creative
];

/**
 * Premium palette - subtle, sophisticated colors with lower saturation
 */
export const premiumPalette = [
  '#5B6EE1', // Soft Indigo
  '#9F7AEA', // Soft Purple
  '#E779C1', // Soft Rose
  '#38BDF8', // Sky Blue
  '#2DD4BF', // Turquoise
  '#FBBF24', // Golden
  '#FB923C', // Coral
  '#4ADE80', // Mint
];

/**
 * Monochrome blue palette - elegant single-hue
 */
export const monochromeBlue = [
  '#1E3A8A', // Deep Blue
  '#1D4ED8', // Royal Blue
  '#3B82F6', // Blue
  '#60A5FA', // Light Blue
  '#93C5FD', // Pale Blue
  '#BFDBFE', // Very Light Blue
];

/**
 * Professional 8-color palette with better contrast and color blind accessibility
 */
export const professionalPalette = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#EA580C', // Burnt Orange
  '#CA8A04', // Gold
  '#059669', // Emerald
  '#0891B2', // Cyan
  '#475569', // Slate
];

/**
 * Dark mode optimized palette - brighter colors for dark backgrounds
 */
export const darkModePalette = [
  '#818CF8', // Light Indigo
  '#A78BFA', // Light Violet
  '#F472B6', // Light Pink
  '#2DD4BF', // Teal
  '#FBBF24', // Yellow
  '#60A5FA', // Light Blue
  '#4ADE80', // Light Green
  '#FB923C', // Light Orange
];

/**
 * Generate a color scale for categorical data
 */
export function generateColorScale(
  domain: string[],
  colors: string[] = defaultColorPalette
): ColorScale {
  const scale = scaleOrdinal<string>().domain(domain).range(colors);
  return (value: string | number) => scale(String(value));
}

/**
 * Generate a sequential color scale for numeric data
 */
export function generateSequentialScale(
  domain: [number, number],
  colorRange: [string, string] = ['#e0f2fe', '#0369a1']
): (value: number) => string {
  return scaleSequential(interpolateRgb(colorRange[0], colorRange[1])).domain(domain);
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(
  color1: string,
  color2: string,
  t: number
): string {
  const interpolator = interpolateRgb(color1, color2);
  return interpolator(Math.max(0, Math.min(1, t)));
}

/**
 * Get a contrasting text color (black or white) based on background
 */
export function getContrastColor(backgroundColor: string): string {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Lighten a color by a given amount
 */
export function lightenColor(color: string, amount: number): string {
  return interpolateColor(color, '#ffffff', amount);
}

/**
 * Darken a color by a given amount
 */
export function darkenColor(color: string, amount: number): string {
  return interpolateColor(color, '#000000', amount);
}

/**
 * Generate gradient ID for a link
 */
export function generateGradientId(sourceId: string, targetId: string): string {
  return `gradient-${sourceId}-${targetId}`.replace(/[^a-zA-Z0-9-]/g, '-');
}

/**
 * Convert hex color to RGBA
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
