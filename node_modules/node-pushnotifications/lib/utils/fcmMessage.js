"use strict";

const _excluded = ["providersExclude"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], t.indexOf(o) >= 0 || {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (e.indexOf(n) >= 0) continue; t[n] = r[n]; } return t; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const _require = require('./tools'),
  buildGcmMessage = _require.buildGcmMessage,
  buildApnsMessage = _require.buildApnsMessage;
class FcmMessage {
  constructor(params) {
    this.data = params.data;
    this.android = params.android;
    this.apns = params.apns;
  }
  buildWithRecipients(recipients) {
    return _objectSpread({
      data: this.data,
      android: this.android,
      apns: this.apns
    }, recipients);
  }
  static normalizeDataParams(data) {
    if (!data) return {};
    return Object.entries(data).reduce((normalized, [key, value]) => {
      if (value === undefined || value === null) {
        return normalized;
      }
      const stringifyValue = typeof value === 'string' ? value : JSON.stringify(value);
      Object.assign(normalized, {
        [key]: stringifyValue
      });
      return normalized;
    }, {});
  }
  static buildAndroidMessage(params, options) {
    const message = buildGcmMessage(params, options);
    const androidMessage = message.toJson();
    androidMessage.ttl = androidMessage.time_to_live * 1000;
    androidMessage.data = this.normalizeDataParams(androidMessage.data);
    delete androidMessage.content_available;
    delete androidMessage.mutable_content;
    delete androidMessage.delay_while_idle;
    delete androidMessage.time_to_live;
    delete androidMessage.dry_run;
    return androidMessage;
  }
  static buildApnsMessage(params) {
    const message = buildApnsMessage(params);
    delete message.payload;
    const headers = message.headers() || {};
    const payload = message.toJSON() || {};
    return {
      headers: this.normalizeDataParams(headers),
      payload
    };
  }
  static build(params, options) {
    const _params$providersExcl = params.providersExclude,
      providersExclude = _params$providersExcl === void 0 ? [] : _params$providersExcl,
      fcmMessageParams = _objectWithoutProperties(params, _excluded);
    const data = this.normalizeDataParams(fcmMessageParams.custom);
    const createParams = {
      data
    };
    if (!providersExclude.includes('apns')) {
      createParams.apns = this.buildApnsMessage(fcmMessageParams);
    }
    if (!providersExclude.includes('android')) {
      createParams.android = this.buildAndroidMessage(fcmMessageParams, options);
    }
    return new this(createParams);
  }
}
module.exports = FcmMessage;