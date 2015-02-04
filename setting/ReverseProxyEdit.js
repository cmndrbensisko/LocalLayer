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
    'dojo/text!./ReverseProxyEdit.html',
    'dijit/form/TextBox',
    'jimu/dijit/CheckBox'
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
    template
    ) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'reverse-proxy-edit',
      templateString: template,
      config:null,

      postCreate: function() {
        this.inherited(arguments);
      },

      startup: function() {
        this.inherited(arguments);
        console.info(this.config);
        if(this.config.useProxy){
          this.useProxy.setValue(true);
          this.proxyPrefix.set('disabled', false);
          this.proxyAddress.set('disabled', false);
        }else{
          this.useProxy.setValue(false);
          this.proxyPrefix.set('disabled', true);
          this.proxyAddress.set('disabled', true);
        }
        if(this.config.proxyPrefix){
          this.proxyPrefix.set('value', this.config.proxyPrefix);
        }
        if(this.config.proxyAddress){
          this.proxyAddress.set('value', this.config.proxyAddress);
        }
      },

      _onClick: function() {
        if (this.useProxy.getValue()){
          this.proxyPrefix.set('disabled', false);
          this.proxyAddress.set('disabled', false);
        }else{
          this.proxyPrefix.set('value', '');
          this.proxyAddress.set('value', '');
          this.proxyPrefix.set('disabled', true);
          this.proxyAddress.set('disabled', true);
        }
      },

      getConfig: function() {
        var config = {
          useProxy: this.useProxy.getValue(),
          proxyPrefix:lang.trim(this.proxyPrefix.get('value')),
          proxyAddress:lang.trim(this.proxyAddress.get('value'))
        };
        return config;
      }
    });
  });
