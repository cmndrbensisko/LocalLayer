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
    'widgets/LocalLayer/setting/webtileURLInput',
    'jimu/dijit/_Transparency',
    'dijit/form/TextBox',
    'jimu/dijit/CheckBox',
    'dijit/form/NumberTextBox',
    'dijit/form/ValidationTextBox',
    'dojo/text!./WebTiledLayerEdit.html',
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
        //this._bindEvents();
        this.own(on(this.layerUrl, 'Change', lang.hitch(this, '_onServiceUrlChange')));
        this.layerUrl.proceedValue = false;
        this.layerUrl.setProcessFunction(lang.hitch(this, '_onServiceFetch', this.layerUrl),
                                    lang.hitch(this, '_onServiceFetchError'));
        if(config.url){
          this.layerUrl.set('value', config.url);
        }
        if(config.subdomains){
          this.subDomains.set('value',config.subdomains.join())
        }
        if(config.type){
          this.type.set('value',config.type)
        }
        if(config.copyright){
          this.layerCopyright.set('value',config.copyright)
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
      },

      _onServiceFetch: function(urlDijit, evt){
        var errormessage = null;
        urlDijit.proceedValue = true;
        result = true;
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
        } else {
          this.popup.disableButton(0);
          if (errormessage) {OK
            html.setAttr(this.errorMessage, 'innerHTML', errormessage);
          }
        }
      },

      //if you change the tile to validate the url on a layer loaded event, reenable this
      _onServiceUrlChange: function(){
      //  this.popup.disableButton(0);
      },

      _onServiceFetchError: function(){
      },

      getConfig: function() {
        var dls = [];
        if(this.subDomains.get('value') !== ''){
          dls = this.subDomains.get('value').split(",");
        }
        var webtiledlayer = {
          type: this.type.get('value'),
          name: this.layerTitle.get('value'),
          copyright: this.layerCopyright.get('value'),
          url: this.layerUrl.get('value'),
          opacity: this.layerAlpha.getAlpha(),
          subdomains: (dls.length > 0)?dls:null,
          autorefresh: this.autoRefresh.get('value'),
          minScale: this.minScale.get('value'),
          maxScale: this.maxScale.get('value'),
          visible: this.isVisible.getValue()
        };
        return [webtiledlayer, this.tr];
      },
    });
  });
