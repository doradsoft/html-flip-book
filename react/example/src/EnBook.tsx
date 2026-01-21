// EnBook.tsx

import { FlipBook } from 'html-flip-book-react'
import { type ReactElement, useEffect, useMemo, useState } from 'react'
import Markdown from 'react-markdown'

const markdownFiles = import.meta.glob('/assets/pages_data/en/content/*.md')

interface MarkdownModule {
  default: string
}

function assertIsMarkdownModule(module: unknown): asserts module is MarkdownModule {
  if (typeof (module as MarkdownModule).default !== 'string') {
    throw new Error('Invalid markdown module')
  }
}

/** Parse URL parameters for test configuration */
function useTestParams() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const initialTurnedLeaves = params.get('initialTurnedLeaves')
    const fastDeltaThreshold = params.get('fastDeltaThreshold')

    return {
      initialTurnedLeaves: initialTurnedLeaves
        ? initialTurnedLeaves
            .split(',')
            .map(Number)
            .filter((n) => !Number.isNaN(n))
        : undefined,
      fastDeltaThreshold: fastDeltaThreshold ? Number(fastDeltaThreshold) : undefined,
    }
  }, [])
}

export const EnBook = () => {
  const [enPages, setEnPages] = useState<ReactElement[]>([])
  const testParams = useTestParams()

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
        .map(({ path, content }) => (
          <div key={path || 'empty-page'} className="en-page">
            <Markdown>{content}</Markdown>
          </div>
        ))

      setEnPages(pages)
    }

    loadMarkdownFiles()
  }, [])

  return enPages.length ? (
    <FlipBook
      className="en-book"
      pages={enPages}
      debug={true}
      initialTurnedLeaves={testParams.initialTurnedLeaves}
      fastDeltaThreshold={testParams.fastDeltaThreshold}
    />
  ) : null
}

export default EnBook
