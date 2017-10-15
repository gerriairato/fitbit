var gulp = require('gulp');
var mocha = require('gulp-mocha');

var mochaConfig = {
    timeout: 30000
};

gulp.task("test_users", function() {
    return gulp.src([
        'test/*.js'
    ]).pipe(mocha(mochaConfig));
});
