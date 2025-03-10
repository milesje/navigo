"use strict";

exports.__esModule = true;
exports.getCurrentEnvURL = getCurrentEnvURL;
exports.clean = clean;
exports.isString = isString;
exports.isFunction = isFunction;
exports.regExpResultToParams = regExpResultToParams;
exports.extractGETParameters = extractGETParameters;
exports.parseQuery = parseQuery;
exports.matchRoute = matchRoute;
exports.pushStateAvailable = pushStateAvailable;
exports.undefinedOrTrue = undefinedOrTrue;
exports.parseNavigateOptions = parseNavigateOptions;
exports.windowAvailable = windowAvailable;
exports.accumulateHooks = accumulateHooks;

var _constants = require("./constants");

function getCurrentEnvURL(fallback) {
  if (fallback === void 0) {
    fallback = "/";
  }

  if (windowAvailable()) {
    return location.pathname + location.search + location.hash;
  }

  return fallback;
}

function clean(s) {
  return s.replace(/\/+$/, "").replace(/^\/+/, "");
}

function isString(s) {
  return typeof s === "string";
}

function isFunction(s) {
  return typeof s === "function";
}

function regExpResultToParams(match, names) {
  if (names.length === 0) return null;
  if (!match) return null;
  return match.slice(1, match.length).reduce(function (params, value, index) {
    if (params === null) params = {};
    params[names[index]] = decodeURIComponent(value);
    return params;
  }, null);
}

function extractGETParameters(url) {
  var tmp = clean(url).split(/\?(.*)?$/);
  return [clean(tmp[0]), tmp.slice(1).join("")];
}

function parseQuery(queryString) {
  var query = {};
  var pairs = queryString.split("&");

  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split("=");

    if (pair[0] !== "") {
      var key = decodeURIComponent(pair[0]);

      if (!query[key]) {
        query[key] = decodeURIComponent(pair[1] || "");
      } else {
        if (!Array.isArray(query[key])) query[key] = [query[key]];
        query[key].push(decodeURIComponent(pair[1] || ""));
      }
    }
  }

  return query;
}

function matchRoute(currentPath, route) {
  var _extractGETParameters = extractGETParameters(clean(currentPath)),
      current = _extractGETParameters[0],
      GETParams = _extractGETParameters[1];

  var params = GETParams === "" ? null : parseQuery(GETParams);
  var paramNames = [];
  var pattern;

  if (isString(route.path)) {
    pattern = _constants.START_BY_SLASH_REGEXP + clean(route.path).replace(_constants.PARAMETER_REGEXP, function (full, dots, name) {
      paramNames.push(name);
      return _constants.REPLACE_VARIABLE_REGEXP;
    }).replace(_constants.WILDCARD_REGEXP, _constants.REPLACE_WILDCARD).replace(_constants.NOT_SURE_REGEXP, _constants.REPLACE_NOT_SURE) + "$";

    if (clean(route.path) === "") {
      if (clean(current) === "") {
        return {
          url: current,
          queryString: GETParams,
          route: route,
          data: null,
          params: params
        };
      }
    }
  } else {
    pattern = route.path;
  }

  var regexp = new RegExp(pattern, _constants.MATCH_REGEXP_FLAGS);
  var match = current.match(regexp);

  if (match) {
    var data = isString(route.path) ? regExpResultToParams(match, paramNames) : match.slice(1);
    return {
      url: current,
      queryString: GETParams,
      route: route,
      data: data,
      params: params
    };
  }

  return false;
}

function pushStateAvailable() {
  return !!(typeof window !== "undefined" && window.history && window.history.pushState);
}

function undefinedOrTrue(obj, key) {
  return typeof obj[key] === "undefined" || obj[key] === true;
}

function parseNavigateOptions(source) {
  if (!source) return {};
  var pairs = source.split(",");
  var options = {};
  var resolveOptions;
  pairs.forEach(function (str) {
    var temp = str.split(":").map(function (v) {
      return v.replace(/(^ +| +$)/g, "");
    });

    switch (temp[0]) {
      case "historyAPIMethod":
        options.historyAPIMethod = temp[1];
        break;

      case "resolveOptionsStrategy":
        if (!resolveOptions) resolveOptions = {};
        resolveOptions.strategy = temp[1];
        break;

      case "resolveOptionsHash":
        if (!resolveOptions) resolveOptions = {};
        resolveOptions.hash = temp[1] === "true";
        break;

      case "updateBrowserURL":
      case "callHandler":
      case "updateState":
      case "force":
        options[temp[0]] = temp[1] === "true";
        break;
    }
  });

  if (resolveOptions) {
    options.resolveOptions = resolveOptions;
  }

  return options;
}

function windowAvailable() {
  return typeof window !== "undefined";
}

function accumulateHooks(hooks, result) {
  if (hooks === void 0) {
    hooks = [];
  }

  if (result === void 0) {
    result = {};
  }

  hooks.filter(function (h) {
    return h;
  }).forEach(function (h) {
    ["before", "after", "already", "leave"].forEach(function (type) {
      if (h[type]) {
        if (!result[type]) result[type] = [];
        result[type].push(h[type]);
      }
    });
  });
  return result;
}