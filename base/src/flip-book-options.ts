import { PageSemantics } from "./page-semantics";
import { AspectRatio } from "./aspect-ratio";

export interface FlipBookOptions {
  pagesCount: number;
  leafAspectRatio?: AspectRatio;
  coverAspectRatio?: AspectRatio;
  direction?: "rtl" | "ltr";
  padding?: number;
  pageSemantics?: PageSemantics;
  onPageChanged?: (pageIndex: number) => void;
}
