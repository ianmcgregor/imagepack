'use strict';

var assert = require('assert');
var fs = require('fs');
var gutil = require('gulp-util');
var path = require('path');
var imagepack = require('./index.js');

describe('packer', function() {

  it('should pack jpg', function (cb) {
  	var stream = imagepack.pack({
      verbose: true
    });

  	stream.once('data', function (file) {
      assert(file.contents.length > 0);
  	});

  	stream.on('end', cb);

  	stream.write(new gutil.File({
  		path: __dirname + '/example/images/graff.jpg',
		  contents: fs.readFileSync('example/images/graff.jpg')
  	}));

  	stream.end();
  });

  it('should pack png', function (cb) {
  	var stream = imagepack.pack({
      verbose: true
    });

  	stream.once('data', function (file) {
      assert(file.contents.length > 0);
  	});

  	stream.on('end', cb);

  	stream.write(new gutil.File({
  		path: __dirname + '/example/images/loader_b0001.png',
		  contents: fs.readFileSync('example/images/loader_b0001.png')
  	}));

  	stream.end();
  });

  it('should name pack', function (cb) {
  	var stream = imagepack.pack({
      verbose: true,
      name: 'testpack'
    });

  	stream.once('data', function (file) {
      assert.strictEqual(path.basename(file.path), 'testpack.bin');
  	});

  	stream.on('end', cb);

  	stream.write(new gutil.File({
  		path: __dirname + '/example/images/graff.jpg',
		  contents: fs.readFileSync('example/images/graff.jpg')
  	}));

  	stream.end();
  });

  it('should unpack', function (cb) {
  	var stream = imagepack.pack({
      verbose: true,
      name: 'testpack'
    });

  	stream.once('data', function (file) {
      var unpackStream = imagepack.unpack({
        verbose: true
      });

      unpackStream.once('data', function (file) {
        assert.strictEqual(path.basename(file.path), 'graff.jpg');
      });

      unpackStream.on('end', cb);

      unpackStream.write(file);

      unpackStream.end();
  	});

  	stream.write(new gutil.File({
  		path: __dirname + '/example/images/graff.jpg',
		  contents: fs.readFileSync('example/images/graff.jpg')
  	}));

  	stream.end();
  });

  it('should skip unsupported files', function (cb) {
  	var stream = imagepack.pack();

  	stream.once('data', function (file) {
      assert.strictEqual(file.contents, null);
  	});

  	stream.on('end', cb);

  	stream.write(new gutil.File({
  		path: __dirname + '/README.md'
  	}));

  	stream.end();
  });

});
