///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
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

define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/html',
    'dojo/on',
    'dojo/aspect',
    'dojo/dom-construct',
    'dojo/dom-geometry',
    'dojo/dom-class',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'jimu/PanelManager',
    'jimu/WidgetManager'
  ],
  function(declare, lang, array, html, on, aspect,
    domConstruct, domGeometry, domClass, _WidgetBase, _TemplatedMixin, PanelManager,
    WidgetManager) {
    var clazz = declare([_WidgetBase, _TemplatedMixin], {
      baseClass: 'jimu-dnd-mobile-controller',
      templateString: '<div>' +
          '<div class="icon-section" data-dojo-attach-point="iconNode"></div>' +
          '<div class="container-section" data-dojo-attach-point="containerNode"></div>' +
        '</div>',
      appConfig: null,
      panelContainerNode: null,
      openIds: null,
      toolsCount: 0,

      postCreate: function() {
        this.inherited(arguments);
        this.panelManager = PanelManager.getInstance();
        this.widgetManager = WidgetManager.getInstance();
        this.openIds = [];
        this.createWidgetIcons();
        if (this.toolsCount === 0) {
          html.setStyle(this.domNode, 'display', 'none');
        }
        this.own(on(this.iconNode, 'click', lang.hitch(this, function(event) {
          event.stopPropagation();
          if (domClass.contains(this.containerNode, 'in')) {
            domClass.remove(this.containerNode, 'in');
            domClass.add(this.containerNode, 'out');
          } else {
            domClass.remove(this.containerNode, 'out');
            domClass.add(this.containerNode, 'in');
          }
        })));
        this.own(on(document.body, 'click', lang.hitch(this, function (event) {
          if (domClass.contains(this.containerNode, 'in')) {
            var target = event.target || event.srcElement;
            if (!this.isPartOfPopup(target)) {
              domClass.remove(this.containerNode, 'in');
              domClass.add(this.containerNode, 'out');
            }
          }
        })));
      },

      destroyOnScreenWidgets: function() {
        array.forEach(this.appConfig.widgetOnScreen.widgets, function(widget) {
          if (widget.inPanel) {
            var pid = widget.id + '_panel';
            this.panelManager.destroyPanel(pid);
          } else {
            this.widgetManager.destroyWidget(widget.id);
          }
        }, this);
      },

      isPartOfPopup: function (target) {
        var node = this.containerNode;
        var isInternal = target === node || html.isDescendant(target, node);
        return isInternal;
      },

      setConfig: function(config) {
        this.appConfig = config;
        this.createWidgetIcons();
      },

      createWidgetIcons: function() {
        this.toolsCount = 0;
        domConstruct.empty(this.containerNode);
        if (this.appConfig && this.appConfig.widgetOnScreen) {
          array.forEach(this.appConfig.widgetOnScreen.widgets, function(widget) {
            // widgets in placeholder
            if (widget.uri && widget.closeable) {
              this._addItem(widget);
              this.toolsCount++;
            }
          }, this);
        }
      },

      _addItem: function(widget) {
        var widgetCopy = lang.clone(widget);
        var row = domConstruct.create('div', {
          'class': 'row'
        }, this.containerNode);
        domConstruct.create('div', {
          'class': 'widget-icon column',
          'style': 'background: url(' + widget.icon + ') no-repeat;'
        }, row);
        domConstruct.create('div', {
          'class': 'widget-label jimu-ellipsis column',
          title: widget.label,
          innerHTML: widget.label
        }, row);

        this.own(on(row, 'click', lang.hitch(this, function(event) {
          var box;
          event.stopPropagation();
          if (widget.inPanel) {
            box = domGeometry.getMarginBox(this.panelContainerNode);
            widgetCopy.panel = {
              uri: 'themes/DashboardTheme/panels/OnScreenPanel/Panel',
              position: {
                relativeTo: 'browser',
                left: box.l,
                top: box.t,
                width: box.w,
                height: box.h
              }
            };
            this.panelManager.showPanel(widgetCopy)
            .then(lang.hitch(this, function(panel) {
              this.activePanel = panel;
              panel.setPosition({
                relativeTo: 'browser',
                left: box.l,
                top: box.t,
                width: box.w,
                height: box.h
              });
              return panel;
            }))
            .then(lang.hitch(this, function(panel) {
              this.panelManager.openPanel(panel);
            }));
          } else {
            box = domGeometry.getMarginBox(row);
            this._toggleOffPanelWidget(widget, box.l + box.w, box.t);
          }
          domClass.remove(this.containerNode, 'in');
          domClass.add(this.containerNode, 'out');
        })));
      },

      _toggleOffPanelWidget: function(widgetConfig, left, top) {
        var index = this.openIds.indexOf(widgetConfig.id);
        if (index >= 0) {
          this.widgetManager.closeWidget(widgetConfig.id);
          this.openIds.splice(index, 1);
        } else {
          this.widgetManager.loadWidget(widgetConfig).then(
              lang.hitch(this, function(widget) {
            this.openIds.push(widgetConfig.id);

            widget.setPosition({
              left: left,
              top: top,
              zIndex: 100,
              relativeTo: 'map'
            });
            this.widgetManager.openWidget(widget);

            this.own(aspect.after(widget, 'onClose', lang.hitch(this, function() {
              index = this.openIds.indexOf(widgetConfig.id);
              if (index >= 0) {
                this.openIds.splice(index, 1);
              }
            })));
          }));
        }
      },

      setPanelPosition: function(pos) {
        if (this.activePanel) {
          pos.relativeTo = 'layout';
          this.activePanel.setPosition(pos);
        }
      }
    });
    return clazz;
  });