import { Injectable, signal } from '@angular/core';

/** Delay before the loader appears, so fast requests don't cause a flash. */
const SHOW_DELAY_MS = 150;

/** Tracks in-flight HTTP requests; `visible` is true while any are running. */
@Injectable({ providedIn: 'root' })
export class LoaderService {
  private pending = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly visible = signal(false);

  start(): void {
    this.pending++;
    if (this.pending === 1 && !this.visible() && this.timer === null) {
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.pending > 0) this.visible.set(true);
      }, SHOW_DELAY_MS);
    }
  }

  stop(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      if (this.timer !== null) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.visible.set(false);
    }
  }
}
