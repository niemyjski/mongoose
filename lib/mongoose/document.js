
/**
 * Module requirements.
 *
 */

var EventEmitter = require('events').EventEmitter
  , MongooseError = require('./error')
  , Schema = require('./schema')
  , DocumentArraySchema = require('./schema/documentarray');

/**
 * Document constructor.
 *
 * @param {Object} document straight from the database
 * @api private
 */

function Document (obj) {
  if (obj) this.init(obj);
  this.pres = {};
  this.hydratedPaths = {};
  this.dirtyPaths = {};
  this.registerHooks();
  this.doQueue();
  this.saveError = null;
};

/**
 * Inherit from EventEmitter.
 *
 */

Document.prototype.__proto__ = EventEmitter.prototype;

/**
 * Base Mongoose instance for the model. Set by the Mongoose instance upon
 * pre-compilation.
 *
 * @api public
 */

Document.prototype.base;

/**
 * Document schema as a nested structure.
 *
 * @api public
 */

Document.prototype.schema;

/**
 * Inits the document.
 *
 * @param {Object} document returned by mongo
 */

Document.prototype.init = function (doc) {
  this.isNew = false;
  for (var i = 0, k = Object.keys(doc), l = k.length; i < l; i++){
    this.set(i, doc[i], false, true);
  }
};

/**
 * Registers a middleware that is executed before a method.
 *
 * @param {String} method name
 * @param {Function} callback
 * @api public
 */

Document.prototype.pre = function (method, fn) {
  if (!(method in this.pres))
    this.pres[method] = {
        serial: []
      , parallel: []
    };
  this.pres[method][fn.length == 1 ? 'serial' : 'parallel'].push(fn);
  return this;
};

/**
 * Sets a path
 *
 * @param {String} key path
 * @param {Object} value
 * @param {Boolean} whether to apply transformations: cast, setters (true) 
 * @param {Boolean} whether to mark dirty (true)
 * @param {Boolean} whether this is an initialization
 * @api public
 */

Document.prototype.set = function (key, val, transform, dirty, isInit) {
  if (this.schema.isEmbeddedDocumentArray(key)){
    if (typeof val != 'object'){
      
    }
  }
  
  // when applying a cast, try/catch
  // and pass an error to save
};

/**
 * Gets a path
 *
 * @param {String} key path
 * @api public
 */

Document.prototype.get = function (key) {
  
};

/**
 * Gets the set value of a path 
 *
 * @param {String} key path
 * @param {Object} object to set
 * @return {Object} object with setters and caster applied
 * @api private
 */

Document.prototype.setValue = function (key, val) {
  
};

/**
 * Gets the get value of a path 
 *
 * @param {String} key path
 * @param {Object} object to set
 * @return {Object} object with setters and caster applied
 * @api private
 */

Document.prototype.getValue = function (key, val) {
  
};

/**
 * Returns the casted value for the path
 *
 * @param {String} key payh
 * @param {Object} value
 * @return {Object} cast value
 * @api private
 */

Document.prototype.castValue = function (key, val) {
  // find SchemaType, call .cast()
};

/**
 * Apply defaults middleware
 *
 * @param {Function} next
 * @api private
 */

Document.prototype.applyDefaults = function (next) {
  if (this.isNew){
    var total = 0
      , self = this;

    for (var i in this.hydratedPaths){
      if (!(i in this.dirtyPaths)){
        if (this.schema.get(i) instanceof DocumentArraySchema){
          total++;
          (function(i){
            process.nextTick(function () {
              self.get(i).applyDefaults(function () {
                --total || next();
              });
            });
          })(i);
        } else {
          var def = this.schema.get(i)._default;
          if (typeof def == 'function') {
            if (def.length > 0){
              total++;
              process.nextTick(function () {
                def.call(this, function () {
                  --total || next();
                });
              });
            } else {
              this.set(i, this.schema.get(i)._default(), true, false);
            }
          } else {
            this.set(i, this.schema.get(i)._default, true, false);
          }
        }
      }
    }
  } else {
    next();
  }
};

/**
 * Validation middleware
 *
 * @param {Function} next
 * @api private
 */

