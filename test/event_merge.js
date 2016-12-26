'use strict';
const assert = require('assert');
const EventsMerge = require('../build/event_merge').EventsMerge;

console.log(EventsMerge);

describe('EventsMerge', function(){
    beforeEach(function(){
        this.eventsMerge = new EventsMerge(1000, (value) => {
            return Promise.resolve(value);
        });
    });
    
    describe('基本功能', function(){
        it('一次基本调用', function(done){
            let ans = null;
            this.eventsMerge.emit({
                uid: '123',
                success: value => ans = value,
                error: err => console.log(err) 
            });
            setTimeout(() => {
                assert.ok(ans === '123');
                done();
            }, 1500);
        });
    });
});
