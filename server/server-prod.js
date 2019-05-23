require('dotenv').config();

const _ = require('lodash');
const Rx = require('rx');
const loopback = require('loopback');
const boot = require('loopback-boot');
const expressState = require('express-state');
const path = require('path');
const createDebugger = require('debug');

const log = createDebugger('consultorios:server');
// force logger to always output
// this may be brittle
log.enabled = true;

Rx.config.longStackSupport = process.env.NODE_DEBUG !== 'production';
const app = loopback();
const isBeta = !!process.env.BETA;

expressState.extend(app);
app.set('state namespace', '__consultorios__');
app.set('port', process.env.PORT || 3000);
app.use(loopback.token());
app.disable('x-powered-by');

boot(app, {
  appRootDir: __dirname,
  dev: process.env.NODE_ENV
});

const { db } = app.datasources;
db.on('connected', _.once(() => log('db connected')));
app.start = _.once(function() {
  const server = app.listen(app.get('port'), function() {
    app.emit('started');
    log(
      'freeCodeCamp server listening on port %d in %s',
      app.get('port'),
      app.get('env')
    );
    if (isBeta) {
      log('freeCodeCamp is in beta mode');
    }
    log(`connecting to db at ${db.settings.url}`);
  });

  process.on('SIGINT', () => {
    log('Shutting down server');
    server.close(() => {
      log('Server is closed');
    });
    log('closing db connection');
    db.disconnect()
      .then(() => {
        log('DB connection closed');
        // exit process
        // this may close kept alive sockets
        // eslint-disable-next-line no-process-exit
        process.exit(0);
      });
  });
});

module.exports = app;

// start the server if `$ node server.js`
// in production use `$npm start-production`
// or `$node server/production` to start the server
// and wait for DB handshake
if (require.main === module) {
  app.start();
}