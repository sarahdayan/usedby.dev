import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DevLogger } from '../dev-logger';

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
  vi.restoreAllMocks();
});

describe('DevLogger', () => {
  describe('when disabled', () => {
    it('does not collect entries', () => {
      const logger = new DevLogger(false);
      logger.log('cache', 'miss');
      logger.summary();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('does not start timers', () => {
      const logger = new DevLogger(false);
      logger.time('search');
      logger.timeEnd('search');
      logger.summary();

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('collects entries that appear in summary', () => {
      const logger = new DevLogger(true);
      logger.log('cache', 'miss');
      logger.summary();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[dev]   cache   miss');
    });

    it('collects multiple entries in order', () => {
      const logger = new DevLogger(true);
      logger.log('cache', 'miss');
      logger.log('search', '42 repos');
      logger.summary();

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, '[dev]   cache    miss');
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        '[dev]   search   42 repos'
      );
    });
  });

  describe('time / timeEnd', () => {
    it('attaches elapsed time to matching log entry', () => {
      vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1250);

      const logger = new DevLogger(true);
      logger.log('search', '42 repos');
      logger.time('search');
      logger.timeEnd('search');
      logger.summary();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[dev]   search   42 repos     250ms'
      );
    });

    it('creates a new entry when no matching log entry exists', () => {
      vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      const logger = new DevLogger(true);
      logger.time('total');
      logger.timeEnd('total');
      logger.summary();

      expect(consoleSpy).toHaveBeenCalledWith('[dev]   total      500ms');
    });

    it('is a no-op when timeEnd is called without a prior time', () => {
      const logger = new DevLogger(true);
      logger.timeEnd('search');
      logger.summary();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('matches the last entry with that label', () => {
      vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1100);

      const logger = new DevLogger(true);
      logger.log('search', 'first');
      logger.log('search', 'second');
      logger.time('search');
      logger.timeEnd('search');
      logger.summary();

      // The time should be attached to the second (last) entry
      expect(consoleSpy).toHaveBeenNthCalledWith(1, '[dev]   search   first');
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        '[dev]   search   second     100ms'
      );
    });
  });

  describe('summary', () => {
    it('does not print when there are no entries', () => {
      const logger = new DevLogger(true);
      logger.summary();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('aligns labels to the longest one', () => {
      const logger = new DevLogger(true);
      logger.log('cache', 'miss');
      logger.log('pre-filter', '100 → 80');
      logger.summary();

      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        '[dev]   cache        miss'
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        '[dev]   pre-filter   100 → 80'
      );
    });

    it('right-aligns time values', () => {
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1005)
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(3204);

      const logger = new DevLogger(true);
      logger.log('search', '42 repos');
      logger.time('search');
      logger.timeEnd('search');
      logger.log('enrich', '40 repos');
      logger.time('enrich');
      logger.timeEnd('enrich');
      logger.summary();

      // Times should be right-aligned in an 8-char column
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        '[dev]   search   42 repos       5ms'
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        '[dev]   enrich   40 repos    1204ms'
      );
    });

    it('handles entry with time but no message', () => {
      vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(2571);

      const logger = new DevLogger(true);
      logger.time('total');
      logger.timeEnd('total');
      logger.summary();

      // No gap between empty message and time
      expect(consoleSpy).toHaveBeenCalledWith('[dev]   total     2571ms');
    });
  });
});
