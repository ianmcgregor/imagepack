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
        return Object.keys(images).sort();
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

        return imagepack;
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
