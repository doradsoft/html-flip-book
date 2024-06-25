var rn = Object.defineProperty;
var on = (d, r, a) => r in d ? rn(d, r, { enumerable: !0, configurable: !0, writable: !0, value: a }) : d[r] = a;
var A = (d, r, a) => on(d, typeof r != "symbol" ? r + "" : r, a);
import Ge, { useRef as sn, useEffect as an } from "react";
var Me = { exports: {} }, oe = {};
var Ue;
function un() {
  if (Ue) return oe;
  Ue = 1;
  var d = Ge, r = Symbol.for("react.element"), a = Symbol.for("react.fragment"), l = Object.prototype.hasOwnProperty, p = d.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, m = { key: !0, ref: !0, __self: !0, __source: !0 };
  function f(h, v, T) {
    var w, E = {}, g = null, C = null;
    T !== void 0 && (g = "" + T), v.key !== void 0 && (g = "" + v.key), v.ref !== void 0 && (C = v.ref);
    for (w in v) l.call(v, w) && !m.hasOwnProperty(w) && (E[w] = v[w]);
    if (h && h.defaultProps) for (w in v = h.defaultProps, v) E[w] === void 0 && (E[w] = v[w]);
    return { $$typeof: r, type: h, key: g, ref: C, props: E, _owner: p.current };
  }
  return oe.Fragment = a, oe.jsx = f, oe.jsxs = f, oe;
}
var se = {};
var Ve;
function cn() {
  return Ve || (Ve = 1, process.env.NODE_ENV !== "production" && function() {
    var d = Ge, r = Symbol.for("react.element"), a = Symbol.for("react.portal"), l = Symbol.for("react.fragment"), p = Symbol.for("react.strict_mode"), m = Symbol.for("react.profiler"), f = Symbol.for("react.provider"), h = Symbol.for("react.context"), v = Symbol.for("react.forward_ref"), T = Symbol.for("react.suspense"), w = Symbol.for("react.suspense_list"), E = Symbol.for("react.memo"), g = Symbol.for("react.lazy"), C = Symbol.for("react.offscreen"), M = Symbol.iterator, z = "@@iterator";
    function G(n) {
      if (n === null || typeof n != "object")
        return null;
      var s = M && n[M] || n[z];
      return typeof s == "function" ? s : null;
    }
    var j = d.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function O(n) {
      {
        for (var s = arguments.length, c = new Array(s > 1 ? s - 1 : 0), y = 1; y < s; y++)
          c[y - 1] = arguments[y];
        ot("error", n, c);
      }
    }
    function ot(n, s, c) {
      {
        var y = j.ReactDebugCurrentFrame, x = y.getStackAddendum();
        x !== "" && (s += "%s", c = c.concat([x]));
        var S = c.map(function(b) {
          return String(b);
        });
        S.unshift("Warning: " + s), Function.prototype.apply.call(console[n], console, S);
      }
    }
    var st = !1, q = !1, ft = !1, at = !1, Tt = !1, bt;
    bt = Symbol.for("react.module.reference");
    function Ft(n) {
      return !!(typeof n == "string" || typeof n == "function" || n === l || n === m || Tt || n === p || n === T || n === w || at || n === C || st || q || ft || typeof n == "object" && n !== null && (n.$$typeof === g || n.$$typeof === E || n.$$typeof === f || n.$$typeof === h || n.$$typeof === v || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      n.$$typeof === bt || n.getModuleId !== void 0));
    }
    function ue(n, s, c) {
      var y = n.displayName;
      if (y)
        return y;
      var x = s.displayName || s.name || "";
      return x !== "" ? c + "(" + x + ")" : c;
    }
    function ut(n) {
      return n.displayName || "Context";
    }
    function J(n) {
      if (n == null)
        return null;
      if (typeof n.tag == "number" && O("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof n == "function")
        return n.displayName || n.name || null;
      if (typeof n == "string")
        return n;
      switch (n) {
        case l:
          return "Fragment";
        case a:
          return "Portal";
        case m:
          return "Profiler";
        case p:
          return "StrictMode";
        case T:
          return "Suspense";
        case w:
          return "SuspenseList";
      }
      if (typeof n == "object")
        switch (n.$$typeof) {
          case h:
            var s = n;
            return ut(s) + ".Consumer";
          case f:
            var c = n;
            return ut(c._context) + ".Provider";
          case v:
            return ue(n, n.render, "ForwardRef");
          case E:
            var y = n.displayName || null;
            return y !== null ? y : J(n.type) || "Memo";
          case g: {
            var x = n, S = x._payload, b = x._init;
            try {
              return J(b(S));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var Z = Object.assign, ct = 0, Ut, Et, ce, Vt, Bt, le, he;
    function pt() {
    }
    pt.__reactDisabledLog = !0;
    function Ht() {
      {
        if (ct === 0) {
          Ut = console.log, Et = console.info, ce = console.warn, Vt = console.error, Bt = console.group, le = console.groupCollapsed, he = console.groupEnd;
          var n = {
            configurable: !0,
            enumerable: !0,
            value: pt,
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
        ct++;
      }
    }
    function xe() {
      {
        if (ct--, ct === 0) {
          var n = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: Z({}, n, {
              value: Ut
            }),
            info: Z({}, n, {
              value: Et
            }),
            warn: Z({}, n, {
              value: ce
            }),
            error: Z({}, n, {
              value: Vt
            }),
            group: Z({}, n, {
              value: Bt
            }),
            groupCollapsed: Z({}, n, {
              value: le
            }),
            groupEnd: Z({}, n, {
              value: he
            })
          });
        }
        ct < 0 && O("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var N = j.ReactCurrentDispatcher, I;
    function Y(n, s, c) {
      {
        if (I === void 0)
          try {
            throw Error();
          } catch (x) {
            var y = x.stack.trim().match(/\n( *(at )?)/);
            I = y && y[1] || "";
          }
        return `
` + I + n;
      }
    }
    var dt = !1, lt;
    {
      var Rt = typeof WeakMap == "function" ? WeakMap : Map;
      lt = new Rt();
    }
    function vt(n, s) {
      if (!n || dt)
        return "";
      {
        var c = lt.get(n);
        if (c !== void 0)
          return c;
      }
      var y;
      dt = !0;
      var x = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var S;
      S = N.current, N.current = null, Ht();
      try {
        if (s) {
          var b = function() {
            throw Error();
          };
          if (Object.defineProperty(b.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(b, []);
            } catch (W) {
              y = W;
            }
            Reflect.construct(n, [], b);
          } else {
            try {
              b.call();
            } catch (W) {
              y = W;
            }
            n.call(b.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (W) {
            y = W;
          }
          n();
        }
      } catch (W) {
        if (W && y && typeof W.stack == "string") {
          for (var P = W.stack.split(`
`), $ = y.stack.split(`
`), k = P.length - 1, L = $.length - 1; k >= 1 && L >= 0 && P[k] !== $[L]; )
            L--;
          for (; k >= 1 && L >= 0; k--, L--)
            if (P[k] !== $[L]) {
              if (k !== 1 || L !== 1)
                do
                  if (k--, L--, L < 0 || P[k] !== $[L]) {
                    var B = `
` + P[k].replace(" at new ", " at ");
                    return n.displayName && B.includes("<anonymous>") && (B = B.replace("<anonymous>", n.displayName)), typeof n == "function" && lt.set(n, B), B;
                  }
                while (k >= 1 && L >= 0);
              break;
            }
        }
      } finally {
        dt = !1, N.current = S, xe(), Error.prepareStackTrace = x;
      }
      var it = n ? n.displayName || n.name : "", K = it ? Y(it) : "";
      return typeof n == "function" && lt.set(n, K), K;
    }
    function wt(n, s, c) {
      return vt(n, !1);
    }
    function tt(n) {
      var s = n.prototype;
      return !!(s && s.isReactComponent);
    }
    function et(n, s, c) {
      if (n == null)
        return "";
      if (typeof n == "function")
        return vt(n, tt(n));
      if (typeof n == "string")
        return Y(n);
      switch (n) {
        case T:
          return Y("Suspense");
        case w:
          return Y("SuspenseList");
      }
      if (typeof n == "object")
        switch (n.$$typeof) {
          case v:
            return wt(n.render);
          case E:
            return et(n.type, s, c);
          case g: {
            var y = n, x = y._payload, S = y._init;
            try {
              return et(S(x), s, c);
            } catch {
            }
          }
        }
      return "";
    }
    var gt = Object.prototype.hasOwnProperty, Gt = {}, Pt = j.ReactDebugCurrentFrame;
    function U(n) {
      if (n) {
        var s = n._owner, c = et(n.type, n._source, s ? s.type : null);
        Pt.setExtraStackFrame(c);
      } else
        Pt.setExtraStackFrame(null);
    }
    function Se(n, s, c, y, x) {
      {
        var S = Function.call.bind(gt);
        for (var b in n)
          if (S(n, b)) {
            var P = void 0;
            try {
              if (typeof n[b] != "function") {
                var $ = Error((y || "React class") + ": " + c + " type `" + b + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof n[b] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw $.name = "Invariant Violation", $;
              }
              P = n[b](s, b, y, c, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (k) {
              P = k;
            }
            P && !(P instanceof Error) && (U(x), O("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", y || "React class", c, b, typeof P), U(null)), P instanceof Error && !(P.message in Gt) && (Gt[P.message] = !0, U(x), O("Failed %s type: %s", c, P.message), U(null));
          }
      }
    }
    var fe = Array.isArray;
    function It(n) {
      return fe(n);
    }
    function pe(n) {
      {
        var s = typeof Symbol == "function" && Symbol.toStringTag, c = s && n[Symbol.toStringTag] || n.constructor.name || "Object";
        return c;
      }
    }
    function de(n) {
      try {
        return _t(n), !1;
      } catch {
        return !0;
      }
    }
    function _t(n) {
      return "" + n;
    }
    function Lt(n) {
      if (de(n))
        return O("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", pe(n)), _t(n);
    }
    var xt = j.ReactCurrentOwner, Ce = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, ve, St, Jt;
    Jt = {};
    function Ae(n) {
      if (gt.call(n, "ref")) {
        var s = Object.getOwnPropertyDescriptor(n, "ref").get;
        if (s && s.isReactWarning)
          return !1;
      }
      return n.ref !== void 0;
    }
    function ge(n) {
      if (gt.call(n, "key")) {
        var s = Object.getOwnPropertyDescriptor(n, "key").get;
        if (s && s.isReactWarning)
          return !1;
      }
      return n.key !== void 0;
    }
    function me(n, s) {
      if (typeof n.ref == "string" && xt.current && s && xt.current.stateNode !== s) {
        var c = J(xt.current.type);
        Jt[c] || (O('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', J(xt.current.type), n.ref), Jt[c] = !0);
      }
    }
    function Kt(n, s) {
      {
        var c = function() {
          ve || (ve = !0, O("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", s));
        };
        c.isReactWarning = !0, Object.defineProperty(n, "key", {
          get: c,
          configurable: !0
        });
      }
    }
    function De(n, s) {
      {
        var c = function() {
          St || (St = !0, O("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", s));
        };
        c.isReactWarning = !0, Object.defineProperty(n, "ref", {
          get: c,
          configurable: !0
        });
      }
    }
    var ye = function(n, s, c, y, x, S, b) {
      var P = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: r,
        // Built-in properties that belong on the element
        type: n,
        key: s,
        ref: c,
        props: b,
        // Record the component responsible for creating this element.
        _owner: S
      };
      return P._store = {}, Object.defineProperty(P._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(P, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: y
      }), Object.defineProperty(P, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: x
      }), Object.freeze && (Object.freeze(P.props), Object.freeze(P)), P;
    };
    function Oe(n, s, c, y, x) {
      {
        var S, b = {}, P = null, $ = null;
        c !== void 0 && (Lt(c), P = "" + c), ge(s) && (Lt(s.key), P = "" + s.key), Ae(s) && ($ = s.ref, me(s, x));
        for (S in s)
          gt.call(s, S) && !Ce.hasOwnProperty(S) && (b[S] = s[S]);
        if (n && n.defaultProps) {
          var k = n.defaultProps;
          for (S in k)
            b[S] === void 0 && (b[S] = k[S]);
        }
        if (P || $) {
          var L = typeof n == "function" ? n.displayName || n.name || "Unknown" : n;
          P && Kt(b, L), $ && De(b, L);
        }
        return ye(n, P, $, x, y, xt.current, b);
      }
    }
    var Zt = j.ReactCurrentOwner, Te = j.ReactDebugCurrentFrame;
    function nt(n) {
      if (n) {
        var s = n._owner, c = et(n.type, n._source, s ? s.type : null);
        Te.setExtraStackFrame(c);
      } else
        Te.setExtraStackFrame(null);
    }
    var Qt;
    Qt = !1;
    function te(n) {
      return typeof n == "object" && n !== null && n.$$typeof === r;
    }
    function Mt() {
      {
        if (Zt.current) {
          var n = J(Zt.current.type);
          if (n)
            return `

Check the render method of \`` + n + "`.";
        }
        return "";
      }
    }
    function ke(n) {
      return "";
    }
    var ee = {};
    function Fe(n) {
      {
        var s = Mt();
        if (!s) {
          var c = typeof n == "string" ? n : n.displayName || n.name;
          c && (s = `

Check the top-level render call using <` + c + ">.");
        }
        return s;
      }
    }
    function ne(n, s) {
      {
        if (!n._store || n._store.validated || n.key != null)
          return;
        n._store.validated = !0;
        var c = Fe(s);
        if (ee[c])
          return;
        ee[c] = !0;
        var y = "";
        n && n._owner && n._owner !== Zt.current && (y = " It was passed a child from " + J(n._owner.type) + "."), nt(n), O('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', c, y), nt(null);
      }
    }
    function ie(n, s) {
      {
        if (typeof n != "object")
          return;
        if (It(n))
          for (var c = 0; c < n.length; c++) {
            var y = n[c];
            te(y) && ne(y, s);
          }
        else if (te(n))
          n._store && (n._store.validated = !0);
        else if (n) {
          var x = G(n);
          if (typeof x == "function" && x !== n.entries)
            for (var S = x.call(n), b; !(b = S.next()).done; )
              te(b.value) && ne(b.value, s);
        }
      }
    }
    function be(n) {
      {
        var s = n.type;
        if (s == null || typeof s == "string")
          return;
        var c;
        if (typeof s == "function")
          c = s.propTypes;
        else if (typeof s == "object" && (s.$$typeof === v || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        s.$$typeof === E))
          c = s.propTypes;
        else
          return;
        if (c) {
          var y = J(s);
          Se(c, n.props, "prop", y, n);
        } else if (s.PropTypes !== void 0 && !Qt) {
          Qt = !0;
          var x = J(s);
          O("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", x || "Unknown");
        }
        typeof s.getDefaultProps == "function" && !s.getDefaultProps.isReactClassApproved && O("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function Ee(n) {
      {
        for (var s = Object.keys(n.props), c = 0; c < s.length; c++) {
          var y = s[c];
          if (y !== "children" && y !== "key") {
            nt(n), O("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", y), nt(null);
            break;
          }
        }
        n.ref !== null && (nt(n), O("Invalid attribute `ref` supplied to `React.Fragment`."), nt(null));
      }
    }
    var jt = {};
    function ht(n, s, c, y, x, S) {
      {
        var b = Ft(n);
        if (!b) {
          var P = "";
          (n === void 0 || typeof n == "object" && n !== null && Object.keys(n).length === 0) && (P += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var $ = ke();
          $ ? P += $ : P += Mt();
          var k;
          n === null ? k = "null" : It(n) ? k = "array" : n !== void 0 && n.$$typeof === r ? (k = "<" + (J(n.type) || "Unknown") + " />", P = " Did you accidentally export a JSX literal instead of a component?") : k = typeof n, O("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", k, P);
        }
        var L = Oe(n, s, c, x, S);
        if (L == null)
          return L;
        if (b) {
          var B = s.children;
          if (B !== void 0)
            if (y)
              if (It(B)) {
                for (var it = 0; it < B.length; it++)
                  ie(B[it], n);
                Object.freeze && Object.freeze(B);
              } else
                O("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              ie(B, n);
        }
        if (gt.call(s, "key")) {
          var K = J(n), W = Object.keys(s).filter(function(e) {
            return e !== "key";
          }), Yt = W.length > 0 ? "{key: someKey, " + W.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!jt[K + Yt]) {
            var t = W.length > 0 ? "{" + W.join(": ..., ") + ": ...}" : "{}";
            O(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, Yt, K, t, K), jt[K + Yt] = !0;
          }
        }
        return n === l ? Ee(L) : be(L), L;
      }
    }
    function Ct(n, s, c) {
      return ht(n, s, c, !0);
    }
    function At(n, s, c) {
      return ht(n, s, c, !1);
    }
    var Nt = At, re = Ct;
    se.Fragment = l, se.jsx = Nt, se.jsxs = re;
  }()), se;
}
process.env.NODE_ENV === "production" ? Me.exports = un() : Me.exports = cn();
var Be = Me.exports;
var ln = { 168: (d, r, a) => {
  var l;
  (function(p, m, f, h) {
    var v, T = ["", "webkit", "Moz", "MS", "ms", "o"], w = m.createElement("div"), E = "function", g = Math.round, C = Math.abs, M = Date.now;
    function z(t, e, i) {
      return setTimeout(ft(t, i), e);
    }
    function G(t, e, i) {
      return !!Array.isArray(t) && (j(t, i[e], i), !0);
    }
    function j(t, e, i) {
      var o;
      if (t) if (t.forEach) t.forEach(e, i);
      else if (t.length !== h) for (o = 0; o < t.length; ) e.call(i, t[o], o, t), o++;
      else for (o in t) t.hasOwnProperty(o) && e.call(i, t[o], o, t);
    }
    function O(t, e, i) {
      var o = "DEPRECATED METHOD: " + e + `
` + i + ` AT 
`;
      return function() {
        var u = new Error("get-stack-trace"), R = u && u.stack ? u.stack.replace(/^[^\(]+?[\n$]/gm, "").replace(/^\s+at\s+/gm, "").replace(/^Object.<anonymous>\s*\(/gm, "{anonymous}()@") : "Unknown Stack Trace", D = p.console && (p.console.warn || p.console.log);
        return D && D.call(p.console, o, R), t.apply(this, arguments);
      };
    }
    v = typeof Object.assign != "function" ? function(t) {
      if (t === h || t === null) throw new TypeError("Cannot convert undefined or null to object");
      for (var e = Object(t), i = 1; i < arguments.length; i++) {
        var o = arguments[i];
        if (o !== h && o !== null) for (var u in o) o.hasOwnProperty(u) && (e[u] = o[u]);
      }
      return e;
    } : Object.assign;
    var ot = O(function(t, e, i) {
      for (var o = Object.keys(e), u = 0; u < o.length; ) (!i || i && t[o[u]] === h) && (t[o[u]] = e[o[u]]), u++;
      return t;
    }, "extend", "Use `assign`."), st = O(function(t, e) {
      return ot(t, e, !0);
    }, "merge", "Use `assign`.");
    function q(t, e, i) {
      var o, u = e.prototype;
      (o = t.prototype = Object.create(u)).constructor = t, o._super = u, i && v(o, i);
    }
    function ft(t, e) {
      return function() {
        return t.apply(e, arguments);
      };
    }
    function at(t, e) {
      return typeof t == E ? t.apply(e && e[0] || h, e) : t;
    }
    function Tt(t, e) {
      return t === h ? e : t;
    }
    function bt(t, e, i) {
      j(J(e), function(o) {
        t.addEventListener(o, i, !1);
      });
    }
    function Ft(t, e, i) {
      j(J(e), function(o) {
        t.removeEventListener(o, i, !1);
      });
    }
    function ue(t, e) {
      for (; t; ) {
        if (t == e) return !0;
        t = t.parentNode;
      }
      return !1;
    }
    function ut(t, e) {
      return t.indexOf(e) > -1;
    }
    function J(t) {
      return t.trim().split(/\s+/g);
    }
    function Z(t, e, i) {
      if (t.indexOf && !i) return t.indexOf(e);
      for (var o = 0; o < t.length; ) {
        if (i && t[o][i] == e || !i && t[o] === e) return o;
        o++;
      }
      return -1;
    }
    function ct(t) {
      return Array.prototype.slice.call(t, 0);
    }
    function Ut(t, e, i) {
      for (var o = [], u = [], R = 0; R < t.length; ) {
        var D = t[R][e];
        Z(u, D) < 0 && o.push(t[R]), u[R] = D, R++;
      }
      return o = o.sort(function(V, _) {
        return V[e] > _[e];
      }), o;
    }
    function Et(t, e) {
      for (var i, o, u = e[0].toUpperCase() + e.slice(1), R = 0; R < T.length; ) {
        if ((o = (i = T[R]) ? i + u : e) in t) return o;
        R++;
      }
      return h;
    }
    var ce = 1;
    function Vt(t) {
      var e = t.ownerDocument || t;
      return e.defaultView || e.parentWindow || p;
    }
    var Bt = "ontouchstart" in p, le = Et(p, "PointerEvent") !== h, he = Bt && /mobile|tablet|ip(ad|hone|od)|android/i.test(navigator.userAgent), pt = "touch", Ht = "mouse", xe = 25, N = 1, I = 4, Y = 8, dt = 1, lt = 2, Rt = 4, vt = 8, wt = 16, tt = lt | Rt, et = vt | wt, gt = tt | et, Gt = ["x", "y"], Pt = ["clientX", "clientY"];
    function U(t, e) {
      var i = this;
      this.manager = t, this.callback = e, this.element = t.element, this.target = t.options.inputTarget, this.domHandler = function(o) {
        at(t.options.enable, [t]) && i.handler(o);
      }, this.init();
    }
    function Se(t, e, i) {
      var o = i.pointers.length, u = i.changedPointers.length, R = e & N && o - u == 0, D = e & (I | Y) && o - u == 0;
      i.isFirst = !!R, i.isFinal = !!D, R && (t.session = {}), i.eventType = e, function(V, _) {
        var H = V.session, Re = _.pointers, je = Re.length;
        H.firstInput || (H.firstInput = fe(_)), je > 1 && !H.firstMultiple ? H.firstMultiple = fe(_) : je === 1 && (H.firstMultiple = !1);
        var Ne = H.firstInput, $t = H.firstMultiple, Ye = $t ? $t.center : Ne.center, $e = _.center = It(Re);
        _.timeStamp = M(), _.deltaTime = _.timeStamp - Ne.timeStamp, _.angle = Lt(Ye, $e), _.distance = _t(Ye, $e), function(rt, X) {
          var mt = X.center, Dt = rt.offsetDelta || {}, Ot = rt.prevDelta || {}, kt = rt.prevInput || {};
          X.eventType !== N && kt.eventType !== I || (Ot = rt.prevDelta = { x: kt.deltaX || 0, y: kt.deltaY || 0 }, Dt = rt.offsetDelta = { x: mt.x, y: mt.y }), X.deltaX = Ot.x + (mt.x - Dt.x), X.deltaY = Ot.y + (mt.y - Dt.y);
        }(H, _), _.offsetDirection = de(_.deltaX, _.deltaY);
        var Ie, We, Wt = pe(_.deltaTime, _.deltaX, _.deltaY);
        _.overallVelocityX = Wt.x, _.overallVelocityY = Wt.y, _.overallVelocity = C(Wt.x) > C(Wt.y) ? Wt.x : Wt.y, _.scale = $t ? (Ie = $t.pointers, _t((We = Re)[0], We[1], Pt) / _t(Ie[0], Ie[1], Pt)) : 1, _.rotation = $t ? function(rt, X) {
          return Lt(X[1], X[0], Pt) + Lt(rt[1], rt[0], Pt);
        }($t.pointers, Re) : 0, _.maxPointers = H.prevInput ? _.pointers.length > H.prevInput.maxPointers ? _.pointers.length : H.prevInput.maxPointers : _.pointers.length, function(rt, X) {
          var mt, Dt, Ot, kt, yt = rt.lastInterval || X, Xe = X.timeStamp - yt.timeStamp;
          if (X.eventType != Y && (Xe > xe || yt.velocity === h)) {
            var ze = X.deltaX - yt.deltaX, qe = X.deltaY - yt.deltaY, Xt = pe(Xe, ze, qe);
            Dt = Xt.x, Ot = Xt.y, mt = C(Xt.x) > C(Xt.y) ? Xt.x : Xt.y, kt = de(ze, qe), rt.lastInterval = X;
          } else mt = yt.velocity, Dt = yt.velocityX, Ot = yt.velocityY, kt = yt.direction;
          X.velocity = mt, X.velocityX = Dt, X.velocityY = Ot, X.direction = kt;
        }(H, _);
        var Le = V.element;
        ue(_.srcEvent.target, Le) && (Le = _.srcEvent.target), _.target = Le;
      }(t, i), t.emit("hammer.input", i), t.recognize(i), t.session.prevInput = i;
    }
    function fe(t) {
      for (var e = [], i = 0; i < t.pointers.length; ) e[i] = { clientX: g(t.pointers[i].clientX), clientY: g(t.pointers[i].clientY) }, i++;
      return { timeStamp: M(), pointers: e, center: It(e), deltaX: t.deltaX, deltaY: t.deltaY };
    }
    function It(t) {
      var e = t.length;
      if (e === 1) return { x: g(t[0].clientX), y: g(t[0].clientY) };
      for (var i = 0, o = 0, u = 0; u < e; ) i += t[u].clientX, o += t[u].clientY, u++;
      return { x: g(i / e), y: g(o / e) };
    }
    function pe(t, e, i) {
      return { x: e / t || 0, y: i / t || 0 };
    }
    function de(t, e) {
      return t === e ? dt : C(t) >= C(e) ? t < 0 ? lt : Rt : e < 0 ? vt : wt;
    }
    function _t(t, e, i) {
      i || (i = Gt);
      var o = e[i[0]] - t[i[0]], u = e[i[1]] - t[i[1]];
      return Math.sqrt(o * o + u * u);
    }
    function Lt(t, e, i) {
      i || (i = Gt);
      var o = e[i[0]] - t[i[0]], u = e[i[1]] - t[i[1]];
      return 180 * Math.atan2(u, o) / Math.PI;
    }
    U.prototype = { handler: function() {
    }, init: function() {
      this.evEl && bt(this.element, this.evEl, this.domHandler), this.evTarget && bt(this.target, this.evTarget, this.domHandler), this.evWin && bt(Vt(this.element), this.evWin, this.domHandler);
    }, destroy: function() {
      this.evEl && Ft(this.element, this.evEl, this.domHandler), this.evTarget && Ft(this.target, this.evTarget, this.domHandler), this.evWin && Ft(Vt(this.element), this.evWin, this.domHandler);
    } };
    var xt = { mousedown: N, mousemove: 2, mouseup: I }, Ce = "mousedown", ve = "mousemove mouseup";
    function St() {
      this.evEl = Ce, this.evWin = ve, this.pressed = !1, U.apply(this, arguments);
    }
    q(St, U, { handler: function(t) {
      var e = xt[t.type];
      e & N && t.button === 0 && (this.pressed = !0), 2 & e && t.which !== 1 && (e = I), this.pressed && (e & I && (this.pressed = !1), this.callback(this.manager, e, { pointers: [t], changedPointers: [t], pointerType: Ht, srcEvent: t }));
    } });
    var Jt = { pointerdown: N, pointermove: 2, pointerup: I, pointercancel: Y, pointerout: Y }, Ae = { 2: pt, 3: "pen", 4: Ht, 5: "kinect" }, ge = "pointerdown", me = "pointermove pointerup pointercancel";
    function Kt() {
      this.evEl = ge, this.evWin = me, U.apply(this, arguments), this.store = this.manager.session.pointerEvents = [];
    }
    p.MSPointerEvent && !p.PointerEvent && (ge = "MSPointerDown", me = "MSPointerMove MSPointerUp MSPointerCancel"), q(Kt, U, { handler: function(t) {
      var e = this.store, i = !1, o = t.type.toLowerCase().replace("ms", ""), u = Jt[o], R = Ae[t.pointerType] || t.pointerType, D = R == pt, V = Z(e, t.pointerId, "pointerId");
      u & N && (t.button === 0 || D) ? V < 0 && (e.push(t), V = e.length - 1) : u & (I | Y) && (i = !0), V < 0 || (e[V] = t, this.callback(this.manager, u, { pointers: e, changedPointers: [t], pointerType: R, srcEvent: t }), i && e.splice(V, 1));
    } });
    var De = { touchstart: N, touchmove: 2, touchend: I, touchcancel: Y };
    function ye() {
      this.evTarget = "touchstart", this.evWin = "touchstart touchmove touchend touchcancel", this.started = !1, U.apply(this, arguments);
    }
    function Oe(t, e) {
      var i = ct(t.touches), o = ct(t.changedTouches);
      return e & (I | Y) && (i = Ut(i.concat(o), "identifier")), [i, o];
    }
    q(ye, U, { handler: function(t) {
      var e = De[t.type];
      if (e === N && (this.started = !0), this.started) {
        var i = Oe.call(this, t, e);
        e & (I | Y) && i[0].length - i[1].length == 0 && (this.started = !1), this.callback(this.manager, e, { pointers: i[0], changedPointers: i[1], pointerType: pt, srcEvent: t });
      }
    } });
    var Zt = { touchstart: N, touchmove: 2, touchend: I, touchcancel: Y }, Te = "touchstart touchmove touchend touchcancel";
    function nt() {
      this.evTarget = Te, this.targetIds = {}, U.apply(this, arguments);
    }
    function Qt(t, e) {
      var i = ct(t.touches), o = this.targetIds;
      if (e & (2 | N) && i.length === 1) return o[i[0].identifier] = !0, [i, i];
      var u, R, D = ct(t.changedTouches), V = [], _ = this.target;
      if (R = i.filter(function(H) {
        return ue(H.target, _);
      }), e === N) for (u = 0; u < R.length; ) o[R[u].identifier] = !0, u++;
      for (u = 0; u < D.length; ) o[D[u].identifier] && V.push(D[u]), e & (I | Y) && delete o[D[u].identifier], u++;
      return V.length ? [Ut(R.concat(V), "identifier"), V] : void 0;
    }
    q(nt, U, { handler: function(t) {
      var e = Zt[t.type], i = Qt.call(this, t, e);
      i && this.callback(this.manager, e, { pointers: i[0], changedPointers: i[1], pointerType: pt, srcEvent: t });
    } });
    var te = 2500;
    function Mt() {
      U.apply(this, arguments);
      var t = ft(this.handler, this);
      this.touch = new nt(this.manager, t), this.mouse = new St(this.manager, t), this.primaryTouch = null, this.lastTouches = [];
    }
    function ke(t, e) {
      t & N ? (this.primaryTouch = e.changedPointers[0].identifier, ee.call(this, e)) : t & (I | Y) && ee.call(this, e);
    }
    function ee(t) {
      var e = t.changedPointers[0];
      if (e.identifier === this.primaryTouch) {
        var i = { x: e.clientX, y: e.clientY };
        this.lastTouches.push(i);
        var o = this.lastTouches;
        setTimeout(function() {
          var u = o.indexOf(i);
          u > -1 && o.splice(u, 1);
        }, te);
      }
    }
    function Fe(t) {
      for (var e = t.srcEvent.clientX, i = t.srcEvent.clientY, o = 0; o < this.lastTouches.length; o++) {
        var u = this.lastTouches[o], R = Math.abs(e - u.x), D = Math.abs(i - u.y);
        if (R <= 25 && D <= 25) return !0;
      }
      return !1;
    }
    q(Mt, U, { handler: function(t, e, i) {
      var o = i.pointerType == pt, u = i.pointerType == Ht;
      if (!(u && i.sourceCapabilities && i.sourceCapabilities.firesTouchEvents)) {
        if (o) ke.call(this, e, i);
        else if (u && Fe.call(this, i)) return;
        this.callback(t, e, i);
      }
    }, destroy: function() {
      this.touch.destroy(), this.mouse.destroy();
    } });
    var ne = Et(w.style, "touchAction"), ie = ne !== h, be = "compute", Ee = "auto", jt = "manipulation", ht = "none", Ct = "pan-x", At = "pan-y", Nt = function() {
      if (!ie) return !1;
      var t = {}, e = p.CSS && p.CSS.supports;
      return ["auto", "manipulation", "pan-y", "pan-x", "pan-x pan-y", "none"].forEach(function(i) {
        t[i] = !e || p.CSS.supports("touch-action", i);
      }), t;
    }();
    function re(t, e) {
      this.manager = t, this.set(e);
    }
    re.prototype = { set: function(t) {
      t == be && (t = this.compute()), ie && this.manager.element.style && Nt[t] && (this.manager.element.style[ne] = t), this.actions = t.toLowerCase().trim();
    }, update: function() {
      this.set(this.manager.options.touchAction);
    }, compute: function() {
      var t = [];
      return j(this.manager.recognizers, function(e) {
        at(e.options.enable, [e]) && (t = t.concat(e.getTouchAction()));
      }), function(e) {
        if (ut(e, ht)) return ht;
        var i = ut(e, Ct), o = ut(e, At);
        return i && o ? ht : i || o ? i ? Ct : At : ut(e, jt) ? jt : Ee;
      }(t.join(" "));
    }, preventDefaults: function(t) {
      var e = t.srcEvent, i = t.offsetDirection;
      if (this.manager.session.prevented) e.preventDefault();
      else {
        var o = this.actions, u = ut(o, ht) && !Nt[ht], R = ut(o, At) && !Nt[At], D = ut(o, Ct) && !Nt[Ct];
        if (u) {
          var V = t.pointers.length === 1, _ = t.distance < 2, H = t.deltaTime < 250;
          if (V && _ && H) return;
        }
        if (!D || !R) return u || R && i & tt || D && i & et ? this.preventSrc(e) : void 0;
      }
    }, preventSrc: function(t) {
      this.manager.session.prevented = !0, t.preventDefault();
    } };
    var n = 1, s = 32;
    function c(t) {
      this.options = v({}, this.defaults, t || {}), this.id = ce++, this.manager = null, this.options.enable = Tt(this.options.enable, !0), this.state = n, this.simultaneous = {}, this.requireFail = [];
    }
    function y(t) {
      return 16 & t ? "cancel" : 8 & t ? "end" : 4 & t ? "move" : 2 & t ? "start" : "";
    }
    function x(t) {
      return t == wt ? "down" : t == vt ? "up" : t == lt ? "left" : t == Rt ? "right" : "";
    }
    function S(t, e) {
      var i = e.manager;
      return i ? i.get(t) : t;
    }
    function b() {
      c.apply(this, arguments);
    }
    function P() {
      b.apply(this, arguments), this.pX = null, this.pY = null;
    }
    function $() {
      b.apply(this, arguments);
    }
    function k() {
      c.apply(this, arguments), this._timer = null, this._input = null;
    }
    function L() {
      b.apply(this, arguments);
    }
    function B() {
      b.apply(this, arguments);
    }
    function it() {
      c.apply(this, arguments), this.pTime = !1, this.pCenter = !1, this._timer = null, this._input = null, this.count = 0;
    }
    function K(t, e) {
      return (e = e || {}).recognizers = Tt(e.recognizers, K.defaults.preset), new W(t, e);
    }
    function W(t, e) {
      this.options = v({}, K.defaults, e || {}), this.options.inputTarget = this.options.inputTarget || t, this.handlers = {}, this.session = {}, this.recognizers = [], this.oldCssProps = {}, this.element = t, this.input = new (this.options.inputClass || (le ? Kt : he ? nt : Bt ? Mt : St))(this, Se), this.touchAction = new re(this, this.options.touchAction), Yt(this, !0), j(this.options.recognizers, function(i) {
        var o = this.add(new i[0](i[1]));
        i[2] && o.recognizeWith(i[2]), i[3] && o.requireFailure(i[3]);
      }, this);
    }
    function Yt(t, e) {
      var i, o = t.element;
      o.style && (j(t.options.cssProps, function(u, R) {
        i = Et(o.style, R), e ? (t.oldCssProps[i] = o.style[i], o.style[i] = u) : o.style[i] = t.oldCssProps[i] || "";
      }), e || (t.oldCssProps = {}));
    }
    c.prototype = { defaults: {}, set: function(t) {
      return v(this.options, t), this.manager && this.manager.touchAction.update(), this;
    }, recognizeWith: function(t) {
      if (G(t, "recognizeWith", this)) return this;
      var e = this.simultaneous;
      return e[(t = S(t, this)).id] || (e[t.id] = t, t.recognizeWith(this)), this;
    }, dropRecognizeWith: function(t) {
      return G(t, "dropRecognizeWith", this) || (t = S(t, this), delete this.simultaneous[t.id]), this;
    }, requireFailure: function(t) {
      if (G(t, "requireFailure", this)) return this;
      var e = this.requireFail;
      return Z(e, t = S(t, this)) === -1 && (e.push(t), t.requireFailure(this)), this;
    }, dropRequireFailure: function(t) {
      if (G(t, "dropRequireFailure", this)) return this;
      t = S(t, this);
      var e = Z(this.requireFail, t);
      return e > -1 && this.requireFail.splice(e, 1), this;
    }, hasRequireFailures: function() {
      return this.requireFail.length > 0;
    }, canRecognizeWith: function(t) {
      return !!this.simultaneous[t.id];
    }, emit: function(t) {
      var e = this, i = this.state;
      function o(u) {
        e.manager.emit(u, t);
      }
      i < 8 && o(e.options.event + y(i)), o(e.options.event), t.additionalEvent && o(t.additionalEvent), i >= 8 && o(e.options.event + y(i));
    }, tryEmit: function(t) {
      if (this.canEmit()) return this.emit(t);
      this.state = s;
    }, canEmit: function() {
      for (var t = 0; t < this.requireFail.length; ) {
        if (!(this.requireFail[t].state & (s | n))) return !1;
        t++;
      }
      return !0;
    }, recognize: function(t) {
      var e = v({}, t);
      if (!at(this.options.enable, [this, e])) return this.reset(), void (this.state = s);
      56 & this.state && (this.state = n), this.state = this.process(e), 30 & this.state && this.tryEmit(e);
    }, process: function(t) {
    }, getTouchAction: function() {
    }, reset: function() {
    } }, q(b, c, { defaults: { pointers: 1 }, attrTest: function(t) {
      var e = this.options.pointers;
      return e === 0 || t.pointers.length === e;
    }, process: function(t) {
      var e = this.state, i = t.eventType, o = 6 & e, u = this.attrTest(t);
      return o && (i & Y || !u) ? 16 | e : o || u ? i & I ? 8 | e : 2 & e ? 4 | e : 2 : s;
    } }), q(P, b, { defaults: { event: "pan", threshold: 10, pointers: 1, direction: gt }, getTouchAction: function() {
      var t = this.options.direction, e = [];
      return t & tt && e.push(At), t & et && e.push(Ct), e;
    }, directionTest: function(t) {
      var e = this.options, i = !0, o = t.distance, u = t.direction, R = t.deltaX, D = t.deltaY;
      return u & e.direction || (e.direction & tt ? (u = R === 0 ? dt : R < 0 ? lt : Rt, i = R != this.pX, o = Math.abs(t.deltaX)) : (u = D === 0 ? dt : D < 0 ? vt : wt, i = D != this.pY, o = Math.abs(t.deltaY))), t.direction = u, i && o > e.threshold && u & e.direction;
    }, attrTest: function(t) {
      return b.prototype.attrTest.call(this, t) && (2 & this.state || !(2 & this.state) && this.directionTest(t));
    }, emit: function(t) {
      this.pX = t.deltaX, this.pY = t.deltaY;
      var e = x(t.direction);
      e && (t.additionalEvent = this.options.event + e), this._super.emit.call(this, t);
    } }), q($, b, { defaults: { event: "pinch", threshold: 0, pointers: 2 }, getTouchAction: function() {
      return [ht];
    }, attrTest: function(t) {
      return this._super.attrTest.call(this, t) && (Math.abs(t.scale - 1) > this.options.threshold || 2 & this.state);
    }, emit: function(t) {
      if (t.scale !== 1) {
        var e = t.scale < 1 ? "in" : "out";
        t.additionalEvent = this.options.event + e;
      }
      this._super.emit.call(this, t);
    } }), q(k, c, { defaults: { event: "press", pointers: 1, time: 251, threshold: 9 }, getTouchAction: function() {
      return [Ee];
    }, process: function(t) {
      var e = this.options, i = t.pointers.length === e.pointers, o = t.distance < e.threshold, u = t.deltaTime > e.time;
      if (this._input = t, !o || !i || t.eventType & (I | Y) && !u) this.reset();
      else if (t.eventType & N) this.reset(), this._timer = z(function() {
        this.state = 8, this.tryEmit();
      }, e.time, this);
      else if (t.eventType & I) return 8;
      return s;
    }, reset: function() {
      clearTimeout(this._timer);
    }, emit: function(t) {
      this.state === 8 && (t && t.eventType & I ? this.manager.emit(this.options.event + "up", t) : (this._input.timeStamp = M(), this.manager.emit(this.options.event, this._input)));
    } }), q(L, b, { defaults: { event: "rotate", threshold: 0, pointers: 2 }, getTouchAction: function() {
      return [ht];
    }, attrTest: function(t) {
      return this._super.attrTest.call(this, t) && (Math.abs(t.rotation) > this.options.threshold || 2 & this.state);
    } }), q(B, b, { defaults: { event: "swipe", threshold: 10, velocity: 0.3, direction: tt | et, pointers: 1 }, getTouchAction: function() {
      return P.prototype.getTouchAction.call(this);
    }, attrTest: function(t) {
      var e, i = this.options.direction;
      return i & (tt | et) ? e = t.overallVelocity : i & tt ? e = t.overallVelocityX : i & et && (e = t.overallVelocityY), this._super.attrTest.call(this, t) && i & t.offsetDirection && t.distance > this.options.threshold && t.maxPointers == this.options.pointers && C(e) > this.options.velocity && t.eventType & I;
    }, emit: function(t) {
      var e = x(t.offsetDirection);
      e && this.manager.emit(this.options.event + e, t), this.manager.emit(this.options.event, t);
    } }), q(it, c, { defaults: { event: "tap", pointers: 1, taps: 1, interval: 300, time: 250, threshold: 9, posThreshold: 10 }, getTouchAction: function() {
      return [jt];
    }, process: function(t) {
      var e = this.options, i = t.pointers.length === e.pointers, o = t.distance < e.threshold, u = t.deltaTime < e.time;
      if (this.reset(), t.eventType & N && this.count === 0) return this.failTimeout();
      if (o && u && i) {
        if (t.eventType != I) return this.failTimeout();
        var R = !this.pTime || t.timeStamp - this.pTime < e.interval, D = !this.pCenter || _t(this.pCenter, t.center) < e.posThreshold;
        if (this.pTime = t.timeStamp, this.pCenter = t.center, D && R ? this.count += 1 : this.count = 1, this._input = t, this.count % e.taps == 0) return this.hasRequireFailures() ? (this._timer = z(function() {
          this.state = 8, this.tryEmit();
        }, e.interval, this), 2) : 8;
      }
      return s;
    }, failTimeout: function() {
      return this._timer = z(function() {
        this.state = s;
      }, this.options.interval, this), s;
    }, reset: function() {
      clearTimeout(this._timer);
    }, emit: function() {
      this.state == 8 && (this._input.tapCount = this.count, this.manager.emit(this.options.event, this._input));
    } }), K.VERSION = "2.0.7", K.defaults = { domEvents: !1, touchAction: be, enable: !0, inputTarget: null, inputClass: null, preset: [[L, { enable: !1 }], [$, { enable: !1 }, ["rotate"]], [B, { direction: tt }], [P, { direction: tt }, ["swipe"]], [it], [it, { event: "doubletap", taps: 2 }, ["tap"]], [k]], cssProps: { userSelect: "none", touchSelect: "none", touchCallout: "none", contentZooming: "none", userDrag: "none", tapHighlightColor: "rgba(0,0,0,0)" } }, W.prototype = { set: function(t) {
      return v(this.options, t), t.touchAction && this.touchAction.update(), t.inputTarget && (this.input.destroy(), this.input.target = t.inputTarget, this.input.init()), this;
    }, stop: function(t) {
      this.session.stopped = t ? 2 : 1;
    }, recognize: function(t) {
      var e = this.session;
      if (!e.stopped) {
        var i;
        this.touchAction.preventDefaults(t);
        var o = this.recognizers, u = e.curRecognizer;
        (!u || u && 8 & u.state) && (u = e.curRecognizer = null);
        for (var R = 0; R < o.length; ) i = o[R], e.stopped === 2 || u && i != u && !i.canRecognizeWith(u) ? i.reset() : i.recognize(t), !u && 14 & i.state && (u = e.curRecognizer = i), R++;
      }
    }, get: function(t) {
      if (t instanceof c) return t;
      for (var e = this.recognizers, i = 0; i < e.length; i++) if (e[i].options.event == t) return e[i];
      return null;
    }, add: function(t) {
      if (G(t, "add", this)) return this;
      var e = this.get(t.options.event);
      return e && this.remove(e), this.recognizers.push(t), t.manager = this, this.touchAction.update(), t;
    }, remove: function(t) {
      if (G(t, "remove", this)) return this;
      if (t = this.get(t)) {
        var e = this.recognizers, i = Z(e, t);
        i !== -1 && (e.splice(i, 1), this.touchAction.update());
      }
      return this;
    }, on: function(t, e) {
      if (t !== h && e !== h) {
        var i = this.handlers;
        return j(J(t), function(o) {
          i[o] = i[o] || [], i[o].push(e);
        }), this;
      }
    }, off: function(t, e) {
      if (t !== h) {
        var i = this.handlers;
        return j(J(t), function(o) {
          e ? i[o] && i[o].splice(Z(i[o], e), 1) : delete i[o];
        }), this;
      }
    }, emit: function(t, e) {
      this.options.domEvents && function(u, R) {
        var D = m.createEvent("Event");
        D.initEvent(u, !0, !0), D.gesture = R, R.target.dispatchEvent(D);
      }(t, e);
      var i = this.handlers[t] && this.handlers[t].slice();
      if (i && i.length) {
        e.type = t, e.preventDefault = function() {
          e.srcEvent.preventDefault();
        };
        for (var o = 0; o < i.length; ) i[o](e), o++;
      }
    }, destroy: function() {
      this.element && Yt(this, !1), this.handlers = {}, this.session = {}, this.input.destroy(), this.element = null;
    } }, v(K, { INPUT_START: N, INPUT_MOVE: 2, INPUT_END: I, INPUT_CANCEL: Y, STATE_POSSIBLE: n, STATE_BEGAN: 2, STATE_CHANGED: 4, STATE_ENDED: 8, STATE_RECOGNIZED: 8, STATE_CANCELLED: 16, STATE_FAILED: s, DIRECTION_NONE: dt, DIRECTION_LEFT: lt, DIRECTION_RIGHT: Rt, DIRECTION_UP: vt, DIRECTION_DOWN: wt, DIRECTION_HORIZONTAL: tt, DIRECTION_VERTICAL: et, DIRECTION_ALL: gt, Manager: W, Input: U, TouchAction: re, TouchInput: nt, MouseInput: St, PointerEventInput: Kt, TouchMouseInput: Mt, SingleTouchInput: ye, Recognizer: c, AttrRecognizer: b, Tap: it, Pan: P, Swipe: B, Pinch: $, Rotate: L, Press: k, on: bt, off: Ft, each: j, merge: st, extend: ot, assign: v, inherit: q, bindFn: ft, prefixed: Et }), (p !== void 0 ? p : typeof self < "u" ? self : {}).Hammer = K, (l = (function() {
      return K;
    }).call(r, a, r, d)) === h || (d.exports = l);
  })(window, document);
}, 970: (d, r, a) => {
  a.d(r, { A: () => h });
  var l = a(645), p = a.n(l), m = a(278), f = a.n(m)()(p());
  f.push([d.id, ".flipbook{height:100%;width:100%;overflow:hidden}.flipbook-debug-bar{position:absolute;bottom:0;left:0;width:100%;background-color:rgba(0,0,0,.5);color:#fff;padding:10px;box-sizing:border-box;display:flex;flex-wrap:wrap;justify-content:space-between;z-index:9999}", ""]);
  const h = f;
}, 0: (d, r, a) => {
  a.d(r, { A: () => h });
  var l = a(645), p = a.n(l), m = a(278), f = a.n(m)()(p());
  f.push([d.id, ".page{position:absolute;backface-visibility:hidden;transform-style:preserve-3d}.page>*{max-width:100%;max-height:100%;height:100%;width:100%;box-sizing:border-box}", ""]);
  const h = f;
}, 278: (d) => {
  d.exports = function(r) {
    var a = [];
    return a.toString = function() {
      return this.map(function(l) {
        var p = "", m = l[5] !== void 0;
        return l[4] && (p += "@supports (".concat(l[4], ") {")), l[2] && (p += "@media ".concat(l[2], " {")), m && (p += "@layer".concat(l[5].length > 0 ? " ".concat(l[5]) : "", " {")), p += r(l), m && (p += "}"), l[2] && (p += "}"), l[4] && (p += "}"), p;
      }).join("");
    }, a.i = function(l, p, m, f, h) {
      typeof l == "string" && (l = [[null, l, void 0]]);
      var v = {};
      if (m) for (var T = 0; T < this.length; T++) {
        var w = this[T][0];
        w != null && (v[w] = !0);
      }
      for (var E = 0; E < l.length; E++) {
        var g = [].concat(l[E]);
        m && v[g[0]] || (h !== void 0 && (g[5] === void 0 || (g[1] = "@layer".concat(g[5].length > 0 ? " ".concat(g[5]) : "", " {").concat(g[1], "}")), g[5] = h), p && (g[2] && (g[1] = "@media ".concat(g[2], " {").concat(g[1], "}")), g[2] = p), f && (g[4] ? (g[1] = "@supports (".concat(g[4], ") {").concat(g[1], "}"), g[4] = f) : g[4] = "".concat(f)), a.push(g));
      }
    }, a;
  };
}, 645: (d) => {
  d.exports = function(r) {
    return r[1];
  };
}, 292: (d) => {
  var r = [];
  function a(m) {
    for (var f = -1, h = 0; h < r.length; h++) if (r[h].identifier === m) {
      f = h;
      break;
    }
    return f;
  }
  function l(m, f) {
    for (var h = {}, v = [], T = 0; T < m.length; T++) {
      var w = m[T], E = f.base ? w[0] + f.base : w[0], g = h[E] || 0, C = "".concat(E, " ").concat(g);
      h[E] = g + 1;
      var M = a(C), z = { css: w[1], media: w[2], sourceMap: w[3], supports: w[4], layer: w[5] };
      if (M !== -1) r[M].references++, r[M].updater(z);
      else {
        var G = p(z, f);
        f.byIndex = T, r.splice(T, 0, { identifier: C, updater: G, references: 1 });
      }
      v.push(C);
    }
    return v;
  }
  function p(m, f) {
    var h = f.domAPI(f);
    return h.update(m), function(v) {
      if (v) {
        if (v.css === m.css && v.media === m.media && v.sourceMap === m.sourceMap && v.supports === m.supports && v.layer === m.layer) return;
        h.update(m = v);
      } else h.remove();
    };
  }
  d.exports = function(m, f) {
    var h = l(m = m || [], f = f || {});
    return function(v) {
      v = v || [];
      for (var T = 0; T < h.length; T++) {
        var w = a(h[T]);
        r[w].references--;
      }
      for (var E = l(v, f), g = 0; g < h.length; g++) {
        var C = a(h[g]);
        r[C].references === 0 && (r[C].updater(), r.splice(C, 1));
      }
      h = E;
    };
  };
}, 383: (d) => {
  var r = {};
  d.exports = function(a, l) {
    var p = function(m) {
      if (r[m] === void 0) {
        var f = document.querySelector(m);
        if (window.HTMLIFrameElement && f instanceof window.HTMLIFrameElement) try {
          f = f.contentDocument.head;
        } catch {
          f = null;
        }
        r[m] = f;
      }
      return r[m];
    }(a);
    if (!p) throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
    p.appendChild(l);
  };
}, 88: (d) => {
  d.exports = function(r) {
    var a = document.createElement("style");
    return r.setAttributes(a, r.attributes), r.insert(a, r.options), a;
  };
}, 884: (d, r, a) => {
  d.exports = function(l) {
    var p = a.nc;
    p && l.setAttribute("nonce", p);
  };
}, 893: (d) => {
  d.exports = function(r) {
    if (typeof document > "u") return { update: function() {
    }, remove: function() {
    } };
    var a = r.insertStyleElement(r);
    return { update: function(l) {
      (function(p, m, f) {
        var h = "";
        f.supports && (h += "@supports (".concat(f.supports, ") {")), f.media && (h += "@media ".concat(f.media, " {"));
        var v = f.layer !== void 0;
        v && (h += "@layer".concat(f.layer.length > 0 ? " ".concat(f.layer) : "", " {")), h += f.css, v && (h += "}"), f.media && (h += "}"), f.supports && (h += "}");
        var T = f.sourceMap;
        T && typeof btoa < "u" && (h += `
/*# sourceMappingURL=data:application/json;base64,`.concat(btoa(unescape(encodeURIComponent(JSON.stringify(T)))), " */")), m.styleTagTransform(h, p, m.options);
      })(a, r, l);
    }, remove: function() {
      (function(l) {
        if (l.parentNode === null) return !1;
        l.parentNode.removeChild(l);
      })(a);
    } };
  };
}, 997: (d) => {
  d.exports = function(r, a) {
    if (a.styleSheet) a.styleSheet.cssText = r;
    else {
      for (; a.firstChild; ) a.removeChild(a.firstChild);
      a.appendChild(document.createTextNode(r));
    }
  };
} }, He = {};
function F(d) {
  var r = He[d];
  if (r !== void 0) return r.exports;
  var a = He[d] = { id: d, exports: {} };
  return ln[d](a, a.exports, F), a.exports;
}
F.n = (d) => {
  var r = d && d.__esModule ? () => d.default : () => d;
  return F.d(r, { a: r }), r;
}, F.d = (d, r) => {
  for (var a in r) F.o(r, a) && !F.o(d, a) && Object.defineProperty(d, a, { enumerable: !0, get: r[a] });
}, F.o = (d, r) => Object.prototype.hasOwnProperty.call(d, r), F.nc = void 0;
var Je = {};
F.d(Je, { $: () => bn });
var hn = F(292), Ke = F.n(hn), fn = F(893), Ze = F.n(fn), pn = F(383), Qe = F.n(pn), dn = F(884), tn = F.n(dn), vn = F(88), en = F.n(vn), gn = F(997), nn = F.n(gn), we = F(0), zt = {};
zt.styleTagTransform = nn(), zt.setAttributes = tn(), zt.insert = Qe().bind(null, "head"), zt.domAPI = Ze(), zt.insertStyleElement = en(), Ke()(we.A, zt), we.A && we.A.locals && we.A.locals;
var Pe = F(970), qt = {};
qt.styleTagTransform = nn(), qt.setAttributes = tn(), qt.insert = Qe().bind(null, "head"), qt.domAPI = Ze(), qt.insertStyleElement = en(), Ke()(Pe.A, qt), Pe.A && Pe.A.locals && Pe.A.locals;
var Q, mn = F(168), yn = F.n(mn);
class Tn {
  constructor(r, a, l, p) {
    A(this, "index");
    A(this, "pages");
    A(this, "bookProperties");
    A(this, "currentAnimation", null);
    A(this, "targetFlipPosition", null);
    A(this, "wrappedFlipPosition");
    this.index = r, this.pages = a, this.bookProperties = p, this.wrappedFlipPosition = l ? 1 : 0;
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
  async flipToPosition(r, a = 225) {
    return this.currentAnimation && await this.currentAnimation, this.flipPosition === r ? Promise.resolve() : this.targetFlipPosition === r ? this.currentAnimation ?? Promise.resolve() : (this.targetFlipPosition = r, this.currentAnimation = new Promise((l) => {
      const p = this.flipPosition, m = 180 * Math.abs(r - p) / a * 1e3, f = performance.now(), h = (v) => {
        const T = v - f;
        if (T < 0) return void requestAnimationFrame(h);
        const w = Math.min(T / m, 1), E = p + w * (r - p);
        this.pages.forEach((g, C) => {
          const M = this.bookProperties.isLTR;
          if (g) {
            const z = C % 2 + 1 == 1, G = (z ? M ? E > 0.5 ? 180 - 180 * E : 180 * -E : E > 0.5 ? -(180 - 180 * E) : 180 * E : M ? E < 0.5 ? 180 * -E : 180 - 180 * E : E < 0.5 ? 180 * E : -(180 - 180 * E)) + "deg", j = z ? M ? "100%" : "-100%" : "0px", O = z ? E > 0.5 ? -1 : 1 : E < 0.5 ? -1 : 1;
            g.style.transform = `translateX(${j})rotateY(${G})scaleX(${O})`, g.style.transformOrigin = z ? M ? "left" : "right" : M ? "right" : "left", g.style.zIndex = `${E > 0.5 ? g.dataset.pageIndex : this.bookProperties.pagesCount - g.dataset.pageIndex}`;
          }
        }), this.flipPosition = Math.max(0, Math.min(1, E)), w < 1 ? requestAnimationFrame(h) : (this.currentAnimation = null, this.targetFlipPosition = null, l());
      };
      requestAnimationFrame(h);
    }), this.currentAnimation);
  }
  async efficientFlipToPosition(r, a = 2e4) {
    return function(l, p, m) {
      var f, h = {}, v = h.noTrailing, T = v !== void 0 && v, w = h.noLeading, E = w !== void 0 && w, g = h.debounceMode, C = g === void 0 ? void 0 : g, M = !1, z = 0;
      function G() {
        f && clearTimeout(f);
      }
      function j() {
        for (var O = arguments.length, ot = new Array(O), st = 0; st < O; st++) ot[st] = arguments[st];
        var q = this, ft = Date.now() - z;
        function at() {
          z = Date.now(), p.apply(q, ot);
        }
        function Tt() {
          f = void 0;
        }
        M || (E || !C || f || at(), G(), C === void 0 && ft > l ? E ? (z = Date.now(), T || (f = setTimeout(C ? Tt : at, l))) : at() : T !== !0 && (f = setTimeout(C ? Tt : at, C === void 0 ? l - ft : l)));
      }
      return j.cancel = function(O) {
        var ot = (O || {}).upcomingOnly, st = ot !== void 0 && ot;
        G(), M = !st;
      }, j;
    }(1, this.flipToPosition.bind(this))(r, a);
  }
}
(function(d) {
  d.Forward = "Forward", d.Backward = "Backward", d.None = "None";
})(Q || (Q = {}));
class _e {
  constructor(r, a) {
    A(this, "width");
    A(this, "height");
    this.width = r, this.height = a;
  }
  static from(r) {
    return new _e(r.width, r.height);
  }
  get value() {
    return this.width / this.height;
  }
}
class ae {
  constructor(r, a) {
    A(this, "width");
    A(this, "height");
    A(this, "aspectRatio");
    this.width = r, this.height = a, this.aspectRatio = new _e(r, a);
  }
  aspectRatioFit(r) {
    const a = _e.from(r).value;
    return this.aspectRatio.value > a ? new ae(this.height * a, this.height) : new ae(this.width, this.width / a);
  }
  get asString() {
    return `${this.width}x${this.height}`;
  }
}
class bn {
  constructor(r) {
    A(this, "bookElement");
    A(this, "pageElements", []);
    A(this, "pagesCount");
    A(this, "leafAspectRatio", { width: 2, height: 3 });
    A(this, "coverAspectRatio", { width: 2.15, height: 3.15 });
    A(this, "direction", "ltr");
    A(this, "onPageChanged");
    A(this, "pageSemantics");
    A(this, "leaves", []);
    A(this, "currentLeaf");
    A(this, "flipDirection", Q.None);
    A(this, "flipStartingPos", 0);
    A(this, "isDuringManualFlip", !1);
    A(this, "flipDelta", 0);
    A(this, "isDuringAutoFlip", !1);
    A(this, "touchStartingPos", { x: 0, y: 0 });
    A(this, "handleTouchStart", (r) => {
      if (r.touches.length > 1) return;
      const a = r.touches[0];
      this.touchStartingPos = { x: a.pageX, y: a.pageY };
    });
    A(this, "handleTouchMove", (r) => {
      if (r.touches.length > 1) return;
      const a = r.touches[0], l = a.pageX - this.touchStartingPos.x, p = a.pageY - this.touchStartingPos.y;
      Math.abs(l) > Math.abs(p) && r.preventDefault();
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
    for (let a = this.leaves.length - 1; a >= 0; a--) {
      const l = this.leaves[a];
      if (l.isTurned) {
        r = l.index + 1;
        break;
      }
    }
    return r == -1 ? [void 0, this.leaves[0]] : r == this.leaves.length ? [this.leaves[r - 1], void 0] : [this.leaves[r - 1], this.leaves[r]];
  }
  get currentOrTurningLeaves() {
    let r = -1;
    for (let a = this.leaves.length - 1; a >= 0; a--) {
      const l = this.leaves[a];
      if (l.isTurned || l.isTurning) {
        r = l.index + 1;
        break;
      }
    }
    return r == -1 ? [void 0, this.leaves[0]] : r == this.leaves.length ? [this.leaves[r - 1], void 0] : [this.leaves[r - 1], this.leaves[r]];
  }
  render(r, a = !1) {
    const l = document.querySelector(r);
    if (!l) throw new Error(`Couldn't find container with selector: ${r}`);
    this.bookElement = l, this.bookElement.classList.contains("flipbook") || this.bookElement.classList.add("flipbook");
    const p = l.querySelectorAll(".page");
    if (!p.length) throw new Error("No pages found in flipbook");
    this.pageElements = Array.from(p), this.leaves.splice(0, this.leaves.length);
    const m = Math.ceil(this.pagesCount / 2), f = new ae(this.bookElement.clientWidth / 2, this.bookElement.clientHeight).aspectRatioFit(this.coverAspectRatio), h = new ae(f.width * this.leafAspectRatio.width / this.coverAspectRatio.width, f.height * this.leafAspectRatio.height / this.coverAspectRatio.height);
    this.bookElement.style.perspective = 2 * Math.min(2 * h.width, h.height) + "px", this.pageElements.forEach((T, w) => {
      var C, M;
      T.style.width = `${h.width}px`, T.style.height = `${h.height}px`, T.style.zIndex = "" + (this.pagesCount - w), T.dataset.pageIndex = w.toString(), T.style[this.isLTR ? "left" : "right"] = (l.clientWidth - 2 * h.width) / 2 + "px", T.style.top = (l.clientHeight - h.height) / 2 + "px", T.dataset.pageSemanticName = ((C = this.pageSemantics) == null ? void 0 : C.indexToSemanticName(w)) ?? "", T.dataset.pageTitle = ((M = this.pageSemantics) == null ? void 0 : M.indexToTitle(w)) ?? "";
      const E = Math.floor(w / 2), g = (w + 1) % 2 == 1;
      T.classList.add(g ? "odd" : "even"), g ? (T.style.transform = `translateX(${this.isLTR ? "" : "-"}100%)`, this.leaves[E] = new Tn(E, [T, void 0], !1, { isLTR: this.isLTR, leavesCount: m, pagesCount: this.pagesCount })) : (T.style.transform = `scaleX(-1)translateX(${this.isLTR ? "-" : ""}100%)`, this.leaves[E].pages[1] = T);
    });
    const v = new (yn())(this.bookElement);
    v.on("panstart", this.onDragStart.bind(this)), v.on("panmove", this.onDragUpdate.bind(this)), v.on("panend", this.onDragEnd.bind(this)), this.bookElement.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: !1 }), this.bookElement.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: !1 }), a && this.fillDebugBar();
  }
  fillDebugBar() {
    var a;
    const r = document.createElement("div");
    r.className = "flipbook-debug-bar", (a = this.bookElement) == null || a.appendChild(r), setInterval(() => {
      var l;
      r.innerHTML = `
          <div>Direction: ${this.isLTR ? "LTR" : "RTL"}</div>
          <div>Current Leaf: ${this.currentLeaf ? this.currentLeaf.index : "None"}</div>
          <div>Flip dir: ${this.flipDirection}</div>
          <div>Flip Δ: ${this.flipDelta}</div>
          <div>Current Leaf Flip Position: ${(l = this.currentLeaf) == null ? void 0 : l.flipPosition.toFixed(3)}</div>
          <div>Is During Auto Flip: ${this.isDuringAutoFlip}</div>
        `;
    }, 10);
  }
  onDragStart(r) {
    if (console.log("drag start"), this.currentLeaf || this.isDuringAutoFlip) return this.flipDirection = Q.None, void (this.flipStartingPos = 0);
    this.flipStartingPos = r.center.x;
  }
  onDragUpdate(r) {
    var a;
    if (console.log("drag update"), !this.isDuringAutoFlip && !this.isDuringManualFlip) {
      this.isDuringManualFlip = !0;
      try {
        const l = r.center.x;
        this.flipDelta = this.isLTR ? this.flipStartingPos - l : l - this.flipStartingPos;
        const p = ((a = this.bookElement) == null ? void 0 : a.clientWidth) ?? 0;
        if (Math.abs(this.flipDelta) > p || this.flipDelta === 0) return;
        switch (this.flipDirection = this.flipDirection !== Q.None ? this.flipDirection : this.flipDelta > 0 ? Q.Forward : Q.Backward, this.flipDirection) {
          case Q.Forward:
            const m = this.flipDelta / p;
            if (m > 1 || this.flipDelta < 0) return;
            if (!this.currentLeaf) {
              if (this.isClosedInverted) return;
              this.currentLeaf = this.currentOrTurningLeaves[1];
            }
            this.currentLeaf.efficientFlipToPosition(m);
            break;
          case Q.Backward:
            const f = 1 - Math.abs(this.flipDelta) / p;
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
    if (console.log("drag end"), !this.currentLeaf || this.isDuringAutoFlip) return this.flipDirection = Q.None, void (this.flipStartingPos = 0);
    const a = 1e3 * r.velocityX;
    let l;
    switch (this.flipDirection) {
      case Q.Forward:
        l = (this.isLTR ? a < -500 : a > 500) || this.currentLeaf.flipPosition >= 0.5 ? 1 : 0;
        break;
      case Q.Backward:
        l = (this.isLTR ? a > 500 : a < -500) || this.currentLeaf.flipPosition <= 0.5 ? 0 : 1;
        break;
      default:
        return;
    }
    this.isDuringAutoFlip = !0, this.flipDirection = Q.None, this.flipStartingPos = 0, await this.currentLeaf.flipToPosition(l), this.isDuringAutoFlip = !1, this.currentLeaf = void 0;
  }
  jumpToPage(r) {
    this.onPageChanged && this.onPageChanged(r);
  }
}
var En = Je.$;
const Pn = ({
  pages: d,
  className: r,
  debug: a = !1,
  direction: l = "ltr",
  // Add the direction prop
  pageSemantics: p = void 0
}) => {
  const m = sn(
    new En({
      pageSemantics: p,
      pagesCount: d.length,
      direction: l
    })
  );
  return an(() => {
    m.current.render(`.${r}`, a);
  }, []), /* @__PURE__ */ Be.jsx("div", { className: r, children: d.map((f, h) => /* @__PURE__ */ Be.jsx("div", { className: "page", children: f }, h)) });
};
export {
  Pn as FlipBook
};
//# sourceMappingURL=flip-book.js.map
