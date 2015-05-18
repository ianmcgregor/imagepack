'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var imagepack = require('imagepack');

gulp.task('bundle', function() {
    return browserify({
            entries: ['example.js'],
            debug: true
        })
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest('./'));
});

gulp.task('pack', function() {
    return gulp.src(['./images/**/*.{gif,jpg,png,webp}'])
        .pipe(imagepack.pack({
            name: 'pack',
            verbose: true
        }))
        .pipe(gulp.dest('./packs'));
});
