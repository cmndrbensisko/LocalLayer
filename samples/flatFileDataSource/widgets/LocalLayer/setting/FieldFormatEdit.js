/*global define*/
define(
  ['dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/html',
    'dojo/on',
    'dojo/dom-style',
    'dojo/dom-attr',
    'dojo/query',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/registry',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/Message',
    'dojo/text!./FieldFormatEdit.html',
    'dijit/form/NumberSpinner',
    'jimu/dijit/CheckBox',
    'dijit/form/FilteringSelect',
    'dijit/form/ValidationTextBox'
  ],
  function(
    declare,
    lang,
    array,
    html,
    on,
    domStyle,
    domAttr,
    query,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    registry,
    BaseWidgetSetting,
    Message,
    template
    ){
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'Field-Format-Edit',
      templateString: template,
      returnfieldInfo: null,
      tr: null,

      postCreate: function(){
        this.inherited(arguments);
        if (this.popup){
          this.popup.enableButton(0);
        }
      },

      setConfig: function(fieldInfo){
        this.returnfieldInfo = fieldInfo;
        if(fieldInfo.format && fieldInfo.format.hasOwnProperty('digitSeparator')){
          this.useThousandsCbx.setValue(fieldInfo.format.digitSeparator);
        }else{
          this.useThousandsCbx.setValue(true);
        }
        if(fieldInfo.format && fieldInfo.format.places){
          this.selectDecimals.set('value', fieldInfo.format.places);
        }else{
          this.selectDecimals.set('value', 2);
        }
        if(fieldInfo.format && fieldInfo.format.dateFormat){
          this.selectDateFormat.set('value', fieldInfo.format.dateFormat);
        }else{
          this.selectDateFormat.set('value', 'longMonthDayYear');
        }
        if(this._isDateType(fieldInfo.type)){
          var numerics = query('.numeric', this.inputTable);
          array.forEach(numerics, function(tr) {
            domStyle.set(tr, 'display', 'none');
          });
        }else if (this._isNumberType(fieldInfo.type)){
          var dates = query('.date', this.inputTable);
          array.forEach(dates, function(tr) {
            domStyle.set(tr, 'display', 'none');
          });
          if(!this._isDecimalType(fieldInfo.type)){
            var dec = query('.decimal', this.inputTable);
            array.forEach(dec, function(tr) {
              domStyle.set(tr, 'display', 'none');
            });
          }
        }
      },

      _isNumberType:function(type){
        var numberTypes = ['esriFieldTypeOID',
                           'esriFieldTypeSmallInteger',
                           'esriFieldTypeInteger',
                           'esriFieldTypeSingle',
                           'esriFieldTypeDouble'];
        return array.indexOf(numberTypes, type) >= 0;
      },

      _isDecimalType:function(type){
        var numberTypes = ['esriFieldTypeSingle',
                           'esriFieldTypeDouble'];
        return array.indexOf(numberTypes, type) >= 0;
      },

      _isDateType:function(type){
        var dateTypes = ['esriFieldTypeDate'];
        return array.indexOf(dateTypes, type) >= 0;
      },

      getConfig: function(){
        var cformat = {};
        var dates = query('.date', this.inputTable);
        array.forEach(dates, lang.hitch(this,function(tr) {
          if(tr.style.display !== 'none'){
            cformat.dateFormat = this.selectDateFormat.get('value');
          }
        }));
        var dec = query('.numeric.decimal', this.inputTable);
        array.forEach(dec, lang.hitch(this,function(tr) {
          if(tr.style.display !== 'none'){
            cformat.places = this.selectDecimals.get('value');
          }else{
            cformat.places = 0;
          }
        }));
        var numerics = query('.numeric', this.inputTable);
        array.forEach(numerics, lang.hitch(this,function(tr) {
          if(tr.style.display !== 'none'){
            cformat.digitSeparator = this.useThousandsCbx.getValue();
          }
        }));
        this.returnfieldInfo.format = cformat;
        return this.returnfieldInfo;
      }
    });
  });
