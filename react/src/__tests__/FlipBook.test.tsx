import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { FlipBook } from '../FlipBook'

const mocked = vi.hoisted(() => ({
  instances: [] as Array<{
    render: ReturnType<typeof vi.fn>
    bookElement: HTMLElement | null
    options: Record<string, unknown>
  }>,
  MockFlipBook: class {
    render = vi.fn()
    bookElement: HTMLElement | null = null
    options: Record<string, unknown>

    constructor(options: Record<string, unknown>) {
      this.options = options
      mocked.instances.push(this)
    }
  }
}))

// Mock the base FlipBook
vi.mock('html-flip-book-base', () => ({
  FlipBook: mocked.MockFlipBook
}))

describe('FlipBook React Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocked.instances.length = 0
  })

  it('should render pages correctly', () => {
    const pages = [
      <div key="1">Page 1</div>,
      <div key="2">Page 2</div>,
      <div key="3">Page 3</div>
    ]

    render(<FlipBook pages={pages} className="test-flipbook" />)

    expect(screen.getByText('Page 1')).toBeTruthy()
    expect(screen.getByText('Page 2')).toBeTruthy()
    expect(screen.getByText('Page 3')).toBeTruthy()
  })

  it('should apply className to container', () => {
    const pages = [<div key="1">Page 1</div>]

    const { container } = render(
      <FlipBook pages={pages} className="my-flipbook" />
    )

    expect(container.querySelector('.my-flipbook')).toBeTruthy()
  })

  it('should wrap each page in a div with page class', () => {
    const pages = [<div key="1">Page 1</div>, <div key="2">Page 2</div>]

    const { container } = render(
      <FlipBook pages={pages} className="test-flipbook" />
    )

    const pageElements = container.querySelectorAll('.page')
    expect(pageElements.length).toBe(2)
  })

  it('should call FlipBook.render on mount', async () => {
    const pages = [<div key="1">Page 1</div>]

    render(<FlipBook pages={pages} className="test-flipbook" />)

    expect(mocked.instances[0].render).toHaveBeenCalledWith(
      '.test-flipbook',
      false
    )
  })

  it('should pass debug prop to render', async () => {
    const pages = [<div key="1">Page 1</div>]

    render(<FlipBook pages={pages} className="test-flipbook" debug={true} />)

    expect(mocked.instances[0].render).toHaveBeenCalledWith(
      '.test-flipbook',
      true
    )
  })

  it('should pass direction to FlipBook constructor', async () => {
    const pages = [<div key="1">Page 1</div>]

    render(<FlipBook pages={pages} className="test-flipbook" direction="rtl" />)

    expect(mocked.instances[0].options.direction).toBe('rtl')
  })

  it('should handle empty pages array', () => {
    const { container } = render(
      <FlipBook pages={[]} className="test-flipbook" />
    )

    const pageElements = container.querySelectorAll('.page')
    expect(pageElements.length).toBe(0)
  })

  it('should handle many pages', () => {
    const pages = Array.from({ length: 100 }, (_, i) => (
      <div key={i}>Page {i + 1}</div>
    ))

    const { container } = render(
      <FlipBook pages={pages} className="test-flipbook" />
    )

    const pageElements = container.querySelectorAll('.page')
    expect(pageElements.length).toBe(100)
  })

  it('should pass pageSemantics to FlipBook constructor', async () => {
    const pageSemantics = {
      indexToSemanticName: vi.fn(),
      indexToTitle: vi.fn()
    }

    const pages = [<div key="1">Page 1</div>]

    render(
      <FlipBook
        pages={pages}
        className="test-flipbook"
        pageSemantics={pageSemantics}
      />
    )

    expect(mocked.instances[0].options.pageSemantics).toBe(pageSemantics)
  })

  it('should create FlipBook with correct pagesCount', async () => {
    const pages = [
      <div key="1">Page 1</div>,
      <div key="2">Page 2</div>,
      <div key="3">Page 3</div>
    ]

    render(<FlipBook pages={pages} className="test-flipbook" />)

    expect(mocked.instances[0].options.pagesCount).toBe(3)
  })
})
