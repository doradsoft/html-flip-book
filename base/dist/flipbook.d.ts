import './pages.scss';
import './flipbook.scss';
import { PageSemantics } from './page-semantics';
import { FlipBookOptions } from './flip-book-options';
declare class FlipBook {
    bookElement?: HTMLElement;
    private pageElements;
    private readonly pagesCount;
    private readonly leafAspectRatio;
    private readonly coverAspectRatio;
    private readonly direction;
    private readonly onPageChanged?;
    private readonly pageSemantics;
    private leaves;
    private currentLeaf;
    private flipDirection;
    private flipStartingPos;
    private isDuringManualFlip;
    private flipDelta;
    private isDuringAutoFlip;
    touchStartingPos: {
        x: number;
        y: number;
    };
    private prevVisiblePageIndices;
    private get isLTR();
    private get isClosed();
    private get isClosedInverted();
    private get currentLeaves();
    private get currentOrTurningLeaves();
    constructor(options: FlipBookOptions);
    render(selector: string, debug?: boolean): void;
    private fillDebugBar;
    private onDragStart;
    private onDragUpdate;
    private onDragEnd;
    private handleTouchStart;
    private handleTouchMove;
    private onTurned;
    jumpToPage(pageIndex: number): void;
}
export { FlipBook, PageSemantics };
//# sourceMappingURL=flipbook.d.ts.map