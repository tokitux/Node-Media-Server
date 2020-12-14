//
//  Created by Mingliang Chen on 18/3/2.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const EventEmitter = require('events');

let sessions = new Map();
let publishers = new Map();
let idlePlayers = new Set();
let nodeEvent = new EventEmitter();

//As EventEmitter works in fully synchronous manner, it doesn't support
//waiting on external events to be finished. The following code 
//introduces this possibility.

nodeEvent.asyncEvents = new Map();
let orig_on = Object.getPrototypeOf(nodeEvent).on;
let orig_emit = Object.getPrototypeOf(nodeEvent).emit;

//The following function decorates the original "on" function.
//It wraps original listener function into a Promise and saves 
//the Promise to the storage before calling the original function.
nodeEvent.on = function(type, listener) {

    let promisifiedListener = function(...args) {

        let promise = Promise.resolve(listener(...args));

        if (this.asyncEvents.has(type)){
            this.asyncEvents.get(type).push(promise);
        } else {
            this.asyncEvents.set(type, [promise]);
        }
    }

    return orig_on.call(this, type, promisifiedListener);
}

//The following function decorates the original "emit".
//It runs the original emit, waits until all the Promises
//for the current event are resolved and clears the storage.
nodeEvent.emit = async function(type, ...args) {
    let res = orig_emit.call(this, type, ...args);

    let asyncEvents = this.asyncEvents.get(type);
    
    if (asyncEvents){
        await Promise.all(asyncEvents).then(this.asyncEvents.delete(type));
    }

    return res;
}

let stat = {
  inbytes: 0,
  outbytes: 0,
  accepted: 0
};
module.exports = { sessions, publishers, idlePlayers, nodeEvent, stat };
