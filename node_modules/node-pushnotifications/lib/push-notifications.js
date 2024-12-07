"use strict";

var _sendGCM = _interopRequireDefault(require("./sendGCM"));
var _sendFCM = _interopRequireDefault(require("./sendFCM"));
var _sendAPN = _interopRequireDefault(require("./sendAPN"));
var _sendADM = _interopRequireDefault(require("./sendADM"));
var _sendWNS = _interopRequireDefault(require("./sendWNS"));
var _sendWeb = _interopRequireDefault(require("./sendWeb"));
var _constants = require("./constants");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } /* eslint-disable import/no-import-module-exports */
class PN {
  constructor(options) {
    this.setOptions(options);
  }
  setOptions(opts) {
    this.settings = _objectSpread(_objectSpread({}, _constants.DEFAULT_SETTINGS), opts);
    if (this.apn) {
      this.apn.shutdown();
    }
    this.apn = new _sendAPN.default(this.settings.apn);
    this.useFcmOrGcmMethod = this.settings.isLegacyGCM ? _constants.GCM_METHOD : _constants.FCM_METHOD;
  }
  sendWith(method, regIds, data, cb) {
    return method(regIds, data, this.settings).then(results => {
      (cb || (noop => noop))(null, results);
      return results;
    }).catch(error => {
      (cb || (noop => noop))(error);
      return Promise.reject(error);
    });
  }
  getPushMethodByRegId(regId) {
    if (typeof regId === 'object' && (!regId.type || !regId.id)) {
      return {
        regId,
        pushMethod: _constants.WEB_METHOD
      };
    }
    if (typeof regId === 'object' && regId.id && regId.type) {
      return {
        regId: regId.id,
        pushMethod: this.settings.isAlwaysUseFCM ? this.useFcmOrGcmMethod : regId.type
      };
    }

    // TODO: deprecated, remove of all cases below in v3.0
    // and review test cases
    if (this.settings.isAlwaysUseFCM) {
      return {
        regId,
        pushMethod: this.useFcmOrGcmMethod
      };
    }
    if (regId.substring(0, 4) === 'http') {
      return {
        regId,
        pushMethod: _constants.WNS_METHOD
      };
    }
    if (/^(amzn[0-9]*.adm)/i.test(regId)) {
      return {
        regId,
        pushMethod: _constants.ADM_METHOD
      };
    }
    if ((regId.length === 64 || regId.length === 160) && /^[a-fA-F0-9]+$/.test(regId)) {
      return {
        regId,
        pushMethod: _constants.APN_METHOD
      };
    }
    if (regId.length > 64) {
      return {
        regId,
        pushMethod: this.useFcmOrGcmMethod
      };
    }
    return {
      regId,
      pushMethod: _constants.UNKNOWN_METHOD
    };
  }
  send(_regIds, data, callback) {
    const promises = [];
    const regIdsGCM = [];
    const regIdsFCM = [];
    const regIdsAPN = [];
    const regIdsWNS = [];
    const regIdsADM = [];
    const regIdsWebPush = [];
    const regIdsUnk = [];
    const regIds = Array.isArray(_regIds || []) ? _regIds || [] : [_regIds];

    // Classify each pushId for corresponding device
    regIds.forEach(regIdOriginal => {
      const _this$getPushMethodBy = this.getPushMethodByRegId(regIdOriginal),
        regId = _this$getPushMethodBy.regId,
        pushMethod = _this$getPushMethodBy.pushMethod;
      if (pushMethod === _constants.WEB_METHOD) {
        regIdsWebPush.push(regId);
      } else if (pushMethod === _constants.GCM_METHOD) {
        regIdsGCM.push(regId);
      } else if (pushMethod === _constants.FCM_METHOD) {
        regIdsFCM.push(regId);
      } else if (pushMethod === _constants.WNS_METHOD) {
        regIdsWNS.push(regId);
      } else if (pushMethod === _constants.ADM_METHOD) {
        regIdsADM.push(regId);
      } else if (pushMethod === _constants.APN_METHOD) {
        regIdsAPN.push(regId);
      } else {
        regIdsUnk.push(regId);
      }
    });
    try {
      // Android GCM / FCM (Android/iOS) Legacy
      if (regIdsGCM.length > 0) {
        promises.push(this.sendWith(_sendGCM.default, regIdsGCM, data));
      }

      // FCM (Android/iOS)
      if (regIdsFCM.length > 0) {
        promises.push(this.sendWith(_sendFCM.default, regIdsFCM, data));
      }

      // iOS APN
      if (regIdsAPN.length > 0) {
        promises.push(this.sendWith(this.apn.sendAPN.bind(this.apn), regIdsAPN, data));
      }

      // Microsoft WNS
      if (regIdsWNS.length > 0) {
        promises.push(this.sendWith(_sendWNS.default, regIdsWNS, data));
      }

      // Amazon ADM
      if (regIdsADM.length > 0) {
        promises.push(this.sendWith(_sendADM.default, regIdsADM, data));
      }

      // Web Push
      if (regIdsWebPush.length > 0) {
        promises.push(this.sendWith(_sendWeb.default, regIdsWebPush, data));
      }
    } catch (err) {
      promises.push(Promise.reject(err));
    }

    // Unknown
    if (regIdsUnk.length > 0) {
      const results = {
        method: 'unknown',
        success: 0,
        failure: regIdsUnk.length,
        message: []
      };
      regIdsUnk.forEach(regId => {
        results.message.push({
          regId,
          error: new Error('Unknown registration id')
        });
      });
      promises.push(Promise.resolve(results));
    }

    // No regIds detected
    if (promises.length === 0) {
      promises.push(Promise.resolve({
        method: 'none',
        success: 0,
        failure: 0,
        message: []
      }));
    }
    return Promise.all(promises).then(results => {
      const cb = callback || (noop => noop);
      cb(null, results);
      return results;
    }).catch(err => {
      const cb = callback || (noop => noop);
      cb(err);
      return Promise.reject(err);
    });
  }
}
module.exports = PN;
module.exports.WEB = _constants.WEB_METHOD;
module.exports.WNS = _constants.WNS_METHOD;
module.exports.ADM = _constants.ADM_METHOD;
module.exports.GCM = _constants.GCM_METHOD;
module.exports.APN = _constants.APN_METHOD;