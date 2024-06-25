// EnBook.tsx
import { useEffect, useState } from 'react'
import { FlipBook } from 'html-flip-book-react'
import Markdown from 'react-markdown'

const markdownFiles = import.meta.glob('/assets/pages_data/en/content/*.md')

interface MarkdownModule {
  default: string
}

export const EnBook = () => {
  const [enPages, setEnPages] = useState<JSX.Element[]>([])

  useEffect(() => {
    const loadMarkdownFiles = async () => {
      const files = await Promise.all(
        Object.entries(markdownFiles).map(async ([path, resolver]) => {
          const content = await resolver()
          assertIsMarkdownModule(content)
          return {
            path,
            content: content.default
          }
        })
      )
      const pages = files.map(({ content }, index) => (
        <div key={index} className="en-page">
          <Markdown>{content}</Markdown>
        </div>
      ))

      setEnPages(pages)
    }

    loadMarkdownFiles()
  }, [])

  function assertIsMarkdownModule(
    module: unknown
  ): asserts module is MarkdownModule {
    if (typeof (module as MarkdownModule).default !== 'string') {
      throw new Error('Invalid markdown module')
    }
  }

  return enPages.length ? (
    <FlipBook className="en-book" pages={enPages} debug={true} />
  ) : null
}

export default EnBook
