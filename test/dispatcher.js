'use strict';
const assert = require('assert');
const Dispatcher = require('../build/Dispatcher').Dispatcher;

// serverCount
let serverCount = 0;
let serverReciveUidCount = 0;

//现在有一个 Ajax 接口，根据用户 uid 获取用户 profile 信息，是一个批量接口。我把这个 ajax 请求封装成以下的异步函数
var requestUserProfile = function(uidList){  // uidList 是一个数组，最大接受 100 个 uid
    // 这个方法的实现不能修改
    /** 先去重 */
    serverCount++;
    var uidList = uidList || [];
    var _tmp = {};
    var _uidList = [];
    uidList.forEach(function(uid){
        if(!_tmp[uid]){
        _tmp[uid] = 1;
        _uidList.push(uid);
        }
    })
    _tmp = null;
    uidList = null;

    serverReciveUidCount = _uidList.length;

    return Promise.resolve().then(function(){
        return new Promise(function(resolve, reject){
        setTimeout(function(){ // 模拟 ajax 异步，1s 返回
            resolve();
        }, 1000);
        }).then(function(){
        var profileList = _uidList.map(function(uid){
            if(uid < 0){  // 模拟 uid 传错，服务端异常，获取不到部分 uid 对应的 profile 等异常场景
            return null;
            }else{
                return {
                    uid: uid,
                    nick: uid + 'Nick',
                    age: 18
                }
            }
        });
        return profileList.filter(function(profile){
            return profile !== null;
        });
        });
    });
}


before(function(){
    serverCount = 0;
    serverReciveUidCount = 0;
    // 在作用范围内的所有case执行之前执行一次
    this.Dispatcher = new Dispatcher(500, requestUserProfile);
    
    this._getUserProfile = function(uid, resolve, reject) {
        this.Dispatcher.emit({
        uid: uid,
        success: value => resolve(value),
        error: error => reject(error)
        });
    }
    // 现在我们有很多业务都需要根据 uid 获取 userProfile , 大多数业务的需求都是给一个 uid，获取 profile 。为了性能，我们需要把这个单个的请求合并成批量请求。

    // 例如，现在页面上 A 模块需要获取 uid 为 1 的 profile，B 模块需要 uid 为 2 的 profile， C 模块需要获取 uid 为 1 的profile
    // 这三个模块会单独调用下面这个方法获取 profile，假设这三次调用的时间非常接近(100ms 以内)，最终要求只发送一个 ajax 请求（只调用一次 requestUserProfile )，拿到这三个模块需要的 profile

    // 完成以下方法，接收一个参数 uid，返回一个 Promise，当成功请求到 profile 的时候， resolve 对应的 profile , 请求失败 reject
    // 例如  getUserProfile(1).then(function(profile){ console.log(profile.uid === 1) // true });  // 假设请求成功了。
    this.getUserProfile = function(uid){
    // 你需要实现这个方法。
    return new Promise((resolve, reject) => {
        this._getUserProfile(uid, resolve, reject);
    })
    }



});

beforeEach(function(){
    serverCount = 0;
});


