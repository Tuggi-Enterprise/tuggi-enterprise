globalThis.monorepoPackagePath = "";globalThis.openNextDebug = false;globalThis.openNextVersion = "4.1.4";globalThis.nextVersion = "16.1.6";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod3) => function __require2() {
  return mod3 || (0, cb[__getOwnPropNames(cb)[0]])((mod3 = { exports: {} }).exports, mod3), mod3.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod3, secondTarget) => (__copyProps(target, mod3, "default"), secondTarget && __copyProps(secondTarget, mod3, "default"));
var __toESM = (mod3, isNodeMode, target) => (target = mod3 != null ? __create(__getProtoOf(mod3)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod3 || !mod3.__esModule ? __defProp(target, "default", { value: mod3, enumerable: true }) : target,
  mod3
));
var __toCommonJS = (mod3) => __copyProps(__defProp({}, "__esModule", { value: true }), mod3);

// node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var IgnorableError, FatalError;
var init_error = __esm({
  "node_modules/@opennextjs/aws/dist/utils/error.js"() {
    IgnorableError = class extends Error {
      __openNextInternal = true;
      canIgnore = true;
      logLevel = 0;
      constructor(message) {
        super(message);
        this.name = "IgnorableError";
      }
    };
    FatalError = class extends Error {
      __openNextInternal = true;
      canIgnore = false;
      logLevel = 2;
      constructor(message) {
        super(message);
        this.name = "FatalError";
      }
    };
  }
});

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}
var DOWNPLAYED_ERROR_LOGS, isDownplayedErrorLog;
var init_logger = __esm({
  "node_modules/@opennextjs/aws/dist/adapters/logger.js"() {
    init_error();
    DOWNPLAYED_ERROR_LOGS = [
      {
        clientName: "S3Client",
        commandName: "GetObjectCommand",
        errorName: "NoSuchKey"
      }
    ];
    isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
  }
});

// node_modules/@opennextjs/aws/dist/http/util.js
function parseSetCookieHeader(cookies) {
  if (!cookies) {
    return [];
  }
  if (typeof cookies === "string") {
    return cookies.split(/(?<!Expires=\w+),/i).map((c) => c.trim());
  }
  return cookies;
}
function getQueryFromIterator(it) {
  const query = {};
  for (const [key, value] of it) {
    if (key in query) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  return query;
}
var parseHeaders, convertHeader;
var init_util = __esm({
  "node_modules/@opennextjs/aws/dist/http/util.js"() {
    init_logger();
    parseHeaders = (headers) => {
      const result = {};
      if (!headers) {
        return result;
      }
      for (const [key, value] of Object.entries(headers)) {
        if (value === void 0) {
          continue;
        }
        const keyLower = key.toLowerCase();
        if (keyLower === "location" && Array.isArray(value)) {
          if (value.length === 1 || value[0] === value[1]) {
            result[keyLower] = value[0];
          } else {
            warn("Multiple different values for Location header found. Using the last one");
            result[keyLower] = value[value.length - 1];
          }
          continue;
        }
        result[keyLower] = convertHeader(value);
      }
      return result;
    };
    convertHeader = (header) => {
      if (typeof header === "string") {
        return header;
      }
      if (Array.isArray(header)) {
        return header.join(",");
      }
      return String(header);
    };
  }
});

// node-built-in-modules:node:module
var node_module_exports = {};
import * as node_module_star from "node:module";
var init_node_module = __esm({
  "node-built-in-modules:node:module"() {
    __reExport(node_module_exports, node_module_star);
  }
});

// node_modules/@opennextjs/aws/dist/utils/stream.js
import { ReadableStream as ReadableStream2 } from "node:stream/web";
function emptyReadableStream() {
  if (process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
    return new ReadableStream2({
      pull(controller) {
        maybeSomethingBuffer ??= Buffer.from("SOMETHING");
        controller.enqueue(maybeSomethingBuffer);
        controller.close();
      }
    }, { highWaterMark: 0 });
  }
  return new ReadableStream2({
    start(controller) {
      controller.close();
    }
  });
}
var maybeSomethingBuffer;
var init_stream = __esm({
  "node_modules/@opennextjs/aws/dist/utils/stream.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/utils.js
function getQueryFromSearchParams(searchParams) {
  return getQueryFromIterator(searchParams.entries());
}
var init_utils = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/utils.js"() {
    init_util();
  }
});

