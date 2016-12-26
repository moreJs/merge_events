import * as uuid from 'uuid/v4';



// 每个event的标准callback对象
interface EmitCbObj{
    uid: string;
    success: () => any;
    error: () => any;
}

// 判断数字
const reg = /^\d*$/;

/**
 * 一个简单的相同类型事件合并class
 * 注意: 相同事件类型是指，这种事件具有结构相同的事件处理
 */

export class EventsMerge{
    // 时间间距，默认 1000 ms;
    interval: number;
    // 真正去服务端取数的被合并过的接口
    emitterFun: (ids: Array<string>)=> Promise<any>;
    // 是否开启 cache, 默认开启
    needCache: boolean = true;
    // 是否在处理结果阶段
    // 若是处理结果阶段，则需要将新加入的event放到parperEmittingQueue队列里面，不要干扰emittingQueueMayRepeat队列
    isEmitting: boolean = false;
    // map: uuid ==> EmitCbObj 的一个映射
    originEmitMap: Map<string, EmitCbObj> = new Map();
    // 队列: 最近的要去服务端取数的emit , id 为 '${uid},${uuid}',注意：uid 有可能会重复
    emittingQueueMayRepeat: Array<string> = new Array();
    // uid不重复的队列: 只在请求数据的时候，从emittingQueueMayRepeat去重复，数据回来的时候根据 uid 设置 value
    emittingQueueUidIsUnique:  Array<string> = new Array();
    // 没有办法在 “下次” 一起去取数，需要在 “下下次” 去取数
    parperEmittingQueue: Array<string> = new Array();
    // uid ==> value 的cache
    answerCache: Map<string, string> = new Map();

    constructor(interval: number, emitterFun: ()=> Promise<any>, needCache) {
        if(interval && !reg.test(interval+'')) {
            throw new Error('interval must be a number');
        }
        if(!emitterFun || typeof emitterFun !== 'function') {
            throw new Error('EventsMerge need a emitterFun which handlers all events');
        }
        this.interval = interval || 1000;
        this.emitterFun = emitterFun;
        this.needCache = needCache || true;
    }

    // 对外暴露的唯一方法
    // 外部使用方式: this.emit(uid, success, error)
    public emit(fnOrObj){

        let emitCbObj = fnOrObj;
        // process arguments
        if(!fnOrObj) {
            throw new Error('emit function need sucess and error function');
        }
        if(arguments.length == 3) {
            emitCbObj = {
                uid: arguments[0],
                success: arguments[1],
                error: arguments[2]
            }
        }

        // 目前认为是不合法状态，所以不做处理
        if(emitCbObj.uid < 0) {
            return;
        }
        // 先去cache里面看下
        if(this.needCache && this.answerCache.has(emitCbObj.uid)) {
            let value = this.answerCache.get(emitCbObj.uid);
            return emitCbObj.success.call(null, value);
        }

        const _uuid = uuid();
        this.originEmitMap.set(_uuid, emitCbObj);

        this._addEimitItem(_uuid, emitCbObj.uid);
    }
    // 核心逻辑
    private _addEimitItem(uuid, uid) {
        let id = `${uuid},${uid}`;
        if(this.isEmitting) {
            // 正在发射阶段，将其添加到 准备队列里面
            this.parperEmittingQueue.push(id);
            return;
        }
        if(this.emittingQueueMayRepeat.length == 0){
            // 第一次进入，添加触发器
            this._emittingDelyTime();
        }
        this.emittingQueueMayRepeat.push(id);
    }

    private _emittingDelyTime() {
        setTimeout(() => {
            this._emitting();
        }, this.interval);
    }
    private _emitting() {
        this.isEmitting = true;
        // 生成去重队列
        this._generatorUniqueEmittingQueue();
        let emittingQueueUidIsUnique = this.emittingQueueUidIsUnique.map(item => {
            let uuidAndUid = item.split(',');
            return uuidAndUid[1];
        });
        this.emitterFun(emittingQueueUidIsUnique).then(values => {
            // 这个values不会重复
            this._installValue(values);
            this._returnScuess();
            this._clearAndInitEmittinQueue();

        }, error => {
            this._returnError(error);
            this._clearAndInitEmittinQueue();
        });
    }
    private _generatorUniqueEmittingQueue() {
        this.emittingQueueUidIsUnique = [];
        this.emittingQueueMayRepeat.forEach(item => {
            if(this.emittingQueueUidIsUnique.indexOf(item) == -1){
                this.emittingQueueUidIsUnique.push(item);
            }
        });
    }
    private _clearAndInitEmittinQueue() {
        this.emittingQueueMayRepeat = [].concat(this.parperEmittingQueue);
        if(this.parperEmittingQueue.length > 0) {
            this._emittingDelyTime();
        }
        this.parperEmittingQueue = [];
        this.isEmitting = false;
    }
    // 把 uid 和 value 关联到 cache 里面
    private _installValue(values) {
        values && values.forEach((value, index) => {
            let id = this.emittingQueueUidIsUnique[index];
            let uuidAndUid = id.split(',');
            let uid = uuidAndUid[1];
            // 会 update
            this.answerCache.set(uid, value);
        });
    }
    // 从 originEmitMap 这里面拿 uid 
    // 从 answerCache 里面拿值
    // 注意： 及时清除 originEmitMap
    private _returnValue(successOrError, errorObj?) {
        this.emittingQueueMayRepeat.forEach(item => {
            let uuidAndUid = item.split(',');
            let uuid = uuidAndUid[0];
            let uid = uuidAndUid[1]; 

            let callbackObject = this.originEmitMap.get(uuid);
            let value = this.answerCache.get(uid);

            if(!successOrError) {
                callbackObject.error.call(null, errorObj);                
            }else{
                callbackObject.success.call(null, value);
            }

        });
    }

    private _returnScuess(){
        this._returnValue(true);
    }
    private _returnError(error) {
        this._returnValue(false, error);
    }


}