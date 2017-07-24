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
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/on',
  'dojo/Evented',
  'jimu/dijit/QueryableLayerChooserFromMap'
],
function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, lang, html, on, Evented,
  QueryableLayerChooserFromMap) {

  //define private dijit QueryableLayerChooserWithButtons
  var baseClassArr = [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented];

  var QueryableLayerChooserWithButtons = declare(baseClassArr, {
    baseClass: 'jimu-layer-chooser-with-buttons jimu-queryable-layer-chooser-with-buttons',
    declaredClass: 'jimu.dijit.QueryableLayerChooserWithButtons',
    templateString: '<div>' +
      '<div class="chooser-container" data-dojo-attach-point="chooserContainer"></div>' +
      '<div class="footer">' +
        '<div class="jimu-btn jimu-float-trailing cancel jimu-btn-vacation" data-dojo-attach-point="btnCancel">' +
          '${nls.cancel}' +
        '</div>' +
        '<div class="jimu-btn jimu-float-trailing ok jimu-trailing-margin1 jimu-state-disabled"' +
        ' data-dojo-attach-point="btnOk">' +
          '${nls.ok}' +
        '</div>' +
      '</div>' +
    '</div>',

    //events:
    //ok
    //cancel

    //public methods:
    //getSelectedItems

    constructor: function(options){
      this.options = options;
    },

    postMixInProperties: function(){
      this.nls = lang.clone(window.jimuNls.common);
    },

    postCreate: function(){
      this.inherited(arguments);
      this.queryableLayerChooserFromMap = new QueryableLayerChooserFromMap(this.options);
      this.queryableLayerChooserFromMap.placeAt(this.chooserContainer);
      html.setStyle(this.queryableLayerChooserFromMap.domNode, {
        width: '100%',
        height: '100%'
      });

      this.own(on(this.queryableLayerChooserFromMap, 'tree-click', lang.hitch(this, function(){
        var items = this.getSelectedItems();
        if(items.length > 0){
          html.removeClass(this.btnOk, 'jimu-state-disabled');
        }
        else{
          html.addClass(this.btnOk, 'jimu-state-disabled');
        }
      })));

      this.own(on(this.btnOk, 'click', lang.hitch(this, function(){
        var items = this.getSelectedItems();
        if(items.length > 0){
          this.emit('ok', items);
        }
      })));

      this.own(on(this.btnCancel, 'click', lang.hitch(this, function(){
        this.emit('cancel');
      })));
    },

    getSelectedItems: function(){
      return this.queryableLayerChooserFromMap.getSelectedItems();
    },

    startup: function(){
      this.inherited(arguments);
      this.queryableLayerChooserFromMap.startup();
    }
  });

  return QueryableLayerChooserWithButtons;
});