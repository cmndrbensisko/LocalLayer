///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
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
  'dojo/_base/html',
  'dojo/_base/declare',
  './ValueProvider'
],
  function(html, declare, ValueProvider) {

    return declare([ValueProvider], {

      templateString: "<div></div>",

      postCreate: function(){
        this.inherited(arguments);
        html.addClass(this.domNode, 'jimu-filter-blank-value-provider');
      },

      getDijits: function(){
        return [];
      },

      getStatus: function(){
        return 1;
      },

      setValueObject: function(){
      },

      getValueObject: function(){
        return {
          "isValid": true,
          "type": this.partObj.valueObj.type,
          "value": null
        };
      },

      isBlankValueProvider: function(){
        return true;
      }

    });
  });