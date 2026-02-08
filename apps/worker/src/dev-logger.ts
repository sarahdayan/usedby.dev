const PREFIX = '[dev]';

export class DevLogger {
  private enabled: boolean;
  private entries: Array<{ label: string; message: string; time?: string }> =
    [];
  private timers = new Map<string, number>();

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  log(label: string, message: string): void {
    if (!this.enabled) {
      return;
    }

    this.entries.push({ label, message });
  }

  time(label: string): void {
    if (!this.enabled) {
      return;
    }

    this.timers.set(label, Date.now());
  }

  timeEnd(label: string): void {
    if (!this.enabled) {
      return;
    }

    const start = this.timers.get(label);

    if (start === undefined) {
      return;
    }

    this.timers.delete(label);

    const elapsed = Date.now() - start;
    const ms = `${elapsed}ms`;

    let existing: (typeof this.entries)[number] | undefined;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i]!.label === label) {
        existing = this.entries[i];
        break;
      }
    }

    if (existing) {
      existing.time = ms;
    } else {
      this.entries.push({ label, message: '', time: ms });
    }
  }

  summary(): void {
    if (!this.enabled || this.entries.length === 0) {
      return;
    }

    const labelWidth = Math.max(...this.entries.map((e) => e.label.length));

    for (const entry of this.entries) {
      const padded = entry.label.padEnd(labelWidth);
      const time = entry.time ? entry.time.padStart(8) : '';
      const gap = entry.time && entry.message ? '  ' : '';

      console.log(
        `${PREFIX}   ${padded}   ${entry.message}${gap}${time}`.trimEnd()
      );
    }
  }
}
