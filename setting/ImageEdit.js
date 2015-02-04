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
    'dojo/text!./ImageEdit.html',
    'widgets/LocalLayer/setting/AddFieldBtn',
    'dijit/form/TextBox'
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
      baseClass: 'image-edit',
      templateString: template,
      config:null,
      flinfo:null,
      wnls:null,

      postCreate: function() {
        this.inherited(arguments);
        this._initFieldsAdds(this.flinfo.data.fields);
        this._bindEvents();
      },

      startup: function() {
        this.inherited(arguments);
        /*if(!this.config.url){
          this.popup.disableButton(0);
        }*/
      },

      _bindEvents: function(){
        this.URLTextBox.on('blur', function() {
          var start = this.textbox.selectionStart,
              end = this.textbox.selectionEnd;
          this.set('cursorPosition', [start, end]);
        });
        this.URLTextBox.on('focus', function() {
          var cursorPosition = this.get('cursorPosition');
          if(cursorPosition) {
            this.textbox.setSelectionRange(cursorPosition[1], cursorPosition[1]);
          }
        });
        this.own(on(this.URLAddButton, 'onMenuClick', lang.hitch(this,function(item){
          var cur = this.URLTextBox.get('cursorPosition');
          var val = this.URLTextBox.get('value');
          var str = val.substring(0,cur[0])+ item.key + val.substring(cur[1]);
          this.URLTextBox.set('value', str);
          this.URLTextBox.focus();
          this.URLTextBox.textbox.setSelectionRange(cur[0]+item.key.length, cur[0]+item.key.length);
        })));
      },

      _initFieldsAdds:function(fieldInfos){
        var fields = array.filter(fieldInfos, function(item) {
          return item.type !== 'esriFieldTypeGeometry';
        });
        var data = array.map(fields,lang.hitch(this,function(fieldInfo,index){
          var item = lang.mixin({},fieldInfo);
          item.id = index;
          item.key = '{' + item.name + '}';
          item.label = item.alias + ' {' + item.name + '}';
          return item;
        }));

        if(data.length > 0){
          this.URLAddButton.items = data;
        }
      },

      getConfig: function() {
        var config = {
          url:lang.trim(this.URLTextBox.get('value'))
        };
        return config;
      }
    });
  });
