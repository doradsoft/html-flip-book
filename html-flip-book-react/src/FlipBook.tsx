import React, { useEffect, useRef } from 'react'
import { FlipBook as FlipBookBase, PageSemantics } from 'html-flip-book-base'

interface FlipBookWrapperProps {
  pages: React.ReactNode[]
  className: string
  pageSemantics?: PageSemantics
  debug?: boolean
  direction?: 'rtl' | 'ltr' // Add the direction property to the interface
  // Add any other props that the wrapper might need
}

const FlipBookReact: React.FC<FlipBookWrapperProps> = ({
  pages,
  className,
  debug = false,
  direction = 'ltr', // Add the direction prop
  pageSemantics = undefined
}) => {
  const flipBook = useRef(
    new FlipBookBase({
      pageSemantics: pageSemantics,
      pagesCount: pages.length,
      direction: direction
    })
  )

  useEffect(() => {
    flipBook.current.render(`.${className}`, debug)
    // Do any other necessary setup here
  }, [])

  return (
    <div className={className}>
      {pages.map((page, index) => (
        <div key={index} className="page">
          {page}
        </div>
      ))}
    </div>
  )
}

export { FlipBookReact as FlipBook }
export type { PageSemantics }
