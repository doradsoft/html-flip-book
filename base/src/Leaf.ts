import { throttle } from "throttle-debounce";

export class Leaf {
  constructor(
    readonly index: number,
    private readonly indexOf: number,
    readonly pages: [HTMLElement, HTMLElement | undefined],
    public flipPosition: number
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
  async flipToPosition(flipPosition: number, duration = 800) {
    const startTime = performance.now();
    console.log("Flipping to position", flipPosition);
    return new Promise<void>((resolve) => {
      const animateFlip = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        this.flipPosition = progress * flipPosition;
        if (progress < 1) {
          requestAnimationFrame(animateFlip);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animateFlip);
    });
  }

  async efficientFlipToPosition(flipPosition: number, duration = 1) {
    return throttle(1, this.flipToPosition.bind(this))(flipPosition, duration);
  }
}
