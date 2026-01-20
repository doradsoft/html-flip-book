import { describe, expect, it } from 'vitest'
import { type AspectRatio, AspectRatioImpl } from '../aspect-ratio'

describe('AspectRatio', () => {
  describe('AspectRatioImpl', () => {
    it('should create an aspect ratio with width and height', () => {
      const ar = new AspectRatioImpl(16, 9)
      expect(ar.width).toBe(16)
      expect(ar.height).toBe(9)
    })

    it('should calculate the aspect ratio value correctly', () => {
      const ar = new AspectRatioImpl(16, 9)
      expect(ar.value).toBeCloseTo(16 / 9)
    })

    it('should handle 1:1 aspect ratio', () => {
      const ar = new AspectRatioImpl(1, 1)
      expect(ar.value).toBe(1)
    })

    it('should handle portrait aspect ratio', () => {
      const ar = new AspectRatioImpl(9, 16)
      expect(ar.value).toBeCloseTo(9 / 16)
    })

    describe('from', () => {
      it('should create AspectRatioImpl from AspectRatio interface', () => {
        const input: AspectRatio = { width: 4, height: 3 }
        const ar = AspectRatioImpl.from(input)
        expect(ar).toBeInstanceOf(AspectRatioImpl)
        expect(ar.width).toBe(4)
        expect(ar.height).toBe(3)
        expect(ar.value).toBeCloseTo(4 / 3)
      })
    })
  })
})
