'use strict';

var path = require('path');
var gutil = require('gulp-util');
var through = require('through2-concurrent');
var chalk = require('chalk');
var File = require('vinyl');

var nameLength = 128;
var sizeLength = 4;
var typeLength = 8;

function pack(options) {
    var packname = (options && options.name) || 'pack';
    var verbose = !!(options && options.verbose);
    var validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    var buffers = [];

    return through.obj(function(file, enc, cb) {

        if (file.isNull()) {
            gutil.log(chalk.red('Imagepack --> Skipping null file'));
            cb();
            return;
        }

        if (file.isStream()) {
            cb(new gutil.PluginError('imagepack', 'Streaming not supported'));
            return;
        }

        if (validExtensions.indexOf(path.extname(file.path).toLowerCase()) === -1) {
            gutil.log(chalk.red('Imagepack --> Skipping unsupported file ' + file.relative));
            cb();
            return;
        }

        var filename = path.basename(file.path);
        filename = filename.replace(/[^\x00-\x7F]/g, '');
        var name = new Buffer(nameLength);
        name.fill(0);
        name.write(filename, 0, nameLength, 'utf8');

        var size = new Buffer(sizeLength);
        size.writeUInt32BE(file.contents.length, 0, sizeLength);

        var typename = path.extname(file.path);
        typename = typename.toLowerCase().replace(/\./, '');
        if (typename === 'jpg') {
            typename = 'jpeg';
        }
        var type = new Buffer(typeLength);
        type.fill(0);
        type.write(typename, 0, typeLength, 'utf8');

        buffers.push(name, size, type, file.contents);

        if (verbose) {
            var msg = 'Packed ' + name.toString('utf8', 0, nameLength) +
                ' size: ' + (size.readUInt32BE(0, sizeLength) / 1024).toFixed() + 'kb' +
                ' type: ' + type.toString('utf8', 0, typeLength);
            gutil.log(chalk.green('Imagepack --> ' + msg));
        }

        cb();

    }, function(cb) {

        if (!buffers.length) {
            gutil.log(chalk.red.bold('Imagepack --> Nothing to pack'));
            cb();
            return;
        }

        var pack = new File({
            cwd: '/',
            base: '/',
            path: '/' + packname + '.bin',
            contents: Buffer.concat(buffers)
        });

        this.push(pack);

        var msg = 'Packed ' + path.basename(pack.path) + ' with ' + buffers.length / 4 + ' files. ' +
            'Total size: ' + (pack.contents.length / 1024).toFixed() + 'kb';

        gutil.log(chalk.green.bold('Imagepack -->', msg));

        cb();
    });
}

function unpack(options) {
    var verbose = !!(options && options.verbose);
    var files = [];

    return through.obj(function(file, enc, cb) {

        if (file.isNull()) {
            gutil.log(chalk.red('Imagepack --> Skipping null file'));
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new gutil.PluginError('imagepack', 'Streaming not supported'));
            return;
        }

        gutil.log(chalk.green('Imagepack --> Unpacking ' + path.basename(file.path)));

        var offset = 0;

        while (offset < file.contents.length) {

            var name = file.contents.toString('utf8', offset, offset + nameLength);
            name = name.replace(/\0/g, '');
            offset += nameLength;

            var size = file.contents.readUInt32BE(offset, offset + sizeLength);
            offset += sizeLength;

            var type = file.contents.toString('utf8', offset, offset + typeLength);
            type = type.replace(/\0/g, '');
            offset += typeLength;

            var contents = file.contents.slice(offset, offset + size);
            offset += size;

            if (verbose) {
                var msg = 'Unpacked ' + name +
                    ' size: ' + (size / 1024).toFixed() + 'kb' +
                    ' type: ' + type;
                gutil.log(chalk.green('Imagepack --> ' + msg));
            }

            var img = new File({
                cwd: '/',
                base: '/test/',
                path: '/test/' + name,
                contents: contents
            });

            files.push(img);
        }

        cb(null, files.pop());

    }, function(cb) {

        var total = files.length + 1;

        while (files.length) {
            this.push(files.pop());
        }

        var msg = 'Unpacked ' + total + ' files';

        gutil.log(chalk.green.bold('Imagepack -->', msg));

        cb();
    });
}

module.exports = {
    pack: pack,
    unpack: unpack
};
