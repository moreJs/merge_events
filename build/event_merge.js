"use strict";
// 判断数字
var reg = /^\d*$/;
var EventMerge = (function () {
    function EventMerge(interval, emitterFun) {
        // cache: uid => profile
        this.cache = new Map();
        // 即将被触发的uid队列
        this.emitQueue = new Array();
        // 候补的uid队列
        this.emitWaittingQueue = new Array();
        // 是否在触发阶段,默认是false
        this.isEmited = false;
        if (interval && !reg.test(interval + '')) {
            throw new Error('interval must be a number');
        }
        if (!emitterFun || typeof emitterFun !== 'function') {
            throw new Error('EventsMerge need a emitterFun which handlers all events');
        }
        this.interval = interval || 1000;
        this.emitterFun = emitterFun;
    }
    /**
     * emit 核心逻辑
     */
    EventMerge.prototype.emit = function (emitCbObj) {
        if (!emitCbObj || !emitCbObj.uid || !emitCbObj.success || !emitCbObj.error) {
            return;
        }
        // 已经在发射阶段了，则将当前事件放入候补队列里面，然后返回
        if (this.isEmited) {
            this.emitWaittingQueue.push(emitCbObj);
            return;
        }
        // 不在发射阶段，则将当前事件推入正式发射队列里面，等待触发器触发请求
        this.emitQueue.push(emitCbObj);
        // 若队列里面，只有一个事件，则需要给当前发射队列添加时间触发器
        if (this.emitQueue.length == 1) {
            this._addTimer();
        }
    };
    EventMerge.prototype._addTimer = function () {
        var _this = this;
        setTimeout(function () { return _this._run(); }, this.interval);
    };
    EventMerge.prototype._run = function () {
        var _this = this;
        this.isEmited = true;
        if (this.emitQueue.length > 100) {
            this._fixEmitQueue();
        }
        var uids = this.emitQueue.map(function (emitCbObj) { return emitCbObj.uid; });
        this.emitterFun(uids)
            .then(function (profiles) { return _this._success(profiles); }, function (error) { return _this._error(error); })
            .catch(function (error) { return _this._error(error); });
    };
    // 服务器端要求，只能接受长度为100的
    EventMerge.prototype._fixEmitQueue = function () {
        var leftEmitQueue = this.emitQueue.splice(100);
        this.emitWaittingQueue = leftEmitQueue.concat(this.emitWaittingQueue);
    };
    EventMerge.prototype._success = function (profiles) {
        var _this = this;
        profiles && profiles.forEach(function (profile) {
            var uid = profile.uid;
            // 若id一样会update
            _this.cache.set(uid, profile);
        });
        this.emitQueue.forEach(function (emitCbObj) {
            var uid = emitCbObj.uid;
            var sucess = emitCbObj.success;
            // 从 cache 里面取值
            var value = _this.cache.get(uid);
            if (value) {
                sucess.call(null, value);
            }
            else {
                emitCbObj.error.call(null, new Error('uid 非法'));
            }
        });
        // 清除这次请求集合对整体的影响
        this._clearEnv();
    };
    EventMerge.prototype._error = function (error) {
        this.emitQueue.forEach(function (emitCbObj) {
            var error = emitCbObj.error;
            error.call(null, error);
        });
        // 清除这次请求集合对整体的影响
        this._clearEnv();
    };
    EventMerge.prototype._clearEnv = function () {
        this.emitQueue = [];
        this.isEmited = false;
        if (this.emitWaittingQueue.length > 0) {
            this.emitQueue = this.emitQueue.concat(this.emitWaittingQueue);
            this.emitWaittingQueue = [];
            this._addTimer();
        }
    };
    return EventMerge;
}());
exports.EventMerge = EventMerge;
//# sourceMappingURL=event_merge.js.map