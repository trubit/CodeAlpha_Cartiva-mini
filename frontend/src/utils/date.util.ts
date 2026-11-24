/**
 * Cartiva Mini — Centralized Date & Time Formatting Utilities
 * Standardized, type-safe date formatting based on ECMA-402 Intl.DateTimeFormat.
 * Guaranteed never to crash the React render tree on null, undefined, or malformed dates.
 */

type DateInput = string | number | Date | null | undefined;

/**
 * Safely parses an input value into a valid Date object.
 * Returns null if the value is missing or represents an invalid date.
 */
export const parseSafeDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};

/**
 * Formats a date value into localized date + time (e.g., "Nov 8, 2026, 8:45 PM").
 * Uses standard Intl.DateTimeFormat with 'en-NG' locale (or fallback).
 */
export const formatDateTime = (
  value: DateInput,
  fallback = 'N/A',
  locale = 'en-NG'
): string => {
  const date = parseSafeDate(value);
  if (!date) return fallback;

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    try {
      return date.toLocaleString();
    } catch {
      return fallback;
    }
  }
};

/**
 * Formats a date value into calendar date only (e.g., "Nov 8, 2026").
 */
export const formatDate = (
  value: DateInput,
  fallback = 'N/A',
  locale = 'en-NG'
): string => {
  const date = parseSafeDate(value);
  if (!date) return fallback;

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
    }).format(date);
  } catch {
    try {
      return date.toLocaleDateString();
    } catch {
      return fallback;
    }
  }
};

/**
 * Formats a date value into time only (e.g., "8:45 PM").
 */
export const formatTime = (
  value: DateInput,
  fallback = 'N/A',
  locale = 'en-NG'
): string => {
  const date = parseSafeDate(value);
  if (!date) return fallback;

  try {
    return new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
    }).format(date);
  } catch {
    try {
      return date.toLocaleTimeString();
    } catch {
      return fallback;
    }
  }
};

