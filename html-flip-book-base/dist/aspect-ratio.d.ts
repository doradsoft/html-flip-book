export interface AspectRatio {
    width: number;
    height: number;
}
export declare class AspectRatioImpl implements AspectRatio {
    readonly width: number;
    readonly height: number;
    static from(aspectRatio: AspectRatio): AspectRatioImpl;
    constructor(width: number, height: number);
    get value(): number;
}
//# sourceMappingURL=aspect-ratio.d.ts.map
