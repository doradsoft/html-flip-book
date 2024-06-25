var nn = Object.defineProperty;
var rn = (d, r, s) => r in d ? nn(d, r, { enumerable: !0, configurable: !0, writable: !0, value: s }) : d[r] = s;
var x = (d, r, s) => rn(d, typeof r != "symbol" ? r + "" : r, s);
import on, { useRef as sn, useEffect as an } from "react";
var Ee = { exports: {} }, Vt = {};
var je;
function un() {
  if (je) return Vt;
  je = 1;
  var d = Symbol.for("react.transitional.element"), r = Symbol.for("react.fragment");
  function s(u, h, v) {
    var f = null;
    if (v !== void 0 && (f = "" + v), h.key !== void 0 && (f = "" + h.key), "key" in h) {
      v = {};
      for (var c in h)
        c !== "key" && (v[c] = h[c]);
    } else v = h;
    return h = v.ref, {
      $$typeof: d,
      type: u,
      key: f,
      ref: h !== void 0 ? h : null,
      props: v
    };
  }
  return Vt.Fragment = r, Vt.jsx = s, Vt.jsxs = s, Vt;
}
var Bt = {};
var Ye;
function cn() {
  return Ye || (Ye = 1, process.env.NODE_ENV !== "production" && function() {
    function d(n) {
      for (var l = arguments.length, p = Array(1 < l ? l - 1 : 0), T = 1; T < l; T++)
        p[T - 1] = arguments[T];
      l = n, T = Error("react-stack-top-frame"), B.getCurrentStack && (T = B.getCurrentStack(T), T !== "" && (l += "%s", p = p.concat([T]))), p.unshift(l), Function.prototype.apply.call(console.error, console, p);
    }
    function r(n) {
      if (n == null) return null;
      if (typeof n == "function")
        return n.$$typeof === ce ? null : n.displayName || n.name || null;
      if (typeof n == "string") return n;
      switch (n) {
        case at:
          return "Fragment";
        case rt:
          return "Portal";
        case Pt:
          return "Profiler";
        case At:
          return "StrictMode";
        case st:
          return "Suspense";
        case ft:
          return "SuspenseList";
      }
      if (typeof n == "object")
        switch (typeof n.tag == "number" && d(
          "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
        ), n.$$typeof) {
          case ot:
            return (n.displayName || "Context") + ".Provider";
          case Yt:
            return (n._context.displayName || "Context") + ".Consumer";
          case ht:
            var l = n.render;
            return n = n.displayName, n || (n = l.displayName || l.name || "", n = n !== "" ? "ForwardRef(" + n + ")" : "ForwardRef"), n;
          case Nt:
            return l = n.displayName || null, l !== null ? l : r(n.type) || "Memo";
          case pt:
            l = n._payload, n = n._init;
            try {
              return r(n(l));
            } catch {
            }
        }
      return null;
    }
    function s(n) {
      return "" + n;
    }
    function u(n) {
      try {
        s(n);
        var l = !1;
      } catch {
        l = !0;
      }
      if (l)
        return l = typeof Symbol == "function" && Symbol.toStringTag && n[Symbol.toStringTag] || n.constructor.name || "Object", d(
          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
          l
        ), s(n);
    }
    function h() {
    }
    function v() {
      if (N === 0) {
        _ = console.log, j = console.info, xt = console.warn, dt = console.error, vt = console.group, gt = console.groupCollapsed, mt = console.groupEnd;
        var n = {
          configurable: !0,
          enumerable: !0,
          value: h,
          writable: !0
        };
        Object.defineProperties(console, {
          info: n,
          log: n,
          warn: n,
          error: n,
          group: n,
          groupCollapsed: n,
          groupEnd: n
        });
      }
      N++;
    }
    function f() {
      if (N--, N === 0) {
        var n = { configurable: !0, enumerable: !0, writable: !0 };
        Object.defineProperties(console, {
          log: H({}, n, { value: _ }),
          info: H({}, n, { value: j }),
          warn: H({}, n, { value: xt }),
          error: H({}, n, { value: dt }),
          group: H({}, n, { value: vt }),
          groupCollapsed: H({}, n, { value: gt }),
          groupEnd: H({}, n, { value: mt })
        });
      }
      0 > N && d(
        "disabledDepth fell below zero. This is a bug in React. Please file an issue."
      );
    }
    function c(n) {
      if (q === void 0)
        try {
          throw Error();
        } catch (p) {
          var l = p.stack.trim().match(/\n( *(at )?)/);
          q = l && l[1] || "";
        }
      return `
` + q + n;
    }
    function E(n, l) {
      if (!n || J) return "";
      var p = Mt.get(n);
      if (p !== void 0) return p;
      J = !0, p = Error.prepareStackTrace, Error.prepareStackTrace = void 0;
      var T = null;
      T = B.H, B.H = null, v();
      var M = {
        DetermineComponentFrameRoot: function() {
          try {
            if (l) {
              var Q = function() {
                throw Error();
              };
              if (Object.defineProperty(Q.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(Q, []);
                } catch (K) {
                  var Et = K;
                }
                Reflect.construct(n, [], Q);
              } else {
                try {
                  Q.call();
                } catch (K) {
                  Et = K;
                }
                n.call(Q.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (K) {
                Et = K;
              }
              (Q = n()) && typeof Q.catch == "function" && Q.catch(function() {
              });
            }
          } catch (K) {
            if (K && Et && typeof K.stack == "string")
              return [K.stack, Et.stack];
          }
          return [null, null];
        }
      };
      M.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var Tt = Object.getOwnPropertyDescriptor(
        M.DetermineComponentFrameRoot,
        "name"
      );
      Tt && Tt.configurable && Object.defineProperty(
        M.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      try {
        var m = M.DetermineComponentFrameRoot(), S = m[0], Z = m[1];
        if (S && Z) {
          var Y = S.split(`
`), ut = Z.split(`
`);
          for (S = m = 0; m < Y.length && !Y[m].includes(
            "DetermineComponentFrameRoot"
          ); )
            m++;
          for (; S < ut.length && !ut[S].includes("DetermineComponentFrameRoot"); )
            S++;
          if (m === Y.length || S === ut.length)
            for (m = Y.length - 1, S = ut.length - 1; 1 <= m && 0 <= S && Y[m] !== ut[S]; )
              S--;
          for (; 1 <= m && 0 <= S; m--, S--)
            if (Y[m] !== ut[S]) {
              if (m !== 1 || S !== 1)
                do
                  if (m--, S--, 0 > S || Y[m] !== ut[S]) {
                    var yt = `
` + Y[m].replace(
                      " at new ",
                      " at "
                    );
                    return n.displayName && yt.includes("<anonymous>") && (yt = yt.replace("<anonymous>", n.displayName)), typeof n == "function" && Mt.set(n, yt), yt;
                  }
                while (1 <= m && 0 <= S);
              break;
            }
        }
      } finally {
        J = !1, B.H = T, f(), Error.prepareStackTrace = p;
      }
      return Y = (Y = n ? n.displayName || n.name : "") ? c(Y) : "", typeof n == "function" && Mt.set(n, Y), Y;
    }
    function y(n) {
      if (n == null) return "";
      if (typeof n == "function") {
        var l = n.prototype;
        return E(
          n,
          !(!l || !l.isReactComponent)
        );
      }
      if (typeof n == "string") return c(n);
      switch (n) {
        case st:
          return c("Suspense");
        case ft:
          return c("SuspenseList");
      }
      if (typeof n == "object")
        switch (n.$$typeof) {
          case ht:
            return n = E(n.render, !1), n;
          case Nt:
            return y(n.type);
          case pt:
            l = n._payload, n = n._init;
            try {
              return y(n(l));
            } catch {
            }
        }
      return "";
    }
    function P() {
      var n = B.A;
      return n === null ? null : n.getOwner();
    }
    function w(n) {
      if (Xt.call(n, "ref")) {
        var l = Object.getOwnPropertyDescriptor(n, "ref").get;
        if (l && l.isReactWarning) return !1;
      }
      return n.ref !== void 0;
    }
    function g(n) {
      if (Xt.call(n, "key")) {
        var l = Object.getOwnPropertyDescriptor(n, "key").get;
        if (l && l.isReactWarning) return !1;
      }
      return n.key !== void 0;
    }
    function C(n, l) {
      function p() {
        Rt || (Rt = !0, d(
          "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
          l
        ));
      }
      p.isReactWarning = !0, Object.defineProperty(n, "key", {
        get: p,
        configurable: !0
      });
    }
    function O() {
      var n = r(this.type);
      return W[n] || (W[n] = !0, d(
        "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
      )), n = this.props.ref, n !== void 0 ? n : null;
    }
    function k(n, l, p, T, M, Tt, m) {
      return p = m.ref, n = {
        $$typeof: it,
        type: n,
        key: l,
        props: m,
        _owner: Tt
      }, (p !== void 0 ? p : null) !== null ? Object.defineProperty(n, "ref", {
        enumerable: !1,
        get: O
      }) : Object.defineProperty(n, "ref", { enumerable: !1, value: null }), n._store = {}, Object.defineProperty(n._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: 0
      }), Object.defineProperty(n, "_debugInfo", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: null
      }), Object.freeze && (Object.freeze(n.props), Object.freeze(n)), n;
    }
    function X(n, l, p, T, M, Tt) {
      if (typeof n == "string" || typeof n == "function" || n === at || n === Pt || n === At || n === st || n === ft || n === ue || typeof n == "object" && n !== null && (n.$$typeof === pt || n.$$typeof === Nt || n.$$typeof === ot || n.$$typeof === Yt || n.$$typeof === ht || n.$$typeof === $t || n.getModuleId !== void 0)) {
        var m = l.children;
        if (m !== void 0)
          if (T)
            if (Wt(m)) {
              for (T = 0; T < m.length; T++)
                I(m[T], n);
              Object.freeze && Object.freeze(m);
            } else
              d(
                "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
              );
          else I(m, n);
      } else
        m = "", (n === void 0 || typeof n == "object" && n !== null && Object.keys(n).length === 0) && (m += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports."), n === null ? T = "null" : Wt(n) ? T = "array" : n !== void 0 && n.$$typeof === it ? (T = "<" + (r(n.type) || "Unknown") + " />", m = " Did you accidentally export a JSX literal instead of a component?") : T = typeof n, d(
          "React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s",
          T,
          m
        );
      if (Xt.call(l, "key")) {
        m = r(n);
        var S = Object.keys(l).filter(function(Y) {
          return Y !== "key";
        });
        T = 0 < S.length ? "{key: someKey, " + S.join(": ..., ") + ": ...}" : "{key: someKey}", Zt[m + T] || (S = 0 < S.length ? "{" + S.join(": ..., ") + ": ...}" : "{}", d(
          `A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`,
          T,
          m,
          S,
          m
        ), Zt[m + T] = !0);
      }
      if (m = null, p !== void 0 && (u(p), m = "" + p), g(l) && (u(l.key), m = "" + l.key), w(l), "key" in l) {
        p = {};
        for (var Z in l)
          Z !== "key" && (p[Z] = l[Z]);
      } else p = l;
      return m && (l = typeof n == "function" ? n.displayName || n.name || "Unknown" : n, m && C(p, l)), k(
        n,
        m,
        null,
        Tt,
        M,
        P(),
        p
      );
    }
    function I(n, l) {
      if (typeof n == "object" && n && n.$$typeof !== Jt) {
        if (Wt(n))
          for (var p = 0; p < n.length; p++) {
            var T = n[p];
            U(T) && G(T, l);
          }
        else if (U(n))
          n._store && (n._store.validated = 1);
        else if (n === null || typeof n != "object" ? p = null : (p = zt && n[zt] || n["@@iterator"], p = typeof p == "function" ? p : null), typeof p == "function" && p !== n.entries && (p = p.call(n), p !== n))
          for (; !(n = p.next()).done; )
            U(n.value) && G(n.value, l);
      }
    }
    function U(n) {
      return typeof n == "object" && n !== null && n.$$typeof === it;
    }
    function G(n, l) {
      if (n._store && !n._store.validated && n.key == null && (n._store.validated = 1, l = nt(l), !qt[l])) {
        qt[l] = !0;
        var p = "";
        n && n._owner != null && n._owner !== P() && (p = null, typeof n._owner.tag == "number" ? p = r(n._owner.type) : typeof n._owner.name == "string" && (p = n._owner.name), p = " It was passed a child from " + p + ".");
        var T = B.getCurrentStack;
        B.getCurrentStack = function() {
          var M = y(n.type);
          return T && (M += T() || ""), M;
        }, d(
          'Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.',
          l,
          p
        ), B.getCurrentStack = T;
      }
    }
    function nt(n) {
      var l = "", p = P();
      return p && (p = r(p.type)) && (l = `

Check the render method of \`` + p + "`."), l || (n = r(n)) && (l = `

Check the top-level render call using <` + n + ">."), l;
    }
    var L = on, it = Symbol.for("react.transitional.element"), rt = Symbol.for("react.portal"), at = Symbol.for("react.fragment"), At = Symbol.for("react.strict_mode"), Pt = Symbol.for("react.profiler"), Yt = Symbol.for("react.consumer"), ot = Symbol.for("react.context"), ht = Symbol.for("react.forward_ref"), st = Symbol.for("react.suspense"), ft = Symbol.for("react.suspense_list"), Nt = Symbol.for("react.memo"), pt = Symbol.for("react.lazy"), ue = Symbol.for("react.offscreen"), zt = Symbol.iterator, B = L.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ce = Symbol.for("react.client.reference"), Xt = Object.prototype.hasOwnProperty, H = Object.assign, $t = Symbol.for("react.client.reference"), Wt = Array.isArray, N = 0, _, j, xt, dt, vt, gt, mt;
    h.__reactDisabledLog = !0;
    var q, J = !1, Mt = new (typeof WeakMap == "function" ? WeakMap : Map)(), Jt = Symbol.for("react.client.reference"), Rt, W = {}, Zt = {}, qt = {};
    Bt.Fragment = at, Bt.jsx = function(n, l, p, T, M) {
      return X(n, l, p, !1, T, M);
    }, Bt.jsxs = function(n, l, p, T, M) {
      return X(n, l, p, !0, T, M);
    };
  }()), Bt;
}
process.env.NODE_ENV === "production" ? Ee.exports = un() : Ee.exports = cn();
var ze = Ee.exports;
var ln = { 168: (d, r, s) => {
  var u;
  (function(h, v, f, c) {
    var E, y = ["", "webkit", "Moz", "MS", "ms", "o"], P = v.createElement("div"), w = "function", g = Math.round, C = Math.abs, O = Date.now;
    function k(t, e, i) {
      return setTimeout(it(t, i), e);
    }
    function X(t, e, i) {
      return !!Array.isArray(t) && (I(t, i[e], i), !0);
    }
    function I(t, e, i) {
      var o;
      if (t) if (t.forEach) t.forEach(e, i);
      else if (t.length !== c) for (o = 0; o < t.length; ) e.call(i, t[o], o, t), o++;
      else for (o in t) t.hasOwnProperty(o) && e.call(i, t[o], o, t);
    }
    function U(t, e, i) {
      var o = "DEPRECATED METHOD: " + e + `
` + i + ` AT 
`;
      return function() {
        var a = new Error("get-stack-trace"), b = a && a.stack ? a.stack.replace(/^[^\(]+?[\n$]/gm, "").replace(/^\s+at\s+/gm, "").replace(/^Object.<anonymous>\s*\(/gm, "{anonymous}()@") : "Unknown Stack Trace", R = h.console && (h.console.warn || h.console.log);
        return R && R.call(h.console, o, b), t.apply(this, arguments);
      };
    }
    E = typeof Object.assign != "function" ? function(t) {
      if (t === c || t === null) throw new TypeError("Cannot convert undefined or null to object");
      for (var e = Object(t), i = 1; i < arguments.length; i++) {
        var o = arguments[i];
        if (o !== c && o !== null) for (var a in o) o.hasOwnProperty(a) && (e[a] = o[a]);
      }
      return e;
    } : Object.assign;
    var G = U(function(t, e, i) {
      for (var o = Object.keys(e), a = 0; a < o.length; ) (!i || i && t[o[a]] === c) && (t[o[a]] = e[o[a]]), a++;
      return t;
    }, "extend", "Use `assign`."), nt = U(function(t, e) {
      return G(t, e, !0);
    }, "merge", "Use `assign`.");
    function L(t, e, i) {
      var o, a = e.prototype;
      (o = t.prototype = Object.create(a)).constructor = t, o._super = a, i && E(o, i);
    }
    function it(t, e) {
      return function() {
        return t.apply(e, arguments);
      };
    }
    function rt(t, e) {
      return typeof t == w ? t.apply(e && e[0] || c, e) : t;
    }
    function at(t, e) {
      return t === c ? e : t;
    }
    function At(t, e, i) {
      I(ht(e), function(o) {
        t.addEventListener(o, i, !1);
      });
    }
    function Pt(t, e, i) {
      I(ht(e), function(o) {
        t.removeEventListener(o, i, !1);
      });
    }
    function Yt(t, e) {
      for (; t; ) {
        if (t == e) return !0;
        t = t.parentNode;
      }
      return !1;
    }
    function ot(t, e) {
      return t.indexOf(e) > -1;
    }
    function ht(t) {
      return t.trim().split(/\s+/g);
    }
    function st(t, e, i) {
      if (t.indexOf && !i) return t.indexOf(e);
      for (var o = 0; o < t.length; ) {
        if (i && t[o][i] == e || !i && t[o] === e) return o;
        o++;
      }
      return -1;
    }
    function ft(t) {
      return Array.prototype.slice.call(t, 0);
    }
    function Nt(t, e, i) {
      for (var o = [], a = [], b = 0; b < t.length; ) {
        var R = t[b][e];
        st(a, R) < 0 && o.push(t[b]), a[b] = R, b++;
      }
      return o = o.sort(function(z, A) {
        return z[e] > A[e];
      }), o;
    }
    function pt(t, e) {
      for (var i, o, a = e[0].toUpperCase() + e.slice(1), b = 0; b < y.length; ) {
        if ((o = (i = y[b]) ? i + a : e) in t) return o;
        b++;
      }
      return c;
    }
    var ue = 1;
    function zt(t) {
      var e = t.ownerDocument || t;
      return e.defaultView || e.parentWindow || h;
    }
    var B = "ontouchstart" in h, ce = pt(h, "PointerEvent") !== c, Xt = B && /mobile|tablet|ip(ad|hone|od)|android/i.test(navigator.userAgent), H = "touch", $t = "mouse", Wt = 25, N = 1, _ = 4, j = 8, xt = 1, dt = 2, vt = 4, gt = 8, mt = 16, q = dt | vt, J = gt | mt, Mt = q | J, Jt = ["x", "y"], Rt = ["clientX", "clientY"];
    function W(t, e) {
      var i = this;
      this.manager = t, this.callback = e, this.element = t.element, this.target = t.options.inputTarget, this.domHandler = function(o) {
        rt(t.options.enable, [t]) && i.handler(o);
      }, this.init();
    }
    function Zt(t, e, i) {
      var o = i.pointers.length, a = i.changedPointers.length, b = e & N && o - a == 0, R = e & (_ | j) && o - a == 0;
      i.isFirst = !!b, i.isFinal = !!R, b && (t.session = {}), i.eventType = e, function(z, A) {
        var $ = z.session, re = A.pointers, _e = re.length;
        $.firstInput || ($.firstInput = qt(A)), _e > 1 && !$.firstMultiple ? $.firstMultiple = qt(A) : _e === 1 && ($.firstMultiple = !1);
        var Oe = $.firstInput, Ft = $.firstMultiple, Ne = Ft ? Ft.center : Oe.center, Me = A.center = n(re);
        A.timeStamp = O(), A.deltaTime = A.timeStamp - Oe.timeStamp, A.angle = M(Ne, Me), A.distance = T(Ne, Me), function(et, F) {
          var bt = F.center, Dt = et.offsetDelta || {}, _t = et.prevDelta || {}, Ot = et.prevInput || {};
          F.eventType !== N && Ot.eventType !== _ || (_t = et.prevDelta = { x: Ot.deltaX || 0, y: Ot.deltaY || 0 }, Dt = et.offsetDelta = { x: bt.x, y: bt.y }), F.deltaX = _t.x + (bt.x - Dt.x), F.deltaY = _t.y + (bt.y - Dt.y);
        }($, A), A.offsetDirection = p(A.deltaX, A.deltaY);
        var Te, Fe, kt = l(A.deltaTime, A.deltaX, A.deltaY);
        A.overallVelocityX = kt.x, A.overallVelocityY = kt.y, A.overallVelocity = C(kt.x) > C(kt.y) ? kt.x : kt.y, A.scale = Ft ? (Te = Ft.pointers, T((Fe = re)[0], Fe[1], Rt) / T(Te[0], Te[1], Rt)) : 1, A.rotation = Ft ? function(et, F) {
          return M(F[1], F[0], Rt) + M(et[1], et[0], Rt);
        }(Ft.pointers, re) : 0, A.maxPointers = $.prevInput ? A.pointers.length > $.prevInput.maxPointers ? A.pointers.length : $.prevInput.maxPointers : A.pointers.length, function(et, F) {
          var bt, Dt, _t, Ot, wt = et.lastInterval || F, ke = F.timeStamp - wt.timeStamp;
          if (F.eventType != j && (ke > Wt || wt.velocity === c)) {
            var Ie = F.deltaX - wt.deltaX, Le = F.deltaY - wt.deltaY, It = l(ke, Ie, Le);
            Dt = It.x, _t = It.y, bt = C(It.x) > C(It.y) ? It.x : It.y, Ot = p(Ie, Le), et.lastInterval = F;
          } else bt = wt.velocity, Dt = wt.velocityX, _t = wt.velocityY, Ot = wt.direction;
          F.velocity = bt, F.velocityX = Dt, F.velocityY = _t, F.direction = Ot;
        }($, A);
        var ye = z.element;
        Yt(A.srcEvent.target, ye) && (ye = A.srcEvent.target), A.target = ye;
      }(t, i), t.emit("hammer.input", i), t.recognize(i), t.session.prevInput = i;
    }
    function qt(t) {
      for (var e = [], i = 0; i < t.pointers.length; ) e[i] = { clientX: g(t.pointers[i].clientX), clientY: g(t.pointers[i].clientY) }, i++;
      return { timeStamp: O(), pointers: e, center: n(e), deltaX: t.deltaX, deltaY: t.deltaY };
    }
    function n(t) {
      var e = t.length;
      if (e === 1) return { x: g(t[0].clientX), y: g(t[0].clientY) };
      for (var i = 0, o = 0, a = 0; a < e; ) i += t[a].clientX, o += t[a].clientY, a++;
      return { x: g(i / e), y: g(o / e) };
    }
    function l(t, e, i) {
      return { x: e / t || 0, y: i / t || 0 };
    }
    function p(t, e) {
      return t === e ? xt : C(t) >= C(e) ? t < 0 ? dt : vt : e < 0 ? gt : mt;
    }
    function T(t, e, i) {
      i || (i = Jt);
      var o = e[i[0]] - t[i[0]], a = e[i[1]] - t[i[1]];
      return Math.sqrt(o * o + a * a);
    }
    function M(t, e, i) {
      i || (i = Jt);
      var o = e[i[0]] - t[i[0]], a = e[i[1]] - t[i[1]];
      return 180 * Math.atan2(a, o) / Math.PI;
    }
    W.prototype = { handler: function() {
    }, init: function() {
      this.evEl && At(this.element, this.evEl, this.domHandler), this.evTarget && At(this.target, this.evTarget, this.domHandler), this.evWin && At(zt(this.element), this.evWin, this.domHandler);
    }, destroy: function() {
      this.evEl && Pt(this.element, this.evEl, this.domHandler), this.evTarget && Pt(this.target, this.evTarget, this.domHandler), this.evWin && Pt(zt(this.element), this.evWin, this.domHandler);
    } };
    var Tt = { mousedown: N, mousemove: 2, mouseup: _ }, m = "mousedown", S = "mousemove mouseup";
    function Z() {
      this.evEl = m, this.evWin = S, this.pressed = !1, W.apply(this, arguments);
    }
    L(Z, W, { handler: function(t) {
      var e = Tt[t.type];
      e & N && t.button === 0 && (this.pressed = !0), 2 & e && t.which !== 1 && (e = _), this.pressed && (e & _ && (this.pressed = !1), this.callback(this.manager, e, { pointers: [t], changedPointers: [t], pointerType: $t, srcEvent: t }));
    } });
    var Y = { pointerdown: N, pointermove: 2, pointerup: _, pointercancel: j, pointerout: j }, ut = { 2: H, 3: "pen", 4: $t, 5: "kinect" }, yt = "pointerdown", Q = "pointermove pointerup pointercancel";
    function Et() {
      this.evEl = yt, this.evWin = Q, W.apply(this, arguments), this.store = this.manager.session.pointerEvents = [];
    }
    h.MSPointerEvent && !h.PointerEvent && (yt = "MSPointerDown", Q = "MSPointerMove MSPointerUp MSPointerCancel"), L(Et, W, { handler: function(t) {
      var e = this.store, i = !1, o = t.type.toLowerCase().replace("ms", ""), a = Y[o], b = ut[t.pointerType] || t.pointerType, R = b == H, z = st(e, t.pointerId, "pointerId");
      a & N && (t.button === 0 || R) ? z < 0 && (e.push(t), z = e.length - 1) : a & (_ | j) && (i = !0), z < 0 || (e[z] = t, this.callback(this.manager, a, { pointers: e, changedPointers: [t], pointerType: b, srcEvent: t }), i && e.splice(z, 1));
    } });
    var K = { touchstart: N, touchmove: 2, touchend: _, touchcancel: j };
    function be() {
      this.evTarget = "touchstart", this.evWin = "touchstart touchmove touchend touchcancel", this.started = !1, W.apply(this, arguments);
    }
    function Ge(t, e) {
      var i = ft(t.touches), o = ft(t.changedTouches);
      return e & (_ | j) && (i = Nt(i.concat(o), "identifier")), [i, o];
    }
    L(be, W, { handler: function(t) {
      var e = K[t.type];
      if (e === N && (this.started = !0), this.started) {
        var i = Ge.call(this, t, e);
        e & (_ | j) && i[0].length - i[1].length == 0 && (this.started = !1), this.callback(this.manager, e, { pointers: i[0], changedPointers: i[1], pointerType: H, srcEvent: t });
      }
    } });
    var Je = { touchstart: N, touchmove: 2, touchend: _, touchcancel: j }, Ze = "touchstart touchmove touchend touchcancel";
    function Qt() {
      this.evTarget = Ze, this.targetIds = {}, W.apply(this, arguments);
    }
    function Qe(t, e) {
      var i = ft(t.touches), o = this.targetIds;
      if (e & (2 | N) && i.length === 1) return o[i[0].identifier] = !0, [i, i];
      var a, b, R = ft(t.changedTouches), z = [], A = this.target;
      if (b = i.filter(function($) {
        return Yt($.target, A);
      }), e === N) for (a = 0; a < b.length; ) o[b[a].identifier] = !0, a++;
      for (a = 0; a < R.length; ) o[R[a].identifier] && z.push(R[a]), e & (_ | j) && delete o[R[a].identifier], a++;
      return z.length ? [Nt(b.concat(z), "identifier"), z] : void 0;
    }
    L(Qt, W, { handler: function(t) {
      var e = Je[t.type], i = Qe.call(this, t, e);
      i && this.callback(this.manager, e, { pointers: i[0], changedPointers: i[1], pointerType: H, srcEvent: t });
    } });
    var Ke = 2500;
    function le() {
      W.apply(this, arguments);
      var t = it(this.handler, this);
      this.touch = new Qt(this.manager, t), this.mouse = new Z(this.manager, t), this.primaryTouch = null, this.lastTouches = [];
    }
    function tn(t, e) {
      t & N ? (this.primaryTouch = e.changedPointers[0].identifier, we.call(this, e)) : t & (_ | j) && we.call(this, e);
    }
    function we(t) {
      var e = t.changedPointers[0];
      if (e.identifier === this.primaryTouch) {
        var i = { x: e.clientX, y: e.clientY };
        this.lastTouches.push(i);
        var o = this.lastTouches;
        setTimeout(function() {
          var a = o.indexOf(i);
          a > -1 && o.splice(a, 1);
        }, Ke);
      }
    }
    function en(t) {
      for (var e = t.srcEvent.clientX, i = t.srcEvent.clientY, o = 0; o < this.lastTouches.length; o++) {
        var a = this.lastTouches[o], b = Math.abs(e - a.x), R = Math.abs(i - a.y);
        if (b <= 25 && R <= 25) return !0;
      }
      return !1;
    }
    L(le, W, { handler: function(t, e, i) {
      var o = i.pointerType == H, a = i.pointerType == $t;
      if (!(a && i.sourceCapabilities && i.sourceCapabilities.firesTouchEvents)) {
        if (o) tn.call(this, e, i);
        else if (a && en.call(this, i)) return;
        this.callback(t, e, i);
      }
    }, destroy: function() {
      this.touch.destroy(), this.mouse.destroy();
    } });
    var Ae = pt(P.style, "touchAction"), Pe = Ae !== c, xe = "compute", Re = "auto", he = "manipulation", Ct = "none", Ut = "pan-x", Ht = "pan-y", Kt = function() {
      if (!Pe) return !1;
      var t = {}, e = h.CSS && h.CSS.supports;
      return ["auto", "manipulation", "pan-y", "pan-x", "pan-x pan-y", "none"].forEach(function(i) {
        t[i] = !e || h.CSS.supports("touch-action", i);
      }), t;
    }();
    function fe(t, e) {
      this.manager = t, this.set(e);
    }
    fe.prototype = { set: function(t) {
      t == xe && (t = this.compute()), Pe && this.manager.element.style && Kt[t] && (this.manager.element.style[Ae] = t), this.actions = t.toLowerCase().trim();
    }, update: function() {
      this.set(this.manager.options.touchAction);
    }, compute: function() {
      var t = [];
      return I(this.manager.recognizers, function(e) {
        rt(e.options.enable, [e]) && (t = t.concat(e.getTouchAction()));
      }), function(e) {
        if (ot(e, Ct)) return Ct;
        var i = ot(e, Ut), o = ot(e, Ht);
        return i && o ? Ct : i || o ? i ? Ut : Ht : ot(e, he) ? he : Re;
      }(t.join(" "));
    }, preventDefaults: function(t) {
      var e = t.srcEvent, i = t.offsetDirection;
      if (this.manager.session.prevented) e.preventDefault();
      else {
        var o = this.actions, a = ot(o, Ct) && !Kt[Ct], b = ot(o, Ht) && !Kt[Ht], R = ot(o, Ut) && !Kt[Ut];
        if (a) {
          var z = t.pointers.length === 1, A = t.distance < 2, $ = t.deltaTime < 250;
          if (z && A && $) return;
        }
        if (!R || !b) return a || b && i & q || R && i & J ? this.preventSrc(e) : void 0;
      }
    }, preventSrc: function(t) {
      this.manager.session.prevented = !0, t.preventDefault();
    } };
    var te = 1, ct = 32;
    function lt(t) {
      this.options = E({}, this.defaults, t || {}), this.id = ue++, this.manager = null, this.options.enable = at(this.options.enable, !0), this.state = te, this.simultaneous = {}, this.requireFail = [];
    }
    function Ce(t) {
      return 16 & t ? "cancel" : 8 & t ? "end" : 4 & t ? "move" : 2 & t ? "start" : "";
    }
    function Se(t) {
      return t == mt ? "down" : t == gt ? "up" : t == dt ? "left" : t == vt ? "right" : "";
    }
    function ee(t, e) {
      var i = e.manager;
      return i ? i.get(t) : t;
    }
    function tt() {
      lt.apply(this, arguments);
    }
    function ne() {
      tt.apply(this, arguments), this.pX = null, this.pY = null;
    }
    function pe() {
      tt.apply(this, arguments);
    }
    function de() {
      lt.apply(this, arguments), this._timer = null, this._input = null;
    }
    function ve() {
      tt.apply(this, arguments);
    }
    function ge() {
      tt.apply(this, arguments);
    }
    function ie() {
      lt.apply(this, arguments), this.pTime = !1, this.pCenter = !1, this._timer = null, this._input = null, this.count = 0;
    }
    function St(t, e) {
      return (e = e || {}).recognizers = at(e.recognizers, St.defaults.preset), new me(t, e);
    }
    function me(t, e) {
      this.options = E({}, St.defaults, e || {}), this.options.inputTarget = this.options.inputTarget || t, this.handlers = {}, this.session = {}, this.recognizers = [], this.oldCssProps = {}, this.element = t, this.input = new (this.options.inputClass || (ce ? Et : Xt ? Qt : B ? le : Z))(this, Zt), this.touchAction = new fe(this, this.options.touchAction), De(this, !0), I(this.options.recognizers, function(i) {
        var o = this.add(new i[0](i[1]));
        i[2] && o.recognizeWith(i[2]), i[3] && o.requireFailure(i[3]);
      }, this);
    }
    function De(t, e) {
      var i, o = t.element;
      o.style && (I(t.options.cssProps, function(a, b) {
        i = pt(o.style, b), e ? (t.oldCssProps[i] = o.style[i], o.style[i] = a) : o.style[i] = t.oldCssProps[i] || "";
      }), e || (t.oldCssProps = {}));
    }
    lt.prototype = { defaults: {}, set: function(t) {
      return E(this.options, t), this.manager && this.manager.touchAction.update(), this;
    }, recognizeWith: function(t) {
      if (X(t, "recognizeWith", this)) return this;
      var e = this.simultaneous;
      return e[(t = ee(t, this)).id] || (e[t.id] = t, t.recognizeWith(this)), this;
    }, dropRecognizeWith: function(t) {
      return X(t, "dropRecognizeWith", this) || (t = ee(t, this), delete this.simultaneous[t.id]), this;
    }, requireFailure: function(t) {
      if (X(t, "requireFailure", this)) return this;
      var e = this.requireFail;
      return st(e, t = ee(t, this)) === -1 && (e.push(t), t.requireFailure(this)), this;
    }, dropRequireFailure: function(t) {
      if (X(t, "dropRequireFailure", this)) return this;
      t = ee(t, this);
      var e = st(this.requireFail, t);
      return e > -1 && this.requireFail.splice(e, 1), this;
    }, hasRequireFailures: function() {
      return this.requireFail.length > 0;
    }, canRecognizeWith: function(t) {
      return !!this.simultaneous[t.id];
    }, emit: function(t) {
      var e = this, i = this.state;
      function o(a) {
        e.manager.emit(a, t);
      }
      i < 8 && o(e.options.event + Ce(i)), o(e.options.event), t.additionalEvent && o(t.additionalEvent), i >= 8 && o(e.options.event + Ce(i));
    }, tryEmit: function(t) {
      if (this.canEmit()) return this.emit(t);
      this.state = ct;
    }, canEmit: function() {
      for (var t = 0; t < this.requireFail.length; ) {
        if (!(this.requireFail[t].state & (ct | te))) return !1;
        t++;
      }
      return !0;
    }, recognize: function(t) {
      var e = E({}, t);
      if (!rt(this.options.enable, [this, e])) return this.reset(), void (this.state = ct);
      56 & this.state && (this.state = te), this.state = this.process(e), 30 & this.state && this.tryEmit(e);
    }, process: function(t) {
    }, getTouchAction: function() {
    }, reset: function() {
    } }, L(tt, lt, { defaults: { pointers: 1 }, attrTest: function(t) {
      var e = this.options.pointers;
      return e === 0 || t.pointers.length === e;
    }, process: function(t) {
      var e = this.state, i = t.eventType, o = 6 & e, a = this.attrTest(t);
      return o && (i & j || !a) ? 16 | e : o || a ? i & _ ? 8 | e : 2 & e ? 4 | e : 2 : ct;
    } }), L(ne, tt, { defaults: { event: "pan", threshold: 10, pointers: 1, direction: Mt }, getTouchAction: function() {
      var t = this.options.direction, e = [];
      return t & q && e.push(Ht), t & J && e.push(Ut), e;
    }, directionTest: function(t) {
      var e = this.options, i = !0, o = t.distance, a = t.direction, b = t.deltaX, R = t.deltaY;
      return a & e.direction || (e.direction & q ? (a = b === 0 ? xt : b < 0 ? dt : vt, i = b != this.pX, o = Math.abs(t.deltaX)) : (a = R === 0 ? xt : R < 0 ? gt : mt, i = R != this.pY, o = Math.abs(t.deltaY))), t.direction = a, i && o > e.threshold && a & e.direction;
    }, attrTest: function(t) {
      return tt.prototype.attrTest.call(this, t) && (2 & this.state || !(2 & this.state) && this.directionTest(t));
    }, emit: function(t) {
      this.pX = t.deltaX, this.pY = t.deltaY;
      var e = Se(t.direction);
      e && (t.additionalEvent = this.options.event + e), this._super.emit.call(this, t);
    } }), L(pe, tt, { defaults: { event: "pinch", threshold: 0, pointers: 2 }, getTouchAction: function() {
      return [Ct];
    }, attrTest: function(t) {
      return this._super.attrTest.call(this, t) && (Math.abs(t.scale - 1) > this.options.threshold || 2 & this.state);
    }, emit: function(t) {
      if (t.scale !== 1) {
        var e = t.scale < 1 ? "in" : "out";
        t.additionalEvent = this.options.event + e;
      }
      this._super.emit.call(this, t);
    } }), L(de, lt, { defaults: { event: "press", pointers: 1, time: 251, threshold: 9 }, getTouchAction: function() {
      return [Re];
    }, process: function(t) {
      var e = this.options, i = t.pointers.length === e.pointers, o = t.distance < e.threshold, a = t.deltaTime > e.time;
      if (this._input = t, !o || !i || t.eventType & (_ | j) && !a) this.reset();
      else if (t.eventType & N) this.reset(), this._timer = k(function() {
        this.state = 8, this.tryEmit();
      }, e.time, this);
      else if (t.eventType & _) return 8;
      return ct;
    }, reset: function() {
      clearTimeout(this._timer);
    }, emit: function(t) {
      this.state === 8 && (t && t.eventType & _ ? this.manager.emit(this.options.event + "up", t) : (this._input.timeStamp = O(), this.manager.emit(this.options.event, this._input)));
    } }), L(ve, tt, { defaults: { event: "rotate", threshold: 0, pointers: 2 }, getTouchAction: function() {
      return [Ct];
    }, attrTest: function(t) {
      return this._super.attrTest.call(this, t) && (Math.abs(t.rotation) > this.options.threshold || 2 & this.state);
    } }), L(ge, tt, { defaults: { event: "swipe", threshold: 10, velocity: 0.3, direction: q | J, pointers: 1 }, getTouchAction: function() {
      return ne.prototype.getTouchAction.call(this);
    }, attrTest: function(t) {
      var e, i = this.options.direction;
      return i & (q | J) ? e = t.overallVelocity : i & q ? e = t.overallVelocityX : i & J && (e = t.overallVelocityY), this._super.attrTest.call(this, t) && i & t.offsetDirection && t.distance > this.options.threshold && t.maxPointers == this.options.pointers && C(e) > this.options.velocity && t.eventType & _;
    }, emit: function(t) {
      var e = Se(t.offsetDirection);
      e && this.manager.emit(this.options.event + e, t), this.manager.emit(this.options.event, t);
    } }), L(ie, lt, { defaults: { event: "tap", pointers: 1, taps: 1, interval: 300, time: 250, threshold: 9, posThreshold: 10 }, getTouchAction: function() {
      return [he];
    }, process: function(t) {
      var e = this.options, i = t.pointers.length === e.pointers, o = t.distance < e.threshold, a = t.deltaTime < e.time;
      if (this.reset(), t.eventType & N && this.count === 0) return this.failTimeout();
      if (o && a && i) {
        if (t.eventType != _) return this.failTimeout();
        var b = !this.pTime || t.timeStamp - this.pTime < e.interval, R = !this.pCenter || T(this.pCenter, t.center) < e.posThreshold;
        if (this.pTime = t.timeStamp, this.pCenter = t.center, R && b ? this.count += 1 : this.count = 1, this._input = t, this.count % e.taps == 0) return this.hasRequireFailures() ? (this._timer = k(function() {
          this.state = 8, this.tryEmit();
        }, e.interval, this), 2) : 8;
      }
      return ct;
    }, failTimeout: function() {
      return this._timer = k(function() {
        this.state = ct;
      }, this.options.interval, this), ct;
    }, reset: function() {
      clearTimeout(this._timer);
    }, emit: function() {
      this.state == 8 && (this._input.tapCount = this.count, this.manager.emit(this.options.event, this._input));
    } }), St.VERSION = "2.0.7", St.defaults = { domEvents: !1, touchAction: xe, enable: !0, inputTarget: null, inputClass: null, preset: [[ve, { enable: !1 }], [pe, { enable: !1 }, ["rotate"]], [ge, { direction: q }], [ne, { direction: q }, ["swipe"]], [ie], [ie, { event: "doubletap", taps: 2 }, ["tap"]], [de]], cssProps: { userSelect: "none", touchSelect: "none", touchCallout: "none", contentZooming: "none", userDrag: "none", tapHighlightColor: "rgba(0,0,0,0)" } }, me.prototype = { set: function(t) {
      return E(this.options, t), t.touchAction && this.touchAction.update(), t.inputTarget && (this.input.destroy(), this.input.target = t.inputTarget, this.input.init()), this;
    }, stop: function(t) {
      this.session.stopped = t ? 2 : 1;
    }, recognize: function(t) {
      var e = this.session;
      if (!e.stopped) {
        var i;
        this.touchAction.preventDefaults(t);
        var o = this.recognizers, a = e.curRecognizer;
        (!a || a && 8 & a.state) && (a = e.curRecognizer = null);
        for (var b = 0; b < o.length; ) i = o[b], e.stopped === 2 || a && i != a && !i.canRecognizeWith(a) ? i.reset() : i.recognize(t), !a && 14 & i.state && (a = e.curRecognizer = i), b++;
      }
    }, get: function(t) {
      if (t instanceof lt) return t;
      for (var e = this.recognizers, i = 0; i < e.length; i++) if (e[i].options.event == t) return e[i];
      return null;
    }, add: function(t) {
      if (X(t, "add", this)) return this;
      var e = this.get(t.options.event);
      return e && this.remove(e), this.recognizers.push(t), t.manager = this, this.touchAction.update(), t;
    }, remove: function(t) {
      if (X(t, "remove", this)) return this;
      if (t = this.get(t)) {
        var e = this.recognizers, i = st(e, t);
        i !== -1 && (e.splice(i, 1), this.touchAction.update());
      }
      return this;
    }, on: function(t, e) {
      if (t !== c && e !== c) {
        var i = this.handlers;
        return I(ht(t), function(o) {
          i[o] = i[o] || [], i[o].push(e);
        }), this;
      }
    }, off: function(t, e) {
      if (t !== c) {
        var i = this.handlers;
        return I(ht(t), function(o) {
          e ? i[o] && i[o].splice(st(i[o], e), 1) : delete i[o];
        }), this;
      }
    }, emit: function(t, e) {
      this.options.domEvents && function(a, b) {
        var R = v.createEvent("Event");
        R.initEvent(a, !0, !0), R.gesture = b, b.target.dispatchEvent(R);
      }(t, e);
      var i = this.handlers[t] && this.handlers[t].slice();
      if (i && i.length) {
        e.type = t, e.preventDefault = function() {
          e.srcEvent.preventDefault();
        };
        for (var o = 0; o < i.length; ) i[o](e), o++;
      }
    }, destroy: function() {
      this.element && De(this, !1), this.handlers = {}, this.session = {}, this.input.destroy(), this.element = null;
    } }, E(St, { INPUT_START: N, INPUT_MOVE: 2, INPUT_END: _, INPUT_CANCEL: j, STATE_POSSIBLE: te, STATE_BEGAN: 2, STATE_CHANGED: 4, STATE_ENDED: 8, STATE_RECOGNIZED: 8, STATE_CANCELLED: 16, STATE_FAILED: ct, DIRECTION_NONE: xt, DIRECTION_LEFT: dt, DIRECTION_RIGHT: vt, DIRECTION_UP: gt, DIRECTION_DOWN: mt, DIRECTION_HORIZONTAL: q, DIRECTION_VERTICAL: J, DIRECTION_ALL: Mt, Manager: me, Input: W, TouchAction: fe, TouchInput: Qt, MouseInput: Z, PointerEventInput: Et, TouchMouseInput: le, SingleTouchInput: be, Recognizer: lt, AttrRecognizer: tt, Tap: ie, Pan: ne, Swipe: ge, Pinch: pe, Rotate: ve, Press: de, on: At, off: Pt, each: I, merge: nt, extend: G, assign: E, inherit: L, bindFn: it, prefixed: pt }), (h !== void 0 ? h : typeof self < "u" ? self : {}).Hammer = St, (u = (function() {
      return St;
    }).call(r, s, r, d)) === c || (d.exports = u);
  })(window, document);
}, 970: (d, r, s) => {
  s.d(r, { A: () => c });
  var u = s(645), h = s.n(u), v = s(278), f = s.n(v)()(h());
  f.push([d.id, ".flipbook{height:100%;width:100%;overflow:hidden}.flipbook-debug-bar{position:absolute;bottom:0;left:0;width:100%;background-color:rgba(0,0,0,.5);color:#fff;padding:10px;box-sizing:border-box;display:flex;flex-wrap:wrap;justify-content:space-between;z-index:9999}", ""]);
  const c = f;
}, 0: (d, r, s) => {
  s.d(r, { A: () => c });
  var u = s(645), h = s.n(u), v = s(278), f = s.n(v)()(h());
  f.push([d.id, ".page{position:absolute;backface-visibility:hidden;transform-style:preserve-3d}.page>*{max-width:100%;max-height:100%;height:100%;width:100%;box-sizing:border-box}", ""]);
  const c = f;
}, 278: (d) => {
  d.exports = function(r) {
    var s = [];
    return s.toString = function() {
      return this.map(function(u) {
        var h = "", v = u[5] !== void 0;
        return u[4] && (h += "@supports (".concat(u[4], ") {")), u[2] && (h += "@media ".concat(u[2], " {")), v && (h += "@layer".concat(u[5].length > 0 ? " ".concat(u[5]) : "", " {")), h += r(u), v && (h += "}"), u[2] && (h += "}"), u[4] && (h += "}"), h;
      }).join("");
    }, s.i = function(u, h, v, f, c) {
      typeof u == "string" && (u = [[null, u, void 0]]);
      var E = {};
      if (v) for (var y = 0; y < this.length; y++) {
        var P = this[y][0];
        P != null && (E[P] = !0);
      }
      for (var w = 0; w < u.length; w++) {
        var g = [].concat(u[w]);
        v && E[g[0]] || (c !== void 0 && (g[5] === void 0 || (g[1] = "@layer".concat(g[5].length > 0 ? " ".concat(g[5]) : "", " {").concat(g[1], "}")), g[5] = c), h && (g[2] && (g[1] = "@media ".concat(g[2], " {").concat(g[1], "}")), g[2] = h), f && (g[4] ? (g[1] = "@supports (".concat(g[4], ") {").concat(g[1], "}"), g[4] = f) : g[4] = "".concat(f)), s.push(g));
      }
    }, s;
  };
}, 645: (d) => {
  d.exports = function(r) {
    return r[1];
  };
}, 292: (d) => {
  var r = [];
  function s(v) {
    for (var f = -1, c = 0; c < r.length; c++) if (r[c].identifier === v) {
      f = c;
      break;
    }
    return f;
  }
  function u(v, f) {
    for (var c = {}, E = [], y = 0; y < v.length; y++) {
      var P = v[y], w = f.base ? P[0] + f.base : P[0], g = c[w] || 0, C = "".concat(w, " ").concat(g);
      c[w] = g + 1;
      var O = s(C), k = { css: P[1], media: P[2], sourceMap: P[3], supports: P[4], layer: P[5] };
      if (O !== -1) r[O].references++, r[O].updater(k);
      else {
        var X = h(k, f);
        f.byIndex = y, r.splice(y, 0, { identifier: C, updater: X, references: 1 });
      }
      E.push(C);
    }
    return E;
  }
  function h(v, f) {
    var c = f.domAPI(f);
    return c.update(v), function(E) {
      if (E) {
        if (E.css === v.css && E.media === v.media && E.sourceMap === v.sourceMap && E.supports === v.supports && E.layer === v.layer) return;
        c.update(v = E);
      } else c.remove();
    };
  }
  d.exports = function(v, f) {
    var c = u(v = v || [], f = f || {});
    return function(E) {
      E = E || [];
      for (var y = 0; y < c.length; y++) {
        var P = s(c[y]);
        r[P].references--;
      }
      for (var w = u(E, f), g = 0; g < c.length; g++) {
        var C = s(c[g]);
        r[C].references === 0 && (r[C].updater(), r.splice(C, 1));
      }
      c = w;
    };
  };
}, 383: (d) => {
  var r = {};
  d.exports = function(s, u) {
    var h = function(v) {
      if (r[v] === void 0) {
        var f = document.querySelector(v);
        if (window.HTMLIFrameElement && f instanceof window.HTMLIFrameElement) try {
          f = f.contentDocument.head;
        } catch {
          f = null;
        }
        r[v] = f;
      }
      return r[v];
    }(s);
    if (!h) throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
    h.appendChild(u);
  };
}, 88: (d) => {
  d.exports = function(r) {
    var s = document.createElement("style");
    return r.setAttributes(s, r.attributes), r.insert(s, r.options), s;
  };
}, 884: (d, r, s) => {
  d.exports = function(u) {
    var h = s.nc;
    h && u.setAttribute("nonce", h);
  };
}, 893: (d) => {
  d.exports = function(r) {
    if (typeof document > "u") return { update: function() {
    }, remove: function() {
    } };
    var s = r.insertStyleElement(r);
    return { update: function(u) {
      (function(h, v, f) {
        var c = "";
        f.supports && (c += "@supports (".concat(f.supports, ") {")), f.media && (c += "@media ".concat(f.media, " {"));
        var E = f.layer !== void 0;
        E && (c += "@layer".concat(f.layer.length > 0 ? " ".concat(f.layer) : "", " {")), c += f.css, E && (c += "}"), f.media && (c += "}"), f.supports && (c += "}");
        var y = f.sourceMap;
        y && typeof btoa < "u" && (c += `
/*# sourceMappingURL=data:application/json;base64,`.concat(btoa(unescape(encodeURIComponent(JSON.stringify(y)))), " */")), v.styleTagTransform(c, h, v.options);
      })(s, r, u);
    }, remove: function() {
      (function(u) {
        if (u.parentNode === null) return !1;
        u.parentNode.removeChild(u);
      })(s);
    } };
  };
}, 997: (d) => {
  d.exports = function(r, s) {
    if (s.styleSheet) s.styleSheet.cssText = r;
    else {
      for (; s.firstChild; ) s.removeChild(s.firstChild);
      s.appendChild(document.createTextNode(r));
    }
  };
} }, Xe = {};
function D(d) {
  var r = Xe[d];
  if (r !== void 0) return r.exports;
  var s = Xe[d] = { id: d, exports: {} };
  return ln[d](s, s.exports, D), s.exports;
}
D.n = (d) => {
  var r = d && d.__esModule ? () => d.default : () => d;
  return D.d(r, { a: r }), r;
}, D.d = (d, r) => {
  for (var s in r) D.o(r, s) && !D.o(d, s) && Object.defineProperty(d, s, { enumerable: !0, get: r[s] });
}, D.o = (d, r) => Object.prototype.hasOwnProperty.call(d, r), D.nc = void 0;
var $e = {};
D.d($e, { $: () => En });
var hn = D(292), We = D.n(hn), fn = D(893), qe = D.n(fn), pn = D(383), Ue = D.n(pn), dn = D(884), He = D.n(dn), vn = D(88), Ve = D.n(vn), gn = D(997), Be = D.n(gn), oe = D(0), Lt = {};
Lt.styleTagTransform = Be(), Lt.setAttributes = He(), Lt.insert = Ue().bind(null, "head"), Lt.domAPI = qe(), Lt.insertStyleElement = Ve(), We()(oe.A, Lt), oe.A && oe.A.locals && oe.A.locals;
var se = D(970), jt = {};
jt.styleTagTransform = Be(), jt.setAttributes = He(), jt.insert = Ue().bind(null, "head"), jt.domAPI = qe(), jt.insertStyleElement = Ve(), We()(se.A, jt), se.A && se.A.locals && se.A.locals;
var V, mn = D(168), Tn = D.n(mn);
class yn {
  constructor(r, s, u, h) {
    x(this, "index");
    x(this, "pages");
    x(this, "bookProperties");
    x(this, "currentAnimation", null);
    x(this, "targetFlipPosition", null);
    x(this, "wrappedFlipPosition");
    this.index = r, this.pages = s, this.bookProperties = h, this.wrappedFlipPosition = u ? 1 : 0;
  }
  get isTurned() {
    return this.flipPosition === 1;
  }
  get isTurning() {
    return this.flipPosition !== 0;
  }
  get isCover() {
    return this.isFirst || this.isLast;
  }
  get isFirst() {
    return this.index === 0;
  }
  get isLast() {
    return this.index === this.bookProperties.leavesCount - 1;
  }
  set flipPosition(r) {
    this.wrappedFlipPosition = Math.max(0, Math.min(1, r));
  }
  get flipPosition() {
    return this.wrappedFlipPosition;
  }
  async flipToPosition(r, s = 225) {
    return this.currentAnimation && await this.currentAnimation, this.flipPosition === r ? Promise.resolve() : this.targetFlipPosition === r ? this.currentAnimation ?? Promise.resolve() : (this.targetFlipPosition = r, this.currentAnimation = new Promise((u) => {
      const h = this.flipPosition, v = 180 * Math.abs(r - h) / s * 1e3, f = performance.now(), c = (E) => {
        const y = E - f;
        if (y < 0) return void requestAnimationFrame(c);
        const P = Math.min(y / v, 1), w = h + P * (r - h);
        this.pages.forEach((g, C) => {
          const O = this.bookProperties.isLTR;
          if (g) {
            const k = C % 2 + 1 == 1, X = (k ? O ? w > 0.5 ? 180 - 180 * w : 180 * -w : w > 0.5 ? -(180 - 180 * w) : 180 * w : O ? w < 0.5 ? 180 * -w : 180 - 180 * w : w < 0.5 ? 180 * w : -(180 - 180 * w)) + "deg", I = k ? O ? "100%" : "-100%" : "0px", U = k ? w > 0.5 ? -1 : 1 : w < 0.5 ? -1 : 1;
            g.style.transform = `translateX(${I})rotateY(${X})scaleX(${U})`, g.style.transformOrigin = k ? O ? "left" : "right" : O ? "right" : "left", g.style.zIndex = `${w > 0.5 ? g.dataset.pageIndex : this.bookProperties.pagesCount - g.dataset.pageIndex}`;
          }
        }), this.flipPosition = Math.max(0, Math.min(1, w)), P < 1 ? requestAnimationFrame(c) : (this.currentAnimation = null, this.targetFlipPosition = null, u());
      };
      requestAnimationFrame(c);
    }), this.currentAnimation);
  }
  async efficientFlipToPosition(r, s = 2e4) {
    return function(u, h, v) {
      var f, c = {}, E = c.noTrailing, y = E !== void 0 && E, P = c.noLeading, w = P !== void 0 && P, g = c.debounceMode, C = g === void 0 ? void 0 : g, O = !1, k = 0;
      function X() {
        f && clearTimeout(f);
      }
      function I() {
        for (var U = arguments.length, G = new Array(U), nt = 0; nt < U; nt++) G[nt] = arguments[nt];
        var L = this, it = Date.now() - k;
        function rt() {
          k = Date.now(), h.apply(L, G);
        }
        function at() {
          f = void 0;
        }
        O || (w || !C || f || rt(), X(), C === void 0 && it > u ? w ? (k = Date.now(), y || (f = setTimeout(C ? at : rt, u))) : rt() : y !== !0 && (f = setTimeout(C ? at : rt, C === void 0 ? u - it : u)));
      }
      return I.cancel = function(U) {
        var G = (U || {}).upcomingOnly, nt = G !== void 0 && G;
        X(), O = !nt;
      }, I;
    }(1, this.flipToPosition.bind(this))(r, s);
  }
}
(function(d) {
  d.Forward = "Forward", d.Backward = "Backward", d.None = "None";
})(V || (V = {}));
class ae {
  constructor(r, s) {
    x(this, "width");
    x(this, "height");
    this.width = r, this.height = s;
  }
  static from(r) {
    return new ae(r.width, r.height);
  }
  get value() {
    return this.width / this.height;
  }
}
class Gt {
  constructor(r, s) {
    x(this, "width");
    x(this, "height");
    x(this, "aspectRatio");
    this.width = r, this.height = s, this.aspectRatio = new ae(r, s);
  }
  aspectRatioFit(r) {
    const s = ae.from(r).value;
    return this.aspectRatio.value > s ? new Gt(this.height * s, this.height) : new Gt(this.width, this.width / s);
  }
  get asString() {
    return `${this.width}x${this.height}`;
  }
}
class En {
  constructor(r) {
    x(this, "bookElement");
    x(this, "pageElements", []);
    x(this, "pagesCount");
    x(this, "leafAspectRatio", { width: 2, height: 3 });
    x(this, "coverAspectRatio", { width: 2.15, height: 3.15 });
    x(this, "direction", "ltr");
    x(this, "onPageChanged");
    x(this, "pageSemantics");
    x(this, "leaves", []);
    x(this, "currentLeaf");
    x(this, "flipDirection", V.None);
    x(this, "flipStartingPos", 0);
    x(this, "isDuringManualFlip", !1);
    x(this, "flipDelta", 0);
    x(this, "isDuringAutoFlip", !1);
    x(this, "touchStartingPos", { x: 0, y: 0 });
    x(this, "handleTouchStart", (r) => {
      if (r.touches.length > 1) return;
      const s = r.touches[0];
      this.touchStartingPos = { x: s.pageX, y: s.pageY };
    });
    x(this, "handleTouchMove", (r) => {
      if (r.touches.length > 1) return;
      const s = r.touches[0], u = s.pageX - this.touchStartingPos.x, h = s.pageY - this.touchStartingPos.y;
      Math.abs(u) > Math.abs(h) && r.preventDefault();
    });
    this.pagesCount = r.pagesCount, this.leafAspectRatio = r.leafAspectRatio || this.leafAspectRatio, this.coverAspectRatio = r.coverAspectRatio || this.coverAspectRatio, this.direction = r.direction || this.direction, this.pageSemantics = r.pageSemantics, this.onPageChanged = r.onPageChanged;
  }
  get isLTR() {
    return this.direction === "ltr";
  }
  get isClosed() {
    return !this.currentOrTurningLeaves[0];
  }
  get isClosedInverted() {
    return !this.currentLeaves[1];
  }
  get currentLeaves() {
    let r = -1;
    for (let s = this.leaves.length - 1; s >= 0; s--) {
      const u = this.leaves[s];
      if (u.isTurned) {
        r = u.index + 1;
        break;
      }
    }
    return r == -1 ? [void 0, this.leaves[0]] : r == this.leaves.length ? [this.leaves[r - 1], void 0] : [this.leaves[r - 1], this.leaves[r]];
  }
  get currentOrTurningLeaves() {
    let r = -1;
    for (let s = this.leaves.length - 1; s >= 0; s--) {
      const u = this.leaves[s];
      if (u.isTurned || u.isTurning) {
        r = u.index + 1;
        break;
      }
    }
    return r == -1 ? [void 0, this.leaves[0]] : r == this.leaves.length ? [this.leaves[r - 1], void 0] : [this.leaves[r - 1], this.leaves[r]];
  }
  render(r, s = !1) {
    const u = document.querySelector(r);
    if (!u) throw new Error(`Couldn't find container with selector: ${r}`);
    this.bookElement = u, this.bookElement.classList.contains("flipbook") || this.bookElement.classList.add("flipbook");
    const h = u.querySelectorAll(".page");
    if (!h.length) throw new Error("No pages found in flipbook");
    this.pageElements = Array.from(h), this.leaves.splice(0, this.leaves.length);
    const v = Math.ceil(this.pagesCount / 2), f = new Gt(this.bookElement.clientWidth / 2, this.bookElement.clientHeight).aspectRatioFit(this.coverAspectRatio), c = new Gt(f.width * this.leafAspectRatio.width / this.coverAspectRatio.width, f.height * this.leafAspectRatio.height / this.coverAspectRatio.height);
    this.bookElement.style.perspective = 2 * Math.min(2 * c.width, c.height) + "px", this.pageElements.forEach((y, P) => {
      var C, O;
      y.style.width = `${c.width}px`, y.style.height = `${c.height}px`, y.style.zIndex = "" + (this.pagesCount - P), y.dataset.pageIndex = P.toString(), y.style[this.isLTR ? "left" : "right"] = (u.clientWidth - 2 * c.width) / 2 + "px", y.style.top = (u.clientHeight - c.height) / 2 + "px", y.dataset.pageSemanticName = ((C = this.pageSemantics) == null ? void 0 : C.indexToSemanticName(P)) ?? "", y.dataset.pageTitle = ((O = this.pageSemantics) == null ? void 0 : O.indexToTitle(P)) ?? "";
      const w = Math.floor(P / 2), g = (P + 1) % 2 == 1;
      y.classList.add(g ? "odd" : "even"), g ? (y.style.transform = `translateX(${this.isLTR ? "" : "-"}100%)`, this.leaves[w] = new yn(w, [y, void 0], !1, { isLTR: this.isLTR, leavesCount: v, pagesCount: this.pagesCount })) : (y.style.transform = `scaleX(-1)translateX(${this.isLTR ? "-" : ""}100%)`, this.leaves[w].pages[1] = y);
    });
    const E = new (Tn())(this.bookElement);
    E.on("panstart", this.onDragStart.bind(this)), E.on("panmove", this.onDragUpdate.bind(this)), E.on("panend", this.onDragEnd.bind(this)), this.bookElement.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: !1 }), this.bookElement.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: !1 }), s && this.fillDebugBar();
  }
  fillDebugBar() {
    var s;
    const r = document.createElement("div");
    r.className = "flipbook-debug-bar", (s = this.bookElement) == null || s.appendChild(r), setInterval(() => {
      var u;
      r.innerHTML = `
          <div>Direction: ${this.isLTR ? "LTR" : "RTL"}</div>
          <div>Current Leaf: ${this.currentLeaf ? this.currentLeaf.index : "None"}</div>
          <div>Flip dir: ${this.flipDirection}</div>
          <div>Flip Δ: ${this.flipDelta}</div>
          <div>Current Leaf Flip Position: ${(u = this.currentLeaf) == null ? void 0 : u.flipPosition.toFixed(3)}</div>
          <div>Is During Auto Flip: ${this.isDuringAutoFlip}</div>
        `;
    }, 10);
  }
  onDragStart(r) {
    if (console.log("drag start"), this.currentLeaf || this.isDuringAutoFlip) return this.flipDirection = V.None, void (this.flipStartingPos = 0);
    this.flipStartingPos = r.center.x;
  }
  onDragUpdate(r) {
    var s;
    if (console.log("drag update"), !this.isDuringAutoFlip && !this.isDuringManualFlip) {
      this.isDuringManualFlip = !0;
      try {
        const u = r.center.x;
        this.flipDelta = this.isLTR ? this.flipStartingPos - u : u - this.flipStartingPos;
        const h = ((s = this.bookElement) == null ? void 0 : s.clientWidth) ?? 0;
        if (Math.abs(this.flipDelta) > h || this.flipDelta === 0) return;
        switch (this.flipDirection = this.flipDirection !== V.None ? this.flipDirection : this.flipDelta > 0 ? V.Forward : V.Backward, this.flipDirection) {
          case V.Forward:
            const v = this.flipDelta / h;
            if (v > 1 || this.flipDelta < 0) return;
            if (!this.currentLeaf) {
              if (this.isClosedInverted) return;
              this.currentLeaf = this.currentOrTurningLeaves[1];
            }
            this.currentLeaf.efficientFlipToPosition(v);
            break;
          case V.Backward:
            const f = 1 - Math.abs(this.flipDelta) / h;
            if (f < 0 || this.flipDelta > 0) return;
            if (!this.currentLeaf) {
              if (this.isClosed) return;
              this.currentLeaf = this.currentOrTurningLeaves[0];
            }
            this.currentLeaf.efficientFlipToPosition(f);
        }
      } finally {
        this.isDuringManualFlip = !1;
      }
    }
  }
  async onDragEnd(r) {
    if (console.log("drag end"), !this.currentLeaf || this.isDuringAutoFlip) return this.flipDirection = V.None, void (this.flipStartingPos = 0);
    const s = 1e3 * r.velocityX;
    let u;
    switch (this.flipDirection) {
      case V.Forward:
        u = (this.isLTR ? s < -500 : s > 500) || this.currentLeaf.flipPosition >= 0.5 ? 1 : 0;
        break;
      case V.Backward:
        u = (this.isLTR ? s > 500 : s < -500) || this.currentLeaf.flipPosition <= 0.5 ? 0 : 1;
        break;
      default:
        return;
    }
    this.isDuringAutoFlip = !0, this.flipDirection = V.None, this.flipStartingPos = 0, await this.currentLeaf.flipToPosition(u), this.isDuringAutoFlip = !1, this.currentLeaf = void 0;
  }
  jumpToPage(r) {
    this.onPageChanged && this.onPageChanged(r);
  }
}
var bn = $e.$;
const Pn = ({
  pages: d,
  className: r,
  debug: s = !1,
  direction: u = "ltr",
  // Add the direction prop
  pageSemantics: h = void 0
}) => {
  const v = sn(
    new bn({
      pageSemantics: h,
      pagesCount: d.length,
      direction: u
    })
  );
  return an(() => {
    v.current.render(`.${r}`, s);
  }, []), /* @__PURE__ */ ze.jsx("div", { className: r, children: d.map((f, c) => /* @__PURE__ */ ze.jsx("div", { className: "page", children: f }, c)) });
};
export {
  Pn as FlipBook
};
//# sourceMappingURL=flip-book.js.map
