import { throttle } from 'throttle-debounce'
import type { IntRange } from 'type-fest'
import { FlipDirection } from './flip-direction'

// number between 1 to infinity
export type DegreesPerSecond = IntRange<1, typeof Infinity>
export type FlipPosition = IntRange<0, 2>
export const FLIPPED = true
export const NOT_FLIPPED = false
export class Leaf {
  private currentAnimation: Promise<void> | null = null
  private targetFlipPosition: FlipPosition | null = null
  private wrappedFlipPosition: number

  constructor(
    readonly index: number,
    readonly pages: [HTMLElement, HTMLElement | undefined],
    isFlipped: boolean,
    private readonly bookProperties: {
      isLTR: boolean
      pagesCount: number
      leavesCount: number
    },
    private readonly onTurned: (direction: FlipDirection) => void
  ) {
    this.wrappedFlipPosition = isFlipped ? 1 : 0
    // TODO: rethink this
    // if(isFlipped) {
    //   // this.flipToPosition(1);
    // }
  }

  get isTurned(): boolean {
    return this.flipPosition === 1
  }
  get isTurning(): boolean {
    return this.flipPosition !== 0
  }
  get isCover(): boolean {
    return this.isFirst || this.isLast
  }
  get isFirst(): boolean {
    return this.index === 0
  }
  get isLast(): boolean {
    return this.index === this.bookProperties.leavesCount - 1
  }
  set flipPosition(value: number) {
    this.wrappedFlipPosition = Math.max(0, Math.min(1, value)) as FlipPosition
  }
  get flipPosition(): number {
    return this.wrappedFlipPosition
  }

  async flipToPosition(
    flipPosition: FlipPosition,
    velocity: DegreesPerSecond = 225 as DegreesPerSecond
  ) {
    if (this.currentAnimation) {
      await this.currentAnimation
    }

    if (this.flipPosition === flipPosition) {
      return Promise.resolve()
    }

    if (this.targetFlipPosition === flipPosition) {
      return this.currentAnimation ?? Promise.resolve()
    }

    this.targetFlipPosition = flipPosition

    this.currentAnimation = new Promise<void>(resolve => {
      const currentFlipPosition = this.flipPosition
      const distance = Math.abs(flipPosition - currentFlipPosition)
      const duration = ((distance * 180) / velocity) * 1000 // duration in milliseconds

      const start = performance.now()
      const step = (timestamp: number) => {
        const elapsed = timestamp - start

        if (elapsed < 0) {
          requestAnimationFrame(step)
          return
        }

        const progress = Math.min(elapsed / duration, 1)
        const newPosition =
          currentFlipPosition + progress * (flipPosition - currentFlipPosition)

        this.pages.forEach((page, index) => {
          const isLTR = this.bookProperties.isLTR
          if (page) {
            const isOdd = (index % 2) + 1 === 1
            const degrees = isOdd
              ? isLTR
                ? newPosition > 0.5
                  ? 180 - newPosition * 180
                  : -newPosition * 180
                : newPosition > 0.5
                  ? -(180 - newPosition * 180)
                  : newPosition * 180
              : isLTR
                ? newPosition < 0.5
                  ? -newPosition * 180
                  : 180 - newPosition * 180
                : newPosition < 0.5
                  ? newPosition * 180
                  : -(180 - newPosition * 180)
            const rotateY = `${degrees}deg`
            const translateX = `${
              isOdd ? (isLTR ? `100%` : `-100%`) : isLTR ? `0px` : `0px`
            }`
            const scaleX = isOdd
              ? newPosition > 0.5
                ? -1
                : 1
              : newPosition < 0.5
                ? -1
                : 1
            page.style.transform = `translateX(${translateX})rotateY(${rotateY})scaleX(${scaleX})`
            // console.log(page.style.transform);
            page.style.transformOrigin = isOdd
              ? `${isLTR ? 'left' : 'right'}`
              : `${isLTR ? 'right' : 'left'}`
            page.style.zIndex = `${
              newPosition > 0.5
                ? page.dataset.pageIndex
                : this.bookProperties.pagesCount -
                  (page.dataset.pageIndex as unknown as number)
            }`
          }
        })

        // Ensure the new position is within valid bounds [0, 1]
        this.flipPosition = Math.max(
          0,
          Math.min(1, newPosition)
        ) as FlipPosition
        if (this.flipPosition === 1 || this.flipPosition === 0) {
          this.onTurned(
            this.flipPosition === 1
              ? FlipDirection.Forward
              : FlipDirection.Backward
          )
        }
        // Detailed log for debugging
        // console.log(
        //   `Timestamp: ${timestamp}, Elapsed: ${elapsed}, Progress: ${progress}, Current Position: ${currentFlipPosition}, Requested Position: ${flipPosition}, New Position: ${this.flipPosition}`
        // );

        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          this.currentAnimation = null
          this.targetFlipPosition = null
          resolve()
        }
      }

      requestAnimationFrame(step)
    })

    return this.currentAnimation
  }

  async efficientFlipToPosition(
    flipPosition: FlipPosition,
    velocity: DegreesPerSecond = 20000 as DegreesPerSecond
  ) {
    return throttle(1, this.flipToPosition.bind(this))(flipPosition, velocity)
  }
}
