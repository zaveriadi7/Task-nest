"use strict";

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const gcm = require('node-gcm');
const _require = require('./constants'),
  GCM_METHOD = _require.GCM_METHOD;
const _require2 = require('./utils/tools'),
  containsValidRecipients = _require2.containsValidRecipients,
  buildGcmMessage = _require2.buildGcmMessage;
const getRecipientList = obj => {
  if (obj.registrationTokens) {
    return obj.registrationTokens;
  }
  if (obj.to) {
    return [obj.to];
  }
  if (obj.condition) {
    return [obj.condition];
  }
  return [];
};
const sendChunk = (GCMSender, recipients, message, retries) => new Promise(resolve => {
  const recipientList = getRecipientList(recipients);
  GCMSender.send(message, recipients, retries, (err, response) => {
    // Response: see https://developers.google.com/cloud-messaging/http-server-ref#table5
    if (err) {
      resolve({
        method: GCM_METHOD,
        success: 0,
        failure: recipientList.length,
        message: recipientList.map(value => ({
          originalRegId: value,
          regId: value,
          error: err,
          errorMsg: err instanceof Error ? err.message : err
        }))
      });
    } else if (response && response.results !== undefined) {
      let regIndex = 0;
      resolve({
        method: GCM_METHOD,
        multicastId: response.multicast_id,
        success: response.success,
        failure: response.failure,
        message: response.results.map(value => {
          const regToken = recipientList[regIndex];
          regIndex += 1;
          return {
            messageId: value.message_id,
            originalRegId: regToken,
            regId: value.registration_id || regToken,
            error: value.error ? new Error(value.error) : null,
            errorMsg: value.error ? value.error.message || value.error : null
          };
        })
      });
    } else {
      resolve({
        method: GCM_METHOD,
        multicastId: response.multicast_id,
        success: response.success,
        failure: response.failure,
        message: recipientList.map(value => ({
          originalRegId: value,
          regId: value,
          error: new Error('unknown'),
          errorMsg: 'unknown'
        }))
      });
    }
  });
});
const sendGCM = (regIds, data, settings) => {
  const opts = _objectSpread({}, settings.gcm);
  const id = opts.id;
  delete opts.id;
  const GCMSender = new gcm.Sender(id, opts);
  const promises = [];
  const message = buildGcmMessage(data, opts);
  let chunk = 0;

  /* allow to override device tokens with custom `to` or `condition` field:
   * https://github.com/ToothlessGear/node-gcm#recipients */
  if (containsValidRecipients(data)) {
    promises.push(sendChunk(GCMSender, data.recipients, message, data.retries || 0));
  } else {
    // Split tokens in 1.000 chunks, see https://developers.google.com/cloud-messaging/http-server-ref#table1
    do {
      const registrationTokens = regIds.slice(chunk * 1000, (chunk + 1) * 1000);
      promises.push(sendChunk(GCMSender, {
        registrationTokens
      }, message, data.retries || 0));
      chunk += 1;
    } while (1000 * chunk < regIds.length);
  }
  return Promise.all(promises).then(results => {
    const resumed = {
      method: GCM_METHOD,
      multicastId: [],
      success: 0,
      failure: 0,
      message: []
    };
    results.forEach(result => {
      if (result.multicastId) {
        resumed.multicastId.push(result.multicastId);
      }
      resumed.success += result.success;
      resumed.failure += result.failure;
      resumed.message.push(...result.message);
    });
    return resumed;
  });
};
module.exports = sendGCM;