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
    'widgets/LocalLayer/setting/jsonURLInput',
    "jimu/dijit/SymbolChooser",
    'jimu/dijit/_Transparency',
    'jimu/dijit/Popup',
    'dojo/keys',
    './PopupEdit',
    'dijit/form/TextBox',
    'jimu/dijit/CheckBox',
    'dijit/form/NumberTextBox',
    'dijit/form/ValidationTextBox',
    'dijit/form/Select',
    'dojo/data/ObjectStore',
    'dojo/store/Memory',
    'dojo/text!./customLayerEdit.html'
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
    jsonURLInput,
    SymbolChooser,
    _Transparency,
    Popup,
    keys,
    PopupEdit,
    TextBox,
    CheckBox,
    NumberTextBox,
    ValidationTextBox,
    Select,
    ObjectStore,
    Memory,
    template) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'feature-layer-edit',
      templateString: template,
      config:null,
      tr:null,
      popuppuedit:null,
      featureLayerDetails:null,
      isValidGeoJson:null,
      geometryType:null,

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
        this.own(on(this.customTransformerName, 'Change', lang.hitch(this, '_onCustomTransformerName')));
        this.own(on(this.layerUrl, 'Change', lang.hitch(this, '_onServiceUrlChange')));
        this.own(on(this.featureTypeSelect, 'Change', lang.hitch(this, '_onFeatureTypeChange')));
        this.layerUrl.proceedValue = false;
        this.layerUrl.setProcessFunction(lang.hitch(this, '_onServiceFetch', this.layerUrl),
                                    lang.hitch(this, '_onServiceFetchError'));
        if(config.url){
          this.layerUrl.set('value', config.url);
        }
        if(config.geometryType){
          this.featureTypeSelect.set("value", config.geometryType)
          this.geometryType = config.geometryType
        }else{
          this.featureTypeSelect.set("value", "esriGeometryPoint")
          this.geometryType = "esriGeometryPoint"
        }
        this.layerTitle.set('value', config.name);
        this.layerTitle.proceedValue = true;
        if(config.visible === false){
          this.isVisible.setValue(false);
        }else{
          this.isVisible.setValue(true);
        }
        if(config.customTransformerName){
          this.customTransformerName.setValue(config.customTransformerName);
        }
        if(config.customTransformerJson){
          this.customTransformerJson.setValue(decodeURIComponent(config.customTransformerJson));
        }

        this.layerAlpha.setAlpha(parseFloat(config.opacity||0.6));
        if(config.mode){
          this.flMode.set('value', config.mode);
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
        if(config.showLabels === false){
          this.showLabelsCbx.setValue(false)
        }else{
          this.showLabelsCbx.setValue(true)
        }
        if(config.popup){
          html.removeClass(this.removePopupBtn, 'disabled');
        }
      },

      _onServiceFetch: function(urlDijit, evt){
        var result = false;
        var errormessage = null;
        var url = evt.url.replace(/\/*$/g, '');
        this._checkProceed(errormessage);

//        this._checkProceed(errormessage);
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
          html.removeClass(this.addPopupBtn, 'disabled');
        } else {
          this.popup.disableButton(0);
          if (errormessage) {
            html.setAttr(this.errorMessage, 'innerHTML', errormessage);
          }
        }
      },

      _onFeatureTypeChange: function(){
        this.geometryType = this.featureTypeSelect.get('value');
      },

      _onServiceUrlChange: function(){
        this.popup.disableButton(0);
      },

      _onCustomTransformerName: function(){
        this.popup.enableButton(0);
        html.removeClass(this.addPopupBtn, 'disabled');
      },

      _onArrayChange: function(){
        this.popup.disableButton(0);
        on.emit(this.layerUrl, "Change", this.layerUrl.get('value'), this.featureArrayFieldSelect.get('value'))
      },

      _onServiceFetchError: function(){
        console.log('error')
      },

      getConfig: function() {
        var subArrayValue
        if (this.featureArrayFieldSelect){
          subArrayValue = this.featureArrayFieldSelect.get('value');
        }
        var featurelayer = {
          type: 'custom',
          url: this.layerUrl.get('value'),
          name: this.layerTitle.get('value'),
          opacity: this.layerAlpha.getAlpha(),
          visible: this.isVisible.getValue(),
          customTransformerName: this.customTransformerName.getValue(),
          customTransformerJson: encodeURIComponent(this.customTransformerJson.getValue()),
          showLabels: this.showLabelsCbx.getValue(),
          popup: this.config.popup,
          autorefresh: this.autoRefresh.get('value'),
          mode: this.flMode.get('value'),
          symbol: this.config.symbol,
          minScale: this.minScale.get('value'),
          maxScale: this.maxScale.get('value'),
          subArray: subArrayValue,
          geometryType: this.geometryType
        };
        return [featurelayer, this.tr];
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

      onEditSymbology: function(){
        if(html.hasClass(this.editSymbolBtn, 'disabled')){
          return false;
        }
        var args;
        if(this.config.symbol){
          args = {
           config:this.config.symbol
          };
          this.symbologyState = 'EDIT';
        }else{
          args = {
           config:{}
          };
          this.symbologyState = 'ADD';
        }
        this._openSymbolEdit(this.nls.configuresymbol, args);
      },

      _onPUEditOk: function() {
        var popupConfig = this.popuppuedit.getConfig();
//        console.info(popupConfig);

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
        this.popuppuedit = null;
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

      _openSymbolEdit: function(title, args) {
        if(this.geometryType == "esriGeometryPoint"){
          this.symboledit = new SymbolChooser({type: "marker"});
        }else if (this.geometryType == "esriGeometryPolyline"){
          this.symboledit = new SymbolChooser({type: "line"});
        }else if (this.geometryType == "esriGeometryPolygon"){
          this.symboledit = new SymbolChooser({type: "fill"});
        }

        this.popup = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.symboledit,
          container: 'main-page',
          width: 380,
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onSymbolEditOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onSymbolEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.symboledit.startup();
      },
      _onSymbolEditOk: function() {
        var symbolConfig = this.symboledit.getSymbol().toJson();
//        console.info(popupConfig);

        if (symbolConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        this.config.symbol = symbolConfig;

        this.popup.close();
        this.popupState = '';
      },

      _onSymbolEditClose: function() {
        if(this.popupState === 'ADD'){
          html.addClass(this.removePopupBtn, 'disabled');
        }
        this.symboledit = null;
        this.popup = null;
      },
    });
  });
