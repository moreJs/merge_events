// 每个event的标准callback对象
interface EmitCbObj{
    uid: string;
    success: () => any;
    error: () => any;
}

interface Profile{
    uid: string,
    nick: string,
    age: number
}

// 判断数字
const reg = /^\d*$/;



export class EventMergeSimple{
    // 时间间隔，默认 1000 ms
    interval: number;
    // 真正去服务端取数的方法
    emitterFun: ()=> Promise<any>;
    // cache: uid => profile
    cache: Map<string, Profile> = new Map();
    // 即将被触发的uid队列
    emitQueue: Array<EmitCbObj> = new Array();
    // 候补的uid队列
    emitWaittingQueue: Array<EmitCbObj> = new Array();
    // 是否在触发阶段,默认是false
    isEmited: boolean = false;

    constructor(interval: number, emitterFun: ()=> Promise<any>, needCache) {
        if(interval && !reg.test(interval+'')) {
            throw new Error('interval must be a number');
        }
        if(!emitterFun || typeof emitterFun !== 'function') {
            throw new Error('EventsMerge need a emitterFun which handlers all events');
        }
        this.interval = interval || 1000;
        this.emitterFun = emitterFun;
    }

    /**
     * emit 核心逻辑
     */
    public emit(emitCbObj:EmitCbObj) {
        if(!emitCbObj || !emitCbObj.uid || !emitCbObj.success || !emitCbObj.error) {
            return;
        }
        // 已经在发射阶段了，则将当前事件放入候补队列里面，然后返回
        if(this.isEmited) {
            this.emitWaittingQueue.push(emitCbObj);
            return;
        }
        // 不在发射阶段，则将当前事件推入正式发射队列里面，等待触发器触发请求
        this.emitQueue.push(emitCbObj);
        // 若队列里面，只有一个事件，则需要给当前发射队列添加时间触发器
        if(this.emitQueue.length == 1) {
            this._addTimer();
        }
    }
    private _addTimer() {
        setTimeout(() => this._run(), this.interval);
    }
    private _run() {
        this.isEmited = true;
        if(this.emitQueue.length > 100) {
            this._fixEmitQueue();
        }
        let uids = this.emitQueue.map(emitCbObj => emitCbObj.uid);
        this.emitterFun(uids)
            .then(profiles => this._success(profiles), error => this._error(error))
            .catch(error => this._error(error));
    }
    // 服务器端要求，只能接受长度为100的
    private _fixEmitQueue() {
        let leftEmitQueue = this.emitQueue.splice(100);
        this.emitWaittingQueue = leftEmitQueue.concat(this.emitWaittingQueue);
    }
    private _success(profiles) {
        profiles && profiles.forEach(profile => {
            let uid = profile.uid;
            // 若id一样会update
            this.cache.set(uid, profile);
        });
        this.emitQueue.forEach(emitCbObj => {
            let uid = emitCbObj.uid;
            let sucess = emitCbObj.success;
            // 从 cache 里面取值
            let value = this.cache.get(uid);
            if(value) {
                sucess.call(null, value);
            }else{
                emitCbObj.error.call(null, new Error('uid 非法'));
            }
        });
        // 清除这次请求集合对整体的影响
        this._clearEnv();
    }
    private _error(error) {
        this.emitQueue.forEach(emitCbObj => {
            let error = emitCbObj.error;
            error.call(null, error);
        });
        // 清除这次请求集合对整体的影响
        this._clearEnv();
    }
    private _clearEnv() {
        this.emitQueue = [];
        if(this.emitWaittingQueue.length > 0) {
            this.emitQueue = this.emitQueue.concat(this.emitWaittingQueue);
            this.emitWaittingQueue = [];
            this._addTimer();
        }
        this.isEmited = false;
    }
}