var ii = Object.defineProperty;
var ni = (d, r, s) => r in d ? ii(d, r, { enumerable: !0, configurable: !0, writable: !0, value: s }) : d[r] = s;
var x = (d, r, s) => ni(d, typeof r != "symbol" ? r + "" : r, s);
import ri, { useRef as oi, useEffect as si } from "react";
var Ee = { exports: {} }, Ht = {};
var je;
function ai() {
  if (je) return Ht;
  je = 1;
  var d = Symbol.for("react.transitional.element"), r = Symbol.for("react.fragment");
  function s(u, c, v) {
    var f = null;
    if (v !== void 0 && (f = "" + v), c.key !== void 0 && (f = "" + c.key), "key" in c) {
      v = {};
      for (var l in c)
        l !== "key" && (v[l] = c[l]);
    } else v = c;
    return c = v.ref, {
      $$typeof: d,
      type: u,
      key: f,
      ref: c !== void 0 ? c : null,
      props: v
    };
  }
  return Ht.Fragment = r, Ht.jsx = s, Ht.jsxs = s, Ht;
}
var Bt = {};
var Ye;
function ui() {
  return Ye || (Ye = 1, process.env.NODE_ENV !== "production" && function() {
    function d(i) {
      for (var h = arguments.length, p = Array(1 < h ? h - 1 : 0), T = 1; T < h; T++)
        p[T - 1] = arguments[T];
      h = i, T = Error("react-stack-top-frame"), G.getCurrentStack && (T = G.getCurrentStack(T), T !== "" && (h += "%s", p = p.concat([T]))), p.unshift(h), Function.prototype.apply.call(console.error, console, p);
    }
    function r(i) {
      if (i == null) return null;
      if (typeof i == "function")
        return i.$$typeof === ce ? null : i.displayName || i.name || null;
      if (typeof i == "string") return i;
      switch (i) {
        case at:
          return "Fragment";
        case rt:
          return "Portal";
        case At:
          return "Profiler";
        case Pt:
          return "StrictMode";
        case st:
          return "Suspense";
        case ft:
          return "SuspenseList";
      }
      if (typeof i == "object")
        switch (typeof i.tag == "number" && d(
          "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
        ), i.$$typeof) {
          case ot:
            return (i.displayName || "Context") + ".Provider";
          case Yt:
            return (i._context.displayName || "Context") + ".Consumer";
          case ht:
            var h = i.render;
            return i = i.displayName, i || (i = h.displayName || h.name || "", i = i !== "" ? "ForwardRef(" + i + ")" : "ForwardRef"), i;
          case Nt:
            return h = i.displayName || null, h !== null ? h : r(i.type) || "Memo";
          case pt:
            h = i._payload, i = i._init;
            try {
              return r(i(h));
            } catch {
            }
        }
      return null;
    }
    function s(i) {
      return "" + i;
    }
    function u(i) {
      try {
        s(i);
        var h = !1;
      } catch {
        h = !0;
      }
      if (h)
        return h = typeof Symbol == "function" && Symbol.toStringTag && i[Symbol.toStringTag] || i.constructor.name || "Object", d(
          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
          h
        ), s(i);
    }
    function c() {
    }
    function v() {
      if (I === 0) {
        _ = console.log, Y = console.info, xt = console.warn, dt = console.error, vt = console.group, gt = console.groupCollapsed, mt = console.groupEnd;
        var i = {
          configurable: !0,
          enumerable: !0,
          value: c,
          writable: !0
        };
        Object.defineProperties(console, {
          info: i,
          log: i,
          warn: i,
          error: i,
          group: i,
          groupCollapsed: i,
          groupEnd: i
        });
      }
      I++;
    }
    function f() {
      if (I--, I === 0) {
        var i = { configurable: !0, enumerable: !0, writable: !0 };
        Object.defineProperties(console, {
          log: B({}, i, { value: _ }),
          info: B({}, i, { value: Y }),
          warn: B({}, i, { value: xt }),
          error: B({}, i, { value: dt }),
          group: B({}, i, { value: vt }),
          groupCollapsed: B({}, i, { value: gt }),
          groupEnd: B({}, i, { value: mt })
        });
      }
      0 > I && d(
        "disabledDepth fell below zero. This is a bug in React. Please file an issue."
      );
    }
    function l(i) {
      if (V === void 0)
        try {
          throw Error();
        } catch (p) {
          var h = p.stack.trim().match(/\n( *(at )?)/);
          V = h && h[1] || "";
        }
      return `
` + V + i;
    }
    function E(i, h) {
      if (!i || J) return "";
      var p = It.get(i);
      if (p !== void 0) return p;
      J = !0, p = Error.prepareStackTrace, Error.prepareStackTrace = void 0;
      var T = null;
      T = G.H, G.H = null, v();
      var k = {
        DetermineComponentFrameRoot: function() {
          try {
            if (h) {
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
                Reflect.construct(i, [], Q);
              } else {
                try {
                  Q.call();
                } catch (K) {
                  Et = K;
                }
                i.call(Q.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (K) {
                Et = K;
              }
              (Q = i()) && typeof Q.catch == "function" && Q.catch(function() {
              });
            }
          } catch (K) {
            if (K && Et && typeof K.stack == "string")
              return [K.stack, Et.stack];
          }
          return [null, null];
        }
      };
      k.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var Tt = Object.getOwnPropertyDescriptor(
        k.DetermineComponentFrameRoot,
        "name"
      );
      Tt && Tt.configurable && Object.defineProperty(
        k.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      try {
        var m = k.DetermineComponentFrameRoot(), S = m[0], Z = m[1];
        if (S && Z) {
          var z = S.split(`
`), ut = Z.split(`
`);
          for (S = m = 0; m < z.length && !z[m].includes(
            "DetermineComponentFrameRoot"
          ); )
            m++;
          for (; S < ut.length && !ut[S].includes("DetermineComponentFrameRoot"); )
            S++;
          if (m === z.length || S === ut.length)
            for (m = z.length - 1, S = ut.length - 1; 1 <= m && 0 <= S && z[m] !== ut[S]; )
              S--;
          for (; 1 <= m && 0 <= S; m--, S--)
            if (z[m] !== ut[S]) {
              if (m !== 1 || S !== 1)
                do
                  if (m--, S--, 0 > S || z[m] !== ut[S]) {
                    var yt = `
` + z[m].replace(
                      " at new ",
                      " at "
                    );
                    return i.displayName && yt.includes("<anonymous>") && (yt = yt.replace("<anonymous>", i.displayName)), typeof i == "function" && It.set(i, yt), yt;
                  }
                while (1 <= m && 0 <= S);
              break;
            }
        }
      } finally {
        J = !1, G.H = T, f(), Error.prepareStackTrace = p;
      }
      return z = (z = i ? i.displayName || i.name : "") ? l(z) : "", typeof i == "function" && It.set(i, z), z;
    }
    function y(i) {
      if (i == null) return "";
      if (typeof i == "function") {
        var h = i.prototype;
        return E(
          i,
          !(!h || !h.isReactComponent)
        );
      }
      if (typeof i == "string") return l(i);
      switch (i) {
        case st:
          return l("Suspense");
        case ft:
          return l("SuspenseList");
      }
      if (typeof i == "object")
        switch (i.$$typeof) {
          case ht:
            return i = E(i.render, !1), i;
          case Nt:
            return y(i.type);
          case pt:
            h = i._payload, i = i._init;
            try {
              return y(i(h));
            } catch {
            }
        }
      return "";
    }
    function w() {
      var i = G.A;
      return i === null ? null : i.getOwner();
    }
    function P(i) {
      if (Xt.call(i, "ref")) {
        var h = Object.getOwnPropertyDescriptor(i, "ref").get;
        if (h && h.isReactWarning) return !1;
      }
      return i.ref !== void 0;
    }
    function g(i) {
      if (Xt.call(i, "key")) {
        var h = Object.getOwnPropertyDescriptor(i, "key").get;
        if (h && h.isReactWarning) return !1;
      }
      return i.key !== void 0;
    }
    function C(i, h) {
      function p() {
        Rt || (Rt = !0, d(
          "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
          h
        ));
      }
      p.isReactWarning = !0, Object.defineProperty(i, "key", {
        get: p,
        configurable: !0
      });
    }
    function O() {
      var i = r(this.type);
      return U[i] || (U[i] = !0, d(
        "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
      )), i = this.props.ref, i !== void 0 ? i : null;
    }
    function F(i, h, p, T, k, Tt, m) {
      return p = m.ref, i = {
        $$typeof: nt,
        type: i,
        key: h,
        props: m,
        _owner: Tt
      }, (p !== void 0 ? p : null) !== null ? Object.defineProperty(i, "ref", {
        enumerable: !1,
        get: O
      }) : Object.defineProperty(i, "ref", { enumerable: !1, value: null }), i._store = {}, Object.defineProperty(i._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: 0
      }), Object.defineProperty(i, "_debugInfo", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: null
      }), Object.freeze && (Object.freeze(i.props), Object.freeze(i)), i;
    }
    function N(i, h, p, T, k, Tt) {
      if (typeof i == "string" || typeof i == "function" || i === at || i === At || i === Pt || i === st || i === ft || i === ue || typeof i == "object" && i !== null && (i.$$typeof === pt || i.$$typeof === Nt || i.$$typeof === ot || i.$$typeof === Yt || i.$$typeof === ht || i.$$typeof === $t || i.getModuleId !== void 0)) {
        var m = h.children;
        if (m !== void 0)
          if (T)
            if (Wt(m)) {
              for (T = 0; T < m.length; T++)
                M(m[T], i);
              Object.freeze && Object.freeze(m);
            } else
              d(
                "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
              );
          else M(m, i);
      } else
        m = "", (i === void 0 || typeof i == "object" && i !== null && Object.keys(i).length === 0) && (m += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports."), i === null ? T = "null" : Wt(i) ? T = "array" : i !== void 0 && i.$$typeof === nt ? (T = "<" + (r(i.type) || "Unknown") + " />", m = " Did you accidentally export a JSX literal instead of a component?") : T = typeof i, d(
          "React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s",
          T,
          m
        );
      if (Xt.call(h, "key")) {
        m = r(i);
        var S = Object.keys(h).filter(function(z) {
          return z !== "key";
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
      if (m = null, p !== void 0 && (u(p), m = "" + p), g(h) && (u(h.key), m = "" + h.key), P(h), "key" in h) {
        p = {};
        for (var Z in h)
          Z !== "key" && (p[Z] = h[Z]);
      } else p = h;
      return m && (h = typeof i == "function" ? i.displayName || i.name || "Unknown" : i, m && C(p, h)), F(
        i,
        m,
        null,
        Tt,
        k,
        w(),
        p
      );
    }
    function M(i, h) {
      if (typeof i == "object" && i && i.$$typeof !== Jt) {
        if (Wt(i))
          for (var p = 0; p < i.length; p++) {
            var T = i[p];
            q(T) && H(T, h);
          }
        else if (q(i))
          i._store && (i._store.validated = 1);
        else if (i === null || typeof i != "object" ? p = null : (p = zt && i[zt] || i["@@iterator"], p = typeof p == "function" ? p : null), typeof p == "function" && p !== i.entries && (p = p.call(i), p !== i))
          for (; !(i = p.next()).done; )
            q(i.value) && H(i.value, h);
      }
    }
    function q(i) {
      return typeof i == "object" && i !== null && i.$$typeof === nt;
    }
    function H(i, h) {
      if (i._store && !i._store.validated && i.key == null && (i._store.validated = 1, h = it(h), !qt[h])) {
        qt[h] = !0;
        var p = "";
        i && i._owner != null && i._owner !== w() && (p = null, typeof i._owner.tag == "number" ? p = r(i._owner.type) : typeof i._owner.name == "string" && (p = i._owner.name), p = " It was passed a child from " + p + ".");
        var T = G.getCurrentStack;
        G.getCurrentStack = function() {
          var k = y(i.type);
          return T && (k += T() || ""), k;
        }, d(
          'Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.',
          h,
          p
        ), G.getCurrentStack = T;
      }
    }
    function it(i) {
      var h = "", p = w();
      return p && (p = r(p.type)) && (h = `

Check the render method of \`` + p + "`."), h || (i = r(i)) && (h = `

Check the top-level render call using <` + i + ">."), h;
    }
    var j = ri, nt = Symbol.for("react.transitional.element"), rt = Symbol.for("react.portal"), at = Symbol.for("react.fragment"), Pt = Symbol.for("react.strict_mode"), At = Symbol.for("react.profiler"), Yt = Symbol.for("react.consumer"), ot = Symbol.for("react.context"), ht = Symbol.for("react.forward_ref"), st = Symbol.for("react.suspense"), ft = Symbol.for("react.suspense_list"), Nt = Symbol.for("react.memo"), pt = Symbol.for("react.lazy"), ue = Symbol.for("react.offscreen"), zt = Symbol.iterator, G = j.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ce = Symbol.for("react.client.reference"), Xt = Object.prototype.hasOwnProperty, B = Object.assign, $t = Symbol.for("react.client.reference"), Wt = Array.isArray, I = 0, _, Y, xt, dt, vt, gt, mt;
    c.__reactDisabledLog = !0;
    var V, J = !1, It = new (typeof WeakMap == "function" ? WeakMap : Map)(), Jt = Symbol.for("react.client.reference"), Rt, U = {}, Zt = {}, qt = {};
    Bt.Fragment = at, Bt.jsx = function(i, h, p, T, k) {
      return N(i, h, p, !1, T, k);
    }, Bt.jsxs = function(i, h, p, T, k) {
      return N(i, h, p, !0, T, k);
    };
  }()), Bt;
}
process.env.NODE_ENV === "production" ? Ee.exports = ai() : Ee.exports = ui();
var ze = Ee.exports;
var ci = { 168: (d, r, s) => {
  var u;
  (function(c, v, f, l) {
    var E, y = ["", "webkit", "Moz", "MS", "ms", "o"], w = v.createElement("div"), P = "function", g = Math.round, C = Math.abs, O = Date.now;
    function F(t, e, n) {
      return setTimeout(nt(t, n), e);
    }
    function N(t, e, n) {
      return !!Array.isArray(t) && (M(t, n[e], n), !0);
    }
    function M(t, e, n) {
      var o;
      if (t) if (t.forEach) t.forEach(e, n);
      else if (t.length !== l) for (o = 0; o < t.length; ) e.call(n, t[o], o, t), o++;
      else for (o in t) t.hasOwnProperty(o) && e.call(n, t[o], o, t);
    }
    function q(t, e, n) {
      var o = "DEPRECATED METHOD: " + e + `
` + n + ` AT
`;
      return function() {
        var a = new Error("get-stack-trace"), b = a && a.stack ? a.stack.replace(/^[^\(]+?[\n$]/gm, "").replace(/^\s+at\s+/gm, "").replace(/^Object.<anonymous>\s*\(/gm, "{anonymous}()@") : "Unknown Stack Trace", R = c.console && (c.console.warn || c.console.log);
        return R && R.call(c.console, o, b), t.apply(this, arguments);
      };
    }
    E = typeof Object.assign != "function" ? function(t) {
      if (t === l || t === null) throw new TypeError("Cannot convert undefined or null to object");
      for (var e = Object(t), n = 1; n < arguments.length; n++) {
        var o = arguments[n];
        if (o !== l && o !== null) for (var a in o) o.hasOwnProperty(a) && (e[a] = o[a]);
      }
      return e;
    } : Object.assign;
    var H = q(function(t, e, n) {
      for (var o = Object.keys(e), a = 0; a < o.length; ) (!n || n && t[o[a]] === l) && (t[o[a]] = e[o[a]]), a++;
      return t;
    }, "extend", "Use `assign`."), it = q(function(t, e) {
      return H(t, e, !0);
    }, "merge", "Use `assign`.");
    function j(t, e, n) {
      var o, a = e.prototype;
      (o = t.prototype = Object.create(a)).constructor = t, o._super = a, n && E(o, n);
    }
    function nt(t, e) {
      return function() {
        return t.apply(e, arguments);
      };
    }
    function rt(t, e) {
      return typeof t == P ? t.apply(e && e[0] || l, e) : t;
    }
    function at(t, e) {
      return t === l ? e : t;
    }
    function Pt(t, e, n) {
      M(ht(e), function(o) {
        t.addEventListener(o, n, !1);
      });
    }
    function At(t, e, n) {
      M(ht(e), function(o) {
        t.removeEventListener(o, n, !1);
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
    function st(t, e, n) {
      if (t.indexOf && !n) return t.indexOf(e);
      for (var o = 0; o < t.length; ) {
        if (n && t[o][n] == e || !n && t[o] === e) return o;
        o++;
      }
      return -1;
    }
    function ft(t) {
      return Array.prototype.slice.call(t, 0);
    }
    function Nt(t, e, n) {
      for (var o = [], a = [], b = 0; b < t.length; ) {
        var R = t[b][e];
        st(a, R) < 0 && o.push(t[b]), a[b] = R, b++;
      }
      return o = o.sort(function(X, A) {
        return X[e] > A[e];
      }), o;
    }
    function pt(t, e) {
      for (var n, o, a = e[0].toUpperCase() + e.slice(1), b = 0; b < y.length; ) {
        if ((o = (n = y[b]) ? n + a : e) in t) return o;
        b++;
      }
      return l;
    }
    var ue = 1;
    function zt(t) {
      var e = t.ownerDocument || t;
      return e.defaultView || e.parentWindow || c;
    }
    var G = "ontouchstart" in c, ce = pt(c, "PointerEvent") !== l, Xt = G && /mobile|tablet|ip(ad|hone|od)|android/i.test(navigator.userAgent), B = "touch", $t = "mouse", Wt = 25, I = 1, _ = 4, Y = 8, xt = 1, dt = 2, vt = 4, gt = 8, mt = 16, V = dt | vt, J = gt | mt, It = V | J, Jt = ["x", "y"], Rt = ["clientX", "clientY"];
    function U(t, e) {
      var n = this;
      this.manager = t, this.callback = e, this.element = t.element, this.target = t.options.inputTarget, this.domHandler = function(o) {
        rt(t.options.enable, [t]) && n.handler(o);
      }, this.init();
    }
    function Zt(t, e, n) {
      var o = n.pointers.length, a = n.changedPointers.length, b = e & I && o - a == 0, R = e & (_ | Y) && o - a == 0;
      n.isFirst = !!b, n.isFinal = !!R, b && (t.session = {}), n.eventType = e, function(X, A) {
        var $ = X.session, re = A.pointers, _e = re.length;
        $.firstInput || ($.firstInput = qt(A)), _e > 1 && !$.firstMultiple ? $.firstMultiple = qt(A) : _e === 1 && ($.firstMultiple = !1);
        var Oe = $.firstInput, Ft = $.firstMultiple, Ne = Ft ? Ft.center : Oe.center, Ie = A.center = i(re);
        A.timeStamp = O(), A.deltaTime = A.timeStamp - Oe.timeStamp, A.angle = k(Ne, Ie), A.distance = T(Ne, Ie), function(et, L) {
          var bt = L.center, Dt = et.offsetDelta || {}, _t = et.prevDelta || {}, Ot = et.prevInput || {};
          L.eventType !== I && Ot.eventType !== _ || (_t = et.prevDelta = { x: Ot.deltaX || 0, y: Ot.deltaY || 0 }, Dt = et.offsetDelta = { x: bt.x, y: bt.y }), L.deltaX = _t.x + (bt.x - Dt.x), L.deltaY = _t.y + (bt.y - Dt.y);
        }($, A), A.offsetDirection = p(A.deltaX, A.deltaY);
        var Te, Fe, Mt = h(A.deltaTime, A.deltaX, A.deltaY);
        A.overallVelocityX = Mt.x, A.overallVelocityY = Mt.y, A.overallVelocity = C(Mt.x) > C(Mt.y) ? Mt.x : Mt.y, A.scale = Ft ? (Te = Ft.pointers, T((Fe = re)[0], Fe[1], Rt) / T(Te[0], Te[1], Rt)) : 1, A.rotation = Ft ? function(et, L) {
          return k(L[1], L[0], Rt) + k(et[1], et[0], Rt);
        }(Ft.pointers, re) : 0, A.maxPointers = $.prevInput ? A.pointers.length > $.prevInput.maxPointers ? A.pointers.length : $.prevInput.maxPointers : A.pointers.length, function(et, L) {
          var bt, Dt, _t, Ot, wt = et.lastInterval || L, Me = L.timeStamp - wt.timeStamp;
          if (L.eventType != Y && (Me > Wt || wt.velocity === l)) {
            var ke = L.deltaX - wt.deltaX, Le = L.deltaY - wt.deltaY, kt = h(Me, ke, Le);
            Dt = kt.x, _t = kt.y, bt = C(kt.x) > C(kt.y) ? kt.x : kt.y, Ot = p(ke, Le), et.lastInterval = L;
          } else bt = wt.velocity, Dt = wt.velocityX, _t = wt.velocityY, Ot = wt.direction;
          L.velocity = bt, L.velocityX = Dt, L.velocityY = _t, L.direction = Ot;
        }($, A);
        var ye = X.element;
        Yt(A.srcEvent.target, ye) && (ye = A.srcEvent.target), A.target = ye;
      }(t, n), t.emit("hammer.input", n), t.recognize(n), t.session.prevInput = n;
    }
    function qt(t) {
      for (var e = [], n = 0; n < t.pointers.length; ) e[n] = { clientX: g(t.pointers[n].clientX), clientY: g(t.pointers[n].clientY) }, n++;
      return { timeStamp: O(), pointers: e, center: i(e), deltaX: t.deltaX, deltaY: t.deltaY };
    }
    function i(t) {
      var e = t.length;
      if (e === 1) return { x: g(t[0].clientX), y: g(t[0].clientY) };
      for (var n = 0, o = 0, a = 0; a < e; ) n += t[a].clientX, o += t[a].clientY, a++;
      return { x: g(n / e), y: g(o / e) };
    }
    function h(t, e, n) {
      return { x: e / t || 0, y: n / t || 0 };
    }
    function p(t, e) {
      return t === e ? xt : C(t) >= C(e) ? t < 0 ? dt : vt : e < 0 ? gt : mt;
    }
    function T(t, e, n) {
      n || (n = Jt);
      var o = e[n[0]] - t[n[0]], a = e[n[1]] - t[n[1]];
      return Math.sqrt(o * o + a * a);
    }
    function k(t, e, n) {
      n || (n = Jt);
      var o = e[n[0]] - t[n[0]], a = e[n[1]] - t[n[1]];
      return 180 * Math.atan2(a, o) / Math.PI;
    }
    U.prototype = { handler: function() {
    }, init: function() {
      this.evEl && Pt(this.element, this.evEl, this.domHandler), this.evTarget && Pt(this.target, this.evTarget, this.domHandler), this.evWin && Pt(zt(this.element), this.evWin, this.domHandler);
    }, destroy: function() {
      this.evEl && At(this.element, this.evEl, this.domHandler), this.evTarget && At(this.target, this.evTarget, this.domHandler), this.evWin && At(zt(this.element), this.evWin, this.domHandler);
    } };
    var Tt = { mousedown: I, mousemove: 2, mouseup: _ }, m = "mousedown", S = "mousemove mouseup";
    function Z() {
      this.evEl = m, this.evWin = S, this.pressed = !1, U.apply(this, arguments);
    }
    j(Z, U, { handler: function(t) {
      var e = Tt[t.type];
      e & I && t.button === 0 && (this.pressed = !0), 2 & e && t.which !== 1 && (e = _), this.pressed && (e & _ && (this.pressed = !1), this.callback(this.manager, e, { pointers: [t], changedPointers: [t], pointerType: $t, srcEvent: t }));
    } });
    var z = { pointerdown: I, pointermove: 2, pointerup: _, pointercancel: Y, pointerout: Y }, ut = { 2: B, 3: "pen", 4: $t, 5: "kinect" }, yt = "pointerdown", Q = "pointermove pointerup pointercancel";
    function Et() {
      this.evEl = yt, this.evWin = Q, U.apply(this, arguments), this.store = this.manager.session.pointerEvents = [];
    }
    c.MSPointerEvent && !c.PointerEvent && (yt = "MSPointerDown", Q = "MSPointerMove MSPointerUp MSPointerCancel"), j(Et, U, { handler: function(t) {
      var e = this.store, n = !1, o = t.type.toLowerCase().replace("ms", ""), a = z[o], b = ut[t.pointerType] || t.pointerType, R = b == B, X = st(e, t.pointerId, "pointerId");
      a & I && (t.button === 0 || R) ? X < 0 && (e.push(t), X = e.length - 1) : a & (_ | Y) && (n = !0), X < 0 || (e[X] = t, this.callback(this.manager, a, { pointers: e, changedPointers: [t], pointerType: b, srcEvent: t }), n && e.splice(X, 1));
    } });
    var K = { touchstart: I, touchmove: 2, touchend: _, touchcancel: Y };
    function be() {
      this.evTarget = "touchstart", this.evWin = "touchstart touchmove touchend touchcancel", this.started = !1, U.apply(this, arguments);
    }
    function Ge(t, e) {
      var n = ft(t.touches), o = ft(t.changedTouches);
      return e & (_ | Y) && (n = Nt(n.concat(o), "identifier")), [n, o];
    }
    j(be, U, { handler: function(t) {
      var e = K[t.type];
      if (e === I && (this.started = !0), this.started) {
        var n = Ge.call(this, t, e);
        e & (_ | Y) && n[0].length - n[1].length == 0 && (this.started = !1), this.callback(this.manager, e, { pointers: n[0], changedPointers: n[1], pointerType: B, srcEvent: t });
      }
    } });
    var Je = { touchstart: I, touchmove: 2, touchend: _, touchcancel: Y }, Ze = "touchstart touchmove touchend touchcancel";
    function Qt() {
      this.evTarget = Ze, this.targetIds = {}, U.apply(this, arguments);
    }
    function Qe(t, e) {
      var n = ft(t.touches), o = this.targetIds;
      if (e & (2 | I) && n.length === 1) return o[n[0].identifier] = !0, [n, n];
      var a, b, R = ft(t.changedTouches), X = [], A = this.target;
      if (b = n.filter(function($) {
        return Yt($.target, A);
      }), e === I) for (a = 0; a < b.length; ) o[b[a].identifier] = !0, a++;
      for (a = 0; a < R.length; ) o[R[a].identifier] && X.push(R[a]), e & (_ | Y) && delete o[R[a].identifier], a++;
      return X.length ? [Nt(b.concat(X), "identifier"), X] : void 0;
    }
    j(Qt, U, { handler: function(t) {
      var e = Je[t.type], n = Qe.call(this, t, e);
      n && this.callback(this.manager, e, { pointers: n[0], changedPointers: n[1], pointerType: B, srcEvent: t });
    } });
    var Ke = 2500;
    function le() {
      U.apply(this, arguments);
      var t = nt(this.handler, this);
      this.touch = new Qt(this.manager, t), this.mouse = new Z(this.manager, t), this.primaryTouch = null, this.lastTouches = [];
    }
    function ti(t, e) {
      t & I ? (this.primaryTouch = e.changedPointers[0].identifier, we.call(this, e)) : t & (_ | Y) && we.call(this, e);
    }
    function we(t) {
      var e = t.changedPointers[0];
      if (e.identifier === this.primaryTouch) {
        var n = { x: e.clientX, y: e.clientY };
        this.lastTouches.push(n);
        var o = this.lastTouches;
        setTimeout(function() {
          var a = o.indexOf(n);
          a > -1 && o.splice(a, 1);
        }, Ke);
      }
    }
    function ei(t) {
      for (var e = t.srcEvent.clientX, n = t.srcEvent.clientY, o = 0; o < this.lastTouches.length; o++) {
        var a = this.lastTouches[o], b = Math.abs(e - a.x), R = Math.abs(n - a.y);
        if (b <= 25 && R <= 25) return !0;
      }
      return !1;
    }
    j(le, U, { handler: function(t, e, n) {
      var o = n.pointerType == B, a = n.pointerType == $t;
      if (!(a && n.sourceCapabilities && n.sourceCapabilities.firesTouchEvents)) {
        if (o) ti.call(this, e, n);
        else if (a && ei.call(this, n)) return;
        this.callback(t, e, n);
      }
    }, destroy: function() {
      this.touch.destroy(), this.mouse.destroy();
    } });
    var Pe = pt(w.style, "touchAction"), Ae = Pe !== l, xe = "compute", Re = "auto", he = "manipulation", Ct = "none", Ut = "pan-x", Vt = "pan-y", Kt = function() {
      if (!Ae) return !1;
      var t = {}, e = c.CSS && c.CSS.supports;
      return ["auto", "manipulation", "pan-y", "pan-x", "pan-x pan-y", "none"].forEach(function(n) {
        t[n] = !e || c.CSS.supports("touch-action", n);
      }), t;
    }();
    function fe(t, e) {
      this.manager = t, this.set(e);
    }
    fe.prototype = { set: function(t) {
      t == xe && (t = this.compute()), Ae && this.manager.element.style && Kt[t] && (this.manager.element.style[Pe] = t), this.actions = t.toLowerCase().trim();
    }, update: function() {
      this.set(this.manager.options.touchAction);
    }, compute: function() {
      var t = [];
      return M(this.manager.recognizers, function(e) {
        rt(e.options.enable, [e]) && (t = t.concat(e.getTouchAction()));
      }), function(e) {
        if (ot(e, Ct)) return Ct;
        var n = ot(e, Ut), o = ot(e, Vt);
        return n && o ? Ct : n || o ? n ? Ut : Vt : ot(e, he) ? he : Re;
      }(t.join(" "));
    }, preventDefaults: function(t) {
      var e = t.srcEvent, n = t.offsetDirection;
      if (this.manager.session.prevented) e.preventDefault();
      else {
        var o = this.actions, a = ot(o, Ct) && !Kt[Ct], b = ot(o, Vt) && !Kt[Vt], R = ot(o, Ut) && !Kt[Ut];
        if (a) {
          var X = t.pointers.length === 1, A = t.distance < 2, $ = t.deltaTime < 250;
          if (X && A && $) return;
        }
        if (!R || !b) return a || b && n & V || R && n & J ? this.preventSrc(e) : void 0;
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
      var n = e.manager;
      return n ? n.get(t) : t;
    }
    function tt() {
      lt.apply(this, arguments);
    }
    function ie() {
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
    function ne() {
      lt.apply(this, arguments), this.pTime = !1, this.pCenter = !1, this._timer = null, this._input = null, this.count = 0;
    }
    function St(t, e) {
      return (e = e || {}).recognizers = at(e.recognizers, St.defaults.preset), new me(t, e);
    }
    function me(t, e) {
      this.options = E({}, St.defaults, e || {}), this.options.inputTarget = this.options.inputTarget || t, this.handlers = {}, this.session = {}, this.recognizers = [], this.oldCssProps = {}, this.element = t, this.input = new (this.options.inputClass || (ce ? Et : Xt ? Qt : G ? le : Z))(this, Zt), this.touchAction = new fe(this, this.options.touchAction), De(this, !0), M(this.options.recognizers, function(n) {
        var o = this.add(new n[0](n[1]));
        n[2] && o.recognizeWith(n[2]), n[3] && o.requireFailure(n[3]);
      }, this);
    }
    function De(t, e) {
      var n, o = t.element;
      o.style && (M(t.options.cssProps, function(a, b) {
        n = pt(o.style, b), e ? (t.oldCssProps[n] = o.style[n], o.style[n] = a) : o.style[n] = t.oldCssProps[n] || "";
      }), e || (t.oldCssProps = {}));
    }
    lt.prototype = { defaults: {}, set: function(t) {
      return E(this.options, t), this.manager && this.manager.touchAction.update(), this;
    }, recognizeWith: function(t) {
      if (N(t, "recognizeWith", this)) return this;
      var e = this.simultaneous;
      return e[(t = ee(t, this)).id] || (e[t.id] = t, t.recognizeWith(this)), this;
    }, dropRecognizeWith: function(t) {
      return N(t, "dropRecognizeWith", this) || (t = ee(t, this), delete this.simultaneous[t.id]), this;
    }, requireFailure: function(t) {
      if (N(t, "requireFailure", this)) return this;
      var e = this.requireFail;
      return st(e, t = ee(t, this)) === -1 && (e.push(t), t.requireFailure(this)), this;
    }, dropRequireFailure: function(t) {
      if (N(t, "dropRequireFailure", this)) return this;
      t = ee(t, this);
      var e = st(this.requireFail, t);
      return e > -1 && this.requireFail.splice(e, 1), this;
    }, hasRequireFailures: function() {
      return this.requireFail.length > 0;
    }, canRecognizeWith: function(t) {
      return !!this.simultaneous[t.id];
    }, emit: function(t) {
      var e = this, n = this.state;
      function o(a) {
        e.manager.emit(a, t);
      }
      n < 8 && o(e.options.event + Ce(n)), o(e.options.event), t.additionalEvent && o(t.additionalEvent), n >= 8 && o(e.options.event + Ce(n));
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
    } }, j(tt, lt, { defaults: { pointers: 1 }, attrTest: function(t) {
      var e = this.options.pointers;
      return e === 0 || t.pointers.length === e;
    }, process: function(t) {
      var e = this.state, n = t.eventType, o = 6 & e, a = this.attrTest(t);
      return o && (n & Y || !a) ? 16 | e : o || a ? n & _ ? 8 | e : 2 & e ? 4 | e : 2 : ct;
    } }), j(ie, tt, { defaults: { event: "pan", threshold: 10, pointers: 1, direction: It }, getTouchAction: function() {
      var t = this.options.direction, e = [];
      return t & V && e.push(Vt), t & J && e.push(Ut), e;
    }, directionTest: function(t) {
      var e = this.options, n = !0, o = t.distance, a = t.direction, b = t.deltaX, R = t.deltaY;
      return a & e.direction || (e.direction & V ? (a = b === 0 ? xt : b < 0 ? dt : vt, n = b != this.pX, o = Math.abs(t.deltaX)) : (a = R === 0 ? xt : R < 0 ? gt : mt, n = R != this.pY, o = Math.abs(t.deltaY))), t.direction = a, n && o > e.threshold && a & e.direction;
    }, attrTest: function(t) {
      return tt.prototype.attrTest.call(this, t) && (2 & this.state || !(2 & this.state) && this.directionTest(t));
    }, emit: function(t) {
      this.pX = t.deltaX, this.pY = t.deltaY;
      var e = Se(t.direction);
      e && (t.additionalEvent = this.options.event + e), this._super.emit.call(this, t);
    } }), j(pe, tt, { defaults: { event: "pinch", threshold: 0, pointers: 2 }, getTouchAction: function() {
      return [Ct];
    }, attrTest: function(t) {
      return this._super.attrTest.call(this, t) && (Math.abs(t.scale - 1) > this.options.threshold || 2 & this.state);
    }, emit: function(t) {
      if (t.scale !== 1) {
        var e = t.scale < 1 ? "in" : "out";
        t.additionalEvent = this.options.event + e;
      }
      this._super.emit.call(this, t);
    } }), j(de, lt, { defaults: { event: "press", pointers: 1, time: 251, threshold: 9 }, getTouchAction: function() {
      return [Re];
    }, process: function(t) {
      var e = this.options, n = t.pointers.length === e.pointers, o = t.distance < e.threshold, a = t.deltaTime > e.time;
      if (this._input = t, !o || !n || t.eventType & (_ | Y) && !a) this.reset();
      else if (t.eventType & I) this.reset(), this._timer = F(function() {
        this.state = 8, this.tryEmit();
      }, e.time, this);
      else if (t.eventType & _) return 8;
      return ct;
    }, reset: function() {
      clearTimeout(this._timer);
    }, emit: function(t) {
      this.state === 8 && (t && t.eventType & _ ? this.manager.emit(this.options.event + "up", t) : (this._input.timeStamp = O(), this.manager.emit(this.options.event, this._input)));
    } }), j(ve, tt, { defaults: { event: "rotate", threshold: 0, pointers: 2 }, getTouchAction: function() {
      return [Ct];
    }, attrTest: function(t) {
      return this._super.attrTest.call(this, t) && (Math.abs(t.rotation) > this.options.threshold || 2 & this.state);
    } }), j(ge, tt, { defaults: { event: "swipe", threshold: 10, velocity: 0.3, direction: V | J, pointers: 1 }, getTouchAction: function() {
      return ie.prototype.getTouchAction.call(this);
    }, attrTest: function(t) {
      var e, n = this.options.direction;
      return n & (V | J) ? e = t.overallVelocity : n & V ? e = t.overallVelocityX : n & J && (e = t.overallVelocityY), this._super.attrTest.call(this, t) && n & t.offsetDirection && t.distance > this.options.threshold && t.maxPointers == this.options.pointers && C(e) > this.options.velocity && t.eventType & _;
    }, emit: function(t) {
      var e = Se(t.offsetDirection);
      e && this.manager.emit(this.options.event + e, t), this.manager.emit(this.options.event, t);
    } }), j(ne, lt, { defaults: { event: "tap", pointers: 1, taps: 1, interval: 300, time: 250, threshold: 9, posThreshold: 10 }, getTouchAction: function() {
      return [he];
    }, process: function(t) {
      var e = this.options, n = t.pointers.length === e.pointers, o = t.distance < e.threshold, a = t.deltaTime < e.time;
      if (this.reset(), t.eventType & I && this.count === 0) return this.failTimeout();
      if (o && a && n) {
        if (t.eventType != _) return this.failTimeout();
        var b = !this.pTime || t.timeStamp - this.pTime < e.interval, R = !this.pCenter || T(this.pCenter, t.center) < e.posThreshold;
        if (this.pTime = t.timeStamp, this.pCenter = t.center, R && b ? this.count += 1 : this.count = 1, this._input = t, this.count % e.taps == 0) return this.hasRequireFailures() ? (this._timer = F(function() {
          this.state = 8, this.tryEmit();
        }, e.interval, this), 2) : 8;
      }
      return ct;
    }, failTimeout: function() {
      return this._timer = F(function() {
        this.state = ct;
      }, this.options.interval, this), ct;
    }, reset: function() {
      clearTimeout(this._timer);
    }, emit: function() {
      this.state == 8 && (this._input.tapCount = this.count, this.manager.emit(this.options.event, this._input));
    } }), St.VERSION = "2.0.7", St.defaults = { domEvents: !1, touchAction: xe, enable: !0, inputTarget: null, inputClass: null, preset: [[ve, { enable: !1 }], [pe, { enable: !1 }, ["rotate"]], [ge, { direction: V }], [ie, { direction: V }, ["swipe"]], [ne], [ne, { event: "doubletap", taps: 2 }, ["tap"]], [de]], cssProps: { userSelect: "none", touchSelect: "none", touchCallout: "none", contentZooming: "none", userDrag: "none", tapHighlightColor: "rgba(0,0,0,0)" } }, me.prototype = { set: function(t) {
      return E(this.options, t), t.touchAction && this.touchAction.update(), t.inputTarget && (this.input.destroy(), this.input.target = t.inputTarget, this.input.init()), this;
    }, stop: function(t) {
      this.session.stopped = t ? 2 : 1;
    }, recognize: function(t) {
      var e = this.session;
      if (!e.stopped) {
        var n;
        this.touchAction.preventDefaults(t);
        var o = this.recognizers, a = e.curRecognizer;
        (!a || a && 8 & a.state) && (a = e.curRecognizer = null);
        for (var b = 0; b < o.length; ) n = o[b], e.stopped === 2 || a && n != a && !n.canRecognizeWith(a) ? n.reset() : n.recognize(t), !a && 14 & n.state && (a = e.curRecognizer = n), b++;
      }
    }, get: function(t) {
      if (t instanceof lt) return t;
      for (var e = this.recognizers, n = 0; n < e.length; n++) if (e[n].options.event == t) return e[n];
      return null;
    }, add: function(t) {
      if (N(t, "add", this)) return this;
      var e = this.get(t.options.event);
      return e && this.remove(e), this.recognizers.push(t), t.manager = this, this.touchAction.update(), t;
    }, remove: function(t) {
      if (N(t, "remove", this)) return this;
      if (t = this.get(t)) {
        var e = this.recognizers, n = st(e, t);
        n !== -1 && (e.splice(n, 1), this.touchAction.update());
      }
      return this;
    }, on: function(t, e) {
      if (t !== l && e !== l) {
        var n = this.handlers;
        return M(ht(t), function(o) {
          n[o] = n[o] || [], n[o].push(e);
        }), this;
      }
    }, off: function(t, e) {
      if (t !== l) {
        var n = this.handlers;
        return M(ht(t), function(o) {
          e ? n[o] && n[o].splice(st(n[o], e), 1) : delete n[o];
        }), this;
      }
    }, emit: function(t, e) {
      this.options.domEvents && function(a, b) {
        var R = v.createEvent("Event");
        R.initEvent(a, !0, !0), R.gesture = b, b.target.dispatchEvent(R);
      }(t, e);
      var n = this.handlers[t] && this.handlers[t].slice();
      if (n && n.length) {
        e.type = t, e.preventDefault = function() {
          e.srcEvent.preventDefault();
        };
        for (var o = 0; o < n.length; ) n[o](e), o++;
      }
    }, destroy: function() {
      this.element && De(this, !1), this.handlers = {}, this.session = {}, this.input.destroy(), this.element = null;
    } }, E(St, { INPUT_START: I, INPUT_MOVE: 2, INPUT_END: _, INPUT_CANCEL: Y, STATE_POSSIBLE: te, STATE_BEGAN: 2, STATE_CHANGED: 4, STATE_ENDED: 8, STATE_RECOGNIZED: 8, STATE_CANCELLED: 16, STATE_FAILED: ct, DIRECTION_NONE: xt, DIRECTION_LEFT: dt, DIRECTION_RIGHT: vt, DIRECTION_UP: gt, DIRECTION_DOWN: mt, DIRECTION_HORIZONTAL: V, DIRECTION_VERTICAL: J, DIRECTION_ALL: It, Manager: me, Input: U, TouchAction: fe, TouchInput: Qt, MouseInput: Z, PointerEventInput: Et, TouchMouseInput: le, SingleTouchInput: be, Recognizer: lt, AttrRecognizer: tt, Tap: ne, Pan: ie, Swipe: ge, Pinch: pe, Rotate: ve, Press: de, on: Pt, off: At, each: M, merge: it, extend: H, assign: E, inherit: j, bindFn: nt, prefixed: pt }), (c !== void 0 ? c : typeof self < "u" ? self : {}).Hammer = St, (u = (function() {
      return St;
    }).call(r, s, r, d)) === l || (d.exports = u);
  })(window, document);
}, 970: (d, r, s) => {
  s.d(r, { A: () => l });
  var u = s(645), c = s.n(u), v = s(278), f = s.n(v)()(c());
  f.push([d.id, ".flipbook{height:100%;width:100%;overflow:hidden}.flipbook-debug-bar{position:absolute;bottom:0;left:0;width:100%;background-color:rgba(0,0,0,.5);color:#fff;padding:10px;box-sizing:border-box;display:flex;flex-wrap:wrap;justify-content:space-between;z-index:9999}", ""]);
  const l = f;
}, 0: (d, r, s) => {
  s.d(r, { A: () => l });
  var u = s(645), c = s.n(u), v = s(278), f = s.n(v)()(c());
  f.push([d.id, ".page{position:absolute;backface-visibility:hidden;transform-style:preserve-3d}.page>*{max-width:100%;max-height:100%;height:100%;width:100%;box-sizing:border-box}", ""]);
  const l = f;
}, 278: (d) => {
  d.exports = function(r) {
    var s = [];
    return s.toString = function() {
      return this.map(function(u) {
        var c = "", v = u[5] !== void 0;
        return u[4] && (c += "@supports (".concat(u[4], ") {")), u[2] && (c += "@media ".concat(u[2], " {")), v && (c += "@layer".concat(u[5].length > 0 ? " ".concat(u[5]) : "", " {")), c += r(u), v && (c += "}"), u[2] && (c += "}"), u[4] && (c += "}"), c;
      }).join("");
    }, s.i = function(u, c, v, f, l) {
      typeof u == "string" && (u = [[null, u, void 0]]);
      var E = {};
      if (v) for (var y = 0; y < this.length; y++) {
        var w = this[y][0];
        w != null && (E[w] = !0);
      }
      for (var P = 0; P < u.length; P++) {
        var g = [].concat(u[P]);
        v && E[g[0]] || (l !== void 0 && (g[5] === void 0 || (g[1] = "@layer".concat(g[5].length > 0 ? " ".concat(g[5]) : "", " {").concat(g[1], "}")), g[5] = l), c && (g[2] && (g[1] = "@media ".concat(g[2], " {").concat(g[1], "}")), g[2] = c), f && (g[4] ? (g[1] = "@supports (".concat(g[4], ") {").concat(g[1], "}"), g[4] = f) : g[4] = "".concat(f)), s.push(g));
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
    for (var f = -1, l = 0; l < r.length; l++) if (r[l].identifier === v) {
      f = l;
      break;
    }
    return f;
  }
  function u(v, f) {
    for (var l = {}, E = [], y = 0; y < v.length; y++) {
      var w = v[y], P = f.base ? w[0] + f.base : w[0], g = l[P] || 0, C = "".concat(P, " ").concat(g);
      l[P] = g + 1;
      var O = s(C), F = { css: w[1], media: w[2], sourceMap: w[3], supports: w[4], layer: w[5] };
      if (O !== -1) r[O].references++, r[O].updater(F);
      else {
        var N = c(F, f);
        f.byIndex = y, r.splice(y, 0, { identifier: C, updater: N, references: 1 });
      }
      E.push(C);
    }
    return E;
  }
  function c(v, f) {
    var l = f.domAPI(f);
    return l.update(v), function(E) {
      if (E) {
        if (E.css === v.css && E.media === v.media && E.sourceMap === v.sourceMap && E.supports === v.supports && E.layer === v.layer) return;
        l.update(v = E);
      } else l.remove();
    };
  }
  d.exports = function(v, f) {
    var l = u(v = v || [], f = f || {});
    return function(E) {
      E = E || [];
      for (var y = 0; y < l.length; y++) {
        var w = s(l[y]);
        r[w].references--;
      }
      for (var P = u(E, f), g = 0; g < l.length; g++) {
        var C = s(l[g]);
        r[C].references === 0 && (r[C].updater(), r.splice(C, 1));
      }
      l = P;
    };
  };
}, 383: (d) => {
  var r = {};
  d.exports = function(s, u) {
    var c = function(v) {
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
    if (!c) throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
    c.appendChild(u);
  };
}, 88: (d) => {
  d.exports = function(r) {
    var s = document.createElement("style");
    return r.setAttributes(s, r.attributes), r.insert(s, r.options), s;
  };
}, 884: (d, r, s) => {
  d.exports = function(u) {
    var c = s.nc;
    c && u.setAttribute("nonce", c);
  };
}, 893: (d) => {
  d.exports = function(r) {
    if (typeof document > "u") return { update: function() {
    }, remove: function() {
    } };
    var s = r.insertStyleElement(r);
    return { update: function(u) {
      (function(c, v, f) {
        var l = "";
        f.supports && (l += "@supports (".concat(f.supports, ") {")), f.media && (l += "@media ".concat(f.media, " {"));
        var E = f.layer !== void 0;
        E && (l += "@layer".concat(f.layer.length > 0 ? " ".concat(f.layer) : "", " {")), l += f.css, E && (l += "}"), f.media && (l += "}"), f.supports && (l += "}");
        var y = f.sourceMap;
        y && typeof btoa < "u" && (l += `
/*# sourceMappingURL=data:application/json;base64,`.concat(btoa(unescape(encodeURIComponent(JSON.stringify(y)))), " */")), v.styleTagTransform(l, c, v.options);
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
  return ci[d](s, s.exports, D), s.exports;
}
D.n = (d) => {
  var r = d && d.__esModule ? () => d.default : () => d;
  return D.d(r, { a: r }), r;
}, D.d = (d, r) => {
  for (var s in r) D.o(r, s) && !D.o(d, s) && Object.defineProperty(d, s, { enumerable: !0, get: r[s] });
}, D.o = (d, r) => Object.prototype.hasOwnProperty.call(d, r), D.nc = void 0;
var $e = {};
D.d($e, { $: () => yi });
var li = D(292), We = D.n(li), hi = D(893), qe = D.n(hi), fi = D(383), Ue = D.n(fi), pi = D(884), Ve = D.n(pi), di = D(88), He = D.n(di), vi = D(997), Be = D.n(vi), oe = D(0), Lt = {};
Lt.styleTagTransform = Be(), Lt.setAttributes = Ve(), Lt.insert = Ue().bind(null, "head"), Lt.domAPI = qe(), Lt.insertStyleElement = He(), We()(oe.A, Lt), oe.A && oe.A.locals && oe.A.locals;
var se = D(970), jt = {};
jt.styleTagTransform = Be(), jt.setAttributes = Ve(), jt.insert = Ue().bind(null, "head"), jt.domAPI = qe(), jt.insertStyleElement = He(), We()(se.A, jt), se.A && se.A.locals && se.A.locals;
var W, gi = D(168), mi = D.n(gi);
(function(d) {
  d.Forward = "Forward", d.Backward = "Backward", d.None = "None";
})(W || (W = {}));
class Ti {
  constructor(r, s, u, c, v) {
    x(this, "index");
    x(this, "pages");
    x(this, "bookProperties");
    x(this, "onTurned");
    x(this, "currentAnimation", null);
    x(this, "targetFlipPosition", null);
    x(this, "wrappedFlipPosition");
    this.index = r, this.pages = s, this.bookProperties = c, this.onTurned = v, this.wrappedFlipPosition = u ? 1 : 0;
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
      const c = this.flipPosition, v = 180 * Math.abs(r - c) / s * 1e3, f = performance.now(), l = (E) => {
        const y = E - f;
        if (y < 0) return void requestAnimationFrame(l);
        const w = Math.min(y / v, 1), P = c + w * (r - c);
        this.pages.forEach((g, C) => {
          const O = this.bookProperties.isLTR;
          if (g) {
            const F = C % 2 + 1 == 1, N = (F ? O ? P > 0.5 ? 180 - 180 * P : 180 * -P : P > 0.5 ? -(180 - 180 * P) : 180 * P : O ? P < 0.5 ? 180 * -P : 180 - 180 * P : P < 0.5 ? 180 * P : -(180 - 180 * P)) + "deg", M = F ? O ? "100%" : "-100%" : "0px", q = F ? P > 0.5 ? -1 : 1 : P < 0.5 ? -1 : 1;
            g.style.transform = `translateX(${M})rotateY(${N})scaleX(${q})`, g.style.transformOrigin = F ? O ? "left" : "right" : O ? "right" : "left", g.style.zIndex = `${P > 0.5 ? g.dataset.pageIndex : this.bookProperties.pagesCount - g.dataset.pageIndex}`;
          }
        }), this.flipPosition = Math.max(0, Math.min(1, P)), this.flipPosition !== 1 && this.flipPosition !== 0 || this.onTurned(this.flipPosition === 1 ? W.Forward : W.Backward), w < 1 ? requestAnimationFrame(l) : (this.currentAnimation = null, this.targetFlipPosition = null, u());
      };
      requestAnimationFrame(l);
    }), this.currentAnimation);
  }
  async efficientFlipToPosition(r, s = 2e4) {
    return function(u, c, v) {
      var f, l = {}, E = l.noTrailing, y = E !== void 0 && E, w = l.noLeading, P = w !== void 0 && w, g = l.debounceMode, C = g === void 0 ? void 0 : g, O = !1, F = 0;
      function N() {
        f && clearTimeout(f);
      }
      function M() {
        for (var q = arguments.length, H = new Array(q), it = 0; it < q; it++) H[it] = arguments[it];
        var j = this, nt = Date.now() - F;
        function rt() {
          F = Date.now(), c.apply(j, H);
        }
        function at() {
          f = void 0;
        }
        O || (P || !C || f || rt(), N(), C === void 0 && nt > u ? P ? (F = Date.now(), y || (f = setTimeout(C ? at : rt, u))) : rt() : y !== !0 && (f = setTimeout(C ? at : rt, C === void 0 ? u - nt : u)));
      }
      return M.cancel = function(q) {
        var H = (q || {}).upcomingOnly, it = H !== void 0 && H;
        N(), O = !it;
      }, M;
    }(1, this.flipToPosition.bind(this))(r, s);
  }
}
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
class yi {
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
    x(this, "flipDirection", W.None);
    x(this, "flipStartingPos", 0);
    x(this, "isDuringManualFlip", !1);
    x(this, "flipDelta", 0);
    x(this, "isDuringAutoFlip", !1);
    x(this, "touchStartingPos", { x: 0, y: 0 });
    x(this, "prevVisiblePageIndices");
    x(this, "handleTouchStart", (r) => {
      if (r.touches.length > 1) return;
      const s = r.touches[0];
      this.touchStartingPos = { x: s.pageX, y: s.pageY };
    });
    x(this, "handleTouchMove", (r) => {
      if (r.touches.length > 1) return;
      const s = r.touches[0], u = s.pageX - this.touchStartingPos.x, c = s.pageY - this.touchStartingPos.y;
      Math.abs(u) > Math.abs(c) && r.preventDefault();
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
    const c = u.querySelectorAll(".page");
    if (!c.length) throw new Error("No pages found in flipbook");
    this.pageElements = Array.from(c), this.leaves.splice(0, this.leaves.length);
    const v = Math.ceil(this.pagesCount / 2), f = new Gt(this.bookElement.clientWidth / 2, this.bookElement.clientHeight).aspectRatioFit(this.coverAspectRatio), l = new Gt(f.width * this.leafAspectRatio.width / this.coverAspectRatio.width, f.height * this.leafAspectRatio.height / this.coverAspectRatio.height);
    this.bookElement.style.perspective = 2 * Math.min(2 * l.width, l.height) + "px", this.pageElements.forEach((y, w) => {
      var C, O;
      y.style.width = `${l.width}px`, y.style.height = `${l.height}px`, y.style.zIndex = "" + (this.pagesCount - w), y.dataset.pageIndex = w.toString(), y.style[this.isLTR ? "left" : "right"] = (u.clientWidth - 2 * l.width) / 2 + "px", y.style.top = (u.clientHeight - l.height) / 2 + "px", y.dataset.pageSemanticName = ((C = this.pageSemantics) == null ? void 0 : C.indexToSemanticName(w)) ?? "", y.dataset.pageTitle = ((O = this.pageSemantics) == null ? void 0 : O.indexToTitle(w)) ?? "";
      const P = Math.floor(w / 2), g = (w + 1) % 2 == 1;
      y.classList.add(g ? "odd" : "even", ...w === 0 ? ["current-page"] : []), g ? (y.style.transform = `translateX(${this.isLTR ? "" : "-"}100%)`, this.leaves[P] = new Ti(P, [y, void 0], !1, { isLTR: this.isLTR, leavesCount: v, pagesCount: this.pagesCount }, (F) => {
        const N = F == W.Forward ? w + 2 === this.pagesCount ? [w + 1] : [w + 1, w + 2] : w === 0 ? [w] : [w - 1, w];
        if (this.prevVisiblePageIndices && this.prevVisiblePageIndices.length === N.length && N.every((q, H) => q === this.prevVisiblePageIndices[H])) return;
        const M = this.prevVisiblePageIndices;
        this.prevVisiblePageIndices = N, this.onTurned(N, M);
      })) : (y.style.transform = `scaleX(-1)translateX(${this.isLTR ? "-" : ""}100%)`, this.leaves[P].pages[1] = y);
    });
    const E = new (mi())(this.bookElement);
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
    if (console.log("drag start"), this.currentLeaf || this.isDuringAutoFlip) return this.flipDirection = W.None, void (this.flipStartingPos = 0);
    this.flipStartingPos = r.center.x;
  }
  onDragUpdate(r) {
    var s;
    if (console.log("drag update"), !this.isDuringAutoFlip && !this.isDuringManualFlip) {
      this.isDuringManualFlip = !0;
      try {
        const u = r.center.x;
        this.flipDelta = this.isLTR ? this.flipStartingPos - u : u - this.flipStartingPos;
        const c = ((s = this.bookElement) == null ? void 0 : s.clientWidth) ?? 0;
        if (Math.abs(this.flipDelta) > c || this.flipDelta === 0) return;
        switch (this.flipDirection = this.flipDirection !== W.None ? this.flipDirection : this.flipDelta > 0 ? W.Forward : W.Backward, this.flipDirection) {
          case W.Forward:
            const v = this.flipDelta / c;
            if (v > 1 || this.flipDelta < 0) return;
            if (!this.currentLeaf) {
              if (this.isClosedInverted) return;
              this.currentLeaf = this.currentOrTurningLeaves[1];
            }
            this.currentLeaf.efficientFlipToPosition(v);
            break;
          case W.Backward:
            const f = 1 - Math.abs(this.flipDelta) / c;
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
    if (console.log("drag end"), !this.currentLeaf || this.isDuringAutoFlip) return this.flipDirection = W.None, void (this.flipStartingPos = 0);
    const s = 1e3 * r.velocityX;
    let u;
    switch (this.flipDirection) {
      case W.Forward:
        u = (this.isLTR ? s < -500 : s > 500) || this.currentLeaf.flipPosition >= 0.5 ? 1 : 0;
        break;
      case W.Backward:
        u = (this.isLTR ? s > 500 : s < -500) || this.currentLeaf.flipPosition <= 0.5 ? 0 : 1;
        break;
      default:
        return;
    }
    this.isDuringAutoFlip = !0, this.flipDirection = W.None, this.flipStartingPos = 0, await this.currentLeaf.flipToPosition(u), this.isDuringAutoFlip = !1, this.currentLeaf = void 0;
  }
  onTurned(r, s) {
    for (let u = 0; u < this.pageElements.length; u++) {
      const c = this.pageElements[u];
      (r.includes(u) ? c.classList.add : s && s.includes ? c.classList.remove : () => null).bind(c.classList)("current-page");
    }
  }
  jumpToPage(r) {
    this.onPageChanged && this.onPageChanged(r);
  }
}
var Ei = $e.$;
const Pi = ({
  pages: d,
  className: r,
  debug: s = !1,
  direction: u = "ltr",
  // Add the direction prop
  pageSemantics: c = void 0
}) => {
  const v = oi(
    new Ei({
      pageSemantics: c,
      pagesCount: d.length,
      direction: u
    })
  );
  return si(() => {
    v.current.render(`.${r}`, s);
  }, []), /* @__PURE__ */ ze.jsx("div", { className: r, children: d.map((f, l) => /* @__PURE__ */ ze.jsx("div", { className: "page", children: f }, l)) });
};
export {
  Pi as FlipBook
};
//# sourceMappingURL=flip-book.js.map
