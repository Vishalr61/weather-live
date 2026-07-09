import { beforeEach, describe, expect, it } from 'vitest';
import { recordAndCheckEdge, resetAlertState } from './alertState.js';

describe('recordAndCheckEdge', () => {
  beforeEach(() => {
    resetAlertState();
  });

  it('fires on the first transition into severe', () => {
    expect(recordAndCheckEdge('tokyo', 'severe')).toBe(true);
  });

  it('does not re-fire while severity stays severe', () => {
    expect(recordAndCheckEdge('tokyo', 'severe')).toBe(true);
    expect(recordAndCheckEdge('tokyo', 'severe')).toBe(false);
    expect(recordAndCheckEdge('tokyo', 'severe')).toBe(false);
  });

  it('does not fire for watch or none', () => {
    expect(recordAndCheckEdge('tokyo', 'watch')).toBe(false);
    expect(recordAndCheckEdge('tokyo', 'none')).toBe(false);
  });

  it('re-fires after dropping back to none and returning to severe', () => {
    expect(recordAndCheckEdge('tokyo', 'severe')).toBe(true);
    expect(recordAndCheckEdge('tokyo', 'watch')).toBe(false);
    expect(recordAndCheckEdge('tokyo', 'none')).toBe(false);
    expect(recordAndCheckEdge('tokyo', 'severe')).toBe(true);
  });

  it('tracks each city independently', () => {
    expect(recordAndCheckEdge('tokyo', 'severe')).toBe(true);
    expect(recordAndCheckEdge('paris', 'severe')).toBe(true);
    expect(recordAndCheckEdge('tokyo', 'severe')).toBe(false);
    expect(recordAndCheckEdge('paris', 'severe')).toBe(false);
  });
});