// node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCookie = parseCookie;
    exports.parse = parseCookie;
    exports.stringifyCookie = stringifyCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    exports.parseSetCookie = parseSetCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var maxAgeRegExp = /^-?\d+$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parseCookie(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
          break;
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const key = valueSlice(str, index, eqIdx);
        if (obj[key] === void 0) {
          obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function stringifyCookie(cookie, options) {
      const enc = options?.encode || encodeURIComponent;
      const cookieStrings = [];
      for (const name of Object.keys(cookie)) {
        const val = cookie[name];
        if (val === void 0)
          continue;
        if (!cookieNameRegExp.test(name)) {
          throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
          throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
      }
      return cookieStrings.join("; ");
    }
    function stringifySetCookie(_name, _val, _opts) {
      const cookie = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) };
      const options = typeof _val === "object" ? _val : _opts;
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(cookie.name)) {
        throw new TypeError(`argument name is invalid: ${cookie.name}`);
      }
      const value = cookie.value ? enc(cookie.value) : "";
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie.value}`);
      }
      let str = cookie.name + "=" + value;
      if (cookie.maxAge !== void 0) {
        if (!Number.isInteger(cookie.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
        }
        str += "; Max-Age=" + cookie.maxAge;
      }
      if (cookie.domain) {
        if (!domainValueRegExp.test(cookie.domain)) {
          throw new TypeError(`option domain is invalid: ${cookie.domain}`);
        }
        str += "; Domain=" + cookie.domain;
      }
      if (cookie.path) {
        if (!pathValueRegExp.test(cookie.path)) {
          throw new TypeError(`option path is invalid: ${cookie.path}`);
        }
        str += "; Path=" + cookie.path;
      }
      if (cookie.expires) {
        if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${cookie.expires}`);
        }
        str += "; Expires=" + cookie.expires.toUTCString();
      }
      if (cookie.httpOnly) {
        str += "; HttpOnly";
      }
      if (cookie.secure) {
        str += "; Secure";
      }
      if (cookie.partitioned) {
        str += "; Partitioned";
      }
      if (cookie.priority) {
        const priority = typeof cookie.priority === "string" ? cookie.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${cookie.priority}`);
        }
      }
      if (cookie.sameSite) {
        const sameSite = typeof cookie.sameSite === "string" ? cookie.sameSite.toLowerCase() : cookie.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
        }
      }
      return str;
    }
    function parseSetCookie(str, options) {
      const dec = options?.decode || decode;
      const len = str.length;
      const endIdx = endIndex(str, 0, len);
      const eqIdx = eqIndex(str, 0, endIdx);
      const setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : {
        name: valueSlice(str, 0, eqIdx),
        value: dec(valueSlice(str, eqIdx + 1, endIdx))
      };
      let index = endIdx + 1;
      while (index < len) {
        const endIdx2 = endIndex(str, index, len);
        const eqIdx2 = eqIndex(str, index, endIdx2);
        const attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2);
        const val = eqIdx2 === -1 ? void 0 : valueSlice(str, eqIdx2 + 1, endIdx2);
        switch (attr.toLowerCase()) {
          case "httponly":
            setCookie.httpOnly = true;
            break;
          case "secure":
            setCookie.secure = true;
            break;
          case "partitioned":
            setCookie.partitioned = true;
            break;
          case "domain":
            setCookie.domain = val;
            break;
          case "path":
            setCookie.path = val;
            break;
          case "max-age":
            if (val && maxAgeRegExp.test(val))
              setCookie.maxAge = Number(val);
            break;
          case "expires":
            if (!val)
              break;
            const date = new Date(val);
            if (Number.isFinite(date.valueOf()))
              setCookie.expires = date;
            break;
          case "priority":
            if (!val)
              break;
            const priority = val.toLowerCase();
            if (priority === "low" || priority === "medium" || priority === "high") {
              setCookie.priority = priority;
            }
            break;
          case "samesite":
            if (!val)
              break;
            const sameSite = val.toLowerCase();
            if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
              setCookie.sameSite = sameSite;
            }
            break;
        }
        index = endIdx2 + 1;
      }
      return setCookie;
    }
    function endIndex(str, min, len) {
      const index = str.indexOf(";", min);
      return index === -1 ? len : index;
    }
    function eqIndex(str, min, max) {
      const index = str.indexOf("=", min);
      return index < max ? index : -1;
    }
    function valueSlice(str, min, max) {
      let start = min;
      let end = max;
      do {
        const code = str.charCodeAt(start);
        if (code !== 32 && code !== 9)
          break;
      } while (++start < end);
      while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 32 && code !== 9)
          break;
        end--;
      }
      return str.slice(start, end);
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/edge.js
var edge_exports = {};
__export(edge_exports, {
  default: () => edge_default
});
import { Buffer as Buffer2 } from "node:buffer";
var import_cookie, NULL_BODY_STATUSES, converter, edge_default;
var init_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/edge.js"() {
    import_cookie = __toESM(require_dist(), 1);
    init_util();
    init_utils();
    NULL_BODY_STATUSES = /* @__PURE__ */ new Set([101, 103, 204, 205, 304]);
    converter = {
      convertFrom: async (event) => {
        const url = new URL(event.url);
        const searchParams = url.searchParams;
        const query = getQueryFromSearchParams(searchParams);
        const headers = {};
        event.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const rawPath = url.pathname;
        const method = event.method;
        const shouldHaveBody = method !== "GET" && method !== "HEAD";
        const body = shouldHaveBody ? Buffer2.from(await event.arrayBuffer()) : void 0;
        const cookieHeader = event.headers.get("cookie");
        const cookies = cookieHeader ? import_cookie.default.parse(cookieHeader) : {};
        return {
          type: "core",
          method,
          rawPath,
          url: event.url,
          body,
          headers,
          remoteAddress: event.headers.get("x-forwarded-for") ?? "::1",
          query,
          cookies
        };
      },
      convertTo: async (result) => {
        if ("internalEvent" in result) {
          const request = new Request(result.internalEvent.url, {
            body: result.internalEvent.body,
            method: result.internalEvent.method,
            headers: {
              ...result.internalEvent.headers,
              "x-forwarded-host": result.internalEvent.headers.host
            }
          });
          if (globalThis.__dangerous_ON_edge_converter_returns_request === true) {
            return request;
          }
          const cfCache = (result.isISR || result.internalEvent.rawPath.startsWith("/_next/image")) && process.env.DISABLE_CACHE !== "true" ? { cacheEverything: true } : {};
          return fetch(request, {
            // This is a hack to make sure that the response is cached by Cloudflare
            // See https://developers.cloudflare.com/workers/examples/cache-using-fetch/#caching-html-resources
            // @ts-expect-error - This is a Cloudflare specific option
            cf: cfCache
          });
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(result.headers)) {
          if (key === "set-cookie" && typeof value === "string") {
            const cookies = parseSetCookieHeader(value);
            for (const cookie of cookies) {
              headers.append(key, cookie);
            }
            continue;
          }
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, value);
          }
        }
        const body = NULL_BODY_STATUSES.has(result.statusCode) ? null : result.body;
        return new Response(body, {
          status: result.statusCode,
          headers
        });
      },
      name: "edge"
    };
    edge_default = converter;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-node.js
var cloudflare_node_exports = {};
__export(cloudflare_node_exports, {
  default: () => cloudflare_node_default
});
import { Writable } from "node:stream";
var NULL_BODY_STATUSES2, handler, cloudflare_node_default;
var init_cloudflare_node = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-node.js"() {
    NULL_BODY_STATUSES2 = /* @__PURE__ */ new Set([101, 204, 205, 304]);
    handler = async (handler3, converter2) => async (request, env, ctx, abortSignal) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const url = new URL(request.url);
      const { promise: promiseResponse, resolve: resolveResponse } = Promise.withResolvers();
      const streamCreator = {
        writeHeaders(prelude) {
          const { statusCode, cookies, headers } = prelude;
          const responseHeaders = new Headers(headers);
          for (const cookie of cookies) {
            responseHeaders.append("Set-Cookie", cookie);
          }
          if (url.hostname === "localhost") {
            responseHeaders.set("Content-Encoding", "identity");
          }
          if (NULL_BODY_STATUSES2.has(statusCode)) {
            const response2 = new Response(null, {
              status: statusCode,
              headers: responseHeaders
            });
            resolveResponse(response2);
            return new Writable({
              write(chunk, encoding, callback) {
                callback();
              }
            });
          }
          let controller;
          const readable = new ReadableStream({
            start(c) {
              controller = c;
            }
          });
          const response = new Response(readable, {
            status: statusCode,
            headers: responseHeaders
          });
          resolveResponse(response);
          return new Writable({
            write(chunk, encoding, callback) {
              try {
                controller.enqueue(chunk);
              } catch (e) {
                return callback(e);
              }
              callback();
            },
            final(callback) {
              controller.close();
              callback();
            },
            destroy(error2, callback) {
              if (error2) {
                controller.error(error2);
              } else {
                try {
                  controller.close();
                } catch {
                }
              }
              callback(error2);
            }
          });
        },
        // This is for passing along the original abort signal from the initial Request you retrieve in your worker
        // Ensures that the response we pass to NextServer is aborted if the request is aborted
        // By doing this `request.signal.onabort` will work in route handlers
        abortSignal,
        // There is no need to retain the chunks that were pushed to the response stream.
        retainChunks: false
      };
      ctx.waitUntil(handler3(internalEvent, {
        streamCreator,
        waitUntil: ctx.waitUntil.bind(ctx)
      }));
      return promiseResponse;
    };
    cloudflare_node_default = {
      wrapper: handler,
      name: "cloudflare-node",
      supportStreaming: true
    };
  }
});

// node_modules/@opennextjs/aws/dist/overrides/tagCache/dummy.js
var dummy_exports = {};
__export(dummy_exports, {
  default: () => dummy_default
});
var dummyTagCache, dummy_default;
var init_dummy = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/tagCache/dummy.js"() {
    dummyTagCache = {
      name: "dummy",
      mode: "original",
      getByPath: async () => {
        return [];
      },
      getByTag: async () => {
        return [];
      },
      getLastModified: async (_, lastModified) => {
        return lastModified ?? Date.now();
      },
      writeTags: async () => {
        return;
      },
      isStale: async (_path) => {
        return false;
      }
    };
    dummy_default = dummyTagCache;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/queue/dummy.js
var dummy_exports2 = {};
__export(dummy_exports2, {
  default: () => dummy_default2
});
var dummyQueue, dummy_default2;
var init_dummy2 = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/queue/dummy.js"() {
    init_error();
    dummyQueue = {
      name: "dummy",
      send: async () => {
        throw new FatalError("Dummy queue is not implemented");
      }
    };
    dummy_default2 = dummyQueue;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/incrementalCache/dummy.js
var dummy_exports3 = {};
__export(dummy_exports3, {
  default: () => dummy_default3
});
var dummyIncrementalCache, dummy_default3;
var init_dummy3 = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/incrementalCache/dummy.js"() {
    init_error();
    dummyIncrementalCache = {
      name: "dummy",
      get: async () => {
        throw new IgnorableError('"Dummy" cache does not cache anything');
      },
      set: async () => {
        throw new IgnorableError('"Dummy" cache does not cache anything');
      },
      delete: async () => {
        throw new IgnorableError('"Dummy" cache does not cache anything');
      }
    };
    dummy_default3 = dummyIncrementalCache;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js
var dummy_exports4 = {};
__export(dummy_exports4, {
  default: () => dummy_default4
});
var resolver, dummy_default4;
var init_dummy4 = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js"() {
    resolver = {
      name: "dummy"
    };
    dummy_default4 = resolver;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js
var fetch_exports = {};
__export(fetch_exports, {
  default: () => fetch_default
});
var fetchProxy, fetch_default;
var init_fetch = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js"() {
    init_stream();
    fetchProxy = {
      name: "fetch-proxy",
      // @ts-ignore
      proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
          method,
          headers,
          body
        });
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          const cur = responseHeaders[key];
          if (cur === void 0) {
            responseHeaders[key] = value;
          } else if (Array.isArray(cur)) {
            cur.push(value);
          } else {
            responseHeaders[key] = [cur, value];
          }
        });
        return {
          type: "core",
          headers: responseHeaders,
          statusCode: response.status,
          isBase64Encoded: true,
          body: response.body ?? emptyReadableStream()
        };
      }
    };
    fetch_default = fetchProxy;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/cdnInvalidation/dummy.js
var dummy_exports5 = {};
__export(dummy_exports5, {
  default: () => dummy_default5
});
var dummy_default5;
var init_dummy5 = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/cdnInvalidation/dummy.js"() {
    dummy_default5 = {
      name: "dummy",
      invalidatePaths: (_) => {
        return Promise.resolve();
      }
    };
  }
});

// node_modules/@opennextjs/aws/dist/core/createMainHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/adapters/util.js
function setNodeEnv() {
  const processEnv = process.env;
  processEnv.NODE_ENV = process.env.NODE_ENV ?? "production";
}
function generateUniqueId() {
  return Math.random().toString(36).slice(2, 8);
}

// node_modules/@opennextjs/aws/dist/core/requestHandler.js
import { AsyncLocalStorage } from "node:async_hooks";

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
import { Transform } from "node:stream";

// node_modules/@opennextjs/aws/dist/utils/cacheHeaders.js
var CACHE_CONTROL_HEADER = "cache-control";
var NEXTJS_CACHE_HEADER = "x-nextjs-cache";
var ISR_HEADER = "x-isr";
var NO_STORE_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";
function fixCacheControlForError(headers, statusCode) {
  if (process.env.OPEN_NEXT_DANGEROUSLY_SET_ERROR_HEADERS === "true") {
    return;
  }
  if (statusCode === 404 || statusCode === 500) {
    headers[CACHE_CONTROL_HEADER] = NO_STORE_CACHE_CONTROL;
  }
}

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_util();
var SET_COOKIE_HEADER = "set-cookie";
var CANNOT_BE_USED = "This cannot be used in OpenNext";
var OpenNextNodeResponse = class extends Transform {
  fixHeadersFn;
  onEnd;
  streamCreator;
  initialHeaders;
  statusCode;
  statusMessage = "";
  headers = {};
  headersSent = false;
  _chunks = [];
  headersAlreadyFixed = false;
  _cookies = [];
  responseStream;
  bodyLength = 0;
  // To comply with the ServerResponse interface :
  strictContentLength = false;
  assignSocket(_socket) {
    throw new Error(CANNOT_BE_USED);
  }
  detachSocket(_socket) {
    throw new Error(CANNOT_BE_USED);
  }
  // We might have to revisit those 3 in the future
  writeContinue(_callback) {
    throw new Error(CANNOT_BE_USED);
  }
  writeEarlyHints(_hints, _callback) {
    throw new Error(CANNOT_BE_USED);
  }
  writeProcessing() {
    throw new Error(CANNOT_BE_USED);
  }
  /**
   * This is a dummy request object to comply with the ServerResponse interface
   * It will never be defined
   */
  req;
  chunkedEncoding = false;
  shouldKeepAlive = true;
  useChunkedEncodingByDefault = true;
  sendDate = false;
  connection = null;
  socket = null;
  setTimeout(_msecs, _callback) {
    throw new Error(CANNOT_BE_USED);
  }
  addTrailers(_headers) {
    throw new Error(CANNOT_BE_USED);
  }
  constructor(fixHeadersFn, onEnd, streamCreator, initialHeaders, statusCode) {
    super();
    this.fixHeadersFn = fixHeadersFn;
    this.onEnd = onEnd;
    this.streamCreator = streamCreator;
    this.initialHeaders = initialHeaders;
    if (statusCode && Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599) {
      this.statusCode = statusCode;
    }
    streamCreator?.abortSignal?.addEventListener("abort", () => {
      this.destroy();
    });
  }
  // Necessary for next 12
  // We might have to implement all the methods here
  get originalResponse() {
    return this;
  }
  get finished() {
    return this.responseStream ? this.responseStream?.writableFinished : this.writableFinished;
  }
  setHeader(name, value) {
    const key = name.toLowerCase();
    if (key === SET_COOKIE_HEADER) {
      if (Array.isArray(value)) {
        this._cookies = value;
      } else {
        this._cookies = [value];
      }
    }
    this.headers[key] = value;
    return this;
  }
  removeHeader(name) {
    const key = name.toLowerCase();
    if (key === SET_COOKIE_HEADER) {
      this._cookies = [];
    } else {
      delete this.headers[key];
    }
    return this;
  }
  hasHeader(name) {
    const key = name.toLowerCase();
    if (key === SET_COOKIE_HEADER) {
      return this._cookies.length > 0;
    }
    return this.headers[key] !== void 0;
  }
  getHeaders() {
    return this.headers;
  }
  getHeader(name) {
    return this.headers[name.toLowerCase()];
  }
  getHeaderNames() {
    return Object.keys(this.headers);
  }
  // Only used directly in next@14+
  flushHeaders() {
    this.headersSent = true;
    const mergeHeadersPriority = globalThis.__openNextAls?.getStore()?.mergeHeadersPriority ?? "middleware";
    if (this.initialHeaders) {
      this.headers = mergeHeadersPriority === "middleware" ? {
        ...this.headers,
        ...this.initialHeaders
      } : {
        ...this.initialHeaders,
        ...this.headers
      };
      const initialCookies = parseSetCookieHeader(this.initialHeaders[SET_COOKIE_HEADER]?.toString());
      this._cookies = mergeHeadersPriority === "middleware" ? [...this._cookies, ...initialCookies] : [...initialCookies, ...this._cookies];
    }
    this.fixHeaders(this.headers);
    this.fixHeadersForError();
    this.headers[SET_COOKIE_HEADER] = this._cookies;
    const parsedHeaders = parseHeaders(this.headers);
    delete parsedHeaders[SET_COOKIE_HEADER];
    if (this.streamCreator) {
      this.responseStream = this.streamCreator?.writeHeaders({
        statusCode: this.statusCode ?? 200,
        cookies: this._cookies,
        headers: parsedHeaders
      });
      this.pipe(this.responseStream);
    }
  }
  appendHeader(name, value) {
    const key = name.toLowerCase();
    if (!this.hasHeader(key)) {
      return this.setHeader(key, value);
    }
    const existingHeader = this.getHeader(key);
    const toAppend = Array.isArray(value) ? value : [value];
    const newValue = Array.isArray(existingHeader) ? [...existingHeader, ...toAppend] : [existingHeader, ...toAppend];
    return this.setHeader(key, newValue);
  }
  writeHead(statusCode, statusMessage, headers) {
    let _headers = headers;
    let _statusMessage;
    if (typeof statusMessage === "string") {
      _statusMessage = statusMessage;
    } else {
      _headers = statusMessage;
    }
    const finalHeaders = this.headers;
    if (_headers) {
      if (Array.isArray(_headers)) {
        for (let i = 0; i < _headers.length; i += 2) {
          finalHeaders[_headers[i]] = _headers[i + 1];
        }
      } else {
        for (const key of Object.keys(_headers)) {
          finalHeaders[key] = _headers[key];
        }
      }
    }
    this.statusCode = statusCode;
    if (headers) {
      this.headers = finalHeaders;
    }
    this.flushHeaders();
    return this;
  }
  /**
   * OpenNext specific method
   */
  fixHeaders(headers) {
    if (this.headersAlreadyFixed) {
      return;
    }
    this.fixHeadersFn(headers);
    this.headersAlreadyFixed = true;
  }
  getFixedHeaders() {
    this.fixHeaders(this.headers);
    this.fixHeadersForError();
    this.headers[SET_COOKIE_HEADER] = this._cookies;
    return this.headers;
  }
  getBody() {
    return Buffer.concat(this._chunks);
  }
  _internalWrite(chunk, encoding) {
    const buffer = encoding === "buffer" ? chunk : Buffer.from(chunk, encoding);
    this.bodyLength += buffer.length;
    if (this.streamCreator?.retainChunks !== false) {
      this._chunks.push(buffer);
    }
    this.push(buffer);
    this.streamCreator?.onWrite?.();
  }
  _transform(chunk, encoding, callback) {
    if (!this.headersSent) {
      this.flushHeaders();
    }
    this._internalWrite(chunk, encoding);
    callback();
  }
  _flush(callback) {
    if (!this.headersSent) {
      this.flushHeaders();
    }
    globalThis.__openNextAls?.getStore()?.pendingPromiseRunner.add(this.onEnd(this.headers));
    this.streamCreator?.onFinish?.(this.bodyLength);
    if (this.bodyLength === 0 && // We use an env variable here because not all aws account have the same behavior
    // On some aws accounts the response will hang if the body is empty
    // We are modifying the response body here, this is not a good practice
    process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
      debug('Force writing "SOMETHING" to the response body');
      this.push("SOMETHING");
    }
    callback();
  }
  /**
   * New method in Node 18.15+
   * There are probably not used right now in Next.js, but better be safe than sorry
   */
  setHeaders(headers) {
    headers.forEach((value, key) => {
      this.setHeader(key, Array.isArray(value) ? value : value.toString());
    });
    return this;
  }
  /**
   * Next specific methods
   * On earlier versions of next.js, those methods are mandatory to make everything work
   */
  get sent() {
    return this.finished || this.headersSent;
  }
  getHeaderValues(name) {
    const values = this.getHeader(name);
    if (values === void 0)
      return void 0;
    return (Array.isArray(values) ? values : [values]).map((value) => value.toString());
  }
  send() {
    for (const chunk of this._chunks) {
      this.write(chunk);
    }
    this.end();
  }
  body(value) {
    this.write(value);
    return this;
  }
  onClose(callback) {
    this.on("close", callback);
  }
  redirect(destination, statusCode) {
    this.setHeader("Location", destination);
    this.statusCode = statusCode;
    if (statusCode === 308) {
      this.setHeader("Refresh", `0;url=${destination}`);
    }
    return this;
  }
  // For some reason, next returns the 500 error page with some cache-control headers
  // We need to fix that
  fixHeadersForError() {
    fixCacheControlForError(this.headers, this.statusCode);
  }
};

// node_modules/@opennextjs/aws/dist/http/request.js
import http from "node:http";
var IncomingMessage = class extends http.IncomingMessage {
  constructor({ method, url, headers, body, remoteAddress }) {
    super({
      encrypted: true,
      readable: false,
      remoteAddress,
      address: () => ({ port: 443 }),
      end: Function.prototype,
      destroy: Function.prototype
    });
    if (body) {
      headers["content-length"] ??= String(Buffer.byteLength(body));
    }
    Object.assign(this, {
      ip: remoteAddress,
      complete: true,
      httpVersion: "1.1",
      httpVersionMajor: "1",
      httpVersionMinor: "1",
      method,
      headers,
      body,
      url
    });
    this._read = () => {
      this.push(body);
      this.push(null);
    };
  }
};

// node_modules/@opennextjs/aws/dist/utils/promise.js
init_logger();

// node_modules/@opennextjs/aws/dist/utils/requestCache.js
var RequestCache = class {
  _caches = /* @__PURE__ */ new Map();
  /**
   * Returns the Map registered under `key`.
   * If no Map exists yet for that key, a new empty Map is created, stored, and returned.
   * Repeated calls with the same key always return the **same** Map instance.
   */
  getOrCreate(key) {
    let cache = this._caches.get(key);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      this._caches.set(key, cache);
    }
    return cache;
  }
};

// node_modules/@opennextjs/aws/dist/utils/promise.js
var DetachedPromise = class {
  resolve;
  reject;
  promise;
  constructor() {
    let resolve;
    let reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolve = resolve;
    this.reject = reject;
  }
};
var DetachedPromiseRunner = class {
  promises = [];
  withResolvers() {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    return detachedPromise;
  }
  add(promise) {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    promise.then(detachedPromise.resolve, detachedPromise.reject);
  }
  async await() {
    debug(`Awaiting ${this.promises.length} detached promises`);
    const results = await Promise.allSettled(this.promises.map((p) => p.promise));
    const rejectedPromises = results.filter((r) => r.status === "rejected");
    rejectedPromises.forEach((r) => {
      error(r.reason);
    });
  }
};
async function awaitAllDetachedPromise() {
  const store = globalThis.__openNextAls.getStore();
  const promisesToAwait = store?.pendingPromiseRunner.await() ?? Promise.resolve();
  if (store?.waitUntil) {
    store.waitUntil(promisesToAwait);
    return;
  }
  await promisesToAwait;
}
function provideNextAfterProvider() {
  const NEXT_REQUEST_CONTEXT_SYMBOL = Symbol.for("@next/request-context");
  const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
  const store = globalThis.__openNextAls.getStore();
  const waitUntil = store?.waitUntil ?? ((promise) => store?.pendingPromiseRunner.add(promise));
  const nextAfterContext = {
    get: () => ({
      waitUntil
    })
  };
  globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
    globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  }
}
function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil, requestId = Math.random().toString(36) }, fn) {
  return globalThis.__openNextAls.run({
    requestId,
    pendingPromiseRunner: new DetachedPromiseRunner(),
    isISRRevalidation,
    waitUntil,
    writtenTags: /* @__PURE__ */ new Set(),
    requestCache: new RequestCache()
  }, async () => {
    provideNextAfterProvider();
    let result;
    try {
      result = await fn();
    } finally {
      await awaitAllDetachedPromise();
    }
    return result;
  });
}

// node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": {}, "webpack": null, "typescript": { "ignoreBuildErrors": false }, "typedRoutes": false, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.ts", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "poweredByHeader": true, "compress": true, "images": { "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840], "imageSizes": [32, 48, 64, 96, 128, 256, 384], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 14400, "formats": ["image/webp"], "maximumRedirects": 3, "maximumResponseBody": 5e7, "dangerouslyAllowLocalIP": false, "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "localPatterns": [{ "pathname": "**", "search": "" }], "remotePatterns": [{ "protocol": "https", "hostname": "fake-project-ref.supabase.co", "pathname": "/storage/v1/object/public/**" }], "qualities": [75], "unoptimized": false }, "devIndicators": { "position": "bottom-left" }, "onDemandEntries": { "maxInactiveAge": 6e4, "pagesBufferLength": 5 }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "reactProductionProfiling": false, "reactStrictMode": null, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": {}, "compiler": {}, "expireTime": 31536e3, "staticPageGenerationTimeout": 60, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "/Users/leandroramos/Documents/work/Tuggi/tuggi-enterprise", "cacheComponents": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 30, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 31536e3 } }, "cacheHandlers": {}, "experimental": { "useSkewCookie": false, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "dynamicOnHover": false, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "proxyPrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 7, "memoryBasedWorkersCount": false, "imgOptConcurrency": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "imgOptSkipMetadata": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "largePageDataBytes": 128e3, "typedEnv": false, "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": false, "optimizeServerReact": true, "viewTransition": false, "removeUncaughtErrorAndRejectionListeners": false, "validateRSCRequestHeaders": false, "staleTimes": { "dynamic": 0, "static": 300 }, "reactDebugChannel": false, "serverComponentsHmrCache": true, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "transitionIndicator": false, "inlineCss": false, "useCache": false, "globalNotFound": false, "browserDebugInfoInTerminal": false, "lockDistDir": true, "isolatedDevBuild": true, "proxyClientMaxBodySize": 10485760, "hideLogsAfterAbort": false, "mcpServer": true, "turbopackFileSystemCacheForDev": true, "turbopackFileSystemCacheForBuild": false, "turbopackInferModuleSideEffects": false, "optimizePackageImports": ["lucide-react", "date-fns", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "rxjs", "@mui/material", "@mui/icons-material", "recharts", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-sqlite-node", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-wasm", "@effect/sql-sqlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight", "bundlePagesRouterDependencies": false, "configFileName": "next.config.ts", "reactCompiler": false, "turbopack": { "resolveAlias": { "next-intl/config": "./src/i18n/request.ts" }, "root": "/Users/leandroramos/Documents/work/Tuggi/tuggi-enterprise" }, "distDirRoot": ".next", "_originalRedirects": [{ "source": "/pt-br", "destination": "/pt", "statusCode": 301 }, { "source": "/pt-pt", "destination": "/pt", "statusCode": 301 }, { "source": "/pt-br/:path*", "destination": "/pt/:path*", "statusCode": 301 }, { "source": "/pt-pt/:path*", "destination": "/pt/:path*", "statusCode": 301 }, { "source": "/:locale(en|es|pt|it)/terms-of-use", "destination": "/:locale/trust-center/terms-of-use", "statusCode": 301 }, { "source": "/terms-of-use", "destination": "/en/trust-center/terms-of-use", "statusCode": 301 }, { "source": "/:locale(en|es|pt|it)/privacy-policy", "destination": "/:locale/trust-center/privacy-policy", "statusCode": 301 }, { "source": "/privacy-policy", "destination": "/en/trust-center/privacy-policy", "statusCode": 301 }, { "source": "/:locale(en|es|pt|it)/accessibility", "destination": "/:locale/trust-center/accessibility", "statusCode": 301 }, { "source": "/accessibility", "destination": "/en/trust-center/accessibility", "statusCode": 301 }, { "source": "/:locale(en|es|pt|it)/data-deletion", "destination": "/:locale/trust-center/data-deletion", "statusCode": 301 }, { "source": "/data-deletion", "destination": "/en/trust-center/data-deletion", "statusCode": 301 }, { "source": "/:locale(en|es|pt|it)/security-sla", "destination": "/:locale/trust-center/security-sla", "statusCode": 301 }, { "source": "/security-sla", "destination": "/en/trust-center/security-sla", "statusCode": 301 }, { "source": "/:locale(en|es|pt|it)/terms", "destination": "/:locale/trust-center/terms-of-use", "statusCode": 301 }, { "source": "/terms", "destination": "/en/trust-center/terms-of-use", "statusCode": 301 }, { "source": "/:locale(en|es|pt|it)/privacy", "destination": "/:locale/trust-center/privacy-policy", "statusCode": 301 }, { "source": "/privacy", "destination": "/en/trust-center/privacy-policy", "statusCode": 301 }, { "source": "/es/technology", "destination": "/es/tecnologia", "statusCode": 301 }, { "source": "/pt/technology", "destination": "/pt/tecnologia", "statusCode": 301 }, { "source": "/it/technology", "destination": "/it/tecnologia", "statusCode": 301 }, { "source": "/technology", "destination": "/en/technology", "statusCode": 301 }, { "source": "/en/enterprise/city-os", "destination": "/en/destinations", "statusCode": 301 }, { "source": "/es/enterprise/city-os", "destination": "/es/destinos", "statusCode": 301 }, { "source": "/pt/enterprise/city-os", "destination": "/pt/destinos", "statusCode": 301 }, { "source": "/it/enterprise/city-os", "destination": "/it/destinazioni", "statusCode": 301 }, { "source": "/enterprise/city-os", "destination": "/en/destinations", "statusCode": 301 }] };
var BuildId = "sgcYRXgj6Q_bI4KL2gAqo";
var HtmlPages = ["/404", "/500"];
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [], "fallback": [] }, "redirects": [{ "source": "/:path+/", "destination": "/:path+", "internal": true, "priority": true, "statusCode": 308, "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$" }, { "source": "/pt-br", "destination": "/pt", "statusCode": 301, "regex": "^(?!/_next)/pt-br(?:/)?$" }, { "source": "/pt-pt", "destination": "/pt", "statusCode": 301, "regex": "^(?!/_next)/pt-pt(?:/)?$" }, { "source": "/pt-br/:path*", "destination": "/pt/:path*", "statusCode": 301, "regex": "^(?!/_next)/pt-br(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/pt-pt/:path*", "destination": "/pt/:path*", "statusCode": 301, "regex": "^(?!/_next)/pt-pt(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$" }, { "source": "/:locale(en|es|pt|it)/terms-of-use", "destination": "/:locale/trust-center/terms-of-use", "statusCode": 301, "regex": "^(?!/_next)(?:/(en|es|pt|it))/terms-of-use(?:/)?$" }, { "source": "/terms-of-use", "destination": "/en/trust-center/terms-of-use", "statusCode": 301, "regex": "^(?!/_next)/terms-of-use(?:/)?$" }, { "source": "/:locale(en|es|pt|it)/privacy-policy", "destination": "/:locale/trust-center/privacy-policy", "statusCode": 301, "regex": "^(?!/_next)(?:/(en|es|pt|it))/privacy-policy(?:/)?$" }, { "source": "/privacy-policy", "destination": "/en/trust-center/privacy-policy", "statusCode": 301, "regex": "^(?!/_next)/privacy-policy(?:/)?$" }, { "source": "/:locale(en|es|pt|it)/accessibility", "destination": "/:locale/trust-center/accessibility", "statusCode": 301, "regex": "^(?!/_next)(?:/(en|es|pt|it))/accessibility(?:/)?$" }, { "source": "/accessibility", "destination": "/en/trust-center/accessibility", "statusCode": 301, "regex": "^(?!/_next)/accessibility(?:/)?$" }, { "source": "/:locale(en|es|pt|it)/data-deletion", "destination": "/:locale/trust-center/data-deletion", "statusCode": 301, "regex": "^(?!/_next)(?:/(en|es|pt|it))/data-deletion(?:/)?$" }, { "source": "/data-deletion", "destination": "/en/trust-center/data-deletion", "statusCode": 301, "regex": "^(?!/_next)/data-deletion(?:/)?$" }, { "source": "/:locale(en|es|pt|it)/security-sla", "destination": "/:locale/trust-center/security-sla", "statusCode": 301, "regex": "^(?!/_next)(?:/(en|es|pt|it))/security-sla(?:/)?$" }, { "source": "/security-sla", "destination": "/en/trust-center/security-sla", "statusCode": 301, "regex": "^(?!/_next)/security-sla(?:/)?$" }, { "source": "/:locale(en|es|pt|it)/terms", "destination": "/:locale/trust-center/terms-of-use", "statusCode": 301, "regex": "^(?!/_next)(?:/(en|es|pt|it))/terms(?:/)?$" }, { "source": "/terms", "destination": "/en/trust-center/terms-of-use", "statusCode": 301, "regex": "^(?!/_next)/terms(?:/)?$" }, { "source": "/:locale(en|es|pt|it)/privacy", "destination": "/:locale/trust-center/privacy-policy", "statusCode": 301, "regex": "^(?!/_next)(?:/(en|es|pt|it))/privacy(?:/)?$" }, { "source": "/privacy", "destination": "/en/trust-center/privacy-policy", "statusCode": 301, "regex": "^(?!/_next)/privacy(?:/)?$" }, { "source": "/es/technology", "destination": "/es/tecnologia", "statusCode": 301, "regex": "^(?!/_next)/es/technology(?:/)?$" }, { "source": "/pt/technology", "destination": "/pt/tecnologia", "statusCode": 301, "regex": "^(?!/_next)/pt/technology(?:/)?$" }, { "source": "/it/technology", "destination": "/it/tecnologia", "statusCode": 301, "regex": "^(?!/_next)/it/technology(?:/)?$" }, { "source": "/technology", "destination": "/en/technology", "statusCode": 301, "regex": "^(?!/_next)/technology(?:/)?$" }, { "source": "/en/enterprise/city-os", "destination": "/en/destinations", "statusCode": 301, "regex": "^(?!/_next)/en/enterprise/city-os(?:/)?$" }, { "source": "/es/enterprise/city-os", "destination": "/es/destinos", "statusCode": 301, "regex": "^(?!/_next)/es/enterprise/city-os(?:/)?$" }, { "source": "/pt/enterprise/city-os", "destination": "/pt/destinos", "statusCode": 301, "regex": "^(?!/_next)/pt/enterprise/city-os(?:/)?$" }, { "source": "/it/enterprise/city-os", "destination": "/it/destinazioni", "statusCode": 301, "regex": "^(?!/_next)/it/enterprise/city-os(?:/)?$" }, { "source": "/enterprise/city-os", "destination": "/en/destinations", "statusCode": 301, "regex": "^(?!/_next)/enterprise/city-os(?:/)?$" }], "routes": { "static": [{ "page": "/_global-error", "regex": "^/_global\\-error(?:/)?$", "routeKeys": {}, "namedRegex": "^/_global\\-error(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/api/attribution", "regex": "^/api/attribution(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/attribution(?:/)?$" }, { "page": "/api/attribution/gate", "regex": "^/api/attribution/gate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/attribution/gate(?:/)?$" }, { "page": "/api/data-deletion", "regex": "^/api/data\\-deletion(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/data\\-deletion(?:/)?$" }, { "page": "/api/geo", "regex": "^/api/geo(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/geo(?:/)?$" }, { "page": "/api/leads", "regex": "^/api/leads(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/leads(?:/)?$" }, { "page": "/api/partner-proposal", "regex": "^/api/partner\\-proposal(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/partner\\-proposal(?:/)?$" }, { "page": "/api/partner-proposal/funnel", "regex": "^/api/partner\\-proposal/funnel(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/partner\\-proposal/funnel(?:/)?$" }, { "page": "/api/postal-code", "regex": "^/api/postal\\-code(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/postal\\-code(?:/)?$" }, { "page": "/llms.txt", "regex": "^/llms\\.txt(?:/)?$", "routeKeys": {}, "namedRegex": "^/llms\\.txt(?:/)?$" }, { "page": "/robots.txt", "regex": "^/robots\\.txt(?:/)?$", "routeKeys": {}, "namedRegex": "^/robots\\.txt(?:/)?$" }, { "page": "/sitemap.xml", "regex": "^/sitemap\\.xml(?:/)?$", "routeKeys": {}, "namedRegex": "^/sitemap\\.xml(?:/)?$" }], "dynamic": [{ "page": "/[locale]", "regex": "^/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)(?:/)?$" }, { "page": "/[locale]/contact", "regex": "^/([^/]+?)/contact(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/contact(?:/)?$" }, { "page": "/[locale]/coverage", "regex": "^/([^/]+?)/coverage(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/coverage(?:/)?$" }, { "page": "/[locale]/coverage/opengraph-image", "regex": "^/([^/]+?)/coverage/opengraph\\-image(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/coverage/opengraph\\-image(?:/)?$" }, { "page": "/[locale]/d/[slug]", "regex": "^/([^/]+?)/d/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/d/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/[locale]/d/[slug]/opengraph-image", "regex": "^/([^/]+?)/d/([^/]+?)/opengraph\\-image(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/d/(?<nxtPslug>[^/]+?)/opengraph\\-image(?:/)?$" }, { "page": "/[locale]/destinations", "regex": "^/([^/]+?)/destinations(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/destinations(?:/)?$" }, { "page": "/[locale]/download", "regex": "^/([^/]+?)/download(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/download(?:/)?$" }, { "page": "/[locale]/drive", "regex": "^/([^/]+?)/drive(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/drive(?:/)?$" }, { "page": "/[locale]/enterprise/fleets", "regex": "^/([^/]+?)/enterprise/fleets(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/enterprise/fleets(?:/)?$" }, { "page": "/[locale]/partners", "regex": "^/([^/]+?)/partners(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/partners(?:/)?$" }, { "page": "/[locale]/partners/proposal", "regex": "^/([^/]+?)/partners/proposal(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/partners/proposal(?:/)?$" }, { "page": "/[locale]/purpose", "regex": "^/([^/]+?)/purpose(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/purpose(?:/)?$" }, { "page": "/[locale]/technology", "regex": "^/([^/]+?)/technology(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/technology(?:/)?$" }, { "page": "/[locale]/tours", "regex": "^/([^/]+?)/tours(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/tours(?:/)?$" }, { "page": "/[locale]/tours/[country]", "regex": "^/([^/]+?)/tours/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPcountry": "nxtPcountry" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/tours/(?<nxtPcountry>[^/]+?)(?:/)?$" }, { "page": "/[locale]/tours/[country]/state/[state]", "regex": "^/([^/]+?)/tours/([^/]+?)/state/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPcountry": "nxtPcountry", "nxtPstate": "nxtPstate" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/tours/(?<nxtPcountry>[^/]+?)/state/(?<nxtPstate>[^/]+?)(?:/)?$" }, { "page": "/[locale]/tours/[country]/[slug]", "regex": "^/([^/]+?)/tours/([^/]+?)/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPcountry": "nxtPcountry", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/tours/(?<nxtPcountry>[^/]+?)/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/[locale]/tours/[country]/[slug]/opengraph-image", "regex": "^/([^/]+?)/tours/([^/]+?)/([^/]+?)/opengraph\\-image(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPcountry": "nxtPcountry", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/tours/(?<nxtPcountry>[^/]+?)/(?<nxtPslug>[^/]+?)/opengraph\\-image(?:/)?$" }, { "page": "/[locale]/trust-center/accessibility", "regex": "^/([^/]+?)/trust\\-center/accessibility(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/trust\\-center/accessibility(?:/)?$" }, { "page": "/[locale]/trust-center/data-deletion", "regex": "^/([^/]+?)/trust\\-center/data\\-deletion(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/trust\\-center/data\\-deletion(?:/)?$" }, { "page": "/[locale]/trust-center/privacy-policy", "regex": "^/([^/]+?)/trust\\-center/privacy\\-policy(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/trust\\-center/privacy\\-policy(?:/)?$" }, { "page": "/[locale]/trust-center/security-sla", "regex": "^/([^/]+?)/trust\\-center/security\\-sla(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/trust\\-center/security\\-sla(?:/)?$" }, { "page": "/[locale]/trust-center/terms-of-use", "regex": "^/([^/]+?)/trust\\-center/terms\\-of\\-use(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/trust\\-center/terms\\-of\\-use(?:/)?$" }, { "page": "/[locale]/unsubscribe", "regex": "^/([^/]+?)/unsubscribe(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/unsubscribe(?:/)?$" }, { "page": "/[locale]/updates", "regex": "^/([^/]+?)/updates(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/updates(?:/)?$" }, { "page": "/[locale]/updates/feed.xml", "regex": "^/([^/]+?)/updates/feed\\.xml(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/updates/feed\\.xml(?:/)?$" }, { "page": "/[locale]/updates/[slug]", "regex": "^/([^/]+?)/updates/([^/]+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/updates/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/[locale]/updates/[slug]/opengraph-image", "regex": "^/([^/]+?)/updates/([^/]+?)/opengraph\\-image(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPslug": "nxtPslug" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/updates/(?<nxtPslug>[^/]+?)/opengraph\\-image(?:/)?$" }, { "page": "/[locale]/[...rest]", "regex": "^/([^/]+?)/(.+?)(?:/)?$", "routeKeys": { "nxtPlocale": "nxtPlocale", "nxtPrest": "nxtPrest" }, "namedRegex": "^/(?<nxtPlocale>[^/]+?)/(?<nxtPrest>.+?)(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var PrerenderManifest = { "version": 4, "routes": { "/_global-error": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_global-error", "dataRoute": "/_global-error.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/_not-found": { "initialStatus": 404, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/_not-found", "dataRoute": "/_not-found.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/contact": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/contact", "dataRoute": "/en/contact.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/contact": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/contact", "dataRoute": "/es/contact.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/contact": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/contact", "dataRoute": "/it/contact.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/contact": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/contact", "dataRoute": "/pt/contact.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/coverage": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/coverage", "dataRoute": "/en/coverage.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/coverage": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/coverage", "dataRoute": "/es/coverage.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/coverage": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/coverage", "dataRoute": "/it/coverage.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/coverage": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/coverage", "dataRoute": "/pt/coverage.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/destinations": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/destinations", "dataRoute": "/en/destinations.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/destinations": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/destinations", "dataRoute": "/es/destinations.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/destinations": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/destinations", "dataRoute": "/it/destinations.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/destinations": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/destinations", "dataRoute": "/pt/destinations.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/drive": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/drive", "dataRoute": "/en/drive.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/drive": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/drive", "dataRoute": "/es/drive.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/drive": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/drive", "dataRoute": "/it/drive.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/drive": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/drive", "dataRoute": "/pt/drive.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/enterprise/fleets": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/enterprise/fleets", "dataRoute": "/en/enterprise/fleets.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/enterprise/fleets": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/enterprise/fleets", "dataRoute": "/es/enterprise/fleets.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/enterprise/fleets": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/enterprise/fleets", "dataRoute": "/it/enterprise/fleets.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/enterprise/fleets": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/enterprise/fleets", "dataRoute": "/pt/enterprise/fleets.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]", "dataRoute": "/en.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]", "dataRoute": "/es.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]", "dataRoute": "/it.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]", "dataRoute": "/pt.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/partners": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/partners", "dataRoute": "/en/partners.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/partners": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/partners", "dataRoute": "/es/partners.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/partners": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/partners", "dataRoute": "/it/partners.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/partners": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/partners", "dataRoute": "/pt/partners.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/partners/proposal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/partners/proposal", "dataRoute": "/en/partners/proposal.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/partners/proposal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/partners/proposal", "dataRoute": "/es/partners/proposal.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/partners/proposal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/partners/proposal", "dataRoute": "/it/partners/proposal.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/partners/proposal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/partners/proposal", "dataRoute": "/pt/partners/proposal.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/purpose": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/purpose", "dataRoute": "/en/purpose.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/purpose": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/purpose", "dataRoute": "/es/purpose.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/purpose": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/purpose", "dataRoute": "/it/purpose.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/purpose": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/purpose", "dataRoute": "/pt/purpose.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/technology": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/technology", "dataRoute": "/en/technology.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/technology": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/technology", "dataRoute": "/es/technology.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/technology": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/technology", "dataRoute": "/it/technology.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/technology": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/technology", "dataRoute": "/pt/technology.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/as-maravilhas-do-rio-em-um-dia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/as-maravilhas-do-rio-em-um-dia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/avenida-paulista-e-arredores/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/avenida-paulista-e-arredores/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/praias-do-rio-de-botafogo-a-grumari/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/praias-do-rio-de-botafogo-a-grumari/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/rio-boemio/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/rio-boemio/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/rota-do-patrimonio-tombado-de-buzios/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/rota-do-patrimonio-tombado-de-buzios/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/rota-religiosa-de-buzios/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/rota-religiosa-de-buzios/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/sao-paulo-a-noite/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/sao-paulo-a-noite/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/sao-paulo-com-criancas/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/sao-paulo-com-criancas/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/sao-paulo-esportiva/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/brazil/sao-paulo-esportiva/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/eletrico-28/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/portugal/eletrico-28/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/grande-volta-de-lisboa/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/portugal/grande-volta-de-lisboa/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/lisboa-historica/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/portugal/lisboa-historica/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/sintra-e-seus-palacios/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/portugal/sintra-e-seus-palacios/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/atlanta-classica/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/atlanta-classica/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/brooklyn-e-queens/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/brooklyn-e-queens/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/cenas-de-cinema-em-nova-york/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/cenas-de-cinema-em-nova-york/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/central-park-do-sul-ao-norte/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/central-park-do-sul-ao-norte/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/compras-em-orlando/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/compras-em-orlando/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/de-orlando-a-space-coast/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/de-orlando-a-space-coast/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/disney-de-graca-sem-ingressos/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/disney-de-graca-sem-ingressos/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/icones-de-midtown-manhattan/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/icones-de-midtown-manhattan/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/kennesaw-e-marietta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/kennesaw-e-marietta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/nova-york-dos-fas-de-friends/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/nova-york-dos-fas-de-friends/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/nova-york-pelas-pontes/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/nova-york-pelas-pontes/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/stone-mountain-e-os-parques-de-atlanta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/stone-mountain-e-os-parques-de-atlanta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/wall-street-e-o-financial-district/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/en/tours/united-states/wall-street-e-o-financial-district/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/as-maravilhas-do-rio-em-um-dia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/brazil/as-maravilhas-do-rio-em-um-dia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/avenida-paulista-e-arredores/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/brazil/avenida-paulista-e-arredores/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/praias-do-rio-de-botafogo-a-grumari/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/brazil/praias-do-rio-de-botafogo-a-grumari/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/rio-boemio/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/brazil/rio-boemio/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/sao-paulo-a-noite/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/brazil/sao-paulo-a-noite/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/sao-paulo-com-criancas/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/brazil/sao-paulo-com-criancas/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/sao-paulo-esportiva/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/brazil/sao-paulo-esportiva/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/eletrico-28/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/portugal/eletrico-28/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/grande-volta-de-lisboa/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/portugal/grande-volta-de-lisboa/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/lisboa-historica/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/portugal/lisboa-historica/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/sintra-e-seus-palacios/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/portugal/sintra-e-seus-palacios/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/spain/barcelona-em-1-dia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/spain/barcelona-em-1-dia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/atlanta-classica/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/atlanta-classica/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/brooklyn-e-queens/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/brooklyn-e-queens/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/cenas-de-cinema-em-nova-york/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/cenas-de-cinema-em-nova-york/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/central-park-do-sul-ao-norte/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/central-park-do-sul-ao-norte/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/compras-em-orlando/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/compras-em-orlando/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/de-orlando-a-space-coast/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/de-orlando-a-space-coast/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/disney-de-graca-sem-ingressos/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/disney-de-graca-sem-ingressos/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/icones-de-midtown-manhattan/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/icones-de-midtown-manhattan/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/kennesaw-e-marietta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/kennesaw-e-marietta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/nova-york-dos-fas-de-friends/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/nova-york-dos-fas-de-friends/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/nova-york-pelas-pontes/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/nova-york-pelas-pontes/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/stone-mountain-e-os-parques-de-atlanta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/stone-mountain-e-os-parques-de-atlanta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/wall-street-e-o-financial-district/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/es/tours/united-states/wall-street-e-o-financial-district/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/as-maravilhas-do-rio-em-um-dia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/brazil/as-maravilhas-do-rio-em-um-dia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/avenida-paulista-e-arredores/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/brazil/avenida-paulista-e-arredores/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/praias-do-rio-de-botafogo-a-grumari/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/brazil/praias-do-rio-de-botafogo-a-grumari/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/rio-boemio/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/brazil/rio-boemio/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/sao-paulo-a-noite/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/brazil/sao-paulo-a-noite/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/sao-paulo-com-criancas/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/brazil/sao-paulo-com-criancas/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/sao-paulo-esportiva/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/brazil/sao-paulo-esportiva/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/eletrico-28/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/portugal/eletrico-28/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/grande-volta-de-lisboa/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/portugal/grande-volta-de-lisboa/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/lisboa-historica/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/portugal/lisboa-historica/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/sintra-e-seus-palacios/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/portugal/sintra-e-seus-palacios/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/atlanta-classica/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/atlanta-classica/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/brooklyn-e-queens/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/brooklyn-e-queens/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/cenas-de-cinema-em-nova-york/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/cenas-de-cinema-em-nova-york/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/central-park-do-sul-ao-norte/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/central-park-do-sul-ao-norte/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/compras-em-orlando/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/compras-em-orlando/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/de-orlando-a-space-coast/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/de-orlando-a-space-coast/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/disney-de-graca-sem-ingressos/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/disney-de-graca-sem-ingressos/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/icones-de-midtown-manhattan/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/icones-de-midtown-manhattan/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/kennesaw-e-marietta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/kennesaw-e-marietta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/nova-york-dos-fas-de-friends/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/nova-york-dos-fas-de-friends/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/nova-york-pelas-pontes/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/nova-york-pelas-pontes/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/stone-mountain-e-os-parques-de-atlanta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/stone-mountain-e-os-parques-de-atlanta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/wall-street-e-o-financial-district/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/it/tours/united-states/wall-street-e-o-financial-district/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/as-maravilhas-do-rio-em-um-dia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/as-maravilhas-do-rio-em-um-dia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/avenida-paulista-e-arredores/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/avenida-paulista-e-arredores/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/caminho-da-fe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/caminho-da-fe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/circuito-dos-santuarios-de-aparecida/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/circuito-dos-santuarios-de-aparecida/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/conservatoria-a-capital-da-seresta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/conservatoria-a-capital-da-seresta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/lagoa-azul-e-lagoa-bonita/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/lagoa-azul-e-lagoa-bonita/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/lagoas-de-santo-amaro/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/lagoas-de-santo-amaro/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/passeio-do-rio-preguicas/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/passeio-do-rio-preguicas/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/praias-do-rio-de-botafogo-a-grumari/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/praias-do-rio-de-botafogo-a-grumari/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/regiao-dos-lagos-em-um-dia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/regiao-dos-lagos-em-um-dia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rio-boemio/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rio-boemio/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-da-cachaca/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-da-cachaca/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-da-luz/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-da-luz/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-do-cafe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-do-cafe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-do-festival-sabores-de-cabo-frio-2026/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-do-festival-sabores-de-cabo-frio-2026/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-do-patrimonio-tombado-de-buzios/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-do-patrimonio-tombado-de-buzios/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-do-queijo-de-valenca/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-do-queijo-de-valenca/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-gastronomica-de-conservatoria/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-gastronomica-de-conservatoria/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-historica-e-cultural-da-orla-bardot/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-historica-e-cultural-da-orla-bardot/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-religiosa-de-buzios/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/rota-religiosa-de-buzios/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/sao-paulo-a-noite/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/sao-paulo-a-noite/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/sao-paulo-com-criancas/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/sao-paulo-com-criancas/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/sao-paulo-esportiva/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/sao-paulo-esportiva/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/trilha-da-brava-ao-forno/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/trilha-da-brava-ao-forno/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/trilha-da-ponta-do-pai-vitorio/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/trilha-da-ponta-do-pai-vitorio/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/trilha-do-canto-amores-e-tartaruga/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/brazil/trilha-do-canto-amores-e-tartaruga/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/eletrico-28/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/eletrico-28/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/furnas-termas-e-vulcoes/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/furnas-termas-e-vulcoes/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/grande-volta-de-lisboa/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/grande-volta-de-lisboa/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/lisboa-historica/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/lisboa-historica/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/nordeste-de-sao-miguel/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/nordeste-de-sao-miguel/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/ponta-delgada-a-capital-acoriana/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/ponta-delgada-a-capital-acoriana/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/ponta-delgada-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/ponta-delgada-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/sete-cidades-e-a-costa-oeste/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/sete-cidades-e-a-costa-oeste/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/sintra-e-seus-palacios/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/portugal/sintra-e-seus-palacios/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barcelona-da-guerra-civil/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/barcelona-da-guerra-civil/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barcelona-em-1-dia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/barcelona-em-1-dia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barcelona-olimpica-1992/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/barcelona-olimpica-1992/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barcelona-religiosa/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/barcelona-religiosa/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barceloneta-e-vila-olimpica-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/barceloneta-e-vila-olimpica-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/bus-turistic-linha-azul/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/bus-turistic-linha-azul/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/bus-turistic-linha-vermelha/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/bus-turistic-linha-vermelha/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-figueres-e-cadaques/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-barcelona-a-figueres-e-cadaques/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-girona-e-costa-brava/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-barcelona-a-girona-e-costa-brava/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-montserrat-e-colonia-guell/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-barcelona-a-montserrat-e-colonia-guell/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-sitges-e-penedes/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-barcelona-a-sitges-e-penedes/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-tarragona-romana/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-barcelona-a-tarragona-romana/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-madrid-a-alcala-de-henares-e-aranjuez/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-madrid-a-alcala-de-henares-e-aranjuez/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-madrid-a-el-escorial-e-avila/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-madrid-a-el-escorial-e-avila/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-madrid-a-segovia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-madrid-a-segovia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-madrid-a-toledo/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/de-madrid-a-toledo/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/eixample-modernista-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/eixample-modernista-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/els-emblematics-lojas-centenarias/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/els-emblematics-lojas-centenarias/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/gaudi-essencial/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/gaudi-essencial/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/gotic-e-born-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/gotic-e-born-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/goya-em-madrid/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/goya-em-madrid/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/gracia-e-park-guell-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/gracia-e-park-guell-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/madrid-dos-austrias-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/madrid-dos-austrias-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/madrid-dos-bourbons-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/madrid-dos-bourbons-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/madrid-em-1-dia/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/madrid-em-1-dia/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/montjuic-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/montjuic-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/paseo-del-arte-a-pe/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/spain/paseo-del-arte-a-pe/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/atlanta-classica/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/atlanta-classica/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/brooklyn-e-queens/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/brooklyn-e-queens/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/cenas-de-cinema-em-nova-york/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/cenas-de-cinema-em-nova-york/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/central-park-do-sul-ao-norte/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/central-park-do-sul-ao-norte/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/compras-em-orlando/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/compras-em-orlando/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/de-orlando-a-space-coast/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/de-orlando-a-space-coast/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/disney-de-graca-sem-ingressos/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/disney-de-graca-sem-ingressos/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/icones-de-midtown-manhattan/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/icones-de-midtown-manhattan/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/kennesaw-e-marietta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/kennesaw-e-marietta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/nova-york-dos-fas-de-friends/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/nova-york-dos-fas-de-friends/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/nova-york-pelas-pontes/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/nova-york-pelas-pontes/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/stone-mountain-e-os-parques-de-atlanta/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/stone-mountain-e-os-parques-de-atlanta/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/wall-street-e-o-financial-district/opengraph-image": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/png", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/tours/layout,_N_T_/[locale]/tours/[country]/layout,_N_T_/[locale]/tours/[country]/[slug]/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/layout,_N_T_/[locale]/tours/[country]/[slug]/opengraph-image/route,_N_T_/pt/tours/united-states/wall-street-e-o-financial-district/opengraph-image" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]/opengraph-image", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/as-maravilhas-do-rio-em-um-dia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/as-maravilhas-do-rio-em-um-dia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/avenida-paulista-e-arredores": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/avenida-paulista-e-arredores.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/praias-do-rio-de-botafogo-a-grumari": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/praias-do-rio-de-botafogo-a-grumari.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/rio-boemio": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/rio-boemio.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/rota-do-patrimonio-tombado-de-buzios": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/rota-do-patrimonio-tombado-de-buzios.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/rota-religiosa-de-buzios": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/rota-religiosa-de-buzios.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/sao-paulo-a-noite": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/sao-paulo-a-noite.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/sao-paulo-com-criancas": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/sao-paulo-com-criancas.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/sao-paulo-esportiva": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/brazil/sao-paulo-esportiva.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/eletrico-28": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/portugal/eletrico-28.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/grande-volta-de-lisboa": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/portugal/grande-volta-de-lisboa.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/lisboa-historica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/portugal/lisboa-historica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal/sintra-e-seus-palacios": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/portugal/sintra-e-seus-palacios.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/atlanta-classica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/atlanta-classica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/brooklyn-e-queens": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/brooklyn-e-queens.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/cenas-de-cinema-em-nova-york": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/cenas-de-cinema-em-nova-york.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/central-park-do-sul-ao-norte": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/central-park-do-sul-ao-norte.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/compras-em-orlando": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/compras-em-orlando.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/de-orlando-a-space-coast": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/de-orlando-a-space-coast.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/disney-de-graca-sem-ingressos": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/disney-de-graca-sem-ingressos.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/icones-de-midtown-manhattan": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/icones-de-midtown-manhattan.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/kennesaw-e-marietta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/kennesaw-e-marietta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/nova-york-dos-fas-de-friends": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/nova-york-dos-fas-de-friends.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/nova-york-pelas-pontes": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/nova-york-pelas-pontes.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/stone-mountain-e-os-parques-de-atlanta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/stone-mountain-e-os-parques-de-atlanta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/wall-street-e-o-financial-district": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/en/tours/united-states/wall-street-e-o-financial-district.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/as-maravilhas-do-rio-em-um-dia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/brazil/as-maravilhas-do-rio-em-um-dia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/avenida-paulista-e-arredores": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/brazil/avenida-paulista-e-arredores.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/praias-do-rio-de-botafogo-a-grumari": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/brazil/praias-do-rio-de-botafogo-a-grumari.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/rio-boemio": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/brazil/rio-boemio.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/sao-paulo-a-noite": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/brazil/sao-paulo-a-noite.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/sao-paulo-com-criancas": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/brazil/sao-paulo-com-criancas.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/sao-paulo-esportiva": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/brazil/sao-paulo-esportiva.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/eletrico-28": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/portugal/eletrico-28.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/grande-volta-de-lisboa": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/portugal/grande-volta-de-lisboa.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/lisboa-historica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/portugal/lisboa-historica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal/sintra-e-seus-palacios": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/portugal/sintra-e-seus-palacios.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/spain/barcelona-em-1-dia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/spain/barcelona-em-1-dia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/atlanta-classica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/atlanta-classica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/brooklyn-e-queens": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/brooklyn-e-queens.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/cenas-de-cinema-em-nova-york": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/cenas-de-cinema-em-nova-york.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/central-park-do-sul-ao-norte": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/central-park-do-sul-ao-norte.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/compras-em-orlando": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/compras-em-orlando.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/de-orlando-a-space-coast": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/de-orlando-a-space-coast.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/disney-de-graca-sem-ingressos": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/disney-de-graca-sem-ingressos.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/icones-de-midtown-manhattan": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/icones-de-midtown-manhattan.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/kennesaw-e-marietta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/kennesaw-e-marietta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/nova-york-dos-fas-de-friends": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/nova-york-dos-fas-de-friends.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/nova-york-pelas-pontes": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/nova-york-pelas-pontes.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/stone-mountain-e-os-parques-de-atlanta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/stone-mountain-e-os-parques-de-atlanta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/wall-street-e-o-financial-district": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/es/tours/united-states/wall-street-e-o-financial-district.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/as-maravilhas-do-rio-em-um-dia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/brazil/as-maravilhas-do-rio-em-um-dia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/avenida-paulista-e-arredores": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/brazil/avenida-paulista-e-arredores.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/praias-do-rio-de-botafogo-a-grumari": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/brazil/praias-do-rio-de-botafogo-a-grumari.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/rio-boemio": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/brazil/rio-boemio.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/sao-paulo-a-noite": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/brazil/sao-paulo-a-noite.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/sao-paulo-com-criancas": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/brazil/sao-paulo-com-criancas.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/sao-paulo-esportiva": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/brazil/sao-paulo-esportiva.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/eletrico-28": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/portugal/eletrico-28.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/grande-volta-de-lisboa": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/portugal/grande-volta-de-lisboa.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/lisboa-historica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/portugal/lisboa-historica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal/sintra-e-seus-palacios": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/portugal/sintra-e-seus-palacios.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/atlanta-classica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/atlanta-classica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/brooklyn-e-queens": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/brooklyn-e-queens.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/cenas-de-cinema-em-nova-york": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/cenas-de-cinema-em-nova-york.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/central-park-do-sul-ao-norte": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/central-park-do-sul-ao-norte.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/compras-em-orlando": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/compras-em-orlando.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/de-orlando-a-space-coast": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/de-orlando-a-space-coast.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/disney-de-graca-sem-ingressos": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/disney-de-graca-sem-ingressos.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/icones-de-midtown-manhattan": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/icones-de-midtown-manhattan.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/kennesaw-e-marietta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/kennesaw-e-marietta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/nova-york-dos-fas-de-friends": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/nova-york-dos-fas-de-friends.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/nova-york-pelas-pontes": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/nova-york-pelas-pontes.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/stone-mountain-e-os-parques-de-atlanta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/stone-mountain-e-os-parques-de-atlanta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/wall-street-e-o-financial-district": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/it/tours/united-states/wall-street-e-o-financial-district.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/as-maravilhas-do-rio-em-um-dia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/as-maravilhas-do-rio-em-um-dia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/avenida-paulista-e-arredores": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/avenida-paulista-e-arredores.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/caminho-da-fe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/caminho-da-fe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/circuito-dos-santuarios-de-aparecida": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/circuito-dos-santuarios-de-aparecida.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/conservatoria-a-capital-da-seresta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/conservatoria-a-capital-da-seresta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/lagoa-azul-e-lagoa-bonita": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/lagoa-azul-e-lagoa-bonita.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/lagoas-de-santo-amaro": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/lagoas-de-santo-amaro.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/passeio-do-rio-preguicas": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/passeio-do-rio-preguicas.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/praias-do-rio-de-botafogo-a-grumari": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/praias-do-rio-de-botafogo-a-grumari.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/regiao-dos-lagos-em-um-dia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/regiao-dos-lagos-em-um-dia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rio-boemio": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rio-boemio.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-da-cachaca": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-da-cachaca.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-da-luz": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-da-luz.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-do-cafe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-do-cafe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-do-festival-sabores-de-cabo-frio-2026": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-do-festival-sabores-de-cabo-frio-2026.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-do-patrimonio-tombado-de-buzios": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-do-patrimonio-tombado-de-buzios.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-do-queijo-de-valenca": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-do-queijo-de-valenca.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-gastronomica-de-conservatoria": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-gastronomica-de-conservatoria.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-historica-e-cultural-da-orla-bardot": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-historica-e-cultural-da-orla-bardot.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/rota-religiosa-de-buzios": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/rota-religiosa-de-buzios.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/sao-paulo-a-noite": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/sao-paulo-a-noite.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/sao-paulo-com-criancas": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/sao-paulo-com-criancas.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/sao-paulo-esportiva": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/sao-paulo-esportiva.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/trilha-da-brava-ao-forno": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/trilha-da-brava-ao-forno.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/trilha-da-ponta-do-pai-vitorio": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/trilha-da-ponta-do-pai-vitorio.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/trilha-do-canto-amores-e-tartaruga": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/brazil/trilha-do-canto-amores-e-tartaruga.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/cristo-rei-e-o-outro-lado-do-tejo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/eletrico-28": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/eletrico-28.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/furnas-termas-e-vulcoes": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/furnas-termas-e-vulcoes.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/grande-volta-de-lisboa": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/grande-volta-de-lisboa.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/lisboa-historica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/lisboa-historica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/nordeste-de-sao-miguel": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/nordeste-de-sao-miguel.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/ponta-delgada-a-capital-acoriana": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/ponta-delgada-a-capital-acoriana.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/ponta-delgada-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/ponta-delgada-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/sete-cidades-e-a-costa-oeste": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/sete-cidades-e-a-costa-oeste.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal/sintra-e-seus-palacios": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/portugal/sintra-e-seus-palacios.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barcelona-da-guerra-civil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/barcelona-da-guerra-civil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barcelona-em-1-dia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/barcelona-em-1-dia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barcelona-olimpica-1992": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/barcelona-olimpica-1992.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barcelona-religiosa": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/barcelona-religiosa.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/barceloneta-e-vila-olimpica-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/barceloneta-e-vila-olimpica-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/bus-turistic-linha-azul": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/bus-turistic-linha-azul.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/bus-turistic-linha-vermelha": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/bus-turistic-linha-vermelha.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-figueres-e-cadaques": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-barcelona-a-figueres-e-cadaques.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-girona-e-costa-brava": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-barcelona-a-girona-e-costa-brava.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-montserrat-e-colonia-guell": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-barcelona-a-montserrat-e-colonia-guell.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-sitges-e-penedes": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-barcelona-a-sitges-e-penedes.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-barcelona-a-tarragona-romana": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-barcelona-a-tarragona-romana.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-madrid-a-alcala-de-henares-e-aranjuez": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-madrid-a-alcala-de-henares-e-aranjuez.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-madrid-a-el-escorial-e-avila": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-madrid-a-el-escorial-e-avila.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-madrid-a-segovia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-madrid-a-segovia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/de-madrid-a-toledo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/de-madrid-a-toledo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/eixample-modernista-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/eixample-modernista-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/els-emblematics-lojas-centenarias": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/els-emblematics-lojas-centenarias.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/gaudi-essencial": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/gaudi-essencial.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/gotic-e-born-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/gotic-e-born-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/goya-em-madrid": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/goya-em-madrid.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/gracia-e-park-guell-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/gracia-e-park-guell-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/madrid-dos-austrias-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/madrid-dos-austrias-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/madrid-dos-bourbons-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/madrid-dos-bourbons-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/madrid-em-1-dia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/madrid-em-1-dia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/montjuic-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/montjuic-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/paseo-del-arte-a-pe": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/spain/paseo-del-arte-a-pe.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/atlanta-classica": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/atlanta-classica.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/brooklyn-e-queens": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/brooklyn-e-queens.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/cenas-de-cinema-em-nova-york": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/cenas-de-cinema-em-nova-york.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/central-park-do-sul-ao-norte": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/central-park-do-sul-ao-norte.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/compras-em-orlando": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/compras-em-orlando.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/de-orlando-a-space-coast": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/de-orlando-a-space-coast.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/disney-de-graca-sem-ingressos": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/disney-de-graca-sem-ingressos.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/estatua-da-liberdade-e-o-lado-de-nova-jersey.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/icones-de-midtown-manhattan": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/icones-de-midtown-manhattan.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/kennesaw-e-marietta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/kennesaw-e-marietta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/nova-york-dos-fas-de-friends": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/nova-york-dos-fas-de-friends.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/nova-york-pelas-pontes": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/nova-york-pelas-pontes.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/stone-mountain-e-os-parques-de-atlanta": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/stone-mountain-e-os-parques-de-atlanta.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/wall-street-e-o-financial-district": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/[slug]", "dataRoute": "/pt/tours/united-states/wall-street-e-o-financial-district.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/en/tours/brazil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/portugal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/en/tours/portugal.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/en/tours/united-states.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/es/tours/brazil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/portugal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/es/tours/portugal.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/spain": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/es/tours/spain.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/es/tours/united-states.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/it/tours/brazil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/portugal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/it/tours/portugal.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/it/tours/united-states.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/pt/tours/brazil.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/portugal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/pt/tours/portugal.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/pt/tours/spain.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]", "dataRoute": "/pt/tours/united-states.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/state/rio-de-janeiro": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/en/tours/brazil/state/rio-de-janeiro.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/brazil/state/sao-paulo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/en/tours/brazil/state/sao-paulo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/state/florida": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/en/tours/united-states/state/florida.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/state/georgia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/en/tours/united-states/state/georgia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/state/new-jersey": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/en/tours/united-states/state/new-jersey.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours/united-states/state/new-york": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/en/tours/united-states/state/new-york.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/state/rio-de-janeiro": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/es/tours/brazil/state/rio-de-janeiro.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/brazil/state/sao-paulo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/es/tours/brazil/state/sao-paulo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/spain/state/catalunya": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/es/tours/spain/state/catalunya.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/state/florida": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/es/tours/united-states/state/florida.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/state/georgia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/es/tours/united-states/state/georgia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/state/new-jersey": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/es/tours/united-states/state/new-jersey.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours/united-states/state/new-york": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/es/tours/united-states/state/new-york.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/state/rio-de-janeiro": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/it/tours/brazil/state/rio-de-janeiro.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/brazil/state/sao-paulo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/it/tours/brazil/state/sao-paulo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/state/florida": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/it/tours/united-states/state/florida.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/state/georgia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/it/tours/united-states/state/georgia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/state/new-jersey": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/it/tours/united-states/state/new-jersey.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours/united-states/state/new-york": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/it/tours/united-states/state/new-york.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/state/maranhao": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/brazil/state/maranhao.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/state/minas-gerais": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/brazil/state/minas-gerais.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/state/rio-de-janeiro": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/brazil/state/rio-de-janeiro.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/brazil/state/sao-paulo": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/brazil/state/sao-paulo.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/state/castilla-la-mancha": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/spain/state/castilla-la-mancha.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/state/castilla-y-leon": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/spain/state/castilla-y-leon.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/state/catalunya": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/spain/state/catalunya.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/spain/state/madrid": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/spain/state/madrid.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/state/florida": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/united-states/state/florida.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/state/georgia": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/united-states/state/georgia.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/state/new-jersey": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/united-states/state/new-jersey.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours/united-states/state/new-york": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours/[country]/state/[state]", "dataRoute": "/pt/tours/united-states/state/new-york.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/tours": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours", "dataRoute": "/en/tours.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/tours": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours", "dataRoute": "/es/tours.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/tours": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours", "dataRoute": "/it/tours.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/tours": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/tours", "dataRoute": "/pt/tours.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/trust-center/accessibility": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/accessibility", "dataRoute": "/en/trust-center/accessibility.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/trust-center/accessibility": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/accessibility", "dataRoute": "/es/trust-center/accessibility.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/trust-center/accessibility": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/accessibility", "dataRoute": "/it/trust-center/accessibility.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/trust-center/accessibility": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/accessibility", "dataRoute": "/pt/trust-center/accessibility.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/trust-center/data-deletion": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/data-deletion", "dataRoute": "/en/trust-center/data-deletion.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/trust-center/data-deletion": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/data-deletion", "dataRoute": "/es/trust-center/data-deletion.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/trust-center/data-deletion": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/data-deletion", "dataRoute": "/it/trust-center/data-deletion.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/trust-center/data-deletion": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/data-deletion", "dataRoute": "/pt/trust-center/data-deletion.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/trust-center/privacy-policy": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/privacy-policy", "dataRoute": "/en/trust-center/privacy-policy.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/trust-center/privacy-policy": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/privacy-policy", "dataRoute": "/es/trust-center/privacy-policy.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/trust-center/privacy-policy": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/privacy-policy", "dataRoute": "/it/trust-center/privacy-policy.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/trust-center/privacy-policy": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/privacy-policy", "dataRoute": "/pt/trust-center/privacy-policy.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/trust-center/security-sla": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/security-sla", "dataRoute": "/en/trust-center/security-sla.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/trust-center/security-sla": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/security-sla", "dataRoute": "/es/trust-center/security-sla.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/trust-center/security-sla": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/security-sla", "dataRoute": "/it/trust-center/security-sla.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/trust-center/security-sla": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/security-sla", "dataRoute": "/pt/trust-center/security-sla.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/trust-center/terms-of-use": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/terms-of-use", "dataRoute": "/en/trust-center/terms-of-use.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/trust-center/terms-of-use": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/terms-of-use", "dataRoute": "/es/trust-center/terms-of-use.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/trust-center/terms-of-use": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/terms-of-use", "dataRoute": "/it/trust-center/terms-of-use.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/trust-center/terms-of-use": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/trust-center/terms-of-use", "dataRoute": "/pt/trust-center/terms-of-use.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/updates/audio-guide-that-starts-on-its-own": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/[slug]", "dataRoute": "/en/updates/audio-guide-that-starts-on-its-own.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/updates/hour-passes": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/[slug]", "dataRoute": "/en/updates/hour-passes.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/updates/audioguia-que-empieza-sola": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/[slug]", "dataRoute": "/es/updates/audioguia-que-empieza-sola.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/updates/pases-por-hora": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/[slug]", "dataRoute": "/es/updates/pases-por-hora.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/updates/audioguida-che-parte-da-sola": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/[slug]", "dataRoute": "/it/updates/audioguida-che-parte-da-sola.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/updates/pass-a-ore": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/[slug]", "dataRoute": "/it/updates/pass-a-ore.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/updates/audio-guia-que-comeca-sozinho": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/[slug]", "dataRoute": "/pt/updates/audio-guia-que-comeca-sozinho.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/updates/passes-por-hora": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/[slug]", "dataRoute": "/pt/updates/passes-por-hora.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/updates/feed.xml": { "initialHeaders": { "cache-control": "public, max-age=3600, s-maxage=86400", "content-type": "application/rss+xml; charset=utf-8", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/updates/layout,_N_T_/[locale]/updates/feed.xml/layout,_N_T_/[locale]/updates/feed.xml/route,_N_T_/en/updates/feed.xml" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/feed.xml", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/updates/feed.xml": { "initialHeaders": { "cache-control": "public, max-age=3600, s-maxage=86400", "content-type": "application/rss+xml; charset=utf-8", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/updates/layout,_N_T_/[locale]/updates/feed.xml/layout,_N_T_/[locale]/updates/feed.xml/route,_N_T_/es/updates/feed.xml" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/feed.xml", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/updates/feed.xml": { "initialHeaders": { "cache-control": "public, max-age=3600, s-maxage=86400", "content-type": "application/rss+xml; charset=utf-8", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/updates/layout,_N_T_/[locale]/updates/feed.xml/layout,_N_T_/[locale]/updates/feed.xml/route,_N_T_/it/updates/feed.xml" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/feed.xml", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/updates/feed.xml": { "initialHeaders": { "cache-control": "public, max-age=3600, s-maxage=86400", "content-type": "application/rss+xml; charset=utf-8", "x-next-cache-tags": "_N_T_/layout,_N_T_/[locale]/layout,_N_T_/[locale]/updates/layout,_N_T_/[locale]/updates/feed.xml/layout,_N_T_/[locale]/updates/feed.xml/route,_N_T_/pt/updates/feed.xml" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates/feed.xml", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/en/updates": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates", "dataRoute": "/en/updates.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/es/updates": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates", "dataRoute": "/es/updates.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/it/updates": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates", "dataRoute": "/it/updates.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/pt/updates": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/[locale]/updates", "dataRoute": "/pt/updates.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/llms.txt": { "initialHeaders": { "cache-control": "public, max-age=3600, s-maxage=86400", "content-type": "text/plain; charset=utf-8", "x-next-cache-tags": "_N_T_/layout,_N_T_/llms.txt/layout,_N_T_/llms.txt/route,_N_T_/llms.txt" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/llms.txt", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/robots.txt": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "text/plain", "x-next-cache-tags": "_N_T_/layout,_N_T_/robots.txt/layout,_N_T_/robots.txt/route,_N_T_/robots.txt" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/robots.txt", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sitemap.xml": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "application/xml", "x-next-cache-tags": "_N_T_/layout,_N_T_/sitemap.xml/layout,_N_T_/sitemap.xml/route,_N_T_/sitemap.xml" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/sitemap.xml", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "dynamicRoutes": { "/[locale]/contact": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/contact(?:/)?$", "dataRoute": "/[locale]/contact.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/contact\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/coverage": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/coverage(?:/)?$", "dataRoute": "/[locale]/coverage.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/coverage\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/destinations": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/destinations(?:/)?$", "dataRoute": "/[locale]/destinations.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/destinations\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/drive": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/drive(?:/)?$", "dataRoute": "/[locale]/drive.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/drive\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/enterprise/fleets": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/enterprise/fleets(?:/)?$", "dataRoute": "/[locale]/enterprise/fleets.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/enterprise/fleets\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)(?:/)?$", "dataRoute": "/[locale].rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/partners": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/partners(?:/)?$", "dataRoute": "/[locale]/partners.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/partners\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/partners/proposal": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/partners/proposal(?:/)?$", "dataRoute": "/[locale]/partners/proposal.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/partners/proposal\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/purpose": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/purpose(?:/)?$", "dataRoute": "/[locale]/purpose.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/purpose\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/technology": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/technology(?:/)?$", "dataRoute": "/[locale]/technology.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/technology\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/tours/[country]/[slug]/opengraph-image": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/tours/([^/]+?)/([^/]+?)/opengraph\\-image(?:/)?$", "dataRoute": null, "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": null, "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/tours/[country]/[slug]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/tours/([^/]+?)/([^/]+?)(?:/)?$", "dataRoute": "/[locale]/tours/[country]/[slug].rsc", "fallback": false, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/tours/([^/]+?)/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/tours/[country]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/tours/([^/]+?)(?:/)?$", "dataRoute": "/[locale]/tours/[country].rsc", "fallback": false, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/tours/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/tours/[country]/state/[state]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/tours/([^/]+?)/state/([^/]+?)(?:/)?$", "dataRoute": "/[locale]/tours/[country]/state/[state].rsc", "fallback": false, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/tours/([^/]+?)/state/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/tours": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/tours(?:/)?$", "dataRoute": "/[locale]/tours.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/tours\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/trust-center/accessibility": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/trust\\-center/accessibility(?:/)?$", "dataRoute": "/[locale]/trust-center/accessibility.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/trust\\-center/accessibility\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/trust-center/data-deletion": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/trust\\-center/data\\-deletion(?:/)?$", "dataRoute": "/[locale]/trust-center/data-deletion.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/trust\\-center/data\\-deletion\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/trust-center/privacy-policy": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/trust\\-center/privacy\\-policy(?:/)?$", "dataRoute": "/[locale]/trust-center/privacy-policy.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/trust\\-center/privacy\\-policy\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/trust-center/security-sla": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/trust\\-center/security\\-sla(?:/)?$", "dataRoute": "/[locale]/trust-center/security-sla.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/trust\\-center/security\\-sla\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/trust-center/terms-of-use": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/trust\\-center/terms\\-of\\-use(?:/)?$", "dataRoute": "/[locale]/trust-center/terms-of-use.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/trust\\-center/terms\\-of\\-use\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/updates/[slug]/opengraph-image": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/updates/([^/]+?)/opengraph\\-image(?:/)?$", "dataRoute": null, "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": null, "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/updates/[slug]": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/updates/([^/]+?)(?:/)?$", "dataRoute": "/[locale]/updates/[slug].rsc", "fallback": false, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/updates/([^/]+?)\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/updates/feed.xml": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/updates/feed\\.xml(?:/)?$", "dataRoute": null, "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": null, "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/[locale]/updates": { "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "routeRegex": "^/([^/]+?)/updates(?:/)?$", "dataRoute": "/[locale]/updates.rsc", "fallback": null, "fallbackRouteParams": [], "dataRouteRegex": "^/([^/]+?)/updates\\.rsc$", "prefetchDataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "notFoundRoutes": [], "preview": { "previewModeId": "337a4a2660de84dded8f833ff1f34e77", "previewModeSigningKey": "dc0173aca8e973d3650b294af07215887df30f172a2feccebe4ca3505b77d4f8", "previewModeEncryptionKey": "097a1864360e542b36ed78cb7bc1b19c58e2d964f0a05538bc10a093dd82bbf3" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge/chunks/[root-of-the-server]__cfc6ad0d._.js", "server/edge/chunks/src_messages_it_json_e3f07adc._.js", "server/edge/chunks/src_messages_pt_json_62ca1c59._.js", "server/edge/chunks/src_messages_es_json_9447b998._.js", "server/edge/chunks/node_modules_5c4c4abd._.js", "server/edge/chunks/src_messages_en_json_a2d62f82._.js", "server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_37db5152.js"], "name": "middleware", "page": "/", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api|_next|_vercel|.*\\..*).*))(\\\\.json)?[\\/#\\?]?$", "originalSource": "/((?!api|_next|_vercel|.*\\..*).*)" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "sgcYRXgj6Q_bI4KL2gAqo", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "vRHJmOzWBEleGexCd/fvM1VYKg8DR5xk1bl5K+n1McI=", "__NEXT_PREVIEW_MODE_ID": "337a4a2660de84dded8f833ff1f34e77", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "097a1864360e542b36ed78cb7bc1b19c58e2d964f0a05538bc10a093dd82bbf3", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "dc0173aca8e973d3650b294af07215887df30f172a2feccebe4ca3505b77d4f8" } } }, "sortedMiddleware": ["/"], "functions": { "/api/geo/route": { "files": ["server/middleware-build-manifest.js", "server/interception-route-rewrite-manifest.js", "required-server-files.js", "server/server-reference-manifest.js", "server/app/api/geo/route_client-reference-manifest.js", "server/edge/chunks/_next-internal_server_app_api_geo_route_actions_613c9cb2.js", "server/edge/chunks/[root-of-the-server]__a66f4487._.js", "server/edge/chunks/node_modules_next_dist_4753ac0d._.js", "server/edge/chunks/turbopack-node_modules_next_dist_esm_build_templates_edge-wrapper_341e15e8.js"], "name": "app/api/geo/route", "page": "/api/geo/route", "matchers": [{ "regexp": "^/api/geo(?:/)?$", "originalSource": "/api/geo" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "sgcYRXgj6Q_bI4KL2gAqo", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "vRHJmOzWBEleGexCd/fvM1VYKg8DR5xk1bl5K+n1McI=", "__NEXT_PREVIEW_MODE_ID": "337a4a2660de84dded8f833ff1f34e77", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "097a1864360e542b36ed78cb7bc1b19c58e2d964f0a05538bc10a093dd82bbf3", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "dc0173aca8e973d3650b294af07215887df30f172a2feccebe4ca3505b77d4f8" } } } };
var AppPathRoutesManifest = { "/[locale]/[...rest]/page": "/[locale]/[...rest]", "/[locale]/contact/page": "/[locale]/contact", "/[locale]/coverage/opengraph-image/route": "/[locale]/coverage/opengraph-image", "/[locale]/coverage/page": "/[locale]/coverage", "/[locale]/d/[slug]/opengraph-image/route": "/[locale]/d/[slug]/opengraph-image", "/[locale]/d/[slug]/page": "/[locale]/d/[slug]", "/[locale]/destinations/page": "/[locale]/destinations", "/[locale]/download/page": "/[locale]/download", "/[locale]/drive/page": "/[locale]/drive", "/[locale]/enterprise/fleets/page": "/[locale]/enterprise/fleets", "/[locale]/page": "/[locale]", "/[locale]/partners/page": "/[locale]/partners", "/[locale]/partners/proposal/page": "/[locale]/partners/proposal", "/[locale]/purpose/page": "/[locale]/purpose", "/[locale]/technology/page": "/[locale]/technology", "/[locale]/tours/[country]/[slug]/opengraph-image/route": "/[locale]/tours/[country]/[slug]/opengraph-image", "/[locale]/tours/[country]/[slug]/page": "/[locale]/tours/[country]/[slug]", "/[locale]/tours/[country]/page": "/[locale]/tours/[country]", "/[locale]/tours/[country]/state/[state]/page": "/[locale]/tours/[country]/state/[state]", "/[locale]/tours/page": "/[locale]/tours", "/[locale]/trust-center/accessibility/page": "/[locale]/trust-center/accessibility", "/[locale]/trust-center/data-deletion/page": "/[locale]/trust-center/data-deletion", "/[locale]/trust-center/privacy-policy/page": "/[locale]/trust-center/privacy-policy", "/[locale]/trust-center/security-sla/page": "/[locale]/trust-center/security-sla", "/[locale]/trust-center/terms-of-use/page": "/[locale]/trust-center/terms-of-use", "/[locale]/unsubscribe/page": "/[locale]/unsubscribe", "/[locale]/updates/[slug]/opengraph-image/route": "/[locale]/updates/[slug]/opengraph-image", "/[locale]/updates/[slug]/page": "/[locale]/updates/[slug]", "/[locale]/updates/feed.xml/route": "/[locale]/updates/feed.xml", "/[locale]/updates/page": "/[locale]/updates", "/_global-error/page": "/_global-error", "/_not-found/page": "/_not-found", "/api/attribution/gate/route": "/api/attribution/gate", "/api/attribution/route": "/api/attribution", "/api/data-deletion/route": "/api/data-deletion", "/api/geo/route": "/api/geo", "/api/leads/route": "/api/leads", "/api/partner-proposal/funnel/route": "/api/partner-proposal/funnel", "/api/partner-proposal/route": "/api/partner-proposal", "/api/postal-code/route": "/api/postal-code", "/llms.txt/route": "/llms.txt", "/robots.txt/route": "/robots.txt", "/sitemap.xml/route": "/sitemap.xml" };
var FunctionsConfigManifest = { "version": 1, "functions": { "/api/attribution/gate": {}, "/api/geo": {} } };
var PagesManifest = { "/404": "pages/404.html", "/500": "pages/500.html" };
process.env.NEXT_BUILD_ID = BuildId;
process.env.OPEN_NEXT_BUILD_ID = NextConfig.deploymentId ?? BuildId;
process.env.NEXT_PREVIEW_MODE_ID = PrerenderManifest?.preview?.previewModeId;

// node_modules/@opennextjs/aws/dist/core/requestHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/patchAsyncStorage.js
var mod = (init_node_module(), __toCommonJS(node_module_exports));
var resolveFilename = mod._resolveFilename;

// node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto from "node:crypto";
init_util();
init_logger();
import { ReadableStream as ReadableStream3 } from "node:stream/web";

// node_modules/@opennextjs/aws/dist/utils/binary.js
var commonBinaryMimeTypes = /* @__PURE__ */ new Set([
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
  // Serialized data
  "application/x-protobuf"
]);
function isBinaryContentType(contentType) {
  if (!contentType)
    return false;
  const value = contentType.split(";")[0];
  return commonBinaryMimeTypes.has(value);
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/i18n/accept-header.js
function parse(raw, preferences, options) {
  const lowers = /* @__PURE__ */ new Map();
  const header = raw.replace(/[ \t]/g, "");
  if (preferences) {
    let pos = 0;
    for (const preference of preferences) {
      const lower = preference.toLowerCase();
      lowers.set(lower, { orig: preference, pos: pos++ });
      if (options.prefixMatch) {
        const parts2 = lower.split("-");
        while (parts2.pop(), parts2.length > 0) {
          const joined = parts2.join("-");
          if (!lowers.has(joined)) {
            lowers.set(joined, { orig: preference, pos: pos++ });
          }
        }
      }
    }
  }
  const parts = header.split(",");
  const selections = [];
  const map = /* @__PURE__ */ new Set();
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const params = part.split(";");
    if (params.length > 2) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const token = params[0].toLowerCase();
    if (!token) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const selection = { token, pos: i, q: 1 };
    if (preferences && lowers.has(token)) {
      selection.pref = lowers.get(token).pos;
    }
    map.add(selection.token);
    if (params.length === 2) {
      const q = params[1];
      const [key, value] = q.split("=");
      if (!value || key !== "q" && key !== "Q") {
        throw new Error(`Invalid ${options.type} header`);
      }
      const score = Number.parseFloat(value);
      if (score === 0) {
        continue;
      }
      if (Number.isFinite(score) && score <= 1 && score >= 1e-3) {
        selection.q = score;
      }
    }
    selections.push(selection);
  }
  selections.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    if (b.pref !== a.pref) {
      if (a.pref === void 0) {
        return 1;
      }
      if (b.pref === void 0) {
        return -1;
      }
      return a.pref - b.pref;
    }
    return a.pos - b.pos;
  });
  const values = selections.map((selection) => selection.token);
  if (!preferences || !preferences.length) {
    return values;
  }
  const preferred = [];
  for (const selection of values) {
    if (selection === "*") {
      for (const [preference, value] of lowers) {
        if (!map.has(preference)) {
          preferred.push(value.orig);
        }
      }
    } else {
      const lower = selection.toLowerCase();
      if (lowers.has(lower)) {
        preferred.push(lowers.get(lower).orig);
      }
    }
  }
  return preferred;
}
function acceptLanguage(header = "", preferences) {
  return parse(header, preferences, {
    type: "accept-language",
    prefixMatch: true
  })[0] || void 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
function isLocalizedPath(path2) {
  return NextConfig.i18n?.locales.includes(path2.split("/")[1].toLowerCase()) ?? false;
}
function getLocaleFromCookie(cookies) {
  const i18n = NextConfig.i18n;
  const nextLocale = cookies.NEXT_LOCALE?.toLowerCase();
  return nextLocale ? i18n?.locales.find((locale) => nextLocale === locale.toLowerCase()) : void 0;
}
function detectDomainLocale({ hostname, detectedLocale }) {
  const i18n = NextConfig.i18n;
  const domains = i18n?.domains;
  if (!domains) {
    return;
  }
  const lowercasedLocale = detectedLocale?.toLowerCase();
  for (const domain of domains) {
    const domainHostname = domain.domain.split(":", 1)[0].toLowerCase();
    if (hostname === domainHostname || lowercasedLocale === domain.defaultLocale.toLowerCase() || domain.locales?.some((locale) => lowercasedLocale === locale.toLowerCase())) {
      return domain;
    }
  }
}
function detectLocale(internalEvent, i18n) {
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  if (i18n.localeDetection === false) {
    return domainLocale?.defaultLocale ?? i18n.defaultLocale;
  }
  const cookiesLocale = getLocaleFromCookie(internalEvent.cookies);
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  debug({
    cookiesLocale,
    preferredLocale,
    defaultLocale: i18n.defaultLocale,
    domainLocale
  });
  return domainLocale?.defaultLocale ?? cookiesLocale ?? preferredLocale ?? i18n.defaultLocale;
}
function localizePath(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n) {
    return internalEvent.rawPath;
  }
  if (isLocalizedPath(internalEvent.rawPath)) {
    return internalEvent.rawPath;
  }
  const detectedLocale = detectLocale(internalEvent, i18n);
  return `/${detectedLocale}${internalEvent.rawPath}`;
}

// node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateShardId(rawPath, maxConcurrency, prefix) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `${prefix}-${randomInt}`;
}
function generateMessageGroupId(rawPath) {
  const maxConcurrency = Number.parseInt(process.env.MAX_REVALIDATE_CONCURRENCY ?? "10");
  return generateShardId(rawPath, maxConcurrency, "revalidate");
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
function constructNextUrl(baseUrl, path2) {
  const nextBasePath = NextConfig.basePath ?? "";
  const url = new URL(`${nextBasePath}${path2}`, baseUrl);
  return url.href;
}
function convertRes(res) {
  const statusCode = res.statusCode || 200;
  const headers = parseHeaders(res.getFixedHeaders());
  const isBase64Encoded = isBinaryContentType(headers["content-type"]) || !!headers["content-encoding"];
  const body = new ReadableStream3({
    pull(controller) {
      if (!res._chunks || res._chunks.length === 0) {
        controller.close();
        return;
      }
      controller.enqueue(res._chunks.shift());
    }
  });
  return {
    type: "core",
    statusCode,
    headers,
    body,
    isBase64Encoded
  };
}
function convertToQueryString(query) {
  const queryStrings = [];
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => queryStrings.push(`${key}=${entry}`));
    } else {
      queryStrings.push(`${key}=${value}`);
    }
  });
  return queryStrings.length > 0 ? `?${queryStrings.join("&")}` : "";
}
function convertToQuery(querystring) {
  if (!querystring)
    return {};
  const query = new URLSearchParams(querystring);
  const queryObject = {};
  for (const key of query.keys()) {
    const queries = query.getAll(key);
    queryObject[key] = queries.length > 1 ? queries : queries[0];
  }
  return queryObject;
}
function getMiddlewareMatch(middlewareManifest2, functionsManifest) {
  if (functionsManifest?.functions?.["/_middleware"]) {
    return functionsManifest.functions["/_middleware"].matchers?.map(({ regexp }) => new RegExp(regexp)) ?? [/.*/];
  }
  const rootMiddleware = middlewareManifest2.middleware["/"];
  if (!rootMiddleware?.matchers)
    return [];
  return rootMiddleware.matchers.map(({ regexp }) => new RegExp(regexp));
}
function fixCacheHeaderForHtmlPages(internalEvent, headers) {
  if (internalEvent.rawPath === "/404" || internalEvent.rawPath === "/500") {
    fixCacheControlForError(headers, internalEvent.rawPath === "/404" ? 404 : 500);
    return;
  }
  const localizedPath = localizePath(internalEvent);
  if (HtmlPages.includes(localizedPath) && !internalEvent.headers["x-middleware-prefetch"]) {
    headers[CACHE_CONTROL_HEADER] = "public, max-age=0, s-maxage=31536000, must-revalidate";
  }
}
function fixSWRCacheHeader(headers) {
  let cacheControl = headers[CACHE_CONTROL_HEADER];
  if (!cacheControl)
    return;
  if (Array.isArray(cacheControl)) {
    cacheControl = cacheControl.join(",");
  }
  if (typeof cacheControl !== "string")
    return;
  headers[CACHE_CONTROL_HEADER] = cacheControl.replace(/\bstale-while-revalidate(?!=)/, "stale-while-revalidate=2592000");
}
function addOpenNextHeader(headers) {
  if (NextConfig.poweredByHeader) {
    headers["X-OpenNext"] = "1";
  }
  if (globalThis.openNextDebug) {
    headers["X-OpenNext-Version"] = globalThis.openNextVersion;
  }
  if (process.env.OPEN_NEXT_REQUEST_ID_HEADER || globalThis.openNextDebug) {
    headers["X-OpenNext-RequestId"] = globalThis.__openNextAls.getStore()?.requestId;
  }
}
async function revalidateIfRequired(host, rawPath, headers, req) {
  if (headers[NEXTJS_CACHE_HEADER] === "STALE") {
    const internalMeta = req?.[Symbol.for("NextInternalRequestMeta")];
    const revalidateUrl = internalMeta?._nextDidRewrite ? rawPath.startsWith("/_next/data/") ? `/_next/data/${BuildId}${internalMeta?._nextRewroteUrl}.json` : internalMeta?._nextRewroteUrl : rawPath;
    try {
      const hash = (str) => crypto.createHash("md5").update(str).digest("hex");
      const lastModified = globalThis.__openNextAls.getStore()?.lastModified ?? 0;
      const eTag = `${headers.etag ?? headers.ETag ?? ""}`;
      await globalThis.queue.send({
        MessageBody: { host, url: revalidateUrl, eTag, lastModified },
        MessageDeduplicationId: hash(`${rawPath}-${lastModified}-${eTag}`),
        MessageGroupId: generateMessageGroupId(rawPath)
      });
    } catch (e) {
      error(`Failed to revalidate stale page ${rawPath}`, e);
    }
  }
}
function fixISRHeaders(headers) {
  const sMaxAgeRegex = /s-maxage=(\d+)/;
  const match = headers[CACHE_CONTROL_HEADER]?.match(sMaxAgeRegex);
  const sMaxAge = match ? Number.parseInt(match[1]) : void 0;
  if (!sMaxAge) {
    return;
  }
  if (headers[NEXTJS_CACHE_HEADER] === "REVALIDATED") {
    headers[CACHE_CONTROL_HEADER] = NO_STORE_CACHE_CONTROL;
    return;
  }
  const _lastModified = globalThis.__openNextAls.getStore()?.lastModified ?? 0;
  if (headers[NEXTJS_CACHE_HEADER] === "HIT" && _lastModified > 0) {
    debug("cache-control", headers[CACHE_CONTROL_HEADER], _lastModified, Date.now());
    if (sMaxAge && sMaxAge !== 31536e3) {
      const age = Math.round((Date.now() - _lastModified) / 1e3);
      const remainingTtl = Math.max(sMaxAge - age, 1);
      headers[CACHE_CONTROL_HEADER] = `s-maxage=${remainingTtl}, stale-while-revalidate=2592000`;
    }
  }
  if (headers[NEXTJS_CACHE_HEADER] !== "STALE")
    return;
  headers[CACHE_CONTROL_HEADER] = "s-maxage=2, stale-while-revalidate=2592000";
}
function createServerResponse(routingResult, headers, responseStream) {
  const internalEvent = routingResult.internalEvent;
  return new OpenNextNodeResponse((_headers) => {
    fixCacheHeaderForHtmlPages(internalEvent, _headers);
    fixSWRCacheHeader(_headers);
    addOpenNextHeader(_headers);
    fixISRHeaders(_headers);
  }, async (_headers) => {
    await revalidateIfRequired(internalEvent.headers.host, internalEvent.rawPath, _headers);
    await invalidateCDNOnRequest(routingResult, _headers);
  }, responseStream, headers, routingResult.rewriteStatusCode);
}
async function invalidateCDNOnRequest(params, headers) {
  const { internalEvent, resolvedRoutes, initialURL } = params;
  const initialPath = new URL(initialURL).pathname;
  const isIsrRevalidation = internalEvent.headers[ISR_HEADER] === "1";
  if (!isIsrRevalidation && headers[NEXTJS_CACHE_HEADER] === "REVALIDATED") {
    await globalThis.cdnInvalidationHandler.invalidatePaths([
      {
        initialPath,
        rawPath: internalEvent.rawPath,
        resolvedRoutes
      }
    ]);
  }
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_stream();

// node_modules/@opennextjs/aws/dist/utils/cache.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/routeMatcher.js
var optionalLocalePrefixRegex = `^/(?:${RoutesManifest.locales.map((locale) => `${locale}/?`).join("|")})?`;
var optionalBasepathPrefixRegex = RoutesManifest.basePath ? `^${RoutesManifest.basePath}/?` : "^/";
var optionalPrefix = optionalLocalePrefixRegex.replace("^/", optionalBasepathPrefixRegex);
function routeMatcher(routeDefinitions) {
  const regexp = routeDefinitions.map((route) => ({
    page: route.page,
    regexp: new RegExp(route.regex.replace("^/", optionalPrefix))
  }));
  const appPathsSet = /* @__PURE__ */ new Set();
  const routePathsSet = /* @__PURE__ */ new Set();
  for (const [k, v] of Object.entries(AppPathRoutesManifest)) {
    if (k.endsWith("page")) {
      appPathsSet.add(v);
    } else if (k.endsWith("route")) {
      routePathsSet.add(v);
    }
  }
  return function matchRoute(path2) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path2));
    return foundRoutes.map((foundRoute) => {
      let routeType = "page";
      if (appPathsSet.has(foundRoute.page)) {
        routeType = "app";
      } else if (routePathsSet.has(foundRoute.page)) {
        routeType = "route";
      }
      return {
        route: foundRoute.page,
        type: routeType
      };
    });
  };
}
var staticRouteMatcher = routeMatcher([
  ...RoutesManifest.routes.static,
  ...getStaticAPIRoutes()
]);
var dynamicRouteMatcher = routeMatcher(RoutesManifest.routes.dynamic);
function getStaticAPIRoutes() {
  const createRouteDefinition = (route) => ({
    page: route,
    regex: `^${route}(?:/)?$`
  });
  const dynamicRoutePages = new Set(RoutesManifest.routes.dynamic.map(({ page }) => page));
  const pagesStaticAPIRoutes = Object.keys(PagesManifest).filter((route) => route.startsWith("/api/") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  const appPathsStaticAPIRoutes = Object.values(AppPathRoutesManifest).filter((route) => (route.startsWith("/api/") || route === "/api") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  return [...pagesStaticAPIRoutes, ...appPathsStaticAPIRoutes];
}

// node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
init_utils();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var INTERNAL_HEADER_REWRITE_STATUS_CODE = `${INTERNAL_HEADER_PREFIX}rewrite-status-code`;
var INTERNAL_EVENT_REQUEST_ID = `${INTERNAL_HEADER_PREFIX}request-id`;

// node_modules/@opennextjs/aws/dist/core/util.js
init_logger();
import NextServer from "next/dist/server/next-server.js";

// node_modules/@opennextjs/aws/dist/core/require-hooks.js
init_logger();
var mod2 = (init_node_module(), __toCommonJS(node_module_exports));
var resolveFilename2 = mod2._resolveFilename;

// node_modules/@opennextjs/aws/dist/core/util.js
var cacheHandlerPath = __require.resolve("./cache.cjs");
var composableCacheHandlerPath = __require.resolve("./composable-cache.cjs");
var nextServer = new NextServer.default({
  conf: {
    ...NextConfig,
    // Next.js compression should be disabled because of a bug in the bundled
    // `compression` package — https://github.com/vercel/next.js/issues/11669
    compress: false,
    // By default, Next.js uses local disk to store ISR cache. We will use
    // our own cache handler to store the cache on S3.
    //#override stableIncrementalCache
    cacheHandler: cacheHandlerPath,
    cacheMaxMemorySize: 0,
    // We need to disable memory cache
    //#endOverride
    experimental: {
      ...NextConfig.experimental,
      // This uses the request.headers.host as the URL
      // https://github.com/vercel/next.js/blob/canary/packages/next/src/server/next-server.ts#L1749-L1754
      //#override trustHostHeader
      trustHostHeader: true,
      //#endOverride
      //#override composableCache
      cacheHandlers: {
        default: composableCacheHandlerPath
      }
      //#endOverride
    }
  },
  customServer: false,
  dev: false,
  dir: __dirname
});
var routesLoaded = false;
globalThis.__next_route_preloader = async (stage) => {
  if (routesLoaded) {
    return;
  }
  const thisFunction = globalThis.fnName ? globalThis.openNextConfig.functions[globalThis.fnName] : globalThis.openNextConfig.default;
  const routePreloadingBehavior = thisFunction?.routePreloadingBehavior ?? "none";
  if (routePreloadingBehavior === "none") {
    routesLoaded = true;
    return;
  }
  if (!("unstable_preloadEntries" in nextServer)) {
    debug("The current version of Next.js does not support route preloading. Skipping route preloading.");
    routesLoaded = true;
    return;
  }
  if (stage === "waitUntil" && routePreloadingBehavior === "withWaitUntil") {
    const waitUntil = globalThis.__openNextAls.getStore()?.waitUntil;
    if (!waitUntil) {
      error("You've tried to use the 'withWaitUntil' route preloading behavior, but the 'waitUntil' function is not available.");
      routesLoaded = true;
      return;
    }
    debug("Preloading entries with waitUntil");
    waitUntil?.(nextServer.unstable_preloadEntries());
    routesLoaded = true;
  } else if (stage === "start" && routePreloadingBehavior === "onStart" || stage === "warmerEvent" && routePreloadingBehavior === "onWarmerEvent" || stage === "onDemand") {
    const startTimestamp = Date.now();
    debug("Preloading entries");
    await nextServer.unstable_preloadEntries();
    debug("Preloading entries took", Date.now() - startTimestamp, "ms");
    routesLoaded = true;
  }
};
var requestHandler = (metadata) => "getRequestHandlerWithMetadata" in nextServer ? nextServer.getRequestHandlerWithMetadata(metadata) : nextServer.getRequestHandler();

// node_modules/@opennextjs/aws/dist/core/requestHandler.js
globalThis.__openNextAls = new AsyncLocalStorage();
async function openNextHandler(internalEvent, options) {
  const initialHeaders = internalEvent.headers;
  const requestId = globalThis.openNextConfig.middleware?.external ? internalEvent.headers[INTERNAL_EVENT_REQUEST_ID] : Math.random().toString(36);
  return runWithOpenNextRequestContext({
    isISRRevalidation: initialHeaders[ISR_HEADER] === "1",
    waitUntil: options?.waitUntil,
    requestId
  }, async () => {
    await globalThis.__next_route_preloader("waitUntil");
    if (initialHeaders["x-forwarded-host"]) {
      initialHeaders.host = initialHeaders["x-forwarded-host"];
    }
    debug("internalEvent", internalEvent);
    const internalHeaders = {
      initialPath: initialHeaders[INTERNAL_HEADER_INITIAL_URL] ?? internalEvent.rawPath,
      resolvedRoutes: initialHeaders[INTERNAL_HEADER_RESOLVED_ROUTES] ? JSON.parse(initialHeaders[INTERNAL_HEADER_RESOLVED_ROUTES]) : [],
      rewriteStatusCode: Number.parseInt(initialHeaders[INTERNAL_HEADER_REWRITE_STATUS_CODE])
    };
    let routingResult = {
      internalEvent,
      isExternalRewrite: false,
      origin: false,
      isISR: false,
      initialURL: internalEvent.url,
      ...internalHeaders
    };
    const headers = "type" in routingResult ? routingResult.headers : routingResult.internalEvent.headers;
    const overwrittenResponseHeaders = {};
    for (const [rawKey, value] of Object.entries(headers)) {
      if (!rawKey.startsWith(MIDDLEWARE_HEADER_PREFIX)) {
        continue;
      }
      const key = rawKey.slice(MIDDLEWARE_HEADER_PREFIX_LEN);
      if (key !== "x-middleware-set-cookie") {
        overwrittenResponseHeaders[key] = value;
      }
      headers[key] = value;
      delete headers[rawKey];
    }
    if ("isExternalRewrite" in routingResult && routingResult.isExternalRewrite === true) {
      try {
        routingResult = await globalThis.proxyExternalRequest.proxy(routingResult.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        routingResult = {
          internalEvent: {
            type: "core",
            rawPath: "/500",
            method: "GET",
            headers: {},
            url: constructNextUrl(internalEvent.url, "/500"),
            query: {},
            cookies: {},
            remoteAddress: ""
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          isISR: false,
          origin: false,
          initialURL: internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    if ("type" in routingResult) {
      if (options?.streamCreator) {
        const response = createServerResponse({
          internalEvent,
          isExternalRewrite: false,
          isISR: false,
          resolvedRoutes: [],
          origin: false,
          initialURL: internalEvent.url
        }, routingResult.headers, options.streamCreator);
        response.statusCode = routingResult.statusCode;
        response.flushHeaders();
        const [bodyToConsume, bodyToReturn] = routingResult.body.tee();
        for await (const chunk of bodyToConsume) {
          response.write(chunk);
        }
        response.end();
        routingResult.body = bodyToReturn;
      }
      return routingResult;
    }
    const preprocessedEvent = routingResult.internalEvent;
    debug("preprocessedEvent", preprocessedEvent);
    const { search, pathname, hash } = new URL(preprocessedEvent.url);
    const reqProps = {
      method: preprocessedEvent.method,
      url: `${pathname}${search}${hash}`,
      //WORKAROUND: We pass this header to the serverless function to mimic a prefetch request which will not trigger revalidation since we handle revalidation differently
      // There is 3 way we can handle revalidation:
      // 1. We could just let the revalidation go as normal, but due to race conditions the revalidation will be unreliable
      // 2. We could alter the lastModified time of our cache to make next believe that the cache is fresh, but this could cause issues with stale data since the cdn will cache the stale data as if it was fresh
      // 3. OUR CHOICE: We could pass a purpose prefetch header to the serverless function to make next believe that the request is a prefetch request and not trigger revalidation (This could potentially break in the future if next changes the behavior of prefetch requests)
      headers: {
        ...headers
      },
      body: preprocessedEvent.body,
      remoteAddress: preprocessedEvent.remoteAddress
    };
    const mergeHeadersPriority = globalThis.openNextConfig.dangerous?.headersAndCookiesPriority ? globalThis.openNextConfig.dangerous.headersAndCookiesPriority(preprocessedEvent) : "middleware";
    const store = globalThis.__openNextAls.getStore();
    if (store) {
      store.mergeHeadersPriority = mergeHeadersPriority;
    }
    const req = new IncomingMessage(reqProps);
    const res = createServerResponse(routingResult, overwrittenResponseHeaders, options?.streamCreator);
    await processRequest(req, res, routingResult);
    const { statusCode, headers: responseHeaders, isBase64Encoded, body } = convertRes(res);
    const internalResult = {
      type: internalEvent.type,
      statusCode,
      headers: responseHeaders,
      body,
      isBase64Encoded
    };
    return internalResult;
  });
}
async function processRequest(req, res, routingResult) {
  delete req.body;
  const initialURL = new URL(
    // We always assume that only the routing layer can set this header.
    routingResult.internalEvent.headers[INTERNAL_HEADER_INITIAL_URL] ?? routingResult.initialURL
  );
  let invokeStatus;
  if (routingResult.internalEvent.rawPath === "/500") {
    invokeStatus = 500;
  } else if (routingResult.internalEvent.rawPath === "/404") {
    invokeStatus = 404;
  }
  const requestMetadata = {
    isNextDataReq: routingResult.internalEvent.query.__nextDataReq === "1",
    initURL: routingResult.initialURL,
    initQuery: convertToQuery(initialURL.search),
    initProtocol: initialURL.protocol,
    defaultLocale: NextConfig.i18n?.defaultLocale,
    locale: routingResult.locale,
    middlewareInvoke: false,
    // By setting invokePath and invokeQuery we can bypass some of the routing logic in Next.js
    invokePath: routingResult.internalEvent.rawPath,
    invokeQuery: routingResult.internalEvent.query,
    // invokeStatus is only used for error pages
    invokeStatus
  };
  try {
    req.url = initialURL.pathname + convertToQueryString(routingResult.internalEvent.query);
    await requestHandler(requestMetadata)(req, res);
  } catch (e) {
    if (e.constructor.name === "NoFallbackError") {
      await handleNoFallbackError(req, res, routingResult, requestMetadata);
    } else {
      error("NextJS request failed.", e);
      await tryRenderError("500", res, routingResult.internalEvent);
    }
  }
}
async function handleNoFallbackError(req, res, routingResult, metadata, index = 1) {
  if (index >= 5) {
    await tryRenderError("500", res, routingResult.internalEvent);
    return;
  }
  if (index >= routingResult.resolvedRoutes.length) {
    await tryRenderError("404", res, routingResult.internalEvent);
    return;
  }
  try {
    await requestHandler({
      ...routingResult,
      invokeOutput: routingResult.resolvedRoutes[index].route,
      ...metadata
    })(req, res);
  } catch (e) {
    if (e.constructor.name === "NoFallbackError") {
      await handleNoFallbackError(req, res, routingResult, metadata, index + 1);
    } else {
      error("NextJS request failed.", e);
      await tryRenderError("500", res, routingResult.internalEvent);
    }
  }
}
async function tryRenderError(type, res, internalEvent) {
  try {
    const _req = new IncomingMessage({
      method: "GET",
      url: `/${type}`,
      headers: internalEvent.headers,
      body: internalEvent.body,
      remoteAddress: internalEvent.remoteAddress
    });
    const requestMetadata = {
      // By setting invokePath and invokeQuery we can bypass some of the routing logic in Next.js
      invokePath: type === "404" ? "/404" : "/500",
      invokeStatus: type === "404" ? 404 : 500,
      middlewareInvoke: false
    };
    await requestHandler(requestMetadata)(_req, res);
  } catch (e) {
    error("NextJS request failed.", e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      message: "Server failed to respond.",
      details: e
    }, null, 2));
  }
}

// node_modules/@opennextjs/aws/dist/core/resolve.js
async function resolveConverter(converter2) {
  if (typeof converter2 === "function") {
    return converter2();
  }
  const m_1 = await Promise.resolve().then(() => (init_edge(), edge_exports));
  return m_1.default;
}
async function resolveWrapper(wrapper) {
  if (typeof wrapper === "function") {
    return wrapper();
  }
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_node(), cloudflare_node_exports));
  return m_1.default;
}
async function resolveTagCache(tagCache) {
  if (typeof tagCache === "function") {
    return tagCache();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy(), dummy_exports));
  return m_1.default;
}
async function resolveQueue(queue) {
  if (typeof queue === "function") {
    return queue();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy2(), dummy_exports2));
  return m_1.default;
}
async function resolveIncrementalCache(incrementalCache) {
  if (typeof incrementalCache === "function") {
    return incrementalCache();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy3(), dummy_exports3));
  return m_1.default;
}
async function resolveAssetResolver(assetResolver) {
  if (typeof assetResolver === "function") {
    return assetResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy4(), dummy_exports4));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}
async function resolveCdnInvalidation(cdnInvalidation) {
  if (typeof cdnInvalidation === "function") {
    return cdnInvalidation();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy5(), dummy_exports5));
  return m_1.default;
}

// node_modules/@opennextjs/aws/dist/core/createMainHandler.js
async function createMainHandler() {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  const thisFunction = globalThis.fnName ? config.functions[globalThis.fnName] : config.default;
  globalThis.serverId = generateUniqueId();
  globalThis.openNextConfig = config;
  await globalThis.__next_route_preloader("start");
  globalThis.queue = await resolveQueue(thisFunction.override?.queue);
  globalThis.incrementalCache = await resolveIncrementalCache(thisFunction.override?.incrementalCache);
  globalThis.tagCache = await resolveTagCache(thisFunction.override?.tagCache);
  if (config.middleware?.external !== true) {
    globalThis.assetResolver = await resolveAssetResolver(globalThis.openNextConfig.middleware?.assetResolver);
  }
  globalThis.proxyExternalRequest = await resolveProxyRequest(thisFunction.override?.proxyExternalRequest);
  globalThis.cdnInvalidationHandler = await resolveCdnInvalidation(thisFunction.override?.cdnInvalidation);
  const converter2 = await resolveConverter(thisFunction.override?.converter);
  const { wrapper, name } = await resolveWrapper(thisFunction.override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(openNextHandler, converter2);
}

// node_modules/@opennextjs/aws/dist/adapters/server-adapter.js
setNodeEnv();
setNextjsServerWorkingDirectory();
globalThis.internalFetch = fetch;
var handler2 = await createMainHandler();
function setNextjsServerWorkingDirectory() {
  process.chdir(__dirname);
}
export {
  handler2 as handler
};
