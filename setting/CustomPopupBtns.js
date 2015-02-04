define(['dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/on',
  'dojo/Evented'
],
function(declare, _WidgetBase, lang, array, html, on, Evented) {
  return declare([_WidgetBase, Evented], {
    'class': 'custom-popup-buttons',
    nls: null,

    postCreate: function(){
      this.boldBtnNode = html.create('div', {
        'class': 'icon-btn bold-btn',
        'title': this.nls.insertbold
      }, this.domNode);

      this.boldBtnNode.innerHTML = 'B';

      this.italicBtnNode = html.create('div', {
        'class': 'icon-btn italic-btn',
        'title': this.nls.insertitalic
      }, this.domNode);

      this.italicBtnNode.innerHTML = 'I';

      this.underBtnNode = html.create('div', {
        'class': 'icon-btn under-btn',
        'title': this.nls.insertunderline
      }, this.domNode);

      this.underBtnNode.innerHTML = 'U';

      this.seperatorNode = html.create('div', {
        'class': 'seperator'
      }, this.domNode);

      this.hyperlinkBtnNode = html.create('div', {
        'class': 'icon-btn hyperlink-btn',
        'title': this.nls.inserthyperlink
      }, this.domNode);

      this.imageBtnNode = html.create('div', {
        'class': 'icon-btn image-btn',
        'title': this.nls.insertimage
      }, this.domNode);

      this.own(on(this.boldBtnNode, 'click', lang.hitch(this, this._onBoldClick)));
      this.own(on(this.italicBtnNode, 'click', lang.hitch(this, this._onItalicClick)));
      this.own(on(this.underBtnNode, 'click', lang.hitch(this, this._onUnderClick)));
      this.own(on(this.hyperlinkBtnNode, 'click', lang.hitch(this, this._onHyperClick)));
      this.own(on(this.imageBtnNode, 'click', lang.hitch(this, this._onImageClick)));
    },

    _onBoldClick: function(evt){
      evt.stopPropagation();
      this.emit('onBold');
    },

    _onItalicClick: function(evt){
      evt.stopPropagation();
      this.emit('onItalic');
    },

    _onUnderClick: function(evt){
      evt.stopPropagation();
      this.emit('onUnderline');
    },

    _onHyperClick: function(evt){
      evt.stopPropagation();
      this.emit('onHyperlink');
    },

    _onImageClick: function(evt){
      evt.stopPropagation();
      this.emit('onImage');
    }

  });
});
