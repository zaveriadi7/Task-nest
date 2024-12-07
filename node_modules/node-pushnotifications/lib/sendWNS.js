"use strict";

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const wns = require('wns');
const _require = require('./constants'),
  WNS_METHOD = _require.WNS_METHOD;
const parseErrorMessage = err => err instanceof Error ? err.message : err;
const parseError = err => {
  if (err instanceof Error) {
    return err;
  }
  if (err) {
    return new Error(err);
  }
  return null;
};
let resumed;
function processResponse(err, response, regId) {
  const error = parseError(err) || parseError(response.innerError);
  const errorMsg = parseErrorMessage(err) || parseErrorMessage(response.innerError);
  resumed.success += error ? 0 : 1;
  resumed.failure += error ? 1 : 0;
  resumed.message.push({
    regId,
    error,
    errorMsg
  });
}
const sendWNS = (_regIds, _data, settings) => {
  // sendNotifications and sendPromises are inside exports as in this way,
  // successive calls to this module doesn't override previous ones
  let sendPromises;
  function sendNotifications(regIds, notificationMethod, data, opts, onFinish) {
    const regId = regIds.shift();
    if (regId) {
      try {
        wns[notificationMethod](regId, data, opts, (err, response) => {
          sendPromises.push(Promise.resolve());
          processResponse(err, response, regId);
          sendNotifications(regIds, notificationMethod, data, _objectSpread(_objectSpread({}, opts), {}, {
            accessToken: response.newAccessToken
          }), onFinish);
        });
      } catch (err) {
        sendPromises.push(Promise.reject(err));
        sendNotifications(regIds, notificationMethod, data, opts, onFinish);
      }
    } else {
      Promise.all(sendPromises).then(() => onFinish(), onFinish);
    }
  }
  const promises = [];
  const opts = _objectSpread({}, settings.wns);
  const notificationMethod = opts.notificationMethod;
  const data = notificationMethod === 'sendRaw' ? JSON.stringify(_data) : _objectSpread({}, _data);
  resumed = {
    method: WNS_METHOD,
    success: 0,
    failure: 0,
    message: []
  };
  opts.headers = data.headers || opts.headers;
  opts.launch = data.launch || opts.launch;
  opts.duration = data.duration || opts.duration;
  delete opts.notificationMethod;
  delete data.headers;
  delete data.launch;
  delete data.duration;
  if (opts.accessToken) {
    sendPromises = [];
    const regIds = [..._regIds];
    // eslint-disable-next-line max-len
    promises.push(new Promise((resolve, reject) => {
      sendNotifications(regIds, notificationMethod, data, opts, err => err ? reject(err) : resolve());
    }));
  } else {
    // eslint-disable-next-line max-len
    _regIds.forEach(regId => promises.push(new Promise(resolve => {
      wns[notificationMethod](regId, data, opts, (err, response) => {
        processResponse(err, response, regId);
        resolve();
      });
    })));
  }
  return Promise.all(promises).then(() => resumed);
};
module.exports = sendWNS;