export interface PageSemantics {
  indexToSemanticName: (pageIndex: number) => string
  indexToTitle: (pageIndex: number) => string
  semanticNameToIndex: (semanticPageName: string) => number | null
}
