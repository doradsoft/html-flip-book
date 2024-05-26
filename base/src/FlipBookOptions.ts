import { PageSemantics } from "./page-semantics";
import { AspectRatio } from "./AspectRatio";

export interface FlipBookOptions {
  totalPages: number;
  leafAspectRatio?: AspectRatio;
  coverAspectRatio?: AspectRatio;
  direction?: "rtl" | "ltr";
  padding?: number;
  pageSemantics: PageSemantics;
  onPageChanged?: (pageIndex: number) => void;
}
