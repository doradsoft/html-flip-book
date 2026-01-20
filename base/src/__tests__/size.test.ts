import { describe, expect, it } from 'vitest'
import { Size } from '../size'

describe('Size', () => {
  describe('constructor', () => {
    it('should create a size with width and height', () => {
      const size = new Size(100, 200)
      expect(size.width).toBe(100)
      expect(size.height).toBe(200)
    })

    it('should calculate aspect ratio on construction', () => {
      const size = new Size(16, 9)
      expect(size.aspectRatio.value).toBeCloseTo(16 / 9)
    })
  })

  describe('asString', () => {
    it('should return width x height format', () => {
      const size = new Size(1920, 1080)
      expect(size.asString).toBe('1920x1080')
    })
  })

  describe('aspectRatioFit', () => {
    it('should fit a wider container to target aspect ratio (height constrained)', () => {
      // Container is 1600x900 (16:9 = 1.78), target is 4:3 (1.33)
      // Container AR > Target AR, so we fit by height
      const container = new Size(1600, 900)
      const fitted = container.aspectRatioFit({ width: 4, height: 3 })

      // Height stays 900, width becomes 900 * (4/3) = 1200
      expect(fitted.height).toBe(900)
      expect(fitted.width).toBeCloseTo(1200)
    })

    it('should fit a taller container to target aspect ratio (width constrained)', () => {
      // Container is 800x900 (0.89), target is 16:9 (1.78)
      // Container AR < Target AR, so we fit by width
      const container = new Size(800, 900)
      const fitted = container.aspectRatioFit({ width: 16, height: 9 })

      // Width stays 800, height becomes 800 / (16/9) = 450
      expect(fitted.width).toBe(800)
      expect(fitted.height).toBeCloseTo(450)
    })

    it('should return same dimensions for matching aspect ratio', () => {
      const container = new Size(1600, 900)
      const fitted = container.aspectRatioFit({ width: 16, height: 9 })

      expect(fitted.width).toBeCloseTo(1600)
      expect(fitted.height).toBeCloseTo(900)
    })

    it('should handle 1:1 target aspect ratio', () => {
      const container = new Size(1920, 1080)
      const fitted = container.aspectRatioFit({ width: 1, height: 1 })

      // Should be constrained by the smaller dimension (height)
      expect(fitted.width).toBe(1080)
      expect(fitted.height).toBe(1080)
    })

    it('should handle portrait container with landscape target', () => {
      const container = new Size(600, 800)
      const fitted = container.aspectRatioFit({ width: 16, height: 9 })

      // Width is constraining
      expect(fitted.width).toBe(600)
      expect(fitted.height).toBeCloseTo(337.5)
    })
  })
})
