"use strict";
var uuid = require("uuid/v4");
// 判断数字
var reg = /^\d*$/;
/**
 * 一个简单的相同类型事件合并class
 * 注意: 相同事件类型是指，这种事件具有结构相同的事件处理
 */
var EventsMerge = (function () {
    function EventsMerge(interval, emitterFun, needCache) {
        // 是否开启 cache, 默认开启
        this.needCache = true;
        // 是否在处理结果阶段
        // 若是处理结果阶段，则需要将新加入的event放到parperEmittingQueue队列里面，不要干扰emittingQueueMayRepeat队列
        this.isEmitting = false;
        // map: uuid ==> EmitCbObj 的一个映射
        this.originEmitMap = new Map();
        // 队列: 最近的要去服务端取数的emit , id 为 '${uid},${uuid}',注意：uid 有可能会重复
        this.emittingQueueMayRepeat = new Array();
        // uid不重复的队列: 只在请求数据的时候，从emittingQueueMayRepeat去重复，数据回来的时候根据 uid 设置 value
        this.emittingQueueUidIsUnique = new Array();
        // 没有办法在 “下次” 一起去取数，需要在 “下下次” 去取数
        this.parperEmittingQueue = new Array();
        // uid ==> value 的cache
        this.answerCache = new Map();
        if (interval && !reg.test(interval + '')) {
            throw new Error('interval must be a number');
        }
        if (!emitterFun || typeof emitterFun !== 'function') {
            throw new Error('EventsMerge need a emitterFun which handlers all events');
        }
        this.interval = interval || 1000;
        this.emitterFun = emitterFun;
        this.needCache = needCache || true;
    }
    // 对外暴露的唯一方法
    // 外部使用方式: this.emit(uid, success, error)
    EventsMerge.prototype.emit = function (fnOrObj) {
        var emitCbObj = fnOrObj;
        // process arguments
        if (!fnOrObj) {
            throw new Error('emit function need sucess and error function');
        }
        if (arguments.length == 3) {
            emitCbObj = {
                uid: arguments[0],
                success: arguments[1],
                error: arguments[2]
            };
        }
        // 目前认为是不合法状态，所以不做处理
        if (emitCbObj.uid < 0) {
            return;
        }
        // 先去cache里面看下
        if (this.needCache && this.answerCache.has(emitCbObj.uid)) {
            var value = this.answerCache.get(emitCbObj.uid);
            return emitCbObj.success.call(null, value);
        }
        var _uuid = uuid();
        this.originEmitMap.set(_uuid, emitCbObj);
        this._addEimitItem(_uuid, emitCbObj.uid);
    };
    // 核心逻辑
    EventsMerge.prototype._addEimitItem = function (uuid, uid) {
        var id = uuid + "," + uid;
        if (this.isEmitting) {
            // 正在发射阶段，将其添加到 准备队列里面
            this.parperEmittingQueue.push(id);
            return;
        }
        if (this.emittingQueueMayRepeat.length == 0) {
            // 第一次进入，添加触发器
            this._emittingDelyTime();
        }
        this.emittingQueueMayRepeat.push(id);
    };
    EventsMerge.prototype._emittingDelyTime = function () {
        var _this = this;
        setTimeout(function () {
            _this._emitting();
        }, this.interval);
    };
    EventsMerge.prototype._emitting = function () {
        var _this = this;
        this.isEmitting = true;
        // 生成去重队列
        this._generatorUniqueEmittingQueue();
        var emittingQueueUidIsUnique = this.emittingQueueUidIsUnique.map(function (item) {
            var uuidAndUid = item.split(',');
            return uuidAndUid[1];
        });
        this.emitterFun(emittingQueueUidIsUnique).then(function (values) {
            // 这个values不会重复
            _this._installValue(values);
            _this._returnScuess();
            _this._clearAndInitEmittinQueue();
        }, function (error) {
            _this._returnError(error);
            _this._clearAndInitEmittinQueue();
        });
    };
    EventsMerge.prototype._generatorUniqueEmittingQueue = function () {
        var _this = this;
        this.emittingQueueUidIsUnique = [];
        this.emittingQueueMayRepeat.forEach(function (item) {
            if (_this.emittingQueueUidIsUnique.indexOf(item) == -1) {
                _this.emittingQueueUidIsUnique.push(item);
            }
        });
    };
    EventsMerge.prototype._clearAndInitEmittinQueue = function () {
        this.emittingQueueMayRepeat = [].concat(this.parperEmittingQueue);
        if (this.parperEmittingQueue.length > 0) {
            this._emittingDelyTime();
        }
        this.parperEmittingQueue = [];
        this.isEmitting = false;
    };
    // 把 uid 和 value 关联到 cache 里面
    EventsMerge.prototype._installValue = function (values) {
        var _this = this;
        values && values.forEach(function (value, index) {
            var id = _this.emittingQueueUidIsUnique[index];
            var uuidAndUid = id.split(',');
            var uid = uuidAndUid[1];
            // 会 update
            _this.answerCache.set(uid, value);
        });
    };
    // 从 originEmitMap 这里面拿 uid 
    // 从 answerCache 里面拿值
    // 注意： 及时清除 originEmitMap
    EventsMerge.prototype._returnValue = function (successOrError, errorObj) {
        var _this = this;
        this.emittingQueueMayRepeat.forEach(function (item) {
            var uuidAndUid = item.split(',');
            var uuid = uuidAndUid[0];
            var uid = uuidAndUid[1];
            var callbackObject = _this.originEmitMap.get(uuid);
            var value = _this.answerCache.get(uid);
            if (!successOrError) {
                callbackObject.error.call(null, errorObj);
            }
            else {
                callbackObject.success.call(null, value);
            }
        });
    };
    EventsMerge.prototype._returnScuess = function () {
        this._returnValue(true);
    };
    EventsMerge.prototype._returnError = function (error) {
        this._returnValue(false, error);
    };
    return EventsMerge;
}());
exports.EventsMerge = EventsMerge;
//# sourceMappingURL=event_merge.js.map