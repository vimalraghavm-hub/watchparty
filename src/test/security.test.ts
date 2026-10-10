import { describe, it, expect } from 'vitest';
import {
  generateInvitationToken,
  validateMovieFile,
  sanitizeText,
  getOrCreateGuestId,
} from '../lib/security';

describe('Security Utilities Unit Tests', () => {
  it('generates secure random invitation tokens', () => {
    const token1 = generateInvitationToken();
    const token2 = generateInvitationToken();

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1.length).toBeGreaterThanOrEqual(16);
    expect(token1).not.toEqual(token2);
  });

  it('validates movie files correctly', () => {
    const validFile = new File(['dummy content'], 'movie.mp4', { type: 'video/mp4' });
    const validation = validateMovieFile(validFile, 500);
    expect(validation.valid).toBe(true);

    const invalidTypeFile = new File(['dummy content'], 'doc.pdf', { type: 'application/pdf' });
    const invalidValidation = validateMovieFile(invalidTypeFile, 500);
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.error).toContain('Unsupported file format');
  });

  it('sanitizes user input to prevent XSS attacks', () => {
    const unsafeText = '<script>alert("xss")</script> & "hello"';
    const cleanText = sanitizeText(unsafeText);
    expect(cleanText).not.toContain('<script>');
    expect(cleanText).toContain('&lt;script&gt;');
    expect(cleanText).toContain('&amp;');
  });

  it('creates and persists guest user ID', () => {
    const guestId = getOrCreateGuestId();
    expect(guestId).toBeDefined();
    expect(guestId.startsWith('guest_')).toBe(true);

    const guestId2 = getOrCreateGuestId();
    expect(guestId2).toEqual(guestId);
  });
});
