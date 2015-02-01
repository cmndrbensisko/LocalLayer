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
    'dojo/text!./BasemapLayerEdit.html',
    'dijit/form/ValidationTextBox',
    'jimu/dijit/ServiceURLInput',
    'jimu/SpatialReference/wkidUtils'
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
    ValidationTextBox,
    ServiceURLInput,
    SRUtils) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'basemap-layer-edit',
      templateString: template,
      config:null,
      map:null,
      tr:null,

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
        this.own(on(this.layerUrl, 'Change', lang.hitch(this, '_onServiceUrlChange')));
        this.layerUrl.proceedValue = false;
        this.layerUrl.setProcessFunction(lang.hitch(this, '_onServiceFetch', this.layerUrl),
                                    lang.hitch(this, '_onServiceFetchError'));
        if(config.url){
          this.layerUrl.set('value', config.url);
        }
        this.layerAlpha.setAlpha(parseFloat(config.opacity||0.6));
        if(config.displayLevels && config.displayLevels.length){
          this.displayLevels.set('value', config.displayLevels.join());
        }
        if(config.hasOwnProperty('isReference') && config.isReference){
          this.isReference.setValue(true);
        }else{
          this.isReference.setValue(false);
        }
      },

      _onServiceFetch: function(urlDijit, evt){
        var result = false;
        var errormessage = null;
        var url = evt.url.replace(/\/*$/g, '');
        if (this._isStringEndWith(url, '/MapServer')||
            this._isStringEndWith(url, '/ImageServer')) {
          html.setAttr(this.errorMessage, 'innerHTML', '');
          var curMapSpatialRefObj = this.map.spatialReference;
          var basemapSpatialRefObj = evt.data.spatialReference ||
                                     evt.data.extent.spatialReference ||
                                     evt.data.initialExtent.spatialReference ||
                                     evt.data.fullExtent.spatialReference;
          if (curMapSpatialRefObj &&
              basemapSpatialRefObj &&
              SRUtils.isSameSR(curMapSpatialRefObj.wkid, basemapSpatialRefObj.wkid)) {
            urlDijit.proceedValue = true;
            result = true;
          } else {
            urlDijit.proceedValue = false;
            result = false;
            errormessage = this.nls.invalidBasemapUrl2;
          }
        } else {
          urlDijit.proceedValue = false;
          result = false;
          errormessage = this.nls.invalidBasemapUrl1;
        }
        if (!errormessage) {
          this.popup.enableButton(0);
        } else {
          this.popup.disableButton(0);
          html.setAttr(this.errorMessage, 'innerHTML', errormessage);
        }
        return result;
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
        var dls = [];
        if(this.displayLevels.get('value') !== ''){
          dls = this.displayLevels.get('value').split();
        }
        var basemaplayer = {
          url: this.layerUrl.get('value'),
          opacity: this.layerAlpha.getAlpha(),
          displayLevels: (dls.length > 0)?dls:null,
          isReference: this.isReference.getValue()
        };
        return [basemaplayer, this.tr];
      }
    });
  });