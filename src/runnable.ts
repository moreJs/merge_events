import { Dispatcher } from './dispatcher';
import {EmitCbObj, Profile, distinct} from './util';


/**
 * 
 */
export class Runnable{
    
    dispatcher: Dispatcher;
    emitterFun: (uids: Array<string>) => Promise<any>;
    emitQueue: Array<EmitCbObj>;
    uids: Array<string>;
    cache: Map<string, Profile>;
    howLong: number;
    timerId: number;

    constructor(dispatcher: Dispatcher) {
        this.dispatcher = dispatcher;
        this.howLong = dispatcher.howLong;
        this.emitterFun = dispatcher.emitterFun;
        this.emitQueue = new Array<EmitCbObj>();
        this.uids = new Array<string>();
        this.cache = new Map<string, Profile>();    
    }

    public emit(emitCbObj: EmitCbObj) {
        this.emitQueue.push(emitCbObj);
        let uid = emitCbObj.uid;
        // 不添加重复的uid
        if(this.uids.indexOf(uid) === -1) {
            this.uids.push(uid);
        }
        if(this.emitQueue.length === 1) {
            this._addTimer();
        }
        // 处理100的问题, 并且 uids 里面没有重复的uid
        if(this.uids.length === 100) {
            if(this.timerId) {
                clearTimeout(this.timerId);
            }
            this._run();
        }
    }

    private _addTimer() {
        this.timerId = setTimeout(() => {
            this._run();
        }, this.howLong);
    }

    private _run() {
        this._destory();
        // 直接拿 this.uids 队列里面的即可，这里面保证了不重复,并且长度小于100
        let uids = this.uids;
        this.emitterFun(uids)
            .then(profiles => this._success(profiles), error => this._error(error))
            .catch(error => this._error(error));

    }

    private _success(profiles) {        
        profiles && profiles.forEach(profile => {
            let uid = profile.uid;
            this.cache.set(uid, profile);
        });     
        this.emitQueue.forEach(emitCbObj => {
            let uid = emitCbObj.uid;
            let fn = emitCbObj.success;
            let value = this.cache.get(uid);
            if(value) {
                fn.call(null, value);
            }else{
                let error = emitCbObj.error;
                error.call(null, new Error('服务端发生异常，请重新再试'));
            }
        });
        this._gc();
    }

    private _error(error) {
        this.emitQueue.forEach(emitCbObj => {
            let fn = emitCbObj.error;
            fn.call(null, error);
        });
        this._gc();
    }

    private _gc() {
        this.dispatcher = null;
        this.emitterFun = null;
        this.emitQueue = null;
        this.cache = null;
    }
    private _destory() {
        this.dispatcher.removeRunnable();
    }
}


