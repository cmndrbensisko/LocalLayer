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
    'dojo/text!./ImageLayerEdit.html',
    "esri/layers/ArcGISImageServiceLayer",
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
    ArcGISImageServiceLayer,
    Popup,
    keys,
    PopupEdit) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'image-layer-edit',
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
        }else{
          html.removeClass(this.addPopupBtn, 'disabled');
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
        if(config.hideInLegend){
          this.hideInLegendCbx.setValue(true)
        }
        if(config.disableclientcaching){
          this.disableClientCachingCbx.setValue(true);
        }
        this.layerAlpha.setAlpha(parseFloat(config.opacity||0.6));
        if(config.imageformat){
          this.imgFormat.set('value', config.imageformat);
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
        if(config.popup){
          html.removeClass(this.removePopupBtn, 'disabled');
        }
      },

      onAddPopup: function(){
        if(html.hasClass(this.addPopupBtn, 'disabled')){
          return false;
        }
        html.removeClass(this.removePopupBtn, 'disabled');
        var args;
        if(this.config.popup){
          args = {
           config:this.config.popup
          };
          this.popupState = 'EDIT';
        }else{
          args = {
           config:{}
          };
          this.popupState = 'ADD';
        }
        this._openPUEdit(this.nls.configurepopup, args);
      },

      onRemovePopup: function(){
        if(this.config.popup){
          delete this.config.popup;
        }
      },

      _onPUEditOk: function() {
        var popupConfig = this.popuppuedit.getConfig();
        if (popupConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        this.config.popup = popupConfig;

        this.popup.close();
        this.popupState = '';
      },

      _onPUEditClose: function() {
        if(this.popupState === 'ADD'){
          html.addClass(this.removePopupBtn, 'disabled');
        }
        this.popupbmedit = null;
        this.popup = null;
      },

      _openPUEdit: function(title, args) {
        this.popuppuedit = new PopupEdit({
          wnls: this.nls,
          config: args.config || {},
          tr: null,
          flinfo: this.featureLayerDetails
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
      },

      _bindEvents: function() {
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
        var url = evt.url.replace(/\/*$/g, '');
        if (this._isStringEndWith(url, '/ImageServer')) {
          urlDijit.proceedValue = true;
          result = true;
          var _layer = new ArcGISImageServiceLayer(evt.url);
          _layer.on('load', lang.hitch(this,function(evt) {
            _layer.getRasterAttributeTable().then(lang.hitch(this,function(table){
              array.forEach(table.fields, function(field){
                if (field.name == "Value"){
                  field.name = "Raster.ServicePixelValue"
                }else{
                  field.name = "Raster." + field.name
                }
              })
              table.fields.push({
                alias:"Raw Value",
                name:"Raster.ServicePixelValue.Raw",
                type: "esriFieldTypeString"
              })
              this.featureLayerDetails = {"data": table}
            }))
          }))
        } else {
          urlDijit.proceedValue = false;
          result = false;
          errormessage = this.nls.invaliddynamiclayer;
        }

        this._checkProceed(errormessage);
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
          html.removeClass(this.addPopupBtn, 'disabled');
        } else {
          this.popup.disableButton(0);
          if (errormessage) {
            html.setAttr(this.errorMessage, 'innerHTML', errormessage);
          }
        }
      },

      _createSubLayer: function(args) {
        var isGroupLayer = false
        if(args.config.subLayerIds){
          //return null;
          isGroupLayer = true;
        }

        args.layerSetting = this;
        args.nls = this.nls;

        var hiddenLayer;
        var isVisible = args.config.defaultVisibility;
        if(this.config.hasOwnProperty('hidelayers')){
          if (this.config.hidelayers){
            hiddenLayer = this.config.hidelayers.split(',');
          }else{
            hiddenLayer = [];
          }
          if(array.indexOf(hiddenLayer, args.config.id) >= 0){
            isVisible = false;
            //isVisible = true;
          }else{
            isVisible = true;
            //isVisible = false;
          }
        }
        var definitionQueries
        var defQuery = ""
        if (this.config.hasOwnProperty('definitionQueries')){
          if (this.config.definitionQueries){
            definitionQueries = JSON.parse(this.config.definitionQueries);
          }else{
            definitionQueries = [];
          }
          if (definitionQueries[args.config.id]){//(array.indexOf(definitionQueries, args.config.id) >= 0){
            defQuery = definitionQueries[args.config.id]
          }
        }

        var rowData = {
          name: (args.config && args.config.name) || '',
          visible: isVisible,
          definitionQuery: defQuery,
          layerindex: args.config.id,
        };

        var result = this.sublayersTable.addRow(rowData);
        if(!result.success){
          return null;
        }

        if (isGroupLayer){
          dojo.style(result.tr, "font-weight", "bold")
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
        var imagelayer = {
          type: 'Image',
          name: this.layerTitle.get('value'),
          url: this.layerUrl.get('value'),
          opacity: this.layerAlpha.getAlpha(),
          visible: this.isVisible.getValue(),
          hideInLegend: this.hideInLegendCbx.getValue(),
          popup: this.config.popup,
          minScale: this.minScale.get('value'),
          maxScale: this.maxScale.get('value')
        };
        return [imagelayer, this.tr];
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
        var it = {
          title: popupConfig.title,
          description: popupConfig.description,
          fieldInfos: popupConfig.fieldInfos
        };
        this.config.popup = it
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
    });
  });
