(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Imagepack = require('imagepack');

var imagepack = new Imagepack({
        verbose: true
    })
    .on('error', function(error) {
        console.error(error);
        log(error);
    })
    .on('progress', function(progress) {
        console.log(progress);
        log('loading ' + (progress * 100).toFixed() + '%');
    })
    .once('load', function(names) {
        var msg = '<h4>Loaded ' + names.length + ' files from packs/pack.bin</h4>';
        log(names.reduce(function(value, name) {
            return value + name + '<br>';
        }, msg));
    })
    .once('load', getPng)
    .once('load', getJpg)
    .once('load', getGif)
    .once('load', getWebp)
    .load('packs/pack.bin');

function log(msg) {
    var el = document.querySelector('[data-js="log"]');
    el.innerHTML = msg;
}

function getPng(names) {
    var sequence = names.filter(function(name) {
        return name.slice(-4) === '.png';
    });
    var el = document.querySelector('[data-js="png"]');
    var img = new Image();
    el.appendChild(img);
    var i = 0;
    var last = 0;

    function loop() {
        window.requestAnimationFrame(loop);

        var now = Date.now();
        if (now - last < 40) {
            return;
        }
        last = now;

        if (i === sequence.length) {
            i = 0;
        }

        img.src = imagepack.getURI(sequence[i]);

        i++;
    }
    loop();
}

function getJpg(names) {
    var el = document.querySelector('[data-js="jpg"]');
    names.filter(function(name) {
        return name.slice(-4) === '.jpg';
    }).forEach(function(name) {
        el.appendChild(imagepack.getImage(name));
    });
}

function getGif(names) {
    var el = document.querySelector('[data-js="gif"]');
    names.filter(function(name) {
        return name.slice(-4) === '.gif';
    }).forEach(function(name) {
        el.appendChild(imagepack.getImage(name));
    });
}

function getWebp(names) {
    var el = document.querySelector('[data-js="webp"]');
    names.filter(function(name) {
        return name.slice(-5) === '.webp';
    }).forEach(function(name) {
        el.appendChild(imagepack.getImage(name));
    });
}

},{"imagepack":4}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
'use strict';

var EventEmitter = require('events').EventEmitter;

function Emitter() {
    EventEmitter.call(this);
    this.setMaxListeners(20);
}

Emitter.prototype = Object.create(EventEmitter.prototype);
Emitter.prototype.constructor = Emitter;

Emitter.prototype.off = function(type, listener) {
    if (listener) {
        return this.removeListener(type, listener);
    }
    if (type) {
        return this.removeAllListeners(type);
    }
    return this.removeAllListeners();
};

