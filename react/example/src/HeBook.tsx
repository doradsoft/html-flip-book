// HeBook.tsx
import { FlipBook, type PageSemantics } from 'html-flip-book-react'

const hePages = Array.from({ length: 10 }, (_, index) => (
  <div key={index}>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  </div>
))

const hePageSemanticsDict: Record<number, string> = {
  4: 'א',
  5: 'ב',
  6: 'ג',
}

const hePageSemantics: PageSemantics = {
  indexToSemanticName(pageIndex: number): string {
    return hePageSemanticsDict[pageIndex] ?? ''
  },
  semanticNameToIndex(semanticPageName: string): number | null {
    const entry = Object.entries(hePageSemanticsDict).find(
      ([, value]) => value === semanticPageName
    )
    return entry ? parseInt(entry[0], 10) : null
  },
  indexToTitle(pageIndex: number): string {
    const chapter = hePageSemanticsDict[pageIndex]
    return chapter ? `פרק ${chapter}` : ''
  },
}

export const HeBook = () => {
  return (
    <FlipBook
      className="he-book"
      pages={hePages}
      pageSemantics={hePageSemantics}
      debug={true}
      direction="rtl"
    />
  )
}

export default HeBook
