import { AspectRatio, AspectRatioImpl } from "./AspectRatio";

export class Size {
  aspectRatio: AspectRatioImpl;
  aspectRatioFit(rhsAspectRatio: AspectRatio) {
    const rhsAspectRatioValue = AspectRatioImpl.from(rhsAspectRatio).value;
    return this.aspectRatio.value > rhsAspectRatioValue
      ? new Size(this.height * rhsAspectRatioValue, this.height)
      : new Size(this.width, this.width / rhsAspectRatioValue);
  }
  constructor(public readonly width: number, public readonly height: number) {
    this.aspectRatio = new AspectRatioImpl(width, height);
  }
  get asString(): string {
    return `${this.width}x${this.height}`;
  }
}
