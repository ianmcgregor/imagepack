(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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

},{"events":1}],3:[function(require,module,exports){
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

  function decode(buffer) {

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
        decode(request.response);
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
      _events: { value: {} },
      load: { value: load },
      getURI: { value: getURI },
      getImage: { value: getImage },
      getKeys: { value: getKeys },
      destroy: { value: destroy }
  });

  return Object.freeze(imagepack);
}

// IE? http://stackoverflow.com/questions/21440050/arraybuffer-prototype-slice-shim-for-ie
if (!ArrayBuffer.prototype.slice) {
    //Returns a new ArrayBuffer whose contents are a copy of this ArrayBuffer's
    //bytes from `begin`, inclusive, up to `end`, exclusive
    var p = ArrayBuffer.prototype;
    p.slice = function (begin, end) {
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

},{"./emitter.js":2}],4:[function(require,module,exports){
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

},{"imagepack":3}]},{},[4])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9pbWFnZXBhY2svc3JjL2VtaXR0ZXIuanMiLCJub2RlX21vZHVsZXMvaW1hZ2VwYWNrL3NyYy9pbWFnZXBhY2suanMiLCJleGFtcGxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbmZ1bmN0aW9uIEVtaXR0ZXIoKSB7XG4gICAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zZXRNYXhMaXN0ZW5lcnMoMjApO1xufVxuXG5FbWl0dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5FbWl0dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVtaXR0ZXI7XG5cbkVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKGxpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgICB9XG4gICAgaWYgKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKHR5cGUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEVtaXR0ZXIgPSByZXF1aXJlKCcuL2VtaXR0ZXIuanMnKTtcblxuZnVuY3Rpb24gSW1hZ2VwYWNrKG9wdGlvbnMpIHtcblxuICBpZiAoIXdpbmRvdy5CbG9iIHx8ICF3aW5kb3cuRGF0YVZpZXcpIHtcbiAgICBjb25zb2xlLndhcm4oJ0ltYWdlcGFjayAtLT4gVW5zdXBwb3J0ZWQgYnJvd3NlcicpO1xuICB9XG5cbiAgdmFyIGltYWdlcGFjaztcbiAgdmFyIGltYWdlcyA9IHt9O1xuXG4gIGZ1bmN0aW9uIHN0b3JlKG5hbWUsIGRhdGEpIHtcbiAgICBpZiAob3B0aW9ucy52ZXJib3NlKSB7XG4gICAgICB2YXIga2JzID0gKGRhdGEuc2l6ZSAvIDEwMjQpLnRvRml4ZWQoKSArICdrYic7XG4gICAgICBjb25zb2xlLmxvZygnSW1hZ2VwYWNrIC0tPiBVbnBhY2tlZCcsIG5hbWUsICdpbWFnZS8nICsgZGF0YS50eXBlLCBrYnMpO1xuICAgIH1cbiAgICBpbWFnZXNbbmFtZV0gPSBkYXRhO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RyaXBOdWxsQnl0ZXMoc3RyKSB7XG4gICAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1xcMC9nLCAnJyk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGVVVEY4KGJ1Zikge1xuICAgIHZhciBzdHIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIG5ldyBVaW50OEFycmF5KGJ1ZikpO1xuICAgIHJldHVybiBzdHJpcE51bGxCeXRlcyhzdHIpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SW1hZ2UobmFtZSkge1xuICAgIHZhciBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgIHZhciByZXZva2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIGltYWdlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCByZXZva2UpO1xuICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChpbWFnZS5zcmMpO1xuICAgICAgaW1hZ2UgPSBudWxsO1xuICAgIH07XG4gICAgaW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIHJldm9rZSk7XG4gICAgaW1hZ2Uuc3JjID0gZ2V0VVJJKG5hbWUpO1xuICAgIHJldHVybiBpbWFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFVSSShuYW1lKSB7XG4gICAgdmFyIGltYWdlID0gaW1hZ2VzW25hbWVdO1xuICAgIGlmICghaW1hZ2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW0VSUk9SXSBJbWFnZXBhY2sgJyArIG5hbWUgKyAnIG5vdCBmb3VuZCcpO1xuICAgIH1cbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtuZXcgVWludDhBcnJheShpbWFnZS5jb250ZW50cyldLCB7XG4gICAgICB0eXBlOiAnaW1hZ2UvJyArIGltYWdlLnR5cGVcbiAgICB9KTtcbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEtleXMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGltYWdlcyk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYnVmZmVyKSB7XG5cbiAgICB2YXIgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcblxuICAgIHZhciBuYW1lTGVuZ3RoID0gMTI4O1xuICAgIHZhciBzaXplTGVuZ3RoID0gNDtcbiAgICB2YXIgdHlwZUxlbmd0aCA9IDg7XG5cbiAgICB2YXIgb2Zmc2V0ID0gMDtcblxuXHRcdHdoaWxlIChvZmZzZXQgPCBkYXRhVmlldy5ieXRlTGVuZ3RoKSB7XG5cbiAgICAgICAgdmFyIG5hbWUgPSBkZWNvZGVVVEY4KGJ1ZmZlci5zbGljZShvZmZzZXQsIG9mZnNldCArIG5hbWVMZW5ndGgpKTtcbiAgICAgICAgb2Zmc2V0ICs9IG5hbWVMZW5ndGg7XG5cbiAgICAgICAgdmFyIHNpemUgPSBkYXRhVmlldy5nZXRVaW50MzIob2Zmc2V0KTtcbiAgICAgICAgb2Zmc2V0ICs9IHNpemVMZW5ndGg7XG5cbiAgICAgICAgdmFyIHR5cGUgPSBkZWNvZGVVVEY4KGJ1ZmZlci5zbGljZShvZmZzZXQsIG9mZnNldCArIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgb2Zmc2V0ICs9IHR5cGVMZW5ndGg7XG5cbiAgICAgICAgdmFyIGNvbnRlbnRzID0gYnVmZmVyLnNsaWNlKG9mZnNldCwgb2Zmc2V0ICsgc2l6ZSk7XG4gICAgICAgIG9mZnNldCArPSBzaXplO1xuXG4gICAgICAgIHN0b3JlKG5hbWUsIHtcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgIGNvbnRlbnRzOiBjb250ZW50cyxcbiAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgIHNpemU6IHNpemVcbiAgICAgICAgfSk7XG5cdFx0fVxuXG4gICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coJ0ltYWdlcGFjayAtLT4gVW5wYWNrZWQgJyArIGdldEtleXMoKS5sZW5ndGggKyAnIGltYWdlcycpO1xuICAgIH1cblxuICAgIGltYWdlcGFjay5lbWl0KCdsb2FkJywgZ2V0S2V5cygpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvYWQocGF0aCkge1xuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxdWVzdC5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcbiAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPCA0MDApIHtcbiAgICAgICAgZGVjb2RlKHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3JIYW5kbGVyKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICBpbWFnZXBhY2suZW1pdCgncHJvZ3Jlc3MnLCBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdmFyIGVycm9ySGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG1zZyA9ICdbRVJST1JdIGltYWdlcGFjayAnICsgcmVxdWVzdC5zdGF0dXMgKyAnICcgKyBvcHRpb25zLnBhdGg7XG4gICAgICBpZiAoaW1hZ2VwYWNrLmxpc3RlbmVycygnZXJyb3InKS5sZW5ndGgpIHtcbiAgICAgICAgaW1hZ2VwYWNrLmVtaXQoJ2Vycm9yJywgbXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfVxuICAgIH07XG4gICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlcik7XG4gICAgcmVxdWVzdC5zZW5kKCk7XG5cbiAgICByZXR1cm4gaW1hZ2VwYWNrO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICBpbWFnZXMgPSB7fTtcbiAgICByZXR1cm4gaW1hZ2VwYWNrO1xuICB9XG5cbiAgaW1hZ2VwYWNrID0gT2JqZWN0LmNyZWF0ZShFbWl0dGVyLnByb3RvdHlwZSwge1xuICAgICAgX2V2ZW50czogeyB2YWx1ZToge30gfSxcbiAgICAgIGxvYWQ6IHsgdmFsdWU6IGxvYWQgfSxcbiAgICAgIGdldFVSSTogeyB2YWx1ZTogZ2V0VVJJIH0sXG4gICAgICBnZXRJbWFnZTogeyB2YWx1ZTogZ2V0SW1hZ2UgfSxcbiAgICAgIGdldEtleXM6IHsgdmFsdWU6IGdldEtleXMgfSxcbiAgICAgIGRlc3Ryb3k6IHsgdmFsdWU6IGRlc3Ryb3kgfVxuICB9KTtcblxuICByZXR1cm4gT2JqZWN0LmZyZWV6ZShpbWFnZXBhY2spO1xufVxuXG4vLyBJRT8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTQ0MDA1MC9hcnJheWJ1ZmZlci1wcm90b3R5cGUtc2xpY2Utc2hpbS1mb3ItaWVcbmlmICghQXJyYXlCdWZmZXIucHJvdG90eXBlLnNsaWNlKSB7XG4gICAgLy9SZXR1cm5zIGEgbmV3IEFycmF5QnVmZmVyIHdob3NlIGNvbnRlbnRzIGFyZSBhIGNvcHkgb2YgdGhpcyBBcnJheUJ1ZmZlcidzXG4gICAgLy9ieXRlcyBmcm9tIGBiZWdpbmAsIGluY2x1c2l2ZSwgdXAgdG8gYGVuZGAsIGV4Y2x1c2l2ZVxuICAgIHZhciBwID0gQXJyYXlCdWZmZXIucHJvdG90eXBlO1xuICAgIHAuc2xpY2UgPSBmdW5jdGlvbiAoYmVnaW4sIGVuZCkge1xuICAgICAgICAvL0lmIGBiZWdpbmAgaXMgdW5zcGVjaWZpZWQsIENocm9tZSBhc3N1bWVzIDAsIHNvIHdlIGRvIHRoZSBzYW1lXG4gICAgICAgIGlmIChiZWdpbiA9PT0gdm9pZCAwKSB7XG4gICAgICAgICAgICBiZWdpbiA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICAvL0lmIGBlbmRgIGlzIHVuc3BlY2lmaWVkLCB0aGUgbmV3IEFycmF5QnVmZmVyIGNvbnRhaW5zIGFsbFxuICAgICAgICAvL2J5dGVzIGZyb20gYGJlZ2luYCB0byB0aGUgZW5kIG9mIHRoaXMgQXJyYXlCdWZmZXIuXG4gICAgICAgIGlmIChlbmQgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgZW5kID0gdGhpcy5ieXRlTGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9DaHJvbWUgY29udmVydHMgdGhlIHZhbHVlcyB0byBpbnRlZ2VycyB2aWEgZmxvb3JpbmdcbiAgICAgICAgYmVnaW4gPSBNYXRoLmZsb29yKGJlZ2luKTtcbiAgICAgICAgZW5kID0gTWF0aC5mbG9vcihlbmQpO1xuXG4gICAgICAgIC8vSWYgZWl0aGVyIGBiZWdpbmAgb3IgYGVuZGAgaXMgbmVnYXRpdmUsIGl0IHJlZmVycyB0byBhblxuICAgICAgICAvL2luZGV4IGZyb20gdGhlIGVuZCBvZiB0aGUgYXJyYXksIGFzIG9wcG9zZWQgdG8gZnJvbSB0aGUgYmVnaW5uaW5nLlxuICAgICAgICBpZiAoYmVnaW4gPCAwKSB7XG4gICAgICAgICAgICBiZWdpbiArPSB0aGlzLmJ5dGVMZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZCA8IDApIHtcbiAgICAgICAgICAgIGVuZCArPSB0aGlzLmJ5dGVMZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICAvL1RoZSByYW5nZSBzcGVjaWZpZWQgYnkgdGhlIGBiZWdpbmAgYW5kIGBlbmRgIHZhbHVlcyBpcyBjbGFtcGVkIHRvIHRoZVxuICAgICAgICAvL3ZhbGlkIGluZGV4IHJhbmdlIGZvciB0aGUgY3VycmVudCBhcnJheS5cbiAgICAgICAgYmVnaW4gPSBNYXRoLm1pbihNYXRoLm1heCgwLCBiZWdpbiksIHRoaXMuYnl0ZUxlbmd0aCk7XG4gICAgICAgIGVuZCA9IE1hdGgubWluKE1hdGgubWF4KDAsIGVuZCksIHRoaXMuYnl0ZUxlbmd0aCk7XG5cbiAgICAgICAgLy9JZiB0aGUgY29tcHV0ZWQgbGVuZ3RoIG9mIHRoZSBuZXcgQXJyYXlCdWZmZXIgd291bGQgYmUgbmVnYXRpdmUsIGl0XG4gICAgICAgIC8vaXMgY2xhbXBlZCB0byB6ZXJvLlxuICAgICAgICBpZiAoZW5kIC0gYmVnaW4gPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBcnJheUJ1ZmZlcigwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoZW5kIC0gYmVnaW4pO1xuICAgICAgICB2YXIgcmVzdWx0Qnl0ZXMgPSBuZXcgVWludDhBcnJheShyZXN1bHQpO1xuICAgICAgICB2YXIgc291cmNlQnl0ZXMgPSBuZXcgVWludDhBcnJheSh0aGlzLCBiZWdpbiwgZW5kIC0gYmVnaW4pO1xuXG4gICAgICAgIHJlc3VsdEJ5dGVzLnNldChzb3VyY2VCeXRlcyk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEltYWdlcGFjaztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEltYWdlcGFjayA9IHJlcXVpcmUoJ2ltYWdlcGFjaycpO1xuXG52YXIgaW1hZ2VwYWNrID0gbmV3IEltYWdlcGFjayh7XG4gICAgICAgIHZlcmJvc2U6IHRydWVcbiAgICB9KVxuICAgIC5vbignZXJyb3InLCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgbG9nKGVycm9yKTtcbiAgICB9KVxuICAgIC5vbigncHJvZ3Jlc3MnLCBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICBjb25zb2xlLmxvZyhwcm9ncmVzcyk7XG4gICAgICAgIGxvZygnbG9hZGluZyAnICsgKHByb2dyZXNzICogMTAwKS50b0ZpeGVkKCkgKyAnJScpO1xuICAgIH0pXG4gICAgLm9uY2UoJ2xvYWQnLCBmdW5jdGlvbihuYW1lcykge1xuICAgICAgICB2YXIgbXNnID0gJzxoND5Mb2FkZWQgJyArIG5hbWVzLmxlbmd0aCArICcgZmlsZXMgZnJvbSBwYWNrcy9wYWNrLmJpbjwvaDQ+JztcbiAgICAgICAgbG9nKG5hbWVzLnJlZHVjZShmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlICsgbmFtZSArICc8YnI+JztcbiAgICAgICAgfSwgbXNnKSk7XG4gICAgfSlcbiAgICAub25jZSgnbG9hZCcsIGdldFBuZylcbiAgICAub25jZSgnbG9hZCcsIGdldEpwZylcbiAgICAub25jZSgnbG9hZCcsIGdldEdpZilcbiAgICAub25jZSgnbG9hZCcsIGdldFdlYnApXG4gICAgLmxvYWQoJ3BhY2tzL3BhY2suYmluJyk7XG5cbmZ1bmN0aW9uIGxvZyhtc2cpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1qcz1cImxvZ1wiXScpO1xuICAgIGVsLmlubmVySFRNTCA9IG1zZztcbn1cblxuZnVuY3Rpb24gZ2V0UG5nKG5hbWVzKSB7XG4gICAgdmFyIHNlcXVlbmNlID0gbmFtZXMuZmlsdGVyKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5hbWUuc2xpY2UoLTQpID09PSAnLnBuZyc7XG4gICAgfSk7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtanM9XCJwbmdcIl0nKTtcbiAgICB2YXIgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgZWwuYXBwZW5kQ2hpbGQoaW1nKTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGxhc3QgPSAwO1xuXG4gICAgZnVuY3Rpb24gbG9vcCgpIHtcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShsb29wKTtcblxuICAgICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgaWYgKG5vdyAtIGxhc3QgPCA0MCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGxhc3QgPSBub3c7XG5cbiAgICAgICAgaWYgKGkgPT09IHNlcXVlbmNlLmxlbmd0aCkge1xuICAgICAgICAgICAgaSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBpbWcuc3JjID0gaW1hZ2VwYWNrLmdldFVSSShzZXF1ZW5jZVtpXSk7XG5cbiAgICAgICAgaSsrO1xuICAgIH1cbiAgICBsb29wKCk7XG59XG5cbmZ1bmN0aW9uIGdldEpwZyhuYW1lcykge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWpzPVwianBnXCJdJyk7XG4gICAgbmFtZXMuZmlsdGVyKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5hbWUuc2xpY2UoLTQpID09PSAnLmpwZyc7XG4gICAgfSkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKGltYWdlcGFjay5nZXRJbWFnZShuYW1lKSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldEdpZihuYW1lcykge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWpzPVwiZ2lmXCJdJyk7XG4gICAgbmFtZXMuZmlsdGVyKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5hbWUuc2xpY2UoLTQpID09PSAnLmdpZic7XG4gICAgfSkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKGltYWdlcGFjay5nZXRJbWFnZShuYW1lKSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldFdlYnAobmFtZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1qcz1cIndlYnBcIl0nKTtcbiAgICBuYW1lcy5maWx0ZXIoZnVuY3Rpb24obmFtZSkge1xuICAgICAgICByZXR1cm4gbmFtZS5zbGljZSgtNSkgPT09ICcud2VicCc7XG4gICAgfSkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKGltYWdlcGFjay5nZXRJbWFnZShuYW1lKSk7XG4gICAgfSk7XG59XG4iXX0=
