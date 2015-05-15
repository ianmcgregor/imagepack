'use strict';

var gulp = require('gulp');
var imagepack = require('./');

var filename = 'test';

gulp.task('pack', function() {
  // return gulp.src(['./images/**/*.{gif,jpg,png,webp}'])
  return gulp.src(['./images/**/*'])
    .pipe(imagepack.pack({
      name: filename,
      verbose: true
    }))
    .pipe(gulp.dest('./packed'));
});

gulp.task('unpack', function() {
  return gulp.src(['./packed/' + filename + '.bin'])
    .pipe(imagepack.unpack({
      verbose: true
    }))
    .pipe(gulp.dest('./unpacked'));
});

gulp.task('bundle', function() {
    var browserify = require('browserify');
    var gulp = require('gulp');
    var source = require('vinyl-source-stream');
    var buffer = require('vinyl-buffer');
    var uglify = require('gulp-uglify');
    var rename = require('gulp-rename');
    var gutil = require('gulp-util');

    return browserify({
        entries: './src/imagepack.js',
        standalone: 'Imagepack',
        debug: true
    })
    .bundle()
    .on('error', gutil.log)
    .pipe(source('imagepack.js'))
    .pipe(buffer())
    .pipe(gulp.dest('./dist/'))
    .pipe(uglify())
    .pipe(rename({extname: '.min.js'}))
    .pipe(gulp.dest('./dist/'));
});
