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
    'jimu/dijit/Popup',
    'dojo/keys',
    './PopupEdit',
    'dijit/form/TextBox',
    'jimu/dijit/CheckBox',
    'dijit/form/NumberTextBox',
    'dijit/form/ValidationTextBox',
    'dojo/text!./FeatureLayerEdit.html'
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
    Popup,
    keys,
    PopupEdit,
    TextBox,
    CheckBox,
    NumberTextBox,
    ValidationTextBox,
    template) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'feature-layer-edit',
      templateString: template,
      config:null,
      tr:null,
      popuppuedit:null,
      featureLayerDetails:null,

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
        if(config.mode){
          this.flMode.set('value', config.mode);
        }
        if(config.hasOwnProperty('autorefresh')){
          this.autoRefresh.set('value', config.autorefresh);
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
        if (this._checkForFeatureLayer(url)) {
          urlDijit.proceedValue = true;
          result = true;
          this.featureLayerDetails = evt;
        } else {
          urlDijit.proceedValue = false;
          result = false;
          errormessage = this.nls.invalidfeaturelayer;
          this.featureLayerDetails = null;
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
          html.removeClass(this.addPopupBtn, 'disabled');
        } else {
          this.popup.disableButton(0);
          if (errormessage) {
            html.setAttr(this.errorMessage, 'innerHTML', errormessage);
          }
        }
      },

      _onServiceUrlChange: function(){
        this.popup.disableButton(0);
      },

      _checkForFeatureLayer: function(layerUrl){
        var isFeatureService = (/\/featureserver\//gi).test(layerUrl);
        var isMapService = (/\/mapserver\//gi).test(layerUrl);
        if(isFeatureService || isMapService){
          return (/\/\d+$/).test(layerUrl);
        }
      },

      _onServiceFetchError: function(){
      },

      getConfig: function() {
        var featurelayer = {
          type: 'Feature',
          url: this.layerUrl.get('value'),
          name: this.layerTitle.get('value'),
          opacity: this.layerAlpha.getAlpha(),
          visible: this.isVisible.getValue(),
          showLabels: this.showLabelsCbx.getValue(),
          popup: this.config.popup,
          autorefresh: this.autoRefresh.get('value'),
          mode: this.flMode.get('value')
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
      }
    });
  });
