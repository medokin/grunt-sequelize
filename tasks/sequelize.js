/*
 * grunt-sequelize
 * https://github.com/webcast-io/grunt-sequelize
 *
 * Copyright (c) 2013 Ben Evans
 * Licensed under the MIT license.
 */

'use strict';

var Sequelize = require('sequelize');
var _         = Sequelize.Utils._;

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerTask('sequelize', 'Sequelize migrations from Grunt', function(cmd, arg1) {
    var done;

    var options = this.options({
      environment: process.env.NODE_ENV || 'development',
      // As a default value, assume __dirname is `/<some path>/node_modules/grunt-sequelize/tasks`
      migrationsPath: __dirname + '/../../../migrations',
      logging: false
    });
  
    var sequelize       = new Sequelize(options.database, options.username, options.password, options);
    var migratorOptions = { path: options.migrationsPath };
    var migrator        = sequelize.getMigrator(migratorOptions);

    function getCurrentMigrationId(callback) {
      var migrationVersionEmitter = sequelize.migrator.getLastMigrationIdFromDatabase();
      migrationVersionEmitter.on('success', function(serverMigrationId) {
        callback(null, serverMigrationId);
      });
      migrationVersionEmitter.on('error', function(error) {
        callback(error);
      });
    }

    if(cmd === 'migrate') {
      done = this.async();

      getCurrentMigrationId(function(err, serverMigrationId) {

        if(serverMigrationId === arg1) {
          console.log('There are no pending migrations.');
          return done();
        }

        if(arg1) {
          migratorOptions.to = arg1;
          migratorOptions.from = serverMigrationId;
          migratorOptions.method = (parseInt(migratorOptions.to, 10) >= parseInt(migratorOptions.from, 10)) ? 'up' : 'down';
          migrator        = sequelize.getMigrator(migratorOptions);
        }

        sequelize.migrate(migratorOptions).done(done);

      });

    } else if(cmd === 'undo') {
      done = this.async();

      migrator.findOrCreateSequelizeMetaDAO().success(function(Meta) {
        Meta.find({ order: 'id DESC' }).success(function(meta) {
          if (meta) {
            migrator = sequelize.getMigrator(_.extend(migratorOptions, meta.values), true);
            migrator.migrate({ method: 'down' }).success(function() {
              done();
            });
          } else {
            console.log('There are no pending migrations.');
            done();
          }
        });
      });

    } else if(cmd === 'current') {
      done = this.async();

      getCurrentMigrationId(function(err, serverMigrationId) {
        if(err) {
          return done(err);
        }
        grunt.log.write('Current Migration: ', serverMigrationId);
        done();
      });

    } else {
      throw new Error('Unknown grunt-sequelize command: ' + cmd);
    }

  });

};
