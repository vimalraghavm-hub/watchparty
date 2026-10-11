import { describe, it, expect } from 'vitest';
import {
  generateInvitationToken,
  validateMovieFile,
  sanitizeText,
  getOrCreateGuestId,
  calculateFileHash,
} from '../lib/security';

describe('Security & File Utilities Unit Tests', () => {
  it('generates secure random invitation tokens', () => {
    const token1 = generateInvitationToken();
    const token2 = generateInvitationToken();

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1.length).toBeGreaterThanOrEqual(16);
    expect(token1).not.toEqual(token2);
  });

  it('validates supported movie files correctly without artificial size limits', () => {
    const validFile = new File(['dummy content'], 'movie.mp4', { type: 'video/mp4' });
    const validation = validateMovieFile(validFile);
    expect(validation.valid).toBe(true);

    const validWebm = new File(['dummy content'], 'movie.webm', { type: 'video/webm' });
    expect(validateMovieFile(validWebm).valid).toBe(true);

    const invalidTypeFile = new File(['dummy content'], 'doc.pdf', { type: 'application/pdf' });
    const invalidValidation = validateMovieFile(invalidTypeFile);
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

  it('calculates deterministic SHA-256 hash for identical file contents', async () => {
    const content = 'Test movie video data for synchronized hash check';
    const file1 = new File([content], 'movie1.mp4', { type: 'video/mp4' });
    const file2 = new File([content], 'renamed_movie.mp4', { type: 'video/mp4' });

    const hash1 = await calculateFileHash(file1);
    const hash2 = await calculateFileHash(file2);

    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    // Deterministic matching: same content produces same hash regardless of filename
    expect(hash1).toEqual(hash2);

    const differentFile = new File(['different content'], 'movie.mp4', { type: 'video/mp4' });
    const diffHash = await calculateFileHash(differentFile);
    expect(diffHash).not.toEqual(hash1);
  });
});
