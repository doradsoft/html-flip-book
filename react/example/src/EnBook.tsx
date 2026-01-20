// EnBook.tsx

import { FlipBook } from 'html-flip-book-react'
import { type ReactElement, useEffect, useState } from 'react'
import Markdown from 'react-markdown'

const markdownFiles = import.meta.glob('/assets/pages_data/en/content/*.md')

interface MarkdownModule {
  default: string
}

export const EnBook = () => {
  const [enPages, setEnPages] = useState<ReactElement[]>([])

  useEffect(() => {
    const loadMarkdownFiles = async () => {
      const files = await Promise.all(
        Object.entries(markdownFiles).map(async ([path, resolver]) => {
          const content = await resolver()
          assertIsMarkdownModule(content)
          return {
            path,
            content: content.default,
          }
        })
      )
      const pages = files
        // To avoid having an empty page at the end
        .concat([{ path: '', content: '' }])
        .map(({ content }, index) => (
          <div key={index} className="en-page">
            <Markdown>{content}</Markdown>
          </div>
        ))

      setEnPages(pages)
    }

    loadMarkdownFiles()
  }, [assertIsMarkdownModule])

  function assertIsMarkdownModule(module: unknown): asserts module is MarkdownModule {
    if (typeof (module as MarkdownModule).default !== 'string') {
      throw new Error('Invalid markdown module')
    }
  }

  return enPages.length ? <FlipBook className="en-book" pages={enPages} debug={true} /> : null
}

export default EnBook
