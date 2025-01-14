"use strict";

exports.__esModule = true;
exports.MATCH_REGEXP_FLAGS = exports.START_BY_SLASH_REGEXP = exports.REPLACE_NOT_SURE = exports.NOT_SURE_REGEXP = exports.REPLACE_WILDCARD = exports.WILDCARD_REGEXP = exports.REPLACE_VARIABLE_REGEXP = exports.PARAMETER_REGEXP = void 0;
var PARAMETER_REGEXP = /([:*])(\w+)/g;
exports.PARAMETER_REGEXP = PARAMETER_REGEXP;
var REPLACE_VARIABLE_REGEXP = "([^/]+)";
exports.REPLACE_VARIABLE_REGEXP = REPLACE_VARIABLE_REGEXP;
var WILDCARD_REGEXP = /\*/g;
exports.WILDCARD_REGEXP = WILDCARD_REGEXP;
var REPLACE_WILDCARD = "(?:.*)";
exports.REPLACE_WILDCARD = REPLACE_WILDCARD;
var NOT_SURE_REGEXP = /\/\?/g;
exports.NOT_SURE_REGEXP = NOT_SURE_REGEXP;
var REPLACE_NOT_SURE = "/?([^/]+|)";
exports.REPLACE_NOT_SURE = REPLACE_NOT_SURE;
var START_BY_SLASH_REGEXP = "(?:/^|^)";
exports.START_BY_SLASH_REGEXP = START_BY_SLASH_REGEXP;
var MATCH_REGEXP_FLAGS = "";
exports.MATCH_REGEXP_FLAGS = MATCH_REGEXP_FLAGS;