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
    'dojo/text!./PopupEdit.html',
    'jimu/dijit/TabContainer3',
    'widgets/LocalLayer/setting/CustomPopupBtns',
    'jimu/dijit/Popup',
    'dojo/keys',
    'widgets/LocalLayer/setting/HyperlinkEdit',
    'widgets/LocalLayer/setting/ImageEdit',
    'widgets/LocalLayer/setting/FieldFormatEdit',
    'esri/request',
    'widgets/LocalLayer/setting/AddFieldBtn',
    'dijit/form/TextBox',
    'widgets/LocalLayer/setting/SimpleTable',
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
    template,
    TabContainer3,
    CustomPopupBtns,
    Popup,
    keys,
    HyperlinkEdit,
    ImageEdit,
    FieldFormatEdit,
    esriRequest
    ) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'popup-edit',
      templateString: template,
      config:null,
      flinfo:null,
      tr:null,
      wnls:null,
      hyperlinkpuedit: null,
      imagepuedit: null,
      fieldformatedit: null,
      url:null,
      tabContainer:null,
      addedFields:null,

      postMixInProperties:function(){
        this.nls = window.jimuNls.popupConfig;
      },

      postCreate: function() {
        this.inherited(arguments);
        this._initTabs();
        this._setConfig(this.config);
        this._initCustomButtons();
        this._bindEvents();
      },

      _initCustomButtons: function() {
        var args = {
          nls: this.wnls
        };
        this.cbuttons = new CustomPopupBtns(args);
        this.cbuttons.placeAt(this.customPopupButtonsTD);
      },

      startup: function() {
        this.inherited(arguments);
        if(!this.config.layers){
          this.popup.disableButton(0);
        }
      },

      _initTabs: function(){
        var tabKeyValues = {
          title: this.wnls.keyvalue,
          content: this.keyValueTabNode
        };

        var tabCustom = {
          title: this.wnls.custom,
          content: this.customTabNode
        };

        var tabs = [tabKeyValues, tabCustom];
        var args = {
          tabs: tabs
        };
        this.tabContainer = new TabContainer3(args);
        this.tabContainer.placeAt(this.detailSection);
      },

      _setConfig: function(config) {
        this.addedFields = [];
        this.config = config;
        if(!this.config){
          return;
        }
        console.info(config);
        this.fieldsTable.clear();
        if(this.config.title){
          this.titleTextBox.set('value',this.config.title);
        }
        if(this.config.description){
          this.customContentTA.value = this.config.description.replace( /<br.*?>/g, '\n');
            //this.config.description;
          this.tabContainer.selectTab(this.wnls.custom);
        }
        if(this.flinfo){
          this.setFields(this.flinfo.data.fields);
          this._initFieldsAdds(this.flinfo.data.fields, (this.config.fieldInfos)?this.config.fieldInfos:{});
        }else{
          if(this.url){
            this.setUrl(this.url);
          }
        }
        if(this.config.showAttachments){
          this.showAttachmentsCbx.setValue(true);
        }
      },

      setUrl:function(url){
        if(typeof url === 'string'){
          url = lang.trim(url);
        }
        else{
          return;
        }
        this.url = url;
        var def = this._requestLayerInfo(url);
        return def;
      },

      _requestLayerInfo:function(url){
        if(this._def){
          this._def.cancel();
        }
        this._def = esriRequest({
          url:url,
          content:{f:'json'},
          handleAs:'json',
          callbackParamName:'callback'
        });
        this._def.then(lang.hitch(this,function(response){
          var obj = {};
          obj.data = response;
          this.flinfo = obj;
          if(response && response.fields){
            this._setFields(response.fields);
            this._initFieldsAdds(response.fields, (this.config.fieldInfos)?this.config.fieldInfos:{});
          }
        }),lang.hitch(this,function(error){
          console.error('request layer info failed',error);
        }));
        return this._def;
      },

      _onTitleChange: function() {
        if(this.titleTextBox.get('value')){
          this.popup.enableButton(0);
        }
      },

      _bindEvents: function(){
        this.own(on(this.titleTextBox, 'Change', lang.hitch(this, '_onTitleChange')));
        this.own(on(this.fieldsTable, 'actions-edit', lang.hitch(this, function (tr) {
          if (tr.fieldInfo) {
            this._openFieldEdit(this.wnls.edit + ': ' + tr.fieldInfo.name, tr);
          }
        })));
        this.titleTextBox.on('blur', function() {
          var start = this.textbox.selectionStart,
              end = this.textbox.selectionEnd;
          this.set('cursorPosition', [start, end]);
        });
        this.titleTextBox.on('focus', function() {
          var cursorPosition = this.get('cursorPosition');
          if(cursorPosition) {
            this.textbox.setSelectionRange(cursorPosition[1], cursorPosition[1]);
          }
        });
        this.own(on(this.titleAddButton, 'onMenuClick', lang.hitch(this,function(item){
          var cur = this.titleTextBox.get('cursorPosition');
          var val = this.titleTextBox.get('value');
          this._setFieldVisible(item.key);
          var str;
          if(!cur){
            str = item.key;
          }else{
            str = val.substring(0, cur[0])+ item.key + val.substring(cur[1]);
          }
          this.titleTextBox.set('value', str);
          this.titleTextBox.focus();

          if(!cur){
            this.titleTextBox.textbox.setSelectionRange(item.key.length, item.key.length);
          }else{
            this.titleTextBox.textbox.setSelectionRange(cur[0]+item.key.length, cur[0]+item.key.length);
          }
        })));
        this.own(on(this.customContentAddButton, 'onMenuClick', lang.hitch(this, function(item){
          this._setFieldVisible(item.key);
          this._insertAtCursor(this.customContentTA, item.key);
        })));
        this.own(on(this.cbuttons, 'onBold', lang.hitch(this, this._onBoldClick)));
        this.own(on(this.cbuttons, 'onItalic', lang.hitch(this, this._onItalicClick)));
        this.own(on(this.cbuttons, 'onUnderline', lang.hitch(this, this._onUnderlineClick)));
        this.own(on(this.cbuttons, 'onHyperlink', lang.hitch(this, this._onHyperlinkClick)));
        this.own(on(this.cbuttons, 'onImage', lang.hitch(this, this._onImageClick)));
      },

      _setFieldVisible: function(value) {
        var eVal = value.replace(/^\{|\}$/g,'');
        var trs = this.fieldsTable.getRows();
        array.forEach(trs, lang.hitch(this,function(tr){
          var rowData = this.fieldsTable.getRowData(tr);
          if(rowData.name === eVal){
            rowData.visibility = true;
            this.fieldsTable.editRow(tr, rowData);
          }
        }));
      },

      _onBoldClick: function() {
        this._wrapAroundSelection(this.customContentTA,'<b>','</b>');
      },

      _onItalicClick: function() {
        this._wrapAroundSelection(this.customContentTA,'<i>','</i>');
      },

      _onUnderlineClick: function() {
        this._wrapAroundSelection(this.customContentTA,'<u>','</u>');
      },

      _onHyperlinkClick: function() {
        var cnfg = {};
        if(this.customContentTA.selectionStart >= 0){
          var startPos = this.customContentTA.selectionStart;
          var endPos = this.customContentTA.selectionEnd;
          cnfg.desc = this.customContentTA.value.substring(startPos, endPos);
        }
        var args = {
         config:cnfg
        };
        this._openHLEdit(this.wnls.hyperlinkproperties, args);
      },

      _onImageClick: function() {
        var args = {
         config:{}
        };
        this._openImgEdit(this.wnls.imageproperties, args);
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
          this.titleAddButton.items = data;
          this.customContentAddButton.items = data;
        }
      },

      getConfig: function() {
        var config = {
          title:lang.trim(this.titleTextBox.get('value')),
          fieldInfos:[]
        };
        var trs = this.fieldsTable.getRows();
        array.forEach(trs, lang.hitch(this,function(tr){
          var rowData = this.fieldsTable.getRowData(tr);
          if (rowData.visibility) {
            var obj = {
              fieldName: rowData.name,
              label: rowData.alias,
              visible: true
            };
            if(tr.fieldInfo.format){
              obj.format = tr.fieldInfo.format;
            }
            config.fieldInfos.push(obj);
          }
        }));
        if(this.customContentTA.value && this.customContentTA.value.length > 0){
          config.description = this.customContentTA.value.replace( new RegExp('\r?\n','g'), '<br>');
        }
        config.showAttachments = this.showAttachmentsCbx.getValue();
        config.tr = this.tr;
//        console.info (config);
        return config;
      },

      setFields:function(fields){
        if(fields instanceof Array){
          this._setFields(fields);
        }
      },

      _setFields:function(fields){
        this.fields = array.filter(fields, function(item) {
          return item.type !== 'esriFieldTypeGeometry';
        });
        if (this.fields.length > 0) {
          array.forEach(this.fields, lang.hitch(this, function(fieldInfo) {
            this._getConfigFieldInfo(fieldInfo);
          }));
        } else {
          this._addEmptyMenuItem();
        }
      },

      _getConfigFieldInfo: function(fieldInfo){
        if(!this.config.fieldInfos){
          this._addRow(fieldInfo, null);
          return;
        }
        var added = array.some(this.config.fieldInfos, lang.hitch(this, function(fldInfo) {
          if(fldInfo.fieldName.toLowerCase() === fieldInfo.name.toLowerCase()){
            fldInfo.type = fieldInfo.type;
            fldInfo.name = fieldInfo.name;
            this._addRow(fieldInfo, fldInfo);
            return true;
          }
        }));
        if(!added){
          this._addRow(fieldInfo, null);
        }
      },

      _insertAtCursor:function(myField, myValue) {
        var sel;
        //IE support
        if (document.selection) {
          myField.focus();
          sel = document.selection.createRange();
          sel.text = myValue;
        }
        //MOZILLA and others
        else if (myField.selectionStart || myField.selectionStart === '0') {
          var startPos = myField.selectionStart;
          var endPos = myField.selectionEnd;
          myField.value = myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos, myField.value.length);
          myField.selectionStart = startPos + myValue.length;
          myField.selectionEnd = startPos + myValue.length;
        } else {
          myField.value += myValue;
        }
      },

      _wrapAroundSelection:function(myField, myValue1, myValue2) {
        var sel;
        //IE support
        if (document.selection) {
          myField.focus();
          sel = document.selection.createRange();
          sel.text = myValue1 + myValue2;
        }
        //MOZILLA and others
        else if (myField.selectionStart >= 0) {
          //|| myField.selectionStart === '0'
          var startPos = myField.selectionStart;
          var endPos = myField.selectionEnd;
          myField.value = myField.value.substring(0, startPos) + myValue1 + myField.value.substring(startPos, endPos) +
            myValue2 + myField.value.substring(endPos, myField.value.length + myValue2.length + myValue1.length);
          myField.selectionStart = startPos + myValue1.length;
          myField.selectionEnd = startPos + myValue2.length;
        } else {
          myField.value += myValue1 + myValue2;
        }
      },

      _addRow:function(fieldInfo, cfi){
        var isNumeric = (this._isNumberType(fieldInfo.type) || fieldInfo.isnumber);
        var rowData = {
          visibility:(cfi)?cfi.visible:false,
          name:fieldInfo.name,
          alias:(cfi)?cfi.label:(fieldInfo.alias||fieldInfo.name),
          isnumber: isNumeric,
          isdate: (fieldInfo.type === 'esriFieldTypeDate' || fieldInfo.isdate)
        };
        var result = this.fieldsTable.addRow(rowData);
        if(result.success){
          result.tr.fieldType = fieldInfo.type;
          result.tr.fieldInfo = cfi||fieldInfo;
        }
      },

      _isNumberType: function (type) {
        var numberTypes = ['esriFieldTypeOID',
                           'esriFieldTypeSmallInteger',
                           'esriFieldTypeInteger',
                           'esriFieldTypeSingle',
                           'esriFieldTypeDouble'];
        return array.indexOf(numberTypes, type) >= 0;
      },

      _onHLEditOk: function() {
        var hyperlinkConfig = this.hyperlinkpuedit.getConfig();
//        console.info(hyperlinkConfig);

        if (hyperlinkConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        this.popup2.close();
        this.popupState = '';
        this._insertAtCursor(this.customContentTA,'<a href="' + hyperlinkConfig.url + '">'+ hyperlinkConfig.description + '</a>');
        this.customContentTA.selectionStart = this.customContentTA.value.length;
      },

      _onHLEditClose: function() {
        this.hyperlinkpuedit = null;
        this.popup2 = null;
      },

      _openHLEdit: function(title, args) {
        this.hyperlinkpuedit = new HyperlinkEdit({
          wnls: this.wnls,
          config: args.config || {},
          flinfo: this.flinfo
        });

        this.popup2 = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.hyperlinkpuedit,
          container: 'main-page',
          width: 540,
          buttons: [{
            label: this.wnls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onHLEditOk')
          }, {
            label: this.wnls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onHLEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.hyperlinkpuedit.startup();
      },

      _onImgEditOk: function() {
        var imageConfig = this.imagepuedit.getConfig();
//        console.info(imageConfig);

        if (imageConfig.length < 0) {
          new Message({
            message: this.nls.warning
          });
          return;
        }
        this.popup3.close();
        this.popupState = '';
        this._insertAtCursor(this.customContentTA,'<img src="' + imageConfig.url + '"/>');
      },

      _onImgEditClose: function() {
        this.imagepuedit = null;
        this.popup3 = null;
      },

      _openImgEdit: function(title, args) {
        this.imagepuedit = new ImageEdit({
          wnls: this.wnls,
          config: args.config || {},
          flinfo: this.flinfo
        });

        this.popup3 = new Popup({
          titleLabel: title,
          autoHeight: true,
          content: this.imagepuedit,
          container: 'main-page',
          width: 540,
          buttons: [{
            label: this.wnls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onImgEditOk')
          }, {
            label: this.wnls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onImgEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.imagepuedit.startup();
      },

      _openFieldEdit: function (name, tr) {
        this.fieldformatedit = new FieldFormatEdit({
          nls: this.wnls,
          tr: tr
        });
        this.fieldformatedit.setConfig(tr.fieldInfo || {});
        this.popup4 = new Popup({
          titleLabel: name,
          autoHeight: true,
          content: this.fieldformatedit,
          container: 'main-page',
          width: 460,
          buttons: [
            {
              label: this.wnls.ok,
              key: keys.ENTER,
              onClick: lang.hitch(this, '_onFieldEditOk')
            }, {
              label: this.wnls.cancel,
              key: keys.ESCAPE
            }
          ],
          onClose: lang.hitch(this, '_onFieldEditClose')
        });
        html.addClass(this.popup.domNode, 'widget-setting-popup');
        this.fieldformatedit.startup();
      },

      _onFieldEditOk: function () {
        var fieldInfo = this.fieldformatedit.getConfig();
        //console.info(fieldInfo);
        this.fieldsTable.editRow(this.fieldformatedit.tr, fieldInfo);
        this.popup4.close();
      },

      _onFieldEditClose: function () {
        this.fieldformatedit = null;
        this.popup4 = null;
      }
    });
  });
