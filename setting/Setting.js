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
    'dojo/aspect',
    'jimu/dijit/Message',
    'jimu/dijit/Popup',
    'dijit/form/Select',
    'jimu/LayerInfos/LayerInfos',
    './DynamicLayerEdit',
    './TiledLayerEdit',
    './FeatureLayerEdit',
    './BasemapEdit',
    './geoJSONEdit',
    './WebTiledLayerEdit',
    './ImageLayerEdit',
    './WMSLayerEdit',
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
    aspect,
    Message,
    Popup,
    Select,
    LayerInfos,
    DynamicLayerEdit,
    TiledLayerEdit,
    FeatureLayerEdit,
    BasemapEdit,
    GeoJsonEdit,
    WebTiledLayerEdit,
    ImageLayerEdit,
    WMSLayerEdit,
    ReverseProxyEdit,
    keys) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-local-layer-setting',
      popupdynlyredit: null,
      popupfeatlyredit: null,
      popuptiledlyredit: null,
      popupwebtiledlyredit: null,
      popupwmsedit: null,
      popupbmedit: null,
      popupgjedit: null,
      popupimageedit: null,
      reverseproxyedit: null,
      popup: null,
      popupState: '', // ADD or EDIT

      startup: function() {
        this.inherited(arguments);
        this._bindEvents();
        this.setConfig(this.config);
        aspect.before(this, 'destroy', function(){
          if (LayerInfos.getInstanceSync()){
            LayerInfos.getInstanceSync()._tables = this.map.updatedLayerInfos._tables;  
            LayerInfos.getInstanceSync()._initTablesInfos();
            aspect.before(LayerInfos.prototype,"update",function(){
              var newOriginOperLayers = []
              array.forEach(LayerInfos.getInstanceSync()._finalLayerInfos,lang.hitch(this,function(layerInfo){
                newOriginOperLayers.push(layerInfo.originOperLayer);
              }))
              LayerInfos.getInstanceSync()._operLayers = newOriginOperLayers;
              LayerInfos.getInstanceSync()._initLayerInfos();
            });
          }
        })        
      },

      setConfig: function(config) {
        this.config = config;
        if(!config.review || config.review === false){
          this.reviewCbx.setValue(false)
        }else{
          this.reviewCbx.setValue(true)
        }
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
        this.config.layers.layer = this._getAllLayers();
        this.config.review = this.reviewCbx.getValue()
        this._removeAllLayersExceptBasemap();
        console.info(this.config);
        return this.config;
      },

      _initLayersTable: function() {
        this.LayersTable.clear();
        var layers = this.config && this.config.layers.layer;
        array.forEach(layers.reverse(), lang.hitch(this, function(layerConfig, index) {
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
        return allLayers.reverse();
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
        }else if(type === 'GEOJSON'){
          return this.nls.geojsonlayer;
        }else if(type === 'WEBTILEDBASEMAP'){
          return this.nls.webtiledbasemap;
        }else if(type === 'WEBTILEDLAYER'){
          return this.nls.webtiledlayer;
        }else if(type === 'IMAGE'){
          return this.nls.imagelayer;
        }else if(type === 'WMS'){
          return this.nls.wmslayer;
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
          }else if(editLayer.type.toUpperCase() === 'GEOJSON'){
            this._openGJEdit(this.nls.editgeojson + ': ' + editLayer.name , tr);
          }else if(editLayer.type.toUpperCase() === 'WEBTILEDBASEMAP'||editLayer.type.toUpperCase() === 'WEBTILEDLAYER'){
            this._openWebTileEdit(this.nls.editwebtile + ': ' + editLayer.name , tr);
          }else if(editLayer.type.toUpperCase() === 'IMAGE'){
            this._openImageEdit(this.nls.editimage + ': ' + editLayer.name , tr);
          }else if(editLayer.type.toUpperCase() === 'WMS'){
            this._openWMSEdit(this.nls.editwms + ': ' + editLayer.name , tr);
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
        this.own(on(this.btnAddGeoJSONLayer,'click',lang.hitch(this,function(){
          var args = {
             config:{type:'geoJSON'}
          };
          this.popupState = 'ADD';
          var tr = this._createLayer(args);
          if (tr) {
            this._openGJEdit(this.nls.addgeojson, tr);
          }
        })));
        this.own(on(this.btnAddWebTileLayer,'click',lang.hitch(this,function(){
          var args = {
             config:{type:'webTile'}
          };
          this.popupState = 'ADD';
          var tr = this._createLayer(args);
          if (tr) {
            this._openWebTileEdit(this.nls.addwebtile, tr);
          }
        })));
        this.own(on(this.btnAddImageLayer,'click',lang.hitch(this,function(){
          var args = {
             config:{type:'Image'}
          };
          this.popupState = 'ADD';
          var tr = this._createLayer(args);
          if (tr) {
            this._openImageEdit(this.nls.addimagelayer, tr);
          }
        })));
        this.own(on(this.btnAddWMSLayer,'click',lang.hitch(this,function(){
          var args = {
             config:{type:'WMS'}
          };
          this.popupState = 'ADD';
          var tr = this._createLayer(args);
          if (tr) {
            this._openWMSEdit(this.nls.addwmslayer, tr);
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

      _onWebTileEditOk: function() {
        var layerConfig = this.popupwebtiledlyredit.getConfig();

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

      _onWebTileEditClose: function() {
        var layerConfig = this.popupwebtiledlyredit.getConfig();
        if(this.popupState === 'ADD'){
          this.LayersTable.deleteRow(layerConfig[1]);
        }
        this.popupwebtiledlyredit = null;
        this.popup = null;
      },

      _openWebTileEdit: function(title, tr) {
        this.popupwebtiledlyredit = new WebTiledLayerEdit({
          nls: this.nls,
          config: tr.singleLayer || {},
          tr: tr
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.popupwebtiledlyredit,
          container: 'main-page',
          width: 840,
          height: 420,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onWebTileEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onWebTileEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popupwebtiledlyredit.startup();
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

      _onImageEditOk: function() {
        var layerConfig = this.popupimageedit.getConfig();
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

      _onImageEditClose: function() {
        var layerConfig = this.popupimageedit.getConfig();
        if(this.popupState === 'ADD'){
          this.LayersTable.deleteRow(layerConfig[1]);
        }
        this.popupimageedit = null;
        this.popup = null;
      },

      _openImageEdit: function(title, tr) {
        this.popupimageedit = new ImageLayerEdit({
          nls: this.nls,
          config: tr.singleLayer || {},
          tr: tr,
          map: this.map
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.popupimageedit,
          container: 'main-page',
          width: 840,
          height: 420,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onImageEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onImageEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popupimageedit.startup();
      },

      _onWMSEditOk: function() {
        var layerConfig = this.popupwmsedit.getConfig();
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

      _onWMSEditClose: function() {
        var layerConfig = this.popupwmsedit.getConfig();
        if(this.popupState === 'ADD'){
          this.LayersTable.deleteRow(layerConfig[1]);
        }
        this.popupwmsedit = null;
        this.popup = null;
      },

      _openWMSEdit: function(title, tr) {
        this.popupwmsedit = new WMSLayerEdit({
          nls: this.nls,
          config: tr.singleLayer || {},
          tr: tr,
          map: this.map
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.popupwmsedit,
          container: 'main-page',
          width: 840,
          height: 420,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onWMSEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onWMSEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popupwmsedit.startup();
      },

      _onGJEditOk: function() {
        var layerConfig = this.popupgjedit.getConfig();
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

      _onGJEditClose: function() {
        var layerConfig = this.popupgjedit.getConfig();
        if(this.popupState === 'ADD'){
          this.LayersTable.deleteRow(layerConfig[1]);
        }
        this.popupbmedit = null;
        this.popup = null;
      },
      
      _openGJEdit: function(title, tr) {
        this.popupgjedit = new GeoJsonEdit({
          nls: this.nls,
          config: tr.singleLayer || {},
          tr: tr,
          map: this.map
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.popupgjedit,
          container: 'main-page',
          width: 840,
          height: 420,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onGJEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onGJEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popupgjedit.startup();
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
