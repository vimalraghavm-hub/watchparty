import { describe, it, expect } from 'vitest';
import {
  calculateTargetPosition,
  calculateDrift,
  shouldHardSeek,
  calculateRateCorrection,
  isCommandValidAndNew,
  applyCommandToState,
} from '../lib/syncEngine';
import type { PlaybackState, PlaybackCommandPayload } from '../types';

describe('SyncEngine Unit Tests', () => {
  const baseState: PlaybackState = {
    roomId: 'room-1',
    mediaId: 'media-1',
    isPlaying: true,
    basePositionSeconds: 10,
    updatedAtServerTime: 1000000,
    playbackRate: 1.0,
    revision: 5,
    lastCommandId: 'cmd-5',
    controllerId: 'user-1',
  };

  it('calculates target position correctly when playing', () => {
    // 5 seconds elapsed (1005000 - 1000000 = 5000ms)
    const target = calculateTargetPosition(baseState, 1005000);
    expect(target).toBe(15);
  });

  it('calculates target position correctly when paused', () => {
    const pausedState = { ...baseState, isPlaying: false };
    const target = calculateTargetPosition(pausedState, 1005000);
    expect(target).toBe(10);
  });

  it('calculates drift between local time and target position', () => {
    const driftBehind = calculateDrift(12, 15);
    expect(driftBehind).toBe(-3);

    const driftAhead = calculateDrift(17, 15);
    expect(driftAhead).toBe(2);
  });

  it('determines when a hard seek is needed', () => {
    expect(shouldHardSeek(0.5, 1.5)).toBe(false);
    expect(shouldHardSeek(1.6, 1.5)).toBe(true);
    expect(shouldHardSeek(-2.0, 1.5)).toBe(true);
  });

  it('calculates micro-drift rate corrections', () => {
    // Within deadband (< 0.25s), rate should be 1.0
    expect(calculateRateCorrection(0.1)).toBe(1.0);

    // Local video behind (-0.5s), should speed up (> 1.0)
    expect(calculateRateCorrection(-0.5)).toBeGreaterThan(1.0);

    // Local video ahead (+0.5s), should slow down (< 1.0)
    expect(calculateRateCorrection(0.5)).toBeLessThan(1.0);
  });

  it('rejects stale or duplicate commands based on revision and command ID', () => {
    const staleCommand: PlaybackCommandPayload = {
      commandId: 'cmd-4',
      commandType: 'SEEK',
      senderId: 'user-2',
      roomId: 'room-1',
      targetPosition: 20,
      revision: 4, // lower than baseState revision 5
      clientTimestamp: 1005000,
    };

    expect(isCommandValidAndNew(staleCommand, baseState)).toBe(false);

    const validNewCommand: PlaybackCommandPayload = {
      commandId: 'cmd-6',
      commandType: 'SEEK',
      senderId: 'user-2',
      roomId: 'room-1',
      targetPosition: 20,
      revision: 6, // higher revision
      clientTimestamp: 1005000,
    };

    expect(isCommandValidAndNew(validNewCommand, baseState)).toBe(true);
  });

  it('applies command to update state properly', () => {
    const pauseCommand: PlaybackCommandPayload = {
      commandId: 'cmd-7',
      commandType: 'PAUSE',
      senderId: 'user-2',
      roomId: 'room-1',
      targetPosition: 42,
      revision: 7,
      clientTimestamp: 1006000,
      serverTimestamp: 1006000,
    };

    const nextState = applyCommandToState(pauseCommand, baseState);
    expect(nextState.isPlaying).toBe(false);
    expect(nextState.basePositionSeconds).toBe(42);
    expect(nextState.revision).toBe(7);
    expect(nextState.lastCommandId).toBe('cmd-7');
  });
});
