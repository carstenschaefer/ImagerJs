var process = require('process');

module.exports = function (grunt) {
  var libs = [
    'src/libs/**/*.js'
  ];

  var jsSources = [
    'src/Globals.js',

    'src/Modal.js',
    'src/Toolbar.js',

    'src/QualitySelector.js',
    'src/Translations.js',
    'src/ImagerJs.js',
    'src/util/**/*.js',
    'src/plugins/**/*.js'
  ];

  var banner = '/*! <%= pkg.name %> - <%= version %> */\n\n';

  grunt.registerTask('platformOpen', 'Detect OS and run different task based on it', function () {
    if (/win32/.test(process.platform)) {
      grunt.task.run(['open:windows']);
    }
  });

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    version: grunt.file.read('version.txt'),
    'http-server': {
      foreground: {
        root: '',
        port: process.env.PORT || 8082,
        host: "0.0.0.0",
        cache: 0,
        showDir: true,
        autoIndex: true,
        ext: "html",
        runInBackground: false
        // specify a logger function. By default the requests are
        // sent to stdout.
        //logFn: function(req, res, error) { }
      },
      background: {
        root: '',
        port: process.env.PORT || 8082,
        host: "0.0.0.0",
        cache: 0,
        showDir: true,
        autoIndex: true,
        ext: "html",
        runInBackground: true
        // specify a logger function. By default the requests are
        // sent to stdout.
        //logFn: function(req, res, error) { }
      }
    },
    open: {
      windows: {
        path: 'http://localhost:8082/example',
        app: 'Chrome'
      }
    },
    copy: {
      assets: {
        files: [
          {
            expand: true,
            dest: 'dist/assets',
            cwd: 'assets',
            src: [
              '**/*.cur',
              '**/*.png',
              '**/*.jpg',
              '**/*.jpeg',
              '**/*.gif'
            ]
          }
        ]
      }
    },
    concat: {
      options: {
        sourceMap: true,
        stripBanners: true,
        banner: banner
      },
      js_standalone: {
        src: libs.concat(jsSources),
        dest: 'dist/imagerJs.js'
      },
      js_redactor: {
        src: libs.concat(jsSources).concat('src/RedactorPlugin.js'),
        dest: 'dist/imagerJs.redactor.js'
      },
      css: {
        src: [
          'src/**/*.css'
        ],
        dest: 'dist/imagerJs.css'
      }
    },
    jshint: {
      files: jsSources,
      options: {
        '-W069': true,
        '-W054': true,
        globals: {
          jQuery: true
        }
      }
    },
    uglify: {
      prod: {
        options: {
          banner: banner,
          sourceMapIncludeSources: true
        },
        files: {
          'dist/imagerJs.min.js': ['dist/imagerJs.js'],
          'dist/imagerJs.redactor.min.js': ['dist/imagerJs.redactor.js']
        }
      }
    },
    cssmin: {
      prod: {
        options: {
          banner: banner,
          sourceMapIncludeSources: true
        },
        files: {
          'dist/imagerJs.min.css': ['dist/imagerJs.css']
        }
      }
    },
    jsdoc: {
      dist: {
        src: 'src/**/*.js',
        options: {
          destination: 'dist/docs',
          readme: 'README.md',
          package: 'package.json',
          private: false
        }
      }
    },
    watch: {
      files: jsSources.concat(['src/**/*.css']),
      tasks: [
        'jshint',
        'concat',
        'jsdoc'
      ],
      options: {
        interrupt: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-http-server');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-jsdoc');

  grunt.registerTask('server', [
    'http-server:foreground',
    'platformOpen'
  ]);

  grunt.registerTask('build', [
    'http-server:background',
    'copy',
    'jshint',
    'concat',
    'uglify',
    'cssmin',
    'open',
    'jsdoc',
    'platformOpen'
  ]);

  grunt.registerTask('build-prod', [
    'copy',
    'jshint',
    'concat',
    'jsdoc',
    'uglify'
  ]);

  grunt.registerTask('default', [
    'build',
    'watch'
  ]);
};