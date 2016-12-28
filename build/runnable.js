"use strict";
var util_1 = require("./util");
/**
 *
 */
var Runnable = (function () {
    function Runnable(dispatcher) {
        this.dispatcher = dispatcher;
        this.howLong = dispatcher.howLong;
        this.emitterFun = dispatcher.emitterFun;
        this.emitQueue = new Array();
        this.cache = new Map();
    }
    Runnable.prototype.emit = function (emitCbObj) {
        this.emitQueue.push(emitCbObj);
        if (this.emitQueue.length === 1) {
            this._addTimer();
        }
        // 处理100的问题
        if (this.emitQueue.length === 100) {
            if (this.timerId) {
                clearTimeout(this.timerId);
            }
            this._run();
        }
    };
    Runnable.prototype._addTimer = function () {
        var _this = this;
        this.timerId = setTimeout(function () {
            _this._run();
        }, this.howLong);
    };
    Runnable.prototype._run = function () {
        var _this = this;
        this._destory();
        var uids = this.emitQueue.map(function (emitCbObj) {
            return emitCbObj.uid;
        });
        // uids 去重复
        uids = util_1.distinct(uids);
        this.emitterFun(uids)
            .then(function (profiles) { return _this._success(profiles); }, function (error) { return _this._error(error); })
            .catch(function (error) { return _this._error(error); });
    };
    Runnable.prototype._success = function (profiles) {
        var _this = this;
        profiles && profiles.forEach(function (profile) {
            var uid = profile.uid;
            _this.cache.set(uid, profile);
        });
        this.emitQueue.forEach(function (emitCbObj) {
            var uid = emitCbObj.uid;
            var fn = emitCbObj.success;
            var value = _this.cache.get(uid);
            if (value) {
                fn.call(null, value);
            }
            else {
                var error = emitCbObj.error;
                error.call(null, new Error('服务端发生异常，请重新再试'));
            }
        });
        this._gc();
    };
    Runnable.prototype._error = function (error) {
        this.emitQueue.forEach(function (emitCbObj) {
            var fn = emitCbObj.error;
            fn.call(null, error);
        });
        this._gc();
    };
    Runnable.prototype._gc = function () {
        this.dispatcher = null;
        this.emitterFun = null;
        this.emitQueue = null;
        this.cache = null;
    };
    Runnable.prototype._destory = function () {
        this.dispatcher.removeRunnable();
    };
    return Runnable;
}());
exports.Runnable = Runnable;
//# sourceMappingURL=runnable.js.map