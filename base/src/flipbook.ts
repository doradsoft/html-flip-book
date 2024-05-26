import "./pages.scss";
import "./flipbook.scss";
import { PageSemantics } from "./page-semantics";
import Hammer from "hammerjs";
import { Leaf } from "./Leaf";
import { FlipBookOptions } from "./FlipBookOptions";
import { FlipDirection } from "./FlipDirection";
import { AspectRatio } from "./AspectRatio";
import { Size } from "./Size";

const FAST_DELTA = 500;
class FlipBook {
  bookElement?: HTMLElement;
  private pageElements: HTMLElement[] = [];
  private readonly totalPages: number;
  private readonly leafAspectRatio: AspectRatio = { width: 2, height: 3 };
  private readonly coverAspectRatio: AspectRatio = {
    width: 2.15,
    height: 3.15,
  };
  private readonly direction: "rtl" | "ltr" = "ltr";
  private readonly onPageChanged?: (pageIndex: number) => void;
  private readonly pageSemantics: PageSemantics | undefined;
  private leaves: Leaf[] = [];
  // flipping state
  private currentLeaf: Leaf | undefined = undefined;
  private flipDirection: FlipDirection = FlipDirection.None;
  private flipStartingPos = 0;
  private isDuringManualFlip = false;
  private flipDelta = 0;
  private isDuringAutoFlip = false;
  private get isLTR(): boolean {
    return this.direction === "ltr";
  }
  private get isClosed(): boolean {
    return this.currentLeaves[1] === undefined;
  }
  private get isClosedInverted(): boolean {
    return this.currentOrTurningLeaves[1] === undefined;
  }
  private get currentLeaves(): [Leaf, Leaf | undefined] {
    let secondLeafIndex = -1;
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i];
      if (leaf.isTurned) {
        secondLeafIndex = leaf.index + 1;
        break;
      }
    }
    return secondLeafIndex == -1
      ? [this.leaves[0], undefined]
      : [this.leaves[secondLeafIndex - 1], this.leaves[secondLeafIndex]];
  }

  private get currentOrTurningLeaves(): [Leaf, Leaf | undefined] {
    let secondLeafIndex = -1;
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i];
      if (leaf.isTurned || leaf.isTurning) {
        secondLeafIndex = leaf.index + 1;
        break;
      }
    }
    return secondLeafIndex == -1
      ? [this.leaves[0], undefined]
      : [this.leaves[secondLeafIndex - 1], this.leaves[secondLeafIndex]];
  }

  constructor(options: FlipBookOptions) {
    this.totalPages = options.totalPages;
    this.leafAspectRatio = options.leafAspectRatio || this.leafAspectRatio;
    this.coverAspectRatio = options.coverAspectRatio || this.coverAspectRatio;
    this.direction = options.direction || this.direction;
    this.pageSemantics = options.pageSemantics;
    this.onPageChanged = options.onPageChanged;
  }

  initialize(selector: string) {
    const bookElement = document.querySelector(selector);
    if (!bookElement) {
      throw new Error(`Couldn't find container with selector: ${selector}`);
    }
    this.bookElement = bookElement as HTMLElement;
    if (!this.bookElement.classList.contains("flipbook")) {
      this.bookElement.classList.add("flipbook");
    }

    const pageElements = bookElement.querySelectorAll(".page");
    if (!pageElements.length) {
      throw new Error("No pages found in flipbook");
    }
    this.pageElements = Array.from(pageElements) as HTMLElement[];
    this.leaves.splice(0, this.leaves.length);
    const leafCount = Math.ceil(this.totalPages / 2);
    const maxCoverSize = new Size(
      this.bookElement.clientWidth / 2,
      this.bookElement.clientHeight
    );
    const coverSize = maxCoverSize.aspectRatioFit(this.coverAspectRatio);
    const leafSize = new Size(
      (coverSize.width * this.leafAspectRatio.width) /
        this.coverAspectRatio.width,
      (coverSize.height * this.leafAspectRatio.height) /
        this.coverAspectRatio.height
    );
    this.pageElements.forEach((pageElement, pageIndex) => {
      pageElement.style.width = `${leafSize.width}px`;
      pageElement.style.height = `${leafSize.height}px`;
      // for debugging
      pageElement.style.border = "1px solid black";
      pageElement.dataset.pageIndex = pageIndex.toString();
      pageElement.dataset.pageSemanticName =
        this.pageSemantics?.indexToSemanticName(pageIndex) ?? "";
      pageElement.dataset.pageTitle =
        this.pageSemantics?.indexToTitle(pageIndex) ?? "";

      const leafIndex = Math.floor(pageIndex / 2);
      const isOddPage = (pageIndex + 1) % 2 === 1;
      pageElement.classList.add(isOddPage ? "odd" : "even");
      if (isOddPage) {
        this.leaves[leafIndex] = new Leaf(
          leafIndex,
          leafCount,
          [pageElement, undefined],
          // TODO: set turned based on initialized page
          0
        );
      } else {
        this.leaves[leafIndex].pages[1] = pageElement;
      }
    });
    const hammer = new Hammer(this.bookElement);

    hammer.on("panstart", this.onDragStart.bind(this));
    hammer.on("panmove", this.onDragUpdate.bind(this));
    hammer.on("panend", this.onDragEnd.bind(this));
  }

  private onDragStart(event: HammerInput) {
    if (this.currentLeaf || this.isDuringAutoFlip) {
      this.flipDirection = FlipDirection.None;
      this.flipStartingPos = 0;
      return;
    }
    this.flipStartingPos = event.center.x;
  }

  private onDragUpdate(event: HammerInput) {
    if (this.isDuringAutoFlip || this.isDuringManualFlip) {
      return;
    }
    this.isDuringManualFlip = true;
    try {
      const currentPos = event.center.x;
      this.flipDelta = this.isLTR
        ? this.flipStartingPos - currentPos
        : currentPos - this.flipStartingPos;
      const bookWidth = this.bookElement?.clientWidth ?? 0;
      if (Math.abs(this.flipDelta) > bookWidth) return;
      console.log(this.flipDelta);
      if (this.flipDelta === 0) return;
      this.flipDirection =
        this.flipDirection ??
        (this.flipDelta > 0 ? FlipDirection.Forward : FlipDirection.Backward);
      switch (this.flipDirection) {
        case FlipDirection.Forward:
          const posForward = this.flipDelta / bookWidth;
          if (posForward > 1 || this.flipDelta < 0) {
            return;
          }
          if (!this.currentLeaf) {
            if (this.isClosedInverted) {
              return;
            } else {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- when `!this.isClosedInverted` there will always be a second leaf in `this.currentOrTurningLeaves`
              this.currentLeaf = this.currentOrTurningLeaves[1]!;
            }
          }
          this.currentLeaf.flipToPosition(posForward);
          break;
        case FlipDirection.Backward:
          const posBackward = 1 - Math.abs(this.flipDelta) / bookWidth;
          if (posBackward < 0 || this.flipDelta > 0) {
            return;
          }
          if (!this.currentLeaf) {
            if (this.isClosed) {
              return;
            } else {
              this.currentLeaf = this.currentOrTurningLeaves[0];
            }
          }
          this.currentLeaf.flipToPosition(posBackward);
          break;
      }
    } finally {
      this.isDuringManualFlip = false;
    }
  }

  private async onDragEnd(event: HammerInput) {
    if (!this.currentLeaf || this.isDuringAutoFlip) {
      this.flipDirection = FlipDirection.None;
      this.flipStartingPos = 0;
      return;
    }
    const ppsX = event.velocityX * 1000; // pixels per second
    let flipTo: number;
    switch (this.flipDirection) {
      case FlipDirection.Forward:
        if (
          (this.isLTR ? ppsX < -FAST_DELTA : ppsX > FAST_DELTA) ||
          this.currentLeaf.flipPosition >= 0.5
        ) {
          flipTo = 1;
        } else {
          flipTo = 0;
        }
        break;
      case FlipDirection.Backward:
        if (
          (this.isLTR ? ppsX > FAST_DELTA : ppsX < -FAST_DELTA) ||
          this.currentLeaf.flipPosition <= 0.5
        ) {
          flipTo = 0;
        } else {
          flipTo = 1;
        }
        break;
      default:
        return;
    }

    this.isDuringAutoFlip = true;
    this.flipDirection = FlipDirection.None;
    this.flipStartingPos = 0;
    await this.currentLeaf.flipToPosition(flipTo);
    this.isDuringAutoFlip = false;
    this.currentLeaf = undefined;
  }

  jumpToPage(pageIndex: number) {
    if (this.onPageChanged) {
      this.onPageChanged(pageIndex);
    }
  }
}

export { FlipBook, PageSemantics };
