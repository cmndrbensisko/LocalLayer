///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define(['dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/on',
  'dojo/Evented',
  'jimu/utils'
],
function(declare, _WidgetBase, lang, array, html, on, Evented, utils) {
  return declare([_WidgetBase, Evented], {
    // summary:
    //    the params format:
    //    items: [{
    //      key:
    //      label: <as innerHTML set to UI>
    //    }]
    //    box: String|DomNode.
    //      if not set, use the menu's parent node to calculate the menu's position.
    'class': 'add-field-button',
    initialized: false,

    constructor: function(){
      this.state = 'closed';
    },
    postCreate: function(){
      this.btnNode = html.create('div', {
        'class': 'add-field-icon-btn'
      }, this.domNode);

      this.btnNode2 = html.create('div', {
        'class': 'plus-sign',
        'style': 'margin-top:8px;'
      }, this.btnNode);

      this.own(on(this.btnNode, 'click', lang.hitch(this, this._onBtnClick)));
      if(!this.box){
        this.box = this.domNode.parentNode;
      }
      this.own(on(this.domNode.parentNode.parentNode, 'click', lang.hitch(this, function(){
        if(this.dropMenuNode){
          this.closeDropMenu();
        }
      })));
    },

    _onBtnClick: function(evt){
      evt.stopPropagation();
      if(!this.dropMenuNode){
        this._createDropMenuNode();
      }
      if(this.state === 'closed'){
        this.openDropMenu();
      }else{
        this.closeDropMenu();
      }
    },

    _createDropMenuNode: function(){
      this.dropMenuNode = html.create('div', {
        'class': 'drop-menu',
        style: {
          display: 'none'
        }
      }, this.domNode);

      if(!this.items){
        this.items = [];
      }

      array.forEach(this.items, function(item){
        var node;
        if(item.key){
          node = html.create('div', {
            'class': 'menu-item',
            'itemId': item.key,
            innerHTML: item.label
          }, this.dropMenuNode);

          this.own(on(node, 'click', lang.hitch(this, function(){
            this.selectItem(item);
          })));
        }else{
          html.create('hr', {
            'class': 'menu-item-line'
          }, this.dropMenuNode);
        }
      }, this);
    },

    _getDropMenuPosition: function(){
      var outBox = html.getContentBox(this.box);
      var btnBox = html.getMarginBox(this.btnNode);
      var menuBox = html.getMarginBox(this.dropMenuNode);
      var pos = {};
      pos.top = menuBox.t - ((this.initialized)? 0 : btnBox.h);
      pos.right = outBox.w;
      this.initialized = true;
      return pos;
    },

    selectItem: function(item){
      this.closeDropMenu();
      this.emit('onMenuClick', item);
    },

    openDropMenu: function(){
      this.state = 'opened';
      html.setStyle(this.dropMenuNode, 'display', '');

      html.setStyle(this.dropMenuNode, utils.getPositionStyle(this._getDropMenuPosition()));

      this.emit('onOpenMenu');
    },

    closeDropMenu: function(){
      this.state = 'closed';
      html.setStyle(this.dropMenuNode, 'display', 'none');
      this.emit('onCloseMenu');
    }

  });
});
