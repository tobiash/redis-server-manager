module.exports = function (grunt) {

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
  });

  grunt.registerTask('doc', 'Generate documentation', function () {
    var done = this.async();
    grunt.log.writeln('Generating Documentation');
    require('child_process')
      .spawn('./node_modules/.bin/groc', ['index.js', 'lib/*.js', 'README.md'])
      .on('exit', function () {
        grunt.log.writeln('...done!');
        done();
      });
  });

};
