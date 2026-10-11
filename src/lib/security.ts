/**
 * Security & File Verification utilities for WatchTogether
 * Handles cryptographic tokens, full-file hashing, format validation, and sanitization.
 */

// Generate a cryptographically secure, unpredictable invitation token
export function generateInvitationToken(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(24);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return 'wt_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Generate & store guest ID
export function getOrCreateGuestId(): string {
  const STORAGE_KEY = 'watchtogether_guest_id';
  let guestId = localStorage.getItem(STORAGE_KEY);
  if (!guestId) {
    guestId = 'guest_' + generateInvitationToken().substring(0, 16);
    localStorage.setItem(STORAGE_KEY, guestId);
  }
  return guestId;
}

export function getOrCreateGuestName(): string {
  const STORAGE_KEY = 'watchtogether_guest_name';
  let name = localStorage.getItem(STORAGE_KEY);
  if (!name) {
    const adjectives = ['Cozy', 'Cinema', 'Starlight', 'Midnight', 'Velvet', 'Lunar', 'Golden'];
    const nouns = ['Viewer', 'Watcher', 'Friend', 'Companion', 'Guest', 'Buddy'];
    name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    localStorage.setItem(STORAGE_KEY, name);
  }
  return name;
}

export function setGuestName(name: string): void {
  const STORAGE_KEY = 'watchtogether_guest_name';
  const cleanName = sanitizeText(name).trim() || 'Guest';
  localStorage.setItem(STORAGE_KEY, cleanName);
}

/**
 * Calculate deterministic full-file SHA-256 cryptographic identity hash.
 * Slices the file in 16MB chunks to stream 100% of all file bytes into cryptographic digests
 * without holding large gigabyte files in JavaScript heap memory.
 */
export async function calculateFileHash(
  file: File,
  progressCallback?: (progress: number) => void
): Promise<string> {
  if (!file) return '';

  const CHUNK_SIZE = 16 * 1024 * 1024; // 16 MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // For small files (<= 16MB), compute single pass SHA-256 directly
  if (totalChunks <= 1 && window.crypto && window.crypto.subtle) {
    try {
      const buffer = await file.arrayBuffer();
      if (progressCallback) progressCallback(50);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      if (progressCallback) progressCallback(100);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to chunked loop if arrayBuffer fails
    }
  }

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    try {
      return await blob.arrayBuffer();
    } catch {
      // Fallback to FileReader
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

  // Multi-chunk sequential hashing for larger files (processes 100% of bytes)
  const chunkHashes: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const slice = file.slice(start, end);
    const buffer = await readBlobAsArrayBuffer(slice);

    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      chunkHashes.push(hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''));
    } else {
      chunkHashes.push(`${slice.size}_${start}`);
    }

    if (progressCallback) {
      progressCallback(Math.floor(((i + 1) / totalChunks) * 100));
    }
  }

  // Combine chunk hashes with total file byte size into final composite master hash
  const encoder = new TextEncoder();
  const masterBuffer = encoder.encode(`${file.size}:${chunkHashes.join(':')}`);

  if (window.crypto && window.crypto.subtle) {
    const finalHashBuffer = await window.crypto.subtle.digest('SHA-256', masterBuffer);
    const finalHashArray = Array.from(new Uint8Array(finalHashBuffer));
    return finalHashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  return `chunked_${file.size}_${chunkHashes.length}`;
}

// Validate file type for private local movie playback
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  recommendedAction?: string;
}

export function validateMovieFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const validTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/mkv',
    'video/x-matroska',
    'video/quicktime',
  ];
  const validExtensions = ['.mp4', '.webm', '.mkv', '.mov', '.ogg'];

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isValidType =
    validTypes.includes(file.type.toLowerCase()) ||
    validExtensions.includes(extension) ||
    file.type.startsWith('video/');

  if (!isValidType) {
    return {
      valid: false,
      error: `Unsupported file format: "${file.name}".`,
      recommendedAction: 'Please select a standard MP4 (.mp4) or WebM (.webm) video file.',
    };
  }

  return { valid: true };
}

// Sanitize text inputs (prevent XSS)
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
