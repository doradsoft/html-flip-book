import k from 'hammerjs'
import { throttle as A } from 'throttle-debounce'

var a = /* @__PURE__ */ ((u) => (
  (u.Forward = 'Forward'), (u.Backward = 'Backward'), (u.None = 'None'), u
))(a || {})
const R = !1
class S {
  constructor(t, i, e, s, f) {
    ;(this.index = t),
      (this.pages = i),
      (this.bookProperties = s),
      (this.onTurned = f),
      (this.wrappedFlipPosition = e ? 1 : 0)
  }
  currentAnimation = null
  targetFlipPosition = null
  wrappedFlipPosition
  get isTurned() {
    return this.flipPosition === 1
  }
  get isTurning() {
    return this.flipPosition !== 0
  }
  get isCover() {
    return this.isFirst || this.isLast
  }
  get isFirst() {
    return this.index === 0
  }
  get isLast() {
    return this.index === this.bookProperties.leavesCount - 1
  }
  set flipPosition(t) {
    this.wrappedFlipPosition = Math.max(0, Math.min(1, t))
  }
  get flipPosition() {
    return this.wrappedFlipPosition
  }
  async flipToPosition(t, i = 225) {
    return (
      this.currentAnimation && (await this.currentAnimation),
      this.flipPosition === t
        ? Promise.resolve()
        : this.targetFlipPosition === t
          ? (this.currentAnimation ?? Promise.resolve())
          : ((this.targetFlipPosition = t),
            (this.currentAnimation = new Promise((e) => {
              const s = this.flipPosition,
                b = ((Math.abs(t - s) * 180) / i) * 1e3,
                v = performance.now(),
                l = (p) => {
                  const o = p - v
                  if (o < 0) {
                    requestAnimationFrame(l)
                    return
                  }
                  const r = Math.min(o / b, 1),
                    n = s + r * (t - s)
                  this.pages.forEach((c, w) => {
                    const h = this.bookProperties.isLTR
                    if (c) {
                      const d = (w % 2) + 1 === 1,
                        L = `${d ? (h ? (n > 0.5 ? 180 - n * 180 : -n * 180) : n > 0.5 ? -(180 - n * 180) : n * 180) : h ? (n < 0.5 ? -n * 180 : 180 - n * 180) : n < 0.5 ? n * 180 : -(180 - n * 180)}deg`,
                        F = `${d ? (h ? '100%' : '-100%') : '0px'}`,
                        D = d ? (n > 0.5 ? -1 : 1) : n < 0.5 ? -1 : 1
                      ;(c.style.transform = `translateX(${F})rotateY(${L})scaleX(${D})`),
                        (c.style.transformOrigin = d
                          ? `${h ? 'left' : 'right'}`
                          : `${h ? 'right' : 'left'}`),
                        (c.style.zIndex = `${n > 0.5 ? c.dataset.pageIndex : this.bookProperties.pagesCount - c.dataset.pageIndex}`)
                    }
                  }),
                    (this.flipPosition = Math.max(0, Math.min(1, n))),
                    (this.flipPosition === 1 || this.flipPosition === 0) &&
                      this.onTurned(this.flipPosition === 1 ? a.Forward : a.Backward),
                    r < 1
                      ? requestAnimationFrame(l)
                      : ((this.currentAnimation = null), (this.targetFlipPosition = null), e())
                }
              requestAnimationFrame(l)
            })),
            this.currentAnimation)
    )
  }
  async efficientFlipToPosition(t, i = 2e4) {
    return A(1, this.flipToPosition.bind(this))(t, i)
  }
}
class P {
  constructor(t, i) {
    ;(this.width = t), (this.height = i)
  }
  static from(t) {
    return new P(t.width, t.height)
  }
  get value() {
    return this.width / this.height
  }
}
class g {
  constructor(t, i) {
    ;(this.width = t), (this.height = i), (this.aspectRatio = new P(t, i))
  }
  aspectRatio
  aspectRatioFit(t) {
    const i = P.from(t).value
    return this.aspectRatio.value > i
      ? new g(this.height * i, this.height)
      : new g(this.width, this.width / i)
  }
  get asString() {
    return `${this.width}x${this.height}`
  }
}
const m = 500
class y {
  bookElement
  pageElements = []
  pagesCount
  leafAspectRatio = { width: 2, height: 3 }
  coverAspectRatio = {
    width: 2.15,
    height: 3.15,
  }
  direction = 'ltr'
  onPageChanged
  pageSemantics
  leaves = []
  // flipping state
  currentLeaf = void 0
  flipDirection = a.None
  flipStartingPos = 0
  isDuringManualFlip = !1
  flipDelta = 0
  isDuringAutoFlip = !1
  touchStartingPos = { x: 0, y: 0 }
  prevVisiblePageIndices
  get isLTR() {
    return this.direction === 'ltr'
  }
  get isClosed() {
    return !this.currentOrTurningLeaves[0]
  }
  get isClosedInverted() {
    return !this.currentLeaves[1]
  }
  get currentLeaves() {
    let t = -1
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const e = this.leaves[i]
      if (e.isTurned) {
        t = e.index + 1
        break
      }
    }
    return t === -1
      ? [void 0, this.leaves[0]]
      : t === this.leaves.length
        ? [this.leaves[t - 1], void 0]
        : [this.leaves[t - 1], this.leaves[t]]
  }
  get currentOrTurningLeaves() {
    let t = -1
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const e = this.leaves[i]
      if (e.isTurned || e.isTurning) {
        t = e.index + 1
        break
      }
    }
    return t === -1
      ? [void 0, this.leaves[0]]
      : t === this.leaves.length
        ? [this.leaves[t - 1], void 0]
        : [this.leaves[t - 1], this.leaves[t]]
  }
  constructor(t) {
    ;(this.pagesCount = t.pagesCount),
      (this.leafAspectRatio = t.leafAspectRatio || this.leafAspectRatio),
      (this.coverAspectRatio = t.coverAspectRatio || this.coverAspectRatio),
      (this.direction = t.direction || this.direction),
      (this.pageSemantics = t.pageSemantics),
      (this.onPageChanged = t.onPageChanged)
  }
  render(t, i = !1) {
    const e = document.querySelector(t)
    if (!e) throw new Error(`Couldn't find container with selector: ${t}`)
    ;(this.bookElement = e),
      this.bookElement.classList.contains('flipbook') || this.bookElement.classList.add('flipbook')
    const s = e.querySelectorAll('.page')
    if (!s.length) throw new Error('No pages found in flipbook')
    ;(this.pageElements = Array.from(s)), this.leaves.splice(0, this.leaves.length)
    const f = Math.ceil(this.pagesCount / 2),
      v = new g(this.bookElement.clientWidth / 2, this.bookElement.clientHeight).aspectRatioFit(
        this.coverAspectRatio
      ),
      l = new g(
        (v.width * this.leafAspectRatio.width) / this.coverAspectRatio.width,
        (v.height * this.leafAspectRatio.height) / this.coverAspectRatio.height
      )
    ;(this.bookElement.style.perspective = `${Math.min(l.width * 2, l.height) * 2}px`),
      this.pageElements.forEach((o, r) => {
        ;(o.style.width = `${l.width}px`),
          (o.style.height = `${l.height}px`),
          (o.style.zIndex = `${this.pagesCount - r}`),
          (o.dataset.pageIndex = r.toString()),
          (o.style[this.isLTR ? 'left' : 'right'] = `${(e.clientWidth - 2 * l.width) / 2}px`),
          (o.style.top = `${(e.clientHeight - l.height) / 2}px`),
          (o.dataset.pageSemanticName = this.pageSemantics?.indexToSemanticName(r) ?? ''),
          (o.dataset.pageTitle = this.pageSemantics?.indexToTitle(r) ?? '')
        const n = Math.floor(r / 2),
          c = (r + 1) % 2 === 1
        o.classList.add(c ? 'odd' : 'even', ...(r === 0 ? ['current-page'] : [])),
          c
            ? ((o.style.transform = `translateX(${this.isLTR ? '' : '-'}100%)`),
              (this.leaves[n] = new S(
                n,
                [o, void 0],
                // TODO: set turned based on initialized page
                R,
                {
                  isLTR: this.isLTR,
                  leavesCount: f,
                  pagesCount: this.pagesCount,
                },
                (w) => {
                  const h =
                    w === a.Forward
                      ? r + 2 === this.pagesCount
                        ? [r + 1]
                        : [r + 1, r + 2]
                      : r === 0
                        ? [r]
                        : [r - 1, r]
                  if (
                    this.prevVisiblePageIndices &&
                    this.prevVisiblePageIndices.length === h.length &&
                    h.every((T, L) => T === this.prevVisiblePageIndices[L])
                  )
                    return
                  const d = this.prevVisiblePageIndices
                  ;(this.prevVisiblePageIndices = h), this.onTurned(h, d)
                }
              )))
            : ((o.style.transform = `scaleX(-1)translateX(${this.isLTR ? '-' : ''}100%)`),
              (this.leaves[n].pages[1] = o))
      })
    const p = new k(this.bookElement)
    p.on('panstart', this.onDragStart.bind(this)),
      p.on('panmove', this.onDragUpdate.bind(this)),
      p.on('panend', this.onDragEnd.bind(this)),
      this.bookElement.addEventListener('touchstart', this.handleTouchStart.bind(this), {
        passive: !1,
      }),
      this.bookElement.addEventListener('touchmove', this.handleTouchMove.bind(this), {
        passive: !1,
      }),
      i && this.fillDebugBar()
  }
  fillDebugBar() {
    const t = document.createElement('div')
    ;(t.className = 'flipbook-debug-bar'),
      this.bookElement?.appendChild(t),
      setInterval(() => {
        t.innerHTML = `
          <div>Direction: ${this.isLTR ? 'LTR' : 'RTL'}</div>
          <div>Current Leaf: ${this.currentLeaf ? this.currentLeaf.index : 'None'}</div>
          <div>Flip dir: ${this.flipDirection}</div>
          <div>Flip Δ: ${this.flipDelta}</div>
          <div>Current Leaf Flip Position: ${this.currentLeaf?.flipPosition.toFixed(3)}</div>
          <div>Is During Auto Flip: ${this.isDuringAutoFlip}</div>
        `
      }, 10)
  }
  onDragStart(t) {
    if ((console.log('drag start'), this.currentLeaf || this.isDuringAutoFlip)) {
      ;(this.flipDirection = a.None), (this.flipStartingPos = 0)
      return
    }
    this.flipStartingPos = t.center.x
  }
  onDragUpdate(t) {
    if ((console.log('drag update'), !(this.isDuringAutoFlip || this.isDuringManualFlip))) {
      this.isDuringManualFlip = !0
      try {
        const i = t.center.x
        this.flipDelta = this.isLTR ? this.flipStartingPos - i : i - this.flipStartingPos
        const e = this.bookElement?.clientWidth ?? 0
        if (Math.abs(this.flipDelta) > e || this.flipDelta === 0) return
        switch (
          ((this.flipDirection =
            this.flipDirection !== a.None
              ? this.flipDirection
              : this.flipDelta > 0
                ? a.Forward
                : a.Backward),
          this.flipDirection)
        ) {
          case a.Forward: {
            const s = this.flipDelta / e
            if (s > 1 || this.flipDelta < 0) return
            if (!this.currentLeaf) {
              if (this.isClosedInverted) return
              this.currentLeaf = this.currentOrTurningLeaves[1]
            }
            this.currentLeaf.efficientFlipToPosition(s)
            break
          }
          case a.Backward: {
            const s = 1 - Math.abs(this.flipDelta) / e
            if (s < 0 || this.flipDelta > 0) return
            if (!this.currentLeaf) {
              if (this.isClosed) return
              this.currentLeaf = this.currentOrTurningLeaves[0]
            }
            this.currentLeaf.efficientFlipToPosition(s)
            break
          }
        }
      } finally {
        this.isDuringManualFlip = !1
      }
    }
  }
  async onDragEnd(t) {
    if ((console.log('drag end'), !this.currentLeaf || this.isDuringAutoFlip)) {
      ;(this.flipDirection = a.None), (this.flipStartingPos = 0)
      return
    }
    const i = t.velocityX * 1e3
    let e
    switch (this.flipDirection) {
      case a.Forward:
        ;(this.isLTR ? i < -m : i > m) || this.currentLeaf.flipPosition >= 0.5 ? (e = 1) : (e = 0)
        break
      case a.Backward:
        ;(this.isLTR ? i > m : i < -m) || this.currentLeaf.flipPosition <= 0.5 ? (e = 0) : (e = 1)
        break
      default:
        return
    }
    ;(this.isDuringAutoFlip = !0),
      (this.flipDirection = a.None),
      (this.flipStartingPos = 0),
      await this.currentLeaf.flipToPosition(e),
      (this.isDuringAutoFlip = !1),
      (this.currentLeaf = void 0)
  }
  handleTouchStart = (t) => {
    if (t.touches.length > 1) return
    const i = t.touches[0]
    this.touchStartingPos = { x: i.pageX, y: i.pageY }
  }
  handleTouchMove = (t) => {
    if (t.touches.length > 1) return
    const i = t.touches[0],
      e = i.pageX - this.touchStartingPos.x,
      s = i.pageY - this.touchStartingPos.y
    Math.abs(e) > Math.abs(s) && t.preventDefault()
  }
  onTurned(t, i) {
    for (let e = 0; e < this.pageElements.length; e++) {
      const s = this.pageElements[e]
      ;(t.includes(e) ? s.classList.add : !i || !i.includes ? () => null : s.classList.remove).bind(
        s.classList
      )('current-page')
    }
  }
  jumpToPage(t) {
    this.onPageChanged?.(t)
  }
}
export { y as FlipBook }
//# sourceMappingURL=flipbook.js.map
