import { jsx as r } from "react/jsx-runtime";
import { useRef as c, useEffect as m } from "react";
import { FlipBook as s } from "html-flip-book-base";
const k = ({
  pages: o,
  className: e,
  debug: t = !1,
  direction: i = "ltr",
  // Add the direction prop
  pageSemantics: n = void 0
}) => {
  const p = c(
    new s({
      pageSemantics: n,
      pagesCount: o.length,
      direction: i
    })
  );
  return m(() => {
    p.current.render(`.${e}`, t);
  }, []), /* @__PURE__ */ r("div", { className: e, children: o.map((l, f) => /* @__PURE__ */ r("div", { className: "page", children: l }, f)) });
};
export {
  k as FlipBook
};
//# sourceMappingURL=flip-book.js.map
