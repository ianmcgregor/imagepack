# imagepack

[![NPM version](https://badge.fury.io/js/imagepack.svg)](http://badge.fury.io/js/imagepack) [![Bower version](https://badge.fury.io/bo/imagepack.svg)](http://badge.fury.io/bo/imagepack) [![Build Status](https://secure.travis-ci.org/ianmcgregor/imagepack.png)](https://travis-ci.org/ianmcgregor/imagepack)

Pack multiple images into one binary file to minimise http requests. Supports modern browsers (IE 10+). Inspired by [Magipack](https://github.com/keitakun/Magipack.js).

<http://ianmcgregor.github.io/imagepack/example/>

## Installation

* npm: ```npm install imagepack --save-dev```
* bower: ```bower install imagepack --save-dev```

## Usage

### Packing images

```javascript
var gulp = require('gulp');
var imagepack = require('imagepack');

gulp.task('pack', function() {
  return gulp.src(['./images/**/*.{gif,jpg,png,webp}'])
    .pipe(imagepack.pack({
      name: 'images',
      verbose: true
    }))
    .pipe(gulp.dest('./packed'));
});

// you can also unpack the imagepack files to a directory:
gulp.task('unpack', function() {
  return gulp.src(['./packed/images.bin'])
    .pipe(imagepack.unpack({
      verbose: true
    }))
    .pipe(gulp.dest('./unpacked'));
});
```

### Unpacking images in the browser

```javascript
var Imagepack = require('imagepack');

var imagepack = new Imagepack({
    verbose: true
  })
  .on('error', function(error) {
    console.error(error);
  })
  .on('progress', function(progress) {
    console.log(progress);
  })
  .once('complete', function(keys) {
    animate(keys);
    display(keys);
  })
  .load('../packed/test.bin');

// call getImage to get an HTMLImageElement from the pack
function display(keys) {
    // add all the images to the page:
    keys.forEach(function(name) {
      document.body.appendChild(imagepack.getImage(name));
    });
}

// call getURI to get a Blob URI from the pack
function animate(sequence) {
    // display the images in an animationFrame loop:
    var img = new Image();
    document.body.appendChild(img);
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

```

## Dev setup

To install dependencies:

```
$ npm install
```

To run tests:

```
$ npm install -g karma-cli
$ karma start
```
