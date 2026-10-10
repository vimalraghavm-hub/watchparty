import type { PlaybackState, PlaybackCommandPayload } from '../types';

// Estimate current server time (using local clock + estimated server offset)
export function getEstimatedServerTime(clockOffsetMs = 0): number {
  return Date.now() + clockOffsetMs;
}

// Derive authoritative playback position at current time
export function calculateTargetPosition(state: PlaybackState, currentServerTimeMs: number): number {
  if (!state.isPlaying) {
    return Math.max(0, state.basePositionSeconds);
  }

  const elapsedMs = Math.max(0, currentServerTimeMs - state.updatedAtServerTime);
  const elapsedSeconds = (elapsedMs / 1000) * (state.playbackRate || 1.0);
  return Math.max(0, state.basePositionSeconds + elapsedSeconds);
}

// Calculate difference between local video time and target position
export function calculateDrift(localCurrentTimeSeconds: number, targetPositionSeconds: number): number {
  return localCurrentTimeSeconds - targetPositionSeconds;
}

// Determine if a hard seek is needed (threshold usually 1.5 seconds)
export function shouldHardSeek(driftSeconds: number, hardThresholdSeconds = 1.5): boolean {
  return Math.abs(driftSeconds) >= hardThresholdSeconds;
}

// Calculate temporary playback rate adjustment for smooth micro-drift correction
export function calculateRateCorrection(driftSeconds: number, deadbandSeconds = 0.25): number {
  const absDrift = Math.abs(driftSeconds);

  // Within acceptable sync deadband, stay at normal speed
  if (absDrift <= deadbandSeconds) {
    return 1.0;
  }

  // If local video is behind (drift < 0), speed up slightly (e.g. 1.05x)
  if (driftSeconds < 0) {
    return Math.min(1.1, 1.0 + Math.min(0.1, absDrift * 0.05));
  }

  // If local video is ahead (drift > 0), slow down slightly (e.g. 0.95x)
  return Math.max(0.9, 1.0 - Math.min(0.1, absDrift * 0.05));
}

// Validate whether an incoming command is newer based on monotonically increasing revision
export function isCommandValidAndNew(incoming: PlaybackCommandPayload, current: PlaybackState): boolean {
  if (!incoming || !incoming.commandId) return false;
  if (incoming.commandId === current.lastCommandId) return false;
  return incoming.revision > current.revision;
}

// Apply an incoming command payload to calculate next PlaybackState
export function applyCommandToState(
  command: PlaybackCommandPayload,
  currentState: PlaybackState
): PlaybackState {
  const serverTime = command.serverTimestamp || command.clientTimestamp || Date.now();

  switch (command.commandType) {
    case 'PLAY':
      return {
        ...currentState,
        isPlaying: true,
        basePositionSeconds: command.targetPosition,
        updatedAtServerTime: serverTime,
        revision: command.revision,
        lastCommandId: command.commandId,
        controllerId: command.senderId,
      };

    case 'PAUSE':
      return {
        ...currentState,
        isPlaying: false,
        basePositionSeconds: command.targetPosition,
        updatedAtServerTime: serverTime,
        revision: command.revision,
        lastCommandId: command.commandId,
        controllerId: command.senderId,
      };

    case 'SEEK':
      return {
        ...currentState,
        basePositionSeconds: command.targetPosition,
        updatedAtServerTime: serverTime,
        revision: command.revision,
        lastCommandId: command.commandId,
        controllerId: command.senderId,
      };

    case 'PLAYBACK_RATE_CHANGE':
      return {
        ...currentState,
        playbackRate: command.playbackRate || 1.0,
        basePositionSeconds: command.targetPosition,
        updatedAtServerTime: serverTime,
        revision: command.revision,
        lastCommandId: command.commandId,
        controllerId: command.senderId,
      };

    case 'ROOM_STATE_SNAPSHOT':
      return {
        ...currentState,
        mediaId: command.mediaId !== undefined ? command.mediaId : currentState.mediaId,
        isPlaying: command.targetPosition > 0 && command.playbackRate ? currentState.isPlaying : false,
        basePositionSeconds: command.targetPosition,
        updatedAtServerTime: serverTime,
        playbackRate: command.playbackRate || 1.0,
        revision: command.revision,
        lastCommandId: command.commandId,
      };

    default:
      return currentState;
  }
}
