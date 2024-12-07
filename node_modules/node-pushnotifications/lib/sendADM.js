"use strict";

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const adm = require('node-adm');
const _require = require('./constants'),
  ADM_METHOD = _require.ADM_METHOD;
const sendADM = (regIds, _data, settings) => {
  const resumed = {
    method: ADM_METHOD,
    success: 0,
    failure: 0,
    message: []
  };
  const promises = [];
  const admSender = new adm.Sender(settings.adm);
  const data = _objectSpread({}, _data);
  const consolidationKey = data.consolidationKey,
    expiry = data.expiry,
    timeToLive = data.timeToLive,
    custom = data.custom;
  delete data.consolidationKey;
  delete data.expiry;
  delete data.timeToLive;
  delete data.custom;
  const message = {
    expiresAfter: expiry - Math.floor(Date.now() / 1000) || timeToLive || 28 * 86400,
    consolidationKey,
    data: _objectSpread(_objectSpread({}, data), custom)
  };
  regIds.forEach(regId => {
    promises.push(new Promise(resolve => {
      admSender.send(message, regId, (err, response) => {
        const errorMsg = err instanceof Error ? err.message : response.error;
        const error = err || (response.error ? new Error(response.error) : null);
        resumed.success += error ? 0 : 1;
        resumed.failure += error ? 1 : 0;
        resumed.message.push({
          regId,
          error,
          errorMsg
        });
        resolve();
      });
    }));
  });
  return Promise.all(promises).then(() => resumed);
};
module.exports = sendADM;