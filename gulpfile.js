'use strict';
 
var gulp = require('gulp');
var gulpif = require('gulp-if');
//var runSequence = require('run-sequence');
var del = require('del');
var sass = require('gulp-sass');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var watchify = require('watchify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var critical = require('critical');
var runSequence = require('run-sequence').use(gulp);
var postcss = require('gulp-postcss');
var svgstore = require('gulp-svgstore');
var svgmin = require('gulp-svgmin');
var imagemin = require('gulp-imagemin');
var compress = require('compression');
var fileinclude = require('gulp-file-include');
var cache = require('gulp-cached');

/**
 * Build config
 */
var config = {
    browserslist: [
        'Explorer >= 11',
        'Edge >= 38',
        'Chrome >= 61',
        'Safari >= 10',
        'Firefox >= 55',
        'iOS >= 10',
        'Android >= 4.4'
    ]
};

// Compiles Sass to CSS
gulp.task('sass', function () {
    var plugins = [
        require('autoprefixer')({
            browsers: config.browserslist
        }),
        require('postcss-inline-svg'), // inlines SVG and customizes styles https://github.com/TrySound/postcss-inline-svg
        require('postcss-pxtorem'), // Fenerates rem units from pixel units https://github.com/cuth/postcss-pxtorem
        require('postcss-object-fit-images')
    ];

    return gulp.src('Build/assets/scss/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
        .pipe(postcss(plugins))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('Build/assets/css/'));
});

// Minifies and optimise images
gulp.task('imagemin', function () {
    return gulp.src('Build/assets/img-raw/*')
        .pipe(imagemin([
            imagemin.gifsicle(), 
            imagemin.jpegtran(), 
            imagemin.optipng(),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ]))
        .on('error', gutil.log)
        .pipe(gulp.dest('Build/assets/img'));
});

// SVG symbol generation
gulp.task('svgstore', function () {
    return gulp
        .src('Build/assets/img-raw/*.svg')
        .pipe(svgmin(function (file) {
            return {
                plugins: [{
                    cleanupIDs: {
                        minify: true
                    }
                }]
            }
        }))
        .pipe(svgstore())
        .on('error', gutil.log)  
        .pipe(rename('icon-sprite.svg'))
        .pipe(gulp.dest('Build/assets/img'));
});


// Compiles static templates
gulp.task('fileinclude', function() {
    gulp.src('src/templates/*.html')
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file',
            filters: {
                test: function( includedFileContent, options ){
                    console.log(includedFileContent, arguments);
                    // Where `options` is the { foo: "bar" } object
                    var template = handlebars.compile(content);
                    return template(options);
                }
            }
        }))
        .on('error', gutil.log)
        .pipe(cache('html'))
        .pipe(gulp.dest('Build/production/'));
        //.pipe(browserSync.stream());
});

// Copies thirdparty JS to build dir
/*gulp.task('copy', function () {
    gulp.src([
            'node_modules/chart.js/dist/Chart.min.js'
        ])
        .pipe(gulp.dest('Build/production/js/'));
});*/

// Concatenate & Minify JS - https://travismaynard.com/writing/getting-started-with-gulp
gulp.task('scripts', function() {
    return gulp.src(['Build/assets/js/app/*.js', 'Build/assets/js/libs/*.js'])
        .pipe(concat('production.js'))
        .pipe(gulp.dest('Build/assets/js/build'))
        .pipe(rename('production.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('Build/assets/js/build'));
});
 
// Watch Files For Changes - https://travismaynard.com/writing/getting-started-with-gulp
gulp.task('watch', function() {
    gulp.watch('Build/assets/js/libs/*.js', gulp.series('scripts'));
    gulp.watch('Build/assets/js/app/*.js', gulp.series('scripts'));
    gulp.watch('Build/assets/scss/**/*.scss', gulp.series('sass'));
});


// Critical CSS extraction 
gulp.task('critical-css', function(cb) {
    
    critical.generate({
        base: 'Build/',
        src: 'http://genesis.local/',
        dest: 'assets/css/critical.css',
        width: 320,
        height: 480,
        inline: false
    });

});





// Default task
gulp.task('default', function( callback ){
    runSequence(
        ['sass', 'svgstore', 'imagemin', 'scripts', 'fileinclude', 'watch'], 
        callback
    );
});


// Generate Critical CSS only
gulp.task('critical', function( callback ){
    runSequence(
        ['critical-css'], 
        callback
    );
});