Document.prototype.validate = function (next) {
  var total = 0
    , paths = Object.keys(this.hydratedPaths)
    , self = this;

  if (paths.length){

  } else {
    next();
  }

  for (var i in this.hydratedPaths){
    if (this.schema.get(i) instanceof SubdocsArrayType){
      total++;
      (function(i){
        process.nextTick(function(){
          self.get(i).validate(function(err){
            if (err){
              next(err);
            }
          });
        });
      })(i);
    } else {
      
    }
  }
};

/**
 * Returns if the document has been modified
 *
 * @return {Boolean}
 * @api public
 */

Document.prototype.__defineGetter__('modified', function () {
  return this.isNew && Object.keys(this.dirtyPaths).length;
});

/**
 * Register default hooks
 *
 * @api private
 */

Document.prototype.registerHooks = function () {
  var self = this;

  // check for existing errors
  this.pre('save', function (next) {
    if (self.saveError){
      next(self.saveError);
      self.saveError = null;
    } else {
      next();
    }
  });

  // apply defaults
  this.pre('save', this.applyDefaults.bind(this));

  // validation
  this.pre('save', this.validate.bind(this));
};


/**
 * Validates a path
 *
 * @param {String} path
 * @param {Object} value
 * @param {Function} callback
 * @api private
 */

Document.prototype.validatePath = function(path, value, fn){
  var validators = this.schema.paths[path]._validators
    , interrupt = false
    , passed = validators.length;

  for (var i = 0, val, l = passed; i < l; i++){
    val = validators[i][0];

    if (typeof val == 'function'){
      val.call(this, val, function(err){
        if (!arguments.callee._called && !interrupt){
          if (typeof err == 'string'){
            fn(new ValidatorError(err));
            interrupt = true;
          } else {
            --passed || fn(true);
          }
          arguments.callee._called = true;
        }
      });
    } else if (val instanceof RegExp){
      if (val.test(value))
        --passed || fn(true);
      else {
        interrupt = true;
        fn(new ValidatorError(validators[i][1]));
      }
    }
  }
};

/**
 * Executes methods queued from the Schema definition
 *
 * @api private
 */

Document.prototype.doQueue = function () {
  if ('queue' in this && this.queue.length)
    for (var i = 0, l = this.queue.length; i < l; i++)
      this[this.queue[i][0]].apply(this, this.queue[i][1]);
};

/**
 * Wrap methods for hooks. Should be called on implemented classes (eg: Model)
 * Takes multiple method names as arguments.
 *
 * @api private
 */

Document.registerHooks = function () {
  for (var i = 0, l = arguments.length; i < l; i++){
    var method = arguments[i]
      , oldFn = this.prototype[method];

    this.prototype[method] = function () {
      var self = this
        , args = arguments;

      function error(){
        if (typeof args[0] == 'function')
          args[0].call(self, err);
      };

      if (method in this.pres){
        var pres = this.pres[method]
          , chain = [];

        if (pres.serial.length){
          pres.serial.forEach(function (fn, i) {
            chain.push(function (err) {
              err ? error() : fn.call(self, chain[i + 1] || parallel);
            });
          });

          chain[0]();
        } else {
          return parallel();
        }

        function parallel () {
          // chain determines execution, callbacks completeness
          var complete = pres.parallel.length;
          if (complete){
            var chain = [];
            
            function done () {
              --complete || oldFn.apply(self, args);
            };

            pres.parallel.forEach(function (fn) {
              chain.push(function (err) {
                err ? error() : fn.call(self, chain[i + 1], done);
              });
            });

            chain[0]();
          } else {
            return oldFn.apply(self, args);
          }
        };
      } else {
        return oldFn.apply(this, arguments);
      }
    };
  }
};

/**
 * Module exports.
 */

module.exports = Document;

/**
 * Document Error
 *
 * @param text
 */

function DocumentError () {
  MongooseError.call(this, msg);
  MongooseError.captureStackTrace(this, arguments.callee);
  this.name = 'DocumentError';
};

/**
 * Inherits from MongooseError.
 */

DocumentError.prototype.__proto__ = MongooseError.prototype;

exports.Error = DocumentError;