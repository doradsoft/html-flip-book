import type { IntRange } from 'type-fest';
import { FlipDirection } from './flip-direction';
export type DegreesPerSecond = IntRange<1, typeof Infinity>;
export type FlipPosition = IntRange<0, 2>;
export declare const FLIPPED = true;
export declare const NOT_FLIPPED = false;
export declare class Leaf {
    readonly index: number;
    readonly pages: [HTMLElement, HTMLElement | undefined];
    private readonly bookProperties;
    private readonly onTurned;
    private currentAnimation;
    private targetFlipPosition;
    private wrappedFlipPosition;
    constructor(index: number, pages: [HTMLElement, HTMLElement | undefined], isFlipped: boolean, bookProperties: {
        isLTR: boolean;
        pagesCount: number;
        leavesCount: number;
    }, onTurned: (direction: FlipDirection) => void);
    get isTurned(): boolean;
    get isTurning(): boolean;
    get isCover(): boolean;
    get isFirst(): boolean;
    get isLast(): boolean;
    set flipPosition(value: number);
    get flipPosition(): number;
    flipToPosition(flipPosition: FlipPosition, velocity?: DegreesPerSecond): Promise<void>;
    efficientFlipToPosition(flipPosition: FlipPosition, velocity?: DegreesPerSecond): Promise<void>;
}
//# sourceMappingURL=leaf.d.ts.map