import { throttle } from "throttle-debounce";
import type { IntRange } from "type-fest";

// number between 1 to infinity
export type DegreesPerSecond = IntRange<1, typeof Infinity>;
export type FlipPosition = IntRange<0, 2>;

export class Leaf {
  private currentAnimation: Promise<void> | null = null;
  private targetFlipPosition: FlipPosition | null = null;

  constructor(
    readonly index: number,
    private readonly indexOf: number,
    readonly pages: [HTMLElement, HTMLElement | undefined],
    private wrappedFlipPosition: FlipPosition
  ) {}

  get isTurned(): boolean {
    return this.flipPosition === 1;
  }
  get isTurning(): boolean {
    return this.flipPosition !== 0;
  }
  get isCover(): boolean {
    return this.isFirst || this.isLast;
  }
  get isFirst(): boolean {
    return this.index === 0;
  }
  get isLast(): boolean {
    return this.index === this.indexOf - 1;
  }
  set flipPosition(value: number) {
    this.wrappedFlipPosition = Math.max(0, Math.min(1, value)) as FlipPosition;
  }
  get flipPosition(): number {
    return this.wrappedFlipPosition;
  }

  async flipToPosition(
    flipPosition: FlipPosition,
    velocity: DegreesPerSecond = 225 as DegreesPerSecond
  ) {
    if (this.currentAnimation) {
      await this.currentAnimation;
    }

    if (this.flipPosition === flipPosition) {
      return Promise.resolve();
    }

    if (this.targetFlipPosition === flipPosition) {
      return this.currentAnimation ?? Promise.resolve();
    }

    this.targetFlipPosition = flipPosition;

    this.currentAnimation = new Promise<void>((resolve) => {
      const currentFlipPosition = this.flipPosition;
      const distance = Math.abs(flipPosition - currentFlipPosition);
      const duration = ((distance * 180) / velocity) * 1000; // duration in milliseconds

      const start = performance.now();
      const step = (timestamp: number) => {
        const elapsed = timestamp - start;

        if (elapsed < 0) {
          requestAnimationFrame(step);
          return;
        }

        const progress = Math.min(elapsed / duration, 1);
        const newPosition =
          currentFlipPosition + progress * (flipPosition - currentFlipPosition);

        // Ensure the new position is within valid bounds [0, 1]
        this.flipPosition = Math.max(
          0,
          Math.min(1, newPosition)
        ) as FlipPosition;

        // Detailed log for debugging
        console.log(
          `Timestamp: ${timestamp}, Elapsed: ${elapsed}, Progress: ${progress}, Current Position: ${currentFlipPosition}, Requested Position: ${flipPosition}, New Position: ${this.flipPosition}`
        );

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          this.currentAnimation = null;
          this.targetFlipPosition = null;
          resolve();
        }
      };

      requestAnimationFrame(step);
    });

    return this.currentAnimation;
  }

  async efficientFlipToPosition(
    flipPosition: FlipPosition,
    velocity: DegreesPerSecond = 20000 as DegreesPerSecond
  ) {
    return throttle(1, this.flipToPosition.bind(this))(flipPosition, velocity);
  }
}
