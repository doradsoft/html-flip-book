import { AspectRatio, AspectRatioImpl } from "./aspect-ratio";
export declare class Size {
    readonly width: number;
    readonly height: number;
    aspectRatio: AspectRatioImpl;
    aspectRatioFit(rhsAspectRatio: AspectRatio): Size;
    constructor(width: number, height: number);
    get asString(): string;
}
//# sourceMappingURL=size.d.ts.map
