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
    'dojo/text!./DynamicLayerEdit.html',
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
      baseClass: 'dynamic-layer-edit',
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
        var url = evt.url.replace(/\/*$/g, '');
        if (this._isStringEndWith(url, '/MapServer')) {
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
          errormessage = this.nls.invaliddynamiclayer;
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

        var hideInLegends
        var hideInLegend
        if (this.config.hasOwnProperty('hideInLegends')){
          if (this.config.hideInLegends){
            hideInLegends = JSON.parse(this.config.hideInLegends);
          }else{
            hideInLegends = []
          }
          if (hideInLegends[args.config.id]){
            hideInLegend = hideInLegends[args.config.id]
          }
        }

        var rowData = {
          name: (args.config && args.config.name) || '',
          visible: isVisible,
          definitionQuery: defQuery,
          hideInLegend: hideInLegend,
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
        var rowsData = this.sublayersTable.getData();

        var visibleLayers = [];
        var definitionQueries = new Object();
        var hideInLegends = new Object();
        array.map(rowsData, lang.hitch(this, function (item) {
          if (item.layerindex == ""){item.layerindex = "0"}
          if(!item.visible){
            visibleLayers.push(parseInt(item.layerindex))
          }
          if (item.definitionQuery !== ""){
            definitionQueries[parseInt(item.layerindex)] = item.definitionQuery
          }
          if (item.hideInLegend){
            hideInLegends[parseInt(item.layerindex)] = true;
          }else{
            hideInLegends[parseInt(item.layerindex)] = false;
          }
        }));
var _hideInLegends = JSON.stringify(hideInLegends)
var _definitionQueries = JSON.stringify(definitionQueries);
var _hideLayers = visibleLayers.join();
if (_hideLayers == ""){_hideLayers = null};
if (_definitionQueries == ""){_definitionQueries = null};
        var dynamiclayer = {
          type: 'Dynamic',
          name: this.layerTitle.get('value'),
          url: this.layerUrl.get('value'),
          opacity: this.layerAlpha.getAlpha(),
          visible: this.isVisible.getValue(),
          hideInLegends: _hideInLegends,
          imageformat: this.imgFormat.get('value'),
          autorefresh: this.autoRefresh.get('value'),
          popup: this.config.popup,
          imagedpi: this.imgDPI.get('value'),
          disableclientcaching: this.disableClientCachingCbx.getValue(),
          minScale: this.minScale.get('value'),
          maxScale: this.maxScale.get('value'),
          //hidelayers: allHiddenLayers.join()
          hidelayers: _hideLayers,
          definitionQueries: _definitionQueries
        };
        return [dynamiclayer, this.tr];
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
        if(!args.tr.subLayer.subLayerIds){
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
      }
    });
  });
