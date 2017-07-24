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
  'dojo/Evented',
  'dojo/on',
  'dojo/_base/lang',
  'dojo/_base/html',
  'jimu/dijit/Popup',
  'jimu/dijit/DataSource',
  'jimu/dijit/LoadingIndicator',
  'esri/request'
],
function(declare, Evented, on, lang, html, Popup, DataSource, LoadingIndicator, esriRequest) {

  return declare([Popup, Evented], {
    width: 830,
    height: 560,
    titleLabel: window.jimuNls.frameworkDatasource.setDataSource,

    dijitArgs: null,//refer to the parameters of dijit DataSource

    //events:
    //ok return {name,url,definition}
    //cancel

    postCreate: function(){
      this.inherited(arguments);
      html.addClass(this.domNode, 'jimu-dijit-data-source-popup');
      this._initFls();
      this._initLoading();
    },

    _initFls: function(){
      this.sourceDijit = new DataSource(this.dijitArgs);
      this.sourceDijit.placeAt(this.contentContainerNode);
      this.sourceDijit.startup();

      this.own(on(this.sourceDijit, 'ok', lang.hitch(this, function(items){
        if(items.length === 0){
          return;
        }
        var item = items[0];
        if(item.definition){
          try{
            item.definition.name = item.name;
            item.definition.url = item.url;
            this.emit('ok', item);
          }catch(e){
            console.error(e);
          }
        }else if(item.url){
          this.loading.show();
          esriRequest({
            url: item.url,
            content: {f:'json'},
            handleAs: 'json',
            callbackParamName: 'callback'
          }).then(lang.hitch(this, function(response){
            if(!this.domNode){
              return;
            }
            this.loading.hide();
            item.definition = response;
            try{
              item.definition.name = item.name;
              item.definition.url = item.url;
              this.emit('ok', item);
            }catch(e){
              console.error(e);
            }
          }), lang.hitch(this, function(err){
            console.error(err);
            if(!this.domNode){
              return;
            }
            this.loading.hide();
          }));
        }else{
          this.emit('ok', item);
        }
      })));

      this.own(on(this.sourceDijit, 'cancel', lang.hitch(this, function(){
        try{
          this.emit('cancel');
        }catch(e){
          console.error(e);
        }
      })));
    },

    _initLoading: function(){
      this.loading = new LoadingIndicator({
        hidden: true
      });
      this.loading.placeAt(this.domNode);
      this.loading.startup();
    }

  });
});