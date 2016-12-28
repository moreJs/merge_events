import { Runnable } from './runnable';
import {EmitCbObj, Profile} from './util';

// 判断数字
const reg = /^\d*$/;

/**
 * 
 */
export class Dispatcher{
    
    howLong: number;
    runnable: Runnable;
    emitterFun: (uids: Array<string>) => Promise<any>;

    constructor(howLong: number, emitterFun: (uids: Array<string>)=> Promise<any>) {
        if(howLong && !reg.test(howLong+'')) {
            throw new Error('howLong must be a number');
        }
        if(!emitterFun || typeof emitterFun !== 'function') {
            throw new Error('EventsMerge need a emitterFun which handlers all events');
        }
        this.howLong = howLong || 100;
        this.emitterFun = emitterFun;
    }

    /**
     * emit 核心逻辑
     */
    public emit(emitCbObj:EmitCbObj) {
        if(!emitCbObj || !emitCbObj.uid || !emitCbObj.success || !emitCbObj.error) {
            return;
        }
        // 当前没有 runnable 对象，直接 new 个新的
        if(!this.runnable) {
            this.runnable = new Runnable(this);
        }
        // 给runnable对象，它负责具体聚合和掉用逻辑
        this.runnable.emit(emitCbObj);
    }

    // 删除旧的runnable
    public removeRunnable() {
        this.runnable = null;
    }
}