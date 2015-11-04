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
    'jimu/dijit/ServiceURLInput',
    'jimu/dijit/_Transparency',
    'dijit/form/TextBox',
    'jimu/dijit/CheckBox',
    'dijit/form/NumberTextBox',
    'dijit/form/ValidationTextBox',
    'dojo/text!./TiledLayerEdit.html',
    'jimu/dijit/Popup',
    'dojo/keys',
    './PopupEdit'
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
    ServiceURLInput,
    _Transparency,
    TextBox,
    CheckBox,
    NumberTextBox,
    ValidationTextBox,
    template,
    Popup,
    keys,
    PopupEdit) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'tiled-layer-edit',
      templateString: template,
      config:null,
      tr:null,
      popuppuedit:null,

      postCreate: function() {
        this.inherited(arguments);
        this._setConfig(this.config);
      },

      startup: function() {
        this.inherited(arguments);
        if(!this.config.url){
          this.popup.disableButton(0);
        }
      },

      _setConfig: function(config) {
        this.config = config;
        if(!this.config){
          return;
        }
//        console.info(config);
        this._bindEvents();
        this.own(on(this.layerUrl, 'Change', lang.hitch(this, '_onServiceUrlChange')));
        this.layerUrl.proceedValue = false;
        this.layerUrl.setProcessFunction(lang.hitch(this, '_onServiceFetch', this.layerUrl),
                                    lang.hitch(this, '_onServiceFetchError'));
        if(config.url){
          this.layerUrl.set('value', config.url);
        }
        this.layerTitle.set('value', config.name);
        this.layerTitle.proceedValue = true;
        if(config.visible === false){
          this.isVisible.setValue(false);
        }else{
          this.isVisible.setValue(true);
        }
        this.layerAlpha.setAlpha(parseFloat(config.opacity||0.6));
        if(config.displayLevels && config.displayLevels.length){
          this.displayLevels.set('value', config.displayLevels.join());
        }
        if(config.hasOwnProperty('autorefresh')){
          this.autoRefresh.set('value', config.autorefresh);
        }
        if(config.hasOwnProperty('maxScale')){
          this.maxScale.set('value', config.maxScale);
        }
        if(config.hasOwnProperty('minScale')){
          this.minScale.set('value', config.minScale);
        }
      },

      _bindEvents: function() {
        this.own(on(this.sublayersTable,'actions-edit',lang.hitch(this,function(tr){
          var args;
          var infoTemp = this.getInfoTemplate(tr.subLayer.id);
          if(this.config.popup){
            args = {
             config: infoTemp,
             tr: tr
            };
            this.popupState = 'EDIT';
          }else{
            args = {
             config:{},
             tr: tr
            };
            this.popupState = 'ADD';
          }
          this._openPUEdit(this.nls.configurepopup, args);
        })));
      },

      onBeforeDelete: function(tr) {
        if(this.config.popup.infoTemplates && this.config.popup.infoTemplates.length > 0){
          var infoTmp = this.getInfoTemplate(tr.subLayer.id);
          var index = this.config.popup.infoTemplates.indexOf(infoTmp);
          if(index !== -1) {
            this.config.popup.infoTemplates.splice(index, 1);
          }
        }
        return false;
      },

      _onServiceFetch: function(urlDijit, evt){
        var result = false;
        var errormessage = null;
        console.info(evt.data);
        var url = evt.url.replace(/\/*$/g, '');
        if (this._isStringEndWith(url, '/MapServer') && evt.data.tileInfo) {
          urlDijit.proceedValue = true;
          result = true;
          this.sublayersTable.clear();
          array.forEach(evt.data.layers, lang.hitch(this, function(layerConfig, index) {
            var args = {
              config: layerConfig,
              sublayerindex: index
            };
            this._createSubLayer(args);
          }));
        } else {
          urlDijit.proceedValue = false;
          result = false;
          errormessage = this.nls.invalidtiledlayer;
        }

        this._checkProceed(errormessage);
//        console.info(evt.data.layers);
        return result;
      },

      _checkProceed: function(errormessage) {
        var canProceed = true;
        html.setAttr(this.errorMessage, 'innerHTML', '');
        if (this.layerTitle.proceedValue) {
          canProceed = canProceed && this.layerUrl.proceedValue;
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
        if(args.config.subLayerIds){
          return null;
        }
        args.layerSetting = this;
        args.nls = this.nls;
        var rowData = {
          name: (args.config && args.config.name) || ''
        };

        var result = this.sublayersTable.addRow(rowData);
        if(!result.success){
          return null;
        }
        result.tr.subLayer = args.config;
        return result.tr;
      },

      _onServiceUrlChange: function(){
        this.popup.disableButton(0);
      },

      _isStringEndWith: function(s,endS){
        return (s.lastIndexOf(endS) + endS.length === s.length);
      },

      _onServiceFetchError: function(){
      },

      getConfig: function() {
        //var dls = [];
        //if(this.displayLevels.get('value') !== ''){
          //dls = this.displayLevels.get('value').split(',');

        //}
        var tiledlayer = {
          type: 'Tiled',
          name: this.layerTitle.get('value'),
          url: this.layerUrl.get('value'),
          opacity: this.layerAlpha.getAlpha(),
          //displayLevels: (dls.length > 0)?dls:null,
          displayLevels: this.displayLevels.get('value'),
          autorefresh: this.autoRefresh.get('value'),
          visible: this.isVisible.getValue(),
          minScale: this.minScale.get('value'),
          maxScale: this.maxScale.get('value'),
          popup: this.config.popup
        };
        return [tiledlayer, this.tr];
      },

      _onPUEditOk: function() {
        var popupConfig = this.popuppuedit.getConfig();
        console.info(popupConfig);

        if (popupConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        this.addOrEditInfoTemplate(popupConfig);
        console.info(this.config.popup);

        this.popup.close();
        this.popupState = '';
      },

      addOrEditInfoTemplate: function(popupConfig) {
        if(!this.config.popup){
          this.config.popup = {
            infoTemplates :[]
          };
        }

        var exists = array.some(this.config.popup.infoTemplates, lang.hitch(this, function(infoTemp) {
          if(infoTemp.layerId === popupConfig.tr.subLayer.id){
            infoTemp.title = popupConfig.title;
            infoTemp.description = popupConfig.description;
            infoTemp.fieldInfos = popupConfig.fieldInfos;
            infoTemp.showAttachments = popupConfig.showAttachments;
            return true;
          }
        }));

        if(!exists){
          var it = {
            layerId: popupConfig.tr.subLayer.id,
            title: popupConfig.title,
            description: popupConfig.description,
            fieldInfos: popupConfig.fieldInfos,
            showAttachments: popupConfig.showAttachments
          };
          this.config.popup.infoTemplates.push(it);
        }
      },

      getInfoTemplate: function(id) {
        var infoTemplate = {};
        if(!this.config.popup){
          return infoTemplate;
        }
        array.some(this.config.popup.infoTemplates, lang.hitch(this, function(infoTemp) {
          if(infoTemp.layerId === id){
            infoTemplate = infoTemp;
            return true;
          }
        }));
        return infoTemplate;
      },

      _onPUEditClose: function() {
        this.popupbmedit = null;
        this.popup = null;
      },

      _openPUEdit: function(title, args) {
        this.popuppuedit = new PopupEdit({
          wnls: this.nls,
          config: args.config || {},
          tr: args.tr,
          flinfo: null,
          url: this.layerUrl.get('value') + '/' + args.tr.subLayer.id
        });

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.popuppuedit,
          container: 'main-page',
          width: 840,
          height: 460,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onPUEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onPUEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.popuppuedit.startup();
      }
    });
  });
