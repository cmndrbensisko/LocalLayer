require(["dojo/_base/declare", "esri/layers/WebTiledLayer", 'dojo/on', "jimu/dijit/ServiceURLInput", 'dojo/Deferred', 'dojo/_base/lang', "dojo/parser"], function(declare, WebTiledLayer, on, ServiceURLInput, Deferred, lang) {
    declare("jimu/dijit/webtileURLInput", [ServiceURLInput], {
        postCreate: function() {
            this.inherited(arguments);
        },
        _onServiceUrlChange: function(serviceUrl, arrayName) {
          var def = new Deferred();

          def.then(lang.hitch(this, function(){
            this._valid();
          }), lang.hitch(this, function(){
            this._inValid();
            this.onFetchError();
          }));

          this._validating();
          try{
            var isTiledLayer = new WebTiledLayer(lang.trim(serviceUrl), {"subDomains": ["a", "b", "c"]})
            def.resolve('success');
            var status = this.onFetch({
              url: this.getValue(),
              data: isTiledLayer
            });
            if (status){
              def.resolve('success');
            }else {
              def.reject('error');
            }
          }
          catch(err){
            def.reject(err);
          }
        }
    });
});