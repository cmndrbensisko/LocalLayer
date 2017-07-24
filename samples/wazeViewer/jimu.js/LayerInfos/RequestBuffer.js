
///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred'
], function(declare, lang, Deferred) {
  var clazz = declare(null, {
    _realRequest: null,
    _buffer: null,

    constructor: function(realRequest) {
      this._buffer = {};
      if(realRequest) {
        this._realRequest = realRequest;
      } else {
        this._realRequest = function() {
          return new Deferred();
        };
      }
    },

    getRequest: function(key) {
      if(!this._buffer[key]) {
        this._buffer[key] = new clazz.RequestProxy(this._realRequest, key);
      }
      return this._buffer[key];
    }

    /*
    // responseObj = {
    //   key: response
    // };
    setResponse: function(responseObj) {
      for (var key in responseObj) {
        if(layersVisible.hasOwnProperty(key) &&
           (typeof layersVisible[child] !== 'function')) {
          this.getRequest(key).setResponse(responseObj[key]);
        }
      }
    },
    */


  });

  clazz.RequestProxy = declare(null, {
    _key: null,
    _deferred: null,
    _realRequest: null,
    constructor: function(realRequest, key) {
      this._realRequest = realRequest;
      this._key = key;
    },

    request: function() {
      if(!this._deferred) {
        this._deferred = new Deferred();
        this._realRequest.apply(null, arguments).then(lang.hitch(this, function(response){
          this._deferred.resolve(response);
        }), lang.hitch(this, function(err) {
          if(err) {
            console.warn(err.message || err);
          }
          this._deferred.resolve(null);
          this._deferred = null;
        }));
      }
      return this._deferred;
    },

    fakeRequest: function() {
      if(!this._deferred) {
        this._deferred = new Deferred();
      }
      return this._deferred;
    },

    setResponse: function(response) {
      if(!this._deferred) {
        this._deferred = new Deferred();
      }
      if(response === null || response === undefined ) {
        this._deferred.resolve(null);
        this._deferred = null;
      } else {
        this._deferred.resolve(response);
      }
    },

    isResolved: function() {
      return this._deferred && this._deferred.isResolved();
    }

  });

  return clazz;
});
