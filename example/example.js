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