describe('EventsMerge 事件合并对象', function(){
    describe('基本功能', function(){
        it('单独的一个事件触发,返回正确的结果', function(done){
            this.timeout(2000);
            this.getUserProfile(1).then(profile => {
                let uid = profile.uid;
                assert(uid === 1);
                done();
            }, err => done(err));
        });
        it('单独的一个事件触发,只发生一次服务端掉用', function(done){
            this.timeout(2000);
            this.getUserProfile(1).then(profile => {
                assert(serverCount === 1);
                done();
            }, err => done(err));
        });
        it('在1000ms不同时间内随机触发5次，确保每次返回结果正确', function(done){
            this.timeout(2000);
            let count = 0;
            setTimeout(() => {
                this.getUserProfile(1).then(profile => {
                    count++;
                    let uid = profile.uid;
                    assert(uid === 1);
                    if(count == 5) {
                        done();
                    }
                }, err => done(err));
            },20);
            setTimeout(() => {
                this.getUserProfile(2).then(profile => {
                    count++;
                    let uid = profile.uid;
                    assert(uid === 2);
                    if(count == 5) {
                        done();
                    }
                }, err => done(err));
            },50);
            setTimeout(() => {
                this.getUserProfile(3).then(profile => {
                    count++;
                    let uid = profile.uid;
                    assert(uid === 3);
                    if(count == 5) {
                        done();
                    }
                }, err => done(err));
            },80);
            setTimeout(() => {
                this.getUserProfile(4).then(profile => {
                    count++;
                    let uid = profile.uid;
                    assert(uid === 4);
                    if(count == 5) {
                        done();
                    }
                }, err => done(err));
            },120);
            setTimeout(() => {
                this.getUserProfile(1).then(profile => {
                    count++;
                    let uid = profile.uid;
                    assert(uid === 1);
                    if(count == 5) {
                        done();
                    }
                }, err => done(err));
            },120);
        });
        it('在1000ms不同时间内随机触发5次，确保只发生一次服务端掉用', function(done){
            this.timeout(2000);
            let count = 0;
            setTimeout(() => {
                this.getUserProfile(1).then(profile => {
                    count++;
                    if(count == 5) {
                        assert(serverCount === 1);
                        done();
                    }
                }, err => done(err));
            },20);
            setTimeout(() => {
                this.getUserProfile(2).then(profile => {
                    count++;
                    if(count == 5) {
                        assert(serverCount === 1);
                        done();
                    }
                }, err => done(err));
            },50);
            setTimeout(() => {
                this.getUserProfile(3).then(profile => {
                    count++;
                    if(count == 5) {
                        assert(serverCount === 1);
                        done();
                    }
                }, err => done(err));
            },80);
            setTimeout(() => {
                this.getUserProfile(4).then(profile => {
                    count++;
                    if(count == 5) {
                        assert(serverCount === 1);
                        done();
                    }
                }, err => done(err));
            },120);
            setTimeout(() => {
                this.getUserProfile(1).then(profile => {
                    count++;
                    if(count == 5) {
                        assert(serverCount === 1);
                        done();
                    }
                }, err => done(err));
            },120);
        });
        it('在1000ms内触发10次掉用，依次返回正确的结果', function(done){
            this.timeout(2000);
            let uids = [1,2,3,4,5,6,7,8,9,10];
            let values = [];

            const assertLengthAndValue = uid => {
                values.push(uid);
                if(values.length === uids.length) {
                    for(let i = 0; i < 10 ; i++) {
                        if(uids[i] !== values[i]) {
                            done(new Error(''));
                        }
                    }
                    done();
                }
            };
            uids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    assertLengthAndValue(profile.uid);
                }, err => done(err));
            });
        });
        it('在1000ms内触发10次掉用，只发生一次服务端掉用', function(done){
            this.timeout(2000);
            let uids = [1,2,3,4,5,6,7,8,9,10];
            let count = 0;
            uids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    count++;
                    if(count === 10) {
                        assert(serverCount === 1);
                        done();
                    }
                }, err => done(err));
            });
        });
        it('在1000ms内触发10次掉用，在2000ms触发5次掉用，依次返回正确的值', function(done){
            this.timeout(5000);
            let firstUids = [1,2,3,4,5,6,7,8,9,10];
            let secondUids = [11,12,13,14,15];
            
            let values = [];
            let totalUids = firstUids.concat(secondUids);

            const assertLengthAndValue = uid => {
                values.push(uid);
                if(values.length === totalUids.length) {
                    for(let i = 0; i < 15 ; i++) {
                        if(totalUids[i] !== values[i]) {
                            done(new Error(''));
                        }
                    }
                    done();
                }
            };
            firstUids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    assertLengthAndValue(profile.uid);
                }, err => done(err));
            });
            setTimeout(() => {
                secondUids.forEach(uid => {
                    this.getUserProfile(uid).then(profile => {
                        assertLengthAndValue(profile.uid);
                    }, err => done(err));
                });              
            },2000);
        });
        it('在1000ms内触发10次掉用，在2000ms触发5次掉用，只发生二次服务端掉用', function(done){
            this.timeout(5000);
            let firstUids = [1,2,3,4,5,6,7,8,9,10];
            let secondUids = [11,12,13,14,15];
            
            let count = 0;
            firstUids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    count++;
                }, err => done(err));
            });
            setTimeout(() => {
                secondUids.forEach(uid => {
                    this.getUserProfile(uid).then(profile => {
                        count++;
                        if(count === 15) {
                            assert(serverCount === 2);
                            done();
                        }
                    }, err => done(err));
                });              
            },2000);
        });
        it('在1000ms内触发300次掉用，依次返回正确的结果', function(done){
            this.timeout(10000);
            let uids = [];
            let start = 1;
            while(uids.length <= 300) {
                uids.push(start++);
            }
            let values = [];

            const assertLengthAndValue = uid => {
                values.push(uid);
                if(values.length === uids.length) {
                    for(let i = 0; i < 300 ; i++) {
                        if(uids[i] !== values[i]) {
                            done(new Error(''));
                        }
                    }
                    done();
                }
            };
            uids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    assertLengthAndValue(profile.uid);
                }, err => done(err));
            });
        });
        it('在1000ms内触发300次掉用，发生3次服务端掉用', function(done){
            this.timeout(8000);
            let uids = [];
            let start = 1;
            while(uids.length < 300) {
                uids.push(start++);
            }
            let count = 0;
            uids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    count++;
                    if(count === 300) {
                        assert(serverCount === 3);
                        done();
                    }
                }, err => done(err));
            });
        });
        it('客户端会去重', function(done){
            this.timeout(2000);
            let uids = [1,3,1,3,5,6,7,10];
            let count = 0;
            uids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    count++;
                    if(count === 5) {
                        assert(serverReciveUidCount === 6);
                        done();
                    }
                }, err => done(err));
            });
        });
    });

    describe('异常情况捕捉', function(){
        it('触发一个uid<0的事件，该请求被 reject', function(done){
            this.timeout(2000);
            this.getUserProfile(-1).then(profile => {
            }, err => done());
        });
        it('触发10个掉用，其中有一个uid非法的情况，这个uid非法会被reject，其它合法请求被resolve', function(done){
            let uids = [1,2,3,4,-5,6,7,8,9,10];
            let id;
            let count = 0;
            uids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    let auid = profile.uid;
                    assert(auid === uid);
                    count++;
                    if(count == 10) {
                        assert(id === 5);
                        done();
                    }
                }, err => {
                    count++;
                    id = 5;
                });
            });
        });
        it('触发10个uid<0的事件，都被 reject', function(done){
            this.timeout(2000);
            let uids = [-1,-2,-3,-4,-5,-6,-7,-8,-9,-10];
            let count = 0;
            uids.forEach(uid => {
                this.getUserProfile(uid).then(profile => {
                    done(new Error('非法uid,居然返回正确的值了'));
                }, err => {
                    count++;
                    if(count === 10) {
                        done();
                    }
                });
            });
        });
    });

    describe('可能具有破坏性的行为', function() {
        it('uid 可能会有很多个重复', function(done) {
            this.timeout(2000);
            let uids = [1,5,1,3,5,3];
            let count = 0;
            uids.forEach(uid => {
                let ref = uid;
                this.getUserProfile(uid).then(profile => {
                    count++;
                    let ret = profile.uid;
                    assert(ret === ref);
                    if(count == 6) {
                        done();
                    }
                }, err => done());
            });
        });

        it('uid 可能会重复，但是属于不同批次的行为', function(done) {
            this.timeout(6000);
            let fuids = [1,5,1,3,5,3];
            let suids = [1,5,1,3,5,3];
            let count = 0;

            fuids.forEach(uid => {
                let ref = uid;
                this.getUserProfile(uid).then(profile => {
                    count++;
                    let ret = profile.uid;
                    assert(ret === ref);
                    if(count == 12) {
                        done();
                    }
                }, err => done(err));
            });

            setTimeout(() => {
                suids.forEach(uid => {
                    let ref = uid;
                    this.getUserProfile(uid).then(profile => {
                        count++;
                        let ret = profile.uid;
                        assert(ret === ref);
                        if(count == 12) {
                            done();
                        }
                    }, err => done(err));
                });    
            },500);
            
        });

        it('uid 可能会重复，但是属于不同批次的行为,这种情况下，还是去服务端两次', function(done) {
            this.timeout(10000);
            let fuids = [1,5,1,3,5,3];
            let suids = [1,5,1,3,5,3];
            let count = 0;

            fuids.forEach(uid => {
                let ref = uid;
                this.getUserProfile(uid).then(profile => {
                    count++;
                    let ret = profile.uid;
                    assert(ret === ref);
                    if(count == 12) {
                        assert(serverCount === 2);
                        done();
                    }
                }, err => done(err));
            });

            setTimeout(() => {
                suids.forEach(uid => {
                    let ref = uid;
                    this.getUserProfile(uid).then(profile => {
                        count++;
                        let ret = profile.uid;
                        assert(ret === ref);
                        if(count == 12) {
                            assert(serverCount === 2);
                            done();
                        }
                    }, err => done(err));
                });    
            },500);
            
        });
    });

});


