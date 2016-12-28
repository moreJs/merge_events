"use strict";
var runnable_1 = require("./runnable");
// 判断数字
var reg = /^\d*$/;
/**
 *
 */
var Dispatcher = (function () {
    function Dispatcher(howLong, emitterFun) {
        if (howLong && !reg.test(howLong + '')) {
            throw new Error('howLong must be a number');
        }
        if (!emitterFun || typeof emitterFun !== 'function') {
            throw new Error('EventsMerge need a emitterFun which handlers all events');
        }
        this.howLong = howLong || 100;
        this.emitterFun = emitterFun;
    }
    /**
     * emit 核心逻辑
     */
    Dispatcher.prototype.emit = function (emitCbObj) {
        if (!emitCbObj || !emitCbObj.uid || !emitCbObj.success || !emitCbObj.error) {
            return;
        }
        // 当前没有 runnable 对象，直接 new 个新的
        if (!this.runnable) {
            this.runnable = new runnable_1.Runnable(this);
        }
        // 给runnable对象，它负责具体聚合和掉用逻辑
        this.runnable.emit(emitCbObj);
    };
    // 删除旧的runnable
    Dispatcher.prototype.removeRunnable = function () {
        this.runnable = null;
    };
    return Dispatcher;
}());
exports.Dispatcher = Dispatcher;
//# sourceMappingURL=dispatcher.js.map