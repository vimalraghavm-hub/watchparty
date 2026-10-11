import { describe, it, expect, vi } from 'vitest';
import type { Participant, MovieMatchStatus } from '../types';

describe('Movie Workflow & Match Verification Tests', () => {
  it('correctly derives matchStatus for all participant combinations', () => {
    const userA = 'user-a';
    const userB = 'user-b';

    const getMatchStatus = (
      participants: Participant[],
      isHashing: boolean
    ): MovieMatchStatus => {
      const self = participants.find((p) => p.id === userA);
      const peer = participants.find((p) => p.id === userB);

      if (isHashing) return 'checking_movie';
      if (!self?.isMediaReady || !peer?.isMediaReady) return 'waiting_for_movie';
      if (self.localFileHash && peer.localFileHash) {
        return self.localFileHash === peer.localFileHash ? 'movies_match' : 'movies_mismatch';
      }
      return 'waiting_for_movie';
    };

    // Case 1: Neither participant ready
    expect(
      getMatchStatus(
        [
          { id: userA, name: 'Alice', role: 'host', joinedAt: '', isOnline: true, isMediaReady: false },
          { id: userB, name: 'Bob', role: 'guest', joinedAt: '', isOnline: true, isMediaReady: false },
        ],
        false
      )
    ).toBe('waiting_for_movie');

    // Case 2: User A is actively hashing file
    expect(
      getMatchStatus(
        [
          { id: userA, name: 'Alice', role: 'host', joinedAt: '', isOnline: true, isMediaReady: false },
          { id: userB, name: 'Bob', role: 'guest', joinedAt: '', isOnline: true, isMediaReady: false },
        ],
        true
      )
    ).toBe('checking_movie');

    // Case 3: Only User A is ready, User B hasn't selected
    expect(
      getMatchStatus(
        [
          { id: userA, name: 'Alice', role: 'host', joinedAt: '', isOnline: true, isMediaReady: true, localFileHash: 'hash123' },
          { id: userB, name: 'Bob', role: 'guest', joinedAt: '', isOnline: true, isMediaReady: false },
        ],
        false
      )
    ).toBe('waiting_for_movie');

    // Case 4: Both ready with matching hashes
    expect(
      getMatchStatus(
        [
          { id: userA, name: 'Alice', role: 'host', joinedAt: '', isOnline: true, isMediaReady: true, localFileHash: 'hash123' },
          { id: userB, name: 'Bob', role: 'guest', joinedAt: '', isOnline: true, isMediaReady: true, localFileHash: 'hash123' },
        ],
        false
      )
    ).toBe('movies_match');

    // Case 5: Both ready with different files (mismatch)
    expect(
      getMatchStatus(
        [
          { id: userA, name: 'Alice', role: 'host', joinedAt: '', isOnline: true, isMediaReady: true, localFileHash: 'hash_movie_1' },
          { id: userB, name: 'Bob', role: 'guest', joinedAt: '', isOnline: true, isMediaReady: true, localFileHash: 'hash_movie_2' },
        ],
        false
      )
    ).toBe('movies_mismatch');
  });

  it('guarantees object URL is revoked only when replacing file or unmounting', () => {
    if (typeof URL.revokeObjectURL !== 'function') URL.revokeObjectURL = () => {};
    if (typeof URL.createObjectURL !== 'function') URL.createObjectURL = () => 'blob:mock';

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => `blob:mock-${(blob as File).name}`);

    let activeUrl: string | null = null;

    const setMovie = (file: File) => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
      activeUrl = URL.createObjectURL(file);
    };

    const cleanup = () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
        activeUrl = null;
      }
    };

    const file1 = new File(['1'], 'video1.mp4', { type: 'video/mp4' });
    setMovie(file1);
    expect(createSpy).toHaveBeenCalledWith(file1);
    expect(revokeSpy).not.toHaveBeenCalled();

    // Re-renders or room state changes do NOT revoke the URL
    expect(activeUrl).toBe('blob:mock-video1.mp4');
    expect(revokeSpy).not.toHaveBeenCalled();

    // Replacing file revokes previous URL and creates new one
    const file2 = new File(['2'], 'video2.mp4', { type: 'video/mp4' });
    setMovie(file2);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-video1.mp4');
    expect(activeUrl).toBe('blob:mock-video2.mp4');

    // Final unmount revokes active URL
    cleanup();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-video2.mp4');
    expect(activeUrl).toBeNull();

    revokeSpy.mockRestore();
    createSpy.mockRestore();
  });

  it('correctly clamps draggable card position within viewport bounds', () => {
    const clampPosition = (
      x: number,
      y: number,
      cardWidth: number,
      cardHeight: number,
      windowWidth: number,
      windowHeight: number
    ) => {
      const minX = 12;
      const maxX = Math.max(minX, windowWidth - cardWidth - 12);
      const minY = 64;
      const maxY = Math.max(minY, windowHeight - cardHeight - 12);

      return {
        x: Math.min(Math.max(minX, x), maxX),
        y: Math.min(Math.max(minY, y), maxY),
      };
    };

    // Standard positioning in 1920x1080 viewport
    const normal = clampPosition(500, 300, 280, 180, 1920, 1080);
    expect(normal).toEqual({ x: 500, y: 300 });

    // Dragged too far left and above navbar
    const outLeftTop = clampPosition(-100, 20, 280, 180, 1920, 1080);
    expect(outLeftTop).toEqual({ x: 12, y: 64 });

    // Dragged off right edge and off bottom edge
    const outRightBottom = clampPosition(2500, 1500, 280, 180, 1920, 1080);
    expect(outRightBottom).toEqual({ x: 1920 - 280 - 12, y: 1080 - 180 - 12 });
  });
});
