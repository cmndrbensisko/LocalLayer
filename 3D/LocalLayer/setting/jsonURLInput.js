require(["dojo/_base/declare", "jimu/dijit/ServiceURLInput", 'dojo/Deferred', 'dojo/_base/lang', "dojo/parser"], function(declare, ServiceURLInput, Deferred, lang) {
    declare("jimu/dijit/jsonURLInput", [ServiceURLInput], {
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
          dojo.xhrGet({
            url:lang.trim(serviceUrl),
            handleAs: "json",
            headers:{
              "X-Requested-With": null
            }
          }).then(
            function(response){
              return response;
            }).then(
              lang.hitch(this, function(restData) {
                if (arrayName){
                  restData = restData[arrayName]
                }
                var status = this.onFetch({
                  url: this.getValue(),
                  data: restData
                });
                if (status){
                  def.resolve('success');
                }else {
                  def.reject('error');
                }
              }), lang.hitch(this, function(err){
                def.reject(err);
              })
            )
          }
        })
});