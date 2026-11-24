import { describe, it, expect } from 'vitest';
import { parseSafeDate, formatDate, formatDateTime, formatTime } from '../frontend/src/utils/date.util';

describe('CRITICAL REPAIR: Date Formatting & Reliability Unit Tests', () => {
  it('should format valid ISO date strings into localized date and time without throwing', () => {
    const iso = '2026-11-08T19:28:00.000Z';
    const result = formatDateTime(iso);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('N/A');
    // Must contain month or digits, never throw Invalid option : timeStyle
    expect(result.length).toBeGreaterThan(5);
  });

  it('should format date only safely', () => {
    const iso = '2026-11-08T19:28:00.000Z';
    const result = formatDate(iso);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('N/A');
  });

  it('should format time only safely', () => {
    const iso = '2026-11-08T19:28:00.000Z';
    const result = formatTime(iso);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('N/A');
  });

  it('should gracefully handle null without throwing', () => {
    expect(formatDateTime(null)).toBe('N/A');
    expect(formatDate(null)).toBe('N/A');
    expect(formatTime(null)).toBe('N/A');
  });

  it('should gracefully handle undefined without throwing', () => {
    expect(formatDateTime(undefined)).toBe('N/A');
    expect(formatDate(undefined)).toBe('N/A');
    expect(formatTime(undefined)).toBe('N/A');
  });

  it('should gracefully handle empty string without throwing', () => {
    expect(formatDateTime('')).toBe('N/A');
    expect(formatDate('')).toBe('N/A');
    expect(formatTime('')).toBe('N/A');
  });

  it('should gracefully handle malformed date string without throwing', () => {
    const malformed = 'not-a-valid-date-value';
    expect(formatDateTime(malformed)).toBe('N/A');
    expect(formatDate(malformed)).toBe('N/A');
    expect(formatTime(malformed)).toBe('N/A');
  });

  it('should allow custom fallback strings', () => {
    expect(formatDateTime(null, 'Pending update')).toBe('Pending update');
    expect(formatDate(null, 'No Date')).toBe('No Date');
  });

  it('should parse valid dates and return null for invalid ones', () => {
    expect(parseSafeDate('2026-11-08T19:00:00Z')).toBeInstanceOf(Date);
    expect(parseSafeDate(1731092400000)).toBeInstanceOf(Date);
    expect(parseSafeDate(new Date())).toBeInstanceOf(Date);
    expect(parseSafeDate(null)).toBeNull();
    expect(parseSafeDate('invalid-date')).toBeNull();
  });
});

