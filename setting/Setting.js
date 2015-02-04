///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/SimpleTable',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/on',
    'dojo/_base/lang',
    'dojo/_base/query',
    'dojo/_base/array',
    'dojo/_base/html',
    'jimu/dijit/Message',
    'jimu/dijit/Popup',
    'dijit/form/Select',
    './DynamicLayerEdit',
    './TiledLayerEdit',
    './FeatureLayerEdit',
    './BasemapEdit',
    './ReverseProxyEdit',
    'dojo/keys'
  ],
  function(
    declare,
    BaseWidgetSetting,
    SimpleTable,
    _WidgetsInTemplateMixin,
    on,
    lang,
    query,
    array,
    html,
    Message,
    Popup,
    Select,
    DynamicLayerEdit,
    TiledLayerEdit,
    FeatureLayerEdit,
    BasemapEdit,
    ReverseProxyEdit,
    keys) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-local-layer-setting',
      popupdynlyredit: null,
      popupfeatlyredit: null,
      popuptiledlyredit: null,
      popupbmedit: null,
      reverseproxyedit: null,
      popup: null,
      popupState: '', // ADD or EDIT

      startup: function() {
        this.inherited(arguments);
        this._bindEvents();
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        this.config = config;
        this._initLayersTable();
      },

      _removeAllLayersExceptBasemap: function(){
        for(var l = this.map.layerIds.length - 1; l>1; l--){
          var lyr = this.map.getLayer(this.map.layerIds[l]);
          if(lyr){
            this.map.removeLayer(lyr);
          }
        }
        var f = this.map.graphicsLayerIds.length;
        while (f--){
          var fl = this.map.getLayer(this.map.graphicsLayerIds[f]);
            if(fl.declaredClass === 'esri.layers.FeatureLayer'){
            this.map.removeLayer(fl);
          }
        }
      },

      getConfig: function() {
        this.config.layers.layer =  this._getAllLayers();
        this._removeAllLayersExceptBasemap();
        console.info(this.config);
        return this.config;
      },

      _initLayersTable: function() {
        this.LayersTable.clear();
        var layers = this.config && this.config.layers.layer;
        array.forEach(layers, lang.hitch(this, function(layerConfig, index) {
          var args = {
            config: layerConfig,
            layerindex: index
          };
          this._createLayer(args);
        }));
      },

      _createLayer: function(args) {
        args.searchSetting = this;
        args.nls = this.nls;
        var rowData = {
          name: (args.config && args.config.name) || '',
          type: this.getNLSLayerType(args.config.type.toUpperCase())
        };

        var result = this.LayersTable.addRow(rowData);
        if(!result.success){
          return null;
        }
        result.tr.singleLayer = args.config;
        return result.tr;
      },

      _getAllLayers: function () {
        var trs = this.LayersTable._getNotEmptyRows();
        var allLayers = array.map(trs, lang.hitch(this, function (item) {
          return item.singleLayer;
        }));
        return allLayers;
      },

      getNLSLayerType: function(type) {
        if(type === 'DYNAMIC'){
          return this.nls.dynamiclayer;
        }else if(type === 'TILED'){
          return this.nls.tiledlayer;
        }else if(type === 'FEATURE'){
          return this.nls.featurelayer;
        }else if(type === 'BASEMAP'){
          return this.nls.basemaplayer;
        }
      },

      _bindEvents: function() {
        this.own(on(this.btnEditRevProxy,'click',lang.hitch(this,function(){
          var args = {
            config:{
              useProxy: this.config.useProxy,
              proxyPrefix: this.config.proxyPrefix,
              proxyAddress: this.config.proxyAddress
            }
          };
          this.popupState = 'EDIT';
          this._openRevProxyEdit(this.nls.reverseproxysettings, args);
        })));
        this.own(on(this.LayersTable,'actions-edit',lang.hitch(this,function(tr){
          var editLayer = tr.singleLayer;
          this.popupState = 'EDIT';
          if(editLayer.type.toUpperCase() === 'DYNAMIC'){
            this._openDLEdit(this.nls.editdynamiclayer + ': ' + editLayer.name , tr);
          }else if(editLayer.type.toUpperCase() === 'TILED'){
            this._openTLEdit(this.nls.edittiledlayer + ': ' + editLayer.name , tr);
          }else if(editLayer.type.toUpperCase() === 'FEATURE'){
            this._openFLEdit(this.nls.editfeaturelayer + ': ' + editLayer.name , tr);
          }else if(editLayer.type.toUpperCase() === 'BASEMAP'){
            this._openBEdit(this.nls.editbasemap + ': ' + editLayer.name , tr);
          }
        })));
        this.own(on(this.LayersTable,'row-delete',lang.hitch(this,function(tr){
          delete tr.singleLayer;
        })));
        this.own(on(this.btnAddDynLayer,'click',lang.hitch(this,function(){
          var args = {
            config:{type:'Dynamic'}
          };
          this.popupState = 'ADD';
          var tr = this._createLayer(args);
          if (tr) {
            this._openDLEdit(this.nls.adddynamiclayer, tr);
          }
        })));
        this.own(on(this.btnAddTiledLayer,'click',lang.hitch(this,function(){
          var args = {
            config:{type:'Tiled'}
          };
          this.popupState = 'ADD';
          var tr = this._createLayer(args);
          if (tr) {
            this._openTLEdit(this.nls.addtiledlayer, tr);
          }
        })));
        this.own(on(this.btnAddFeatLayer,'click',lang.hitch(this,function(){
          var args = {
             config:{type:'Feature'}
          };
          this.popupState = 'ADD';
          var tr = this._createLayer(args);
          if (tr) {
            this._openFLEdit(this.nls.addfeaturelayer, tr);
          }
        })));
        this.own(on(this.btnAddBMLayer,'click',lang.hitch(this,function(){
          var args = {
             config:{type:'Basemap'}
          };
          this.popupState = 'ADD';
          var tr = this._createLayer(args);
          if (tr) {
            this._openBEdit(this.nls.addbasemap, tr);
          }
        })));
      },

      _onDLEditOk: function() {
        var layerConfig = this.popupdynlyredit.getConfig();

        if (layerConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        if(this.popupState === 'ADD'){
          this.LayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].name
          });
          layerConfig[1].singleLayer = layerConfig[0];
          this.popupState = '';
        }else{
          this.LayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].name
          });
          layerConfig[1].singleLayer = layerConfig[0];
        }
        this.popup.close();
        this.popupState = '';
      },

      _onDLEditClose: function() {
        var layerConfig = this.popupdynlyredit.getConfig();
        if(this.popupState === 'ADD'){
          this.LayersTable.deleteRow(layerConfig[1]);
        }
        this.popupdynlyredit = null;
        this.popup = null;
      },

      _openDLEdit: function(title, tr) {
        this.popupdynlyredit = new DynamicLayerEdit({
          nls: this.nls,
          config: tr.singleLayer || {},
          tr: tr
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: false,
          content: this.popupdynlyredit,
          container: 'main-page',
          width: 840,
          height: 420,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onDLEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onDLEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popupdynlyredit.startup();
      },

      _onTLEditOk: function() {
        var layerConfig = this.popuptiledlyredit.getConfig();

        if (layerConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        if(this.popupState === 'ADD'){
          this.LayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].name
          });
          layerConfig[1].singleLayer = layerConfig[0];
          this.popupState = '';
        }else{
          this.LayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].name
          });
          layerConfig[1].singleLayer = layerConfig[0];
        }
        this.popup.close();
        this.popupState = '';
      },

      _onTLEditClose: function() {
        var layerConfig = this.popuptiledlyredit.getConfig();
        if(this.popupState === 'ADD'){
          this.LayersTable.deleteRow(layerConfig[1]);
        }
        this.popuptiledlyredit = null;
        this.popup = null;
      },

      _openTLEdit: function(title, tr) {
        this.popuptiledlyredit = new TiledLayerEdit({
          nls: this.nls,
          config: tr.singleLayer || {},
          tr: tr
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: false,
          content: this.popuptiledlyredit,
          container: 'main-page',
          width: 840,
          height: 420,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onTLEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onTLEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popuptiledlyredit.startup();
      },

      _onFLEditOk: function() {
        var layerConfig = this.popupfeatlyredit.getConfig();

        if (layerConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        if(this.popupState === 'ADD'){
          this.LayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].name
          });
          layerConfig[1].singleLayer = layerConfig[0];
          this.popupState = '';
        }else{
          this.LayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].name
          });
          layerConfig[1].singleLayer = layerConfig[0];
        }

        this.popup.close();
        this.popupState = '';
      },

      _onFLEditClose: function() {
        var layerConfig = this.popupfeatlyredit.getConfig();
        if(this.popupState === 'ADD'){
          this.LayersTable.deleteRow(layerConfig[1]);
        }
        this.popupfeatlyredit = null;
        this.popup = null;
      },

      _openFLEdit: function(title, tr) {
        this.popupfeatlyredit = new FeatureLayerEdit({
          nls: this.nls,
          config: tr.singleLayer || {},
          tr: tr
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.popupfeatlyredit,
          container: 'main-page',
          width: 840,
          height: 350,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onFLEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onFLEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popupfeatlyredit.startup();
      },

      _onBEditOk: function() {
        var layerConfig = this.popupbmedit.getConfig();
        console.info(layerConfig);

        if (layerConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        if(this.popupState === 'ADD'){
          this.LayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].name
          });
          layerConfig[1].singleLayer = layerConfig[0];
          this.popupState = '';
        }else{
          this.LayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].name
          });
          layerConfig[1].singleLayer = layerConfig[0];
        }

        this.popup.close();
        this.popupState = '';
      },

      _onBEditClose: function() {
        var layerConfig = this.popupbmedit.getConfig();
        if(this.popupState === 'ADD'){
          this.LayersTable.deleteRow(layerConfig[1]);
        }
        this.popupbmedit = null;
        this.popup = null;
      },

      _openBEdit: function(title, tr) {
        this.popupbmedit = new BasemapEdit({
          nls: this.nls,
          config: tr.singleLayer || {},
          tr: tr,
          map: this.map
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.popupbmedit,
          container: 'main-page',
          width: 840,
          height: 420,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onBEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onBEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popupbmedit.startup();
      },

      _onRevProxyEditOk: function() {
        var rpConfig = this.reverseproxyedit.getConfig();
        if(rpConfig.useProxy){
          this.config.useProxy = rpConfig.useProxy;
          this.config.proxyPrefix = rpConfig.proxyPrefix;
          this.config.proxyAddress = rpConfig.proxyAddress;
        }else{
          delete this.config.useProxy;
          delete this.config.proxyPrefix;
          delete this.config.proxyAddress;
        }
        this.popup.close();
        this.popupState = '';
      },

      _onRevProxyEditClose: function() {
        this.reverseproxyedit = null;
        this.popup = null;
      },

      _openRevProxyEdit: function(title, args) {
        this.reverseproxyedit = new ReverseProxyEdit({
          nls: this.nls,
          config: args.config
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.reverseproxyedit,
          container: 'main-page',
          width: 620,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onRevProxyEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onRevProxyEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.reverseproxyedit.startup();
      }
    });
  });
