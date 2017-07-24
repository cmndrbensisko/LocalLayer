/*global define*/
define(
  ['dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/html',
    'dojo/on',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/Message',
    'dojo/text!./BasemapEdit.html',
    'jimu/dijit/ServiceURLInput',
    './BasemapLayerEdit',
    'jimu/dijit/Popup',
    'dojo/keys'
  ],
  function(
    declare,
    lang,
    array,
    html,
    on,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    Message,
    template,
    ServiceURLInput,
    BasemapLayerEdit,
    Popup,
    keys) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'basemap-edit',
      templateString: template,
      config:null,
      popupbmlyredit: null,
      map:null,
      tr:null,

      postCreate: function() {
        this.inherited(arguments);
        this._setConfig(this.config);
      },

      startup: function() {
        this.inherited(arguments);
        if(!this.config.layers){
          this.popup.disableButton(0);
        }
        this._bindEvents();
      },

      _setConfig: function(config) {
        this.config = config;
        if(!this.config){
          return;
        }
        console.info(config);
        this.layerTitle.set('value', config.name);
        this.layerTitle.proceedValue = true;
        if(config.layers){
          array.forEach(config.layers.layer, lang.hitch(this, function(layerConfig, index) {
            var args = {
              config: layerConfig,
              sublayerindex: index
            };
            this._createSubLayer(args);
          }));
        }
      },

      _checkProceed: function(errormessage) {
        var canProceed = true;
        html.setAttr(this.errorMessage, 'innerHTML', '');
        if (this.layerTitle.proceedValue) {
          canProceed = true;
        } else {
          canProceed = false;
        }
        if (canProceed) {
          this.popup.enableButton(0);
        } else {
          this.popup.disableButton(0);
          if (errormessage) {
            html.setAttr(this.errorMessage, 'innerHTML', errormessage);
          }
        }
      },

      _createSubLayer: function(args) {
        args.layerSetting = this;
        args.nls = this.nls;
        var rowData = {
          name: (args.config && args.config.url) || ''
        };

        var result = this.sublayersTable.addRow(rowData);
        if(!result.success){
          return null;
        }
        result.tr.subLayer = args.config;
        return result.tr;
      },

      onAddLayerUrl: function(){
        var args = {
          config:null
        };
        this.popup2State = 'ADD';
        var tr = this._createSubLayer(args);
        if (tr) {
          this._openBLEdit(this.nls.editbasemaplayer, tr);
        }
      },

      getConfig: function() {
        var basemap = {
          type: 'Basemap',
          name: this.layerTitle.get('value'),
          layers: {
            layer: this._getAllBasemapLayers()
          }
        };
        return [basemap, this.tr];
      },

      _getAllBasemapLayers: function () {
        var trs = this.sublayersTable._getNotEmptyRows();
        var allBasemapLayers = array.map(trs, lang.hitch(this, function (item) {
          return item.subLayer;
        }));
        return allBasemapLayers;
      },

      _onBLEditOk: function() {
        var layerConfig = this.popupbmlyredit.getConfig();
        if (layerConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        console.info(layerConfig);
        if(this.popup2State === 'ADD'){
          this.sublayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].url
          });
          layerConfig[1].subLayer = layerConfig[0];
          this.popup2State = '';
        }else{
          this.sublayersTable.editRow(layerConfig[1], {
            name: layerConfig[0].url
          });
          layerConfig[1].subLayer = layerConfig[0];
        }
        this.popup2.close();
        this.popup2State = '';
        this._checkProceed();
      },

      _onBLEditClose: function() {
        var layerConfig = this.popupbmlyredit.getConfig();
        if(this.popup2State === 'ADD'){
          this.sublayersTable.deleteRow(layerConfig[1]);
        }
        this.popupbmlyredit = null;
        this.popup2 = null;
      },

      _openBLEdit: function(title, tr) {
        this.popupbmlyredit = new BasemapLayerEdit({
          nls: this.nls,
          config: tr.subLayer || {},
          tr: tr,
          map: this.map
        });
        this.popup2 = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.popupbmlyredit,
          container: 'main-page',
          width: 840,
          height: 300,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onBLEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onBLEditClose')
        });
        html.addClass(this.popup2.domNode, 'widget-setting-popup');
        this.popupbmlyredit.startup();
      },

      _bindEvents: function() {
        this.own(on(this.sublayersTable,'actions-edit',lang.hitch(this,function(tr){
          this.popup2State = 'EDIT';
          this._openBLEdit(this.nls.editbasemaplayer, tr);
        })));
        this.own(on(this.sublayersTable,'row-delete',lang.hitch(this,function(tr){
          delete tr.subLayer;
        })));
      }
    });
  });
