'use strict';

const EventsMerge = require('../build/event_merge').EventsMerge;


const eventsMerge = new EventsMerge(1000, value => {
    console.log('fetch data from server');
    return Promise.resolve(value);
});

eventsMerge.emit({
    uid: '1',
    success: value => console.log('value', value),
    error: err => console.log(err) 
});

eventsMerge.emit({
    uid: '2',
    success: value => console.log('value', value),
    error: err => console.log(err) 
});

eventsMerge.emit({
    uid: '3',
    success: value => console.log('value', value),
    error: err => console.log(err) 
});

eventsMerge.emit({
    uid: '2',
    success: value => console.log('value2', value),
    error: err => console.log(err) 
});

setTimeout(() => {
    eventsMerge.emit({
        uid: '21',
        success: value => console.log('value', value),
        error: err => console.log(err) 
    });
} ,1500);

setTimeout(() => {
    eventsMerge.emit({
        uid: '22',
        success: value => console.log('value', value),
        error: err => console.log(err) 
    });
} ,2000);


setTimeout(() => {
    eventsMerge.emit({
        uid: '2',
        success: value => console.log('value', value),
        error: err => console.log(err) 
    });
} ,3000);