module.exports = Emitter;

},{"events":2}],4:[function(require,module,exports){
'use strict';

var Emitter = require('./emitter.js');

function Imagepack(options) {

    if (!window.Blob || !window.DataView) {
        console.warn('Imagepack --> Unsupported browser');
    }

    var imagepack;
    var images = {};

    function store(name, data) {
        if (options.verbose) {
            var kbs = (data.size / 1024).toFixed() + 'kb';
            console.log('Imagepack --> Unpacked', name, 'image/' + data.type, kbs);
        }
        images[name] = data;
    }

    function stripNullBytes(str) {
        return str.replace(/\0/g, '');
    }

    function decodeUTF8(buf) {
        var str = String.fromCharCode.apply(null, new Uint8Array(buf));
        return stripNullBytes(str);
    }

    function getImage(name) {
        var image = new Image();
        var revoke = function() {
            image.removeEventListener('load', revoke);
            URL.revokeObjectURL(image.src);
            image = null;
        };
        image.addEventListener('load', revoke);
        image.src = getURI(name);
        return image;
    }

    function getURI(name) {
        var image = images[name];
        if (!image) {
            throw new Error('[ERROR] Imagepack ' + name + ' not found');
        }
        var blob = new Blob([new Uint8Array(image.contents)], {
            type: 'image/' + image.type
        });
        return URL.createObjectURL(blob);
    }

    function getKeys() {
        return Object.keys(images);
    }

    function unpack(buffer) {

        var dataView = new DataView(buffer);

        var nameLength = 128;
        var sizeLength = 4;
        var typeLength = 8;

        var offset = 0;

        while (offset < dataView.byteLength) {

            var name = decodeUTF8(buffer.slice(offset, offset + nameLength));
            offset += nameLength;

            var size = dataView.getUint32(offset);
            offset += sizeLength;

            var type = decodeUTF8(buffer.slice(offset, offset + typeLength));
            offset += typeLength;

            var contents = buffer.slice(offset, offset + size);
            offset += size;

            store(name, {
                name: name,
                contents: contents,
                type: type,
                size: size
            });
        }

        if (options.verbose) {
            console.log('Imagepack --> Unpacked ' + getKeys().length + ' images');
        }

        imagepack.emit('load', getKeys());
    }

    function load(path) {
        var request = new XMLHttpRequest();
        request.open('GET', path, true);
        request.responseType = 'arraybuffer';
        request.addEventListener('load', function() {
            if (request.status < 400) {
                unpack(request.response);
            } else {
                errorHandler();
            }
        });
        request.addEventListener('progress', function(event) {
            if (event.lengthComputable) {
                imagepack.emit('progress', event.loaded / event.total);
            }
        });
        var errorHandler = function() {
            var msg = '[ERROR] imagepack ' + request.status + ' ' + options.path;
            if (imagepack.listeners('error').length) {
                imagepack.emit('error', msg);
            } else {
                throw new Error(msg);
            }
        };
        request.addEventListener('error', errorHandler);
        request.send();

        return imagepack;
    }

    function destroy() {
        images = {};
        return imagepack;
    }

    imagepack = Object.create(Emitter.prototype, {
        _events: {
            value: {}
        },
        load: {
            value: load
        },
        unpack: {
            value: unpack
        },
        getURI: {
            value: getURI
        },
        getImage: {
            value: getImage
        },
        getKeys: {
            value: getKeys
        },
        destroy: {
            value: destroy
        }
    });

    return Object.freeze(imagepack);
}

// IE? http://stackoverflow.com/questions/21440050/arraybuffer-prototype-slice-shim-for-ie
if (!ArrayBuffer.prototype.slice) {
    //Returns a new ArrayBuffer whose contents are a copy of this ArrayBuffer's
    //bytes from `begin`, inclusive, up to `end`, exclusive
    var p = ArrayBuffer.prototype;
    p.slice = function(begin, end) {
        //If `begin` is unspecified, Chrome assumes 0, so we do the same
        if (begin === void 0) {
            begin = 0;
        }

        //If `end` is unspecified, the new ArrayBuffer contains all
        //bytes from `begin` to the end of this ArrayBuffer.
        if (end === void 0) {
            end = this.byteLength;
        }

        //Chrome converts the values to integers via flooring
        begin = Math.floor(begin);
        end = Math.floor(end);

        //If either `begin` or `end` is negative, it refers to an
        //index from the end of the array, as opposed to from the beginning.
        if (begin < 0) {
            begin += this.byteLength;
        }
        if (end < 0) {
            end += this.byteLength;
        }

        //The range specified by the `begin` and `end` values is clamped to the
        //valid index range for the current array.
        begin = Math.min(Math.max(0, begin), this.byteLength);
        end = Math.min(Math.max(0, end), this.byteLength);

        //If the computed length of the new ArrayBuffer would be negative, it
        //is clamped to zero.
        if (end - begin <= 0) {
            return new ArrayBuffer(0);
        }

        var result = new ArrayBuffer(end - begin);
        var resultBytes = new Uint8Array(result);
        var sourceBytes = new Uint8Array(this, begin, end - begin);

        resultBytes.set(sourceBytes);

        return result;
    };
}

module.exports = Imagepack;

},{"./emitter.js":3}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvaW1hZ2VwYWNrL3NyYy9lbWl0dGVyLmpzIiwibm9kZV9tb2R1bGVzL2ltYWdlcGFjay9zcmMvaW1hZ2VwYWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBJbWFnZXBhY2sgPSByZXF1aXJlKCdpbWFnZXBhY2snKTtcblxudmFyIGltYWdlcGFjayA9IG5ldyBJbWFnZXBhY2soe1xuICAgICAgICB2ZXJib3NlOiB0cnVlXG4gICAgfSlcbiAgICAub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIGxvZyhlcnJvcik7XG4gICAgfSlcbiAgICAub24oJ3Byb2dyZXNzJywgZnVuY3Rpb24ocHJvZ3Jlc3MpIHtcbiAgICAgICAgY29uc29sZS5sb2cocHJvZ3Jlc3MpO1xuICAgICAgICBsb2coJ2xvYWRpbmcgJyArIChwcm9ncmVzcyAqIDEwMCkudG9GaXhlZCgpICsgJyUnKTtcbiAgICB9KVxuICAgIC5vbmNlKCdsb2FkJywgZnVuY3Rpb24obmFtZXMpIHtcbiAgICAgICAgdmFyIG1zZyA9ICc8aDQ+TG9hZGVkICcgKyBuYW1lcy5sZW5ndGggKyAnIGZpbGVzIGZyb20gcGFja3MvcGFjay5iaW48L2g0Pic7XG4gICAgICAgIGxvZyhuYW1lcy5yZWR1Y2UoZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSArIG5hbWUgKyAnPGJyPic7XG4gICAgICAgIH0sIG1zZykpO1xuICAgIH0pXG4gICAgLm9uY2UoJ2xvYWQnLCBnZXRQbmcpXG4gICAgLm9uY2UoJ2xvYWQnLCBnZXRKcGcpXG4gICAgLm9uY2UoJ2xvYWQnLCBnZXRHaWYpXG4gICAgLm9uY2UoJ2xvYWQnLCBnZXRXZWJwKVxuICAgIC5sb2FkKCdwYWNrcy9wYWNrLmJpbicpO1xuXG5mdW5jdGlvbiBsb2cobXNnKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtanM9XCJsb2dcIl0nKTtcbiAgICBlbC5pbm5lckhUTUwgPSBtc2c7XG59XG5cbmZ1bmN0aW9uIGdldFBuZyhuYW1lcykge1xuICAgIHZhciBzZXF1ZW5jZSA9IG5hbWVzLmZpbHRlcihmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lLnNsaWNlKC00KSA9PT0gJy5wbmcnO1xuICAgIH0pO1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWpzPVwicG5nXCJdJyk7XG4gICAgdmFyIGltZyA9IG5ldyBJbWFnZSgpO1xuICAgIGVsLmFwcGVuZENoaWxkKGltZyk7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBsYXN0ID0gMDtcblxuICAgIGZ1bmN0aW9uIGxvb3AoKSB7XG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7XG5cbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGlmIChub3cgLSBsYXN0IDwgNDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBsYXN0ID0gbm93O1xuXG4gICAgICAgIGlmIChpID09PSBzZXF1ZW5jZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgaW1nLnNyYyA9IGltYWdlcGFjay5nZXRVUkkoc2VxdWVuY2VbaV0pO1xuXG4gICAgICAgIGkrKztcbiAgICB9XG4gICAgbG9vcCgpO1xufVxuXG5mdW5jdGlvbiBnZXRKcGcobmFtZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1qcz1cImpwZ1wiXScpO1xuICAgIG5hbWVzLmZpbHRlcihmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lLnNsaWNlKC00KSA9PT0gJy5qcGcnO1xuICAgIH0pLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChpbWFnZXBhY2suZ2V0SW1hZ2UobmFtZSkpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRHaWYobmFtZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1qcz1cImdpZlwiXScpO1xuICAgIG5hbWVzLmZpbHRlcihmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lLnNsaWNlKC00KSA9PT0gJy5naWYnO1xuICAgIH0pLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChpbWFnZXBhY2suZ2V0SW1hZ2UobmFtZSkpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRXZWJwKG5hbWVzKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtanM9XCJ3ZWJwXCJdJyk7XG4gICAgbmFtZXMuZmlsdGVyKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5hbWUuc2xpY2UoLTUpID09PSAnLndlYnAnO1xuICAgIH0pLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChpbWFnZXBhY2suZ2V0SW1hZ2UobmFtZSkpO1xuICAgIH0pO1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG5mdW5jdGlvbiBFbWl0dGVyKCkge1xuICAgIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuICAgIHRoaXMuc2V0TWF4TGlzdGVuZXJzKDIwKTtcbn1cblxuRW1pdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RW1pdHRlci5wcm90b3R5cGUpO1xuRW1pdHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFbWl0dGVyO1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmIChsaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcik7XG4gICAgfVxuICAgIGlmICh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyh0eXBlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi9lbWl0dGVyLmpzJyk7XG5cbmZ1bmN0aW9uIEltYWdlcGFjayhvcHRpb25zKSB7XG5cbiAgICBpZiAoIXdpbmRvdy5CbG9iIHx8ICF3aW5kb3cuRGF0YVZpZXcpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdJbWFnZXBhY2sgLS0+IFVuc3VwcG9ydGVkIGJyb3dzZXInKTtcbiAgICB9XG5cbiAgICB2YXIgaW1hZ2VwYWNrO1xuICAgIHZhciBpbWFnZXMgPSB7fTtcblxuICAgIGZ1bmN0aW9uIHN0b3JlKG5hbWUsIGRhdGEpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICAgICAgdmFyIGticyA9IChkYXRhLnNpemUgLyAxMDI0KS50b0ZpeGVkKCkgKyAna2InO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0ltYWdlcGFjayAtLT4gVW5wYWNrZWQnLCBuYW1lLCAnaW1hZ2UvJyArIGRhdGEudHlwZSwga2JzKTtcbiAgICAgICAgfVxuICAgICAgICBpbWFnZXNbbmFtZV0gPSBkYXRhO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0cmlwTnVsbEJ5dGVzKHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVjb2RlVVRGOChidWYpIHtcbiAgICAgICAgdmFyIHN0ciA9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgbmV3IFVpbnQ4QXJyYXkoYnVmKSk7XG4gICAgICAgIHJldHVybiBzdHJpcE51bGxCeXRlcyhzdHIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEltYWdlKG5hbWUpIHtcbiAgICAgICAgdmFyIGltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICAgIHZhciByZXZva2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGltYWdlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCByZXZva2UpO1xuICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChpbWFnZS5zcmMpO1xuICAgICAgICAgICAgaW1hZ2UgPSBudWxsO1xuICAgICAgICB9O1xuICAgICAgICBpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgcmV2b2tlKTtcbiAgICAgICAgaW1hZ2Uuc3JjID0gZ2V0VVJJKG5hbWUpO1xuICAgICAgICByZXR1cm4gaW1hZ2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VVJJKG5hbWUpIHtcbiAgICAgICAgdmFyIGltYWdlID0gaW1hZ2VzW25hbWVdO1xuICAgICAgICBpZiAoIWltYWdlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tFUlJPUl0gSW1hZ2VwYWNrICcgKyBuYW1lICsgJyBub3QgZm91bmQnKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtuZXcgVWludDhBcnJheShpbWFnZS5jb250ZW50cyldLCB7XG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvJyArIGltYWdlLnR5cGVcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEtleXMoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhpbWFnZXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVucGFjayhidWZmZXIpIHtcblxuICAgICAgICB2YXIgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcblxuICAgICAgICB2YXIgbmFtZUxlbmd0aCA9IDEyODtcbiAgICAgICAgdmFyIHNpemVMZW5ndGggPSA0O1xuICAgICAgICB2YXIgdHlwZUxlbmd0aCA9IDg7XG5cbiAgICAgICAgdmFyIG9mZnNldCA9IDA7XG5cbiAgICAgICAgd2hpbGUgKG9mZnNldCA8IGRhdGFWaWV3LmJ5dGVMZW5ndGgpIHtcblxuICAgICAgICAgICAgdmFyIG5hbWUgPSBkZWNvZGVVVEY4KGJ1ZmZlci5zbGljZShvZmZzZXQsIG9mZnNldCArIG5hbWVMZW5ndGgpKTtcbiAgICAgICAgICAgIG9mZnNldCArPSBuYW1lTGVuZ3RoO1xuXG4gICAgICAgICAgICB2YXIgc2l6ZSA9IGRhdGFWaWV3LmdldFVpbnQzMihvZmZzZXQpO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IHNpemVMZW5ndGg7XG5cbiAgICAgICAgICAgIHZhciB0eXBlID0gZGVjb2RlVVRGOChidWZmZXIuc2xpY2Uob2Zmc2V0LCBvZmZzZXQgKyB0eXBlTGVuZ3RoKSk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gdHlwZUxlbmd0aDtcblxuICAgICAgICAgICAgdmFyIGNvbnRlbnRzID0gYnVmZmVyLnNsaWNlKG9mZnNldCwgb2Zmc2V0ICsgc2l6ZSk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gc2l6ZTtcblxuICAgICAgICAgICAgc3RvcmUobmFtZSwge1xuICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgY29udGVudHM6IGNvbnRlbnRzLFxuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICAgICAgc2l6ZTogc2l6ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy52ZXJib3NlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnSW1hZ2VwYWNrIC0tPiBVbnBhY2tlZCAnICsgZ2V0S2V5cygpLmxlbmd0aCArICcgaW1hZ2VzJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpbWFnZXBhY2suZW1pdCgnbG9hZCcsIGdldEtleXMoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9hZChwYXRoKSB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgcGF0aCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPCA0MDApIHtcbiAgICAgICAgICAgICAgICB1bnBhY2socmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVycm9ySGFuZGxlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgICAgICAgIGltYWdlcGFjay5lbWl0KCdwcm9ncmVzcycsIGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBlcnJvckhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBtc2cgPSAnW0VSUk9SXSBpbWFnZXBhY2sgJyArIHJlcXVlc3Quc3RhdHVzICsgJyAnICsgb3B0aW9ucy5wYXRoO1xuICAgICAgICAgICAgaWYgKGltYWdlcGFjay5saXN0ZW5lcnMoJ2Vycm9yJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaW1hZ2VwYWNrLmVtaXQoJ2Vycm9yJywgbXNnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBlcnJvckhhbmRsZXIpO1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcblxuICAgICAgICByZXR1cm4gaW1hZ2VwYWNrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgICAgIGltYWdlcyA9IHt9O1xuICAgICAgICByZXR1cm4gaW1hZ2VwYWNrO1xuICAgIH1cblxuICAgIGltYWdlcGFjayA9IE9iamVjdC5jcmVhdGUoRW1pdHRlci5wcm90b3R5cGUsIHtcbiAgICAgICAgX2V2ZW50czoge1xuICAgICAgICAgICAgdmFsdWU6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIGxvYWQ6IHtcbiAgICAgICAgICAgIHZhbHVlOiBsb2FkXG4gICAgICAgIH0sXG4gICAgICAgIHVucGFjazoge1xuICAgICAgICAgICAgdmFsdWU6IHVucGFja1xuICAgICAgICB9LFxuICAgICAgICBnZXRVUkk6IHtcbiAgICAgICAgICAgIHZhbHVlOiBnZXRVUklcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SW1hZ2U6IHtcbiAgICAgICAgICAgIHZhbHVlOiBnZXRJbWFnZVxuICAgICAgICB9LFxuICAgICAgICBnZXRLZXlzOiB7XG4gICAgICAgICAgICB2YWx1ZTogZ2V0S2V5c1xuICAgICAgICB9LFxuICAgICAgICBkZXN0cm95OiB7XG4gICAgICAgICAgICB2YWx1ZTogZGVzdHJveVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZShpbWFnZXBhY2spO1xufVxuXG4vLyBJRT8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTQ0MDA1MC9hcnJheWJ1ZmZlci1wcm90b3R5cGUtc2xpY2Utc2hpbS1mb3ItaWVcbmlmICghQXJyYXlCdWZmZXIucHJvdG90eXBlLnNsaWNlKSB7XG4gICAgLy9SZXR1cm5zIGEgbmV3IEFycmF5QnVmZmVyIHdob3NlIGNvbnRlbnRzIGFyZSBhIGNvcHkgb2YgdGhpcyBBcnJheUJ1ZmZlcidzXG4gICAgLy9ieXRlcyBmcm9tIGBiZWdpbmAsIGluY2x1c2l2ZSwgdXAgdG8gYGVuZGAsIGV4Y2x1c2l2ZVxuICAgIHZhciBwID0gQXJyYXlCdWZmZXIucHJvdG90eXBlO1xuICAgIHAuc2xpY2UgPSBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgICAgIC8vSWYgYGJlZ2luYCBpcyB1bnNwZWNpZmllZCwgQ2hyb21lIGFzc3VtZXMgMCwgc28gd2UgZG8gdGhlIHNhbWVcbiAgICAgICAgaWYgKGJlZ2luID09PSB2b2lkIDApIHtcbiAgICAgICAgICAgIGJlZ2luID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vSWYgYGVuZGAgaXMgdW5zcGVjaWZpZWQsIHRoZSBuZXcgQXJyYXlCdWZmZXIgY29udGFpbnMgYWxsXG4gICAgICAgIC8vYnl0ZXMgZnJvbSBgYmVnaW5gIHRvIHRoZSBlbmQgb2YgdGhpcyBBcnJheUJ1ZmZlci5cbiAgICAgICAgaWYgKGVuZCA9PT0gdm9pZCAwKSB7XG4gICAgICAgICAgICBlbmQgPSB0aGlzLmJ5dGVMZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICAvL0Nocm9tZSBjb252ZXJ0cyB0aGUgdmFsdWVzIHRvIGludGVnZXJzIHZpYSBmbG9vcmluZ1xuICAgICAgICBiZWdpbiA9IE1hdGguZmxvb3IoYmVnaW4pO1xuICAgICAgICBlbmQgPSBNYXRoLmZsb29yKGVuZCk7XG5cbiAgICAgICAgLy9JZiBlaXRoZXIgYGJlZ2luYCBvciBgZW5kYCBpcyBuZWdhdGl2ZSwgaXQgcmVmZXJzIHRvIGFuXG4gICAgICAgIC8vaW5kZXggZnJvbSB0aGUgZW5kIG9mIHRoZSBhcnJheSwgYXMgb3Bwb3NlZCB0byBmcm9tIHRoZSBiZWdpbm5pbmcuXG4gICAgICAgIGlmIChiZWdpbiA8IDApIHtcbiAgICAgICAgICAgIGJlZ2luICs9IHRoaXMuYnl0ZUxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5kIDwgMCkge1xuICAgICAgICAgICAgZW5kICs9IHRoaXMuYnl0ZUxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vVGhlIHJhbmdlIHNwZWNpZmllZCBieSB0aGUgYGJlZ2luYCBhbmQgYGVuZGAgdmFsdWVzIGlzIGNsYW1wZWQgdG8gdGhlXG4gICAgICAgIC8vdmFsaWQgaW5kZXggcmFuZ2UgZm9yIHRoZSBjdXJyZW50IGFycmF5LlxuICAgICAgICBiZWdpbiA9IE1hdGgubWluKE1hdGgubWF4KDAsIGJlZ2luKSwgdGhpcy5ieXRlTGVuZ3RoKTtcbiAgICAgICAgZW5kID0gTWF0aC5taW4oTWF0aC5tYXgoMCwgZW5kKSwgdGhpcy5ieXRlTGVuZ3RoKTtcblxuICAgICAgICAvL0lmIHRoZSBjb21wdXRlZCBsZW5ndGggb2YgdGhlIG5ldyBBcnJheUJ1ZmZlciB3b3VsZCBiZSBuZWdhdGl2ZSwgaXRcbiAgICAgICAgLy9pcyBjbGFtcGVkIHRvIHplcm8uXG4gICAgICAgIGlmIChlbmQgLSBiZWdpbiA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFycmF5QnVmZmVyKDApO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheUJ1ZmZlcihlbmQgLSBiZWdpbik7XG4gICAgICAgIHZhciByZXN1bHRCeXRlcyA9IG5ldyBVaW50OEFycmF5KHJlc3VsdCk7XG4gICAgICAgIHZhciBzb3VyY2VCeXRlcyA9IG5ldyBVaW50OEFycmF5KHRoaXMsIGJlZ2luLCBlbmQgLSBiZWdpbik7XG5cbiAgICAgICAgcmVzdWx0Qnl0ZXMuc2V0KHNvdXJjZUJ5dGVzKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW1hZ2VwYWNrO1xuIl19
