export interface AspectRatio {
  width: number
  height: number
}
export class AspectRatioImpl implements AspectRatio {
  static from(aspectRatio: AspectRatio) {
    return new AspectRatioImpl(aspectRatio.width, aspectRatio.height)
  }
  constructor(
    public readonly width: number,
    public readonly height: number
  ) {}
  get value(): number {
    return this.width / this.height
  }
}
