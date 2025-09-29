sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
	"sap/ui/core/ValueState"
], 
    /**
     * provide app-view type models (as in the first "V" in MVVC)
     * 
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel
     * @param {typeof sap.ui.Device} Device
     * 
     * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
     */
    function (JSONModel, Device, ValueState) {
        "use strict";

        return {
            createDeviceModel: function () {
                var oModel = new JSONModel(Device);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
        },

            createLocalHeaderInfoModel: function(){
                var locHeaderModel = new JSONModel();
			    var headerItem = {
				"stockRequestType": "",//OData - ReqOrd or ReqMan
				"plant":"",//Werks
				"warehouseNumber":"",//Lgnum
                "reqForOrderFields":false,//
				"manualRequestFields":false,
				"plDateTime":"",//Pdatu and Pzeit
                "transferPriority":"",//Tbpri	
                "movementType":"",//Bwart
                "orderNumber":"",//Aufnr
                "requirementNumber":"",//betyp - reqt type(N or P)
                "requirementDesc":"",//benum - reqt desc
				"reqtDescEnabled":true,
                "storageLoc":"",//Lgort
				"destStorageType":"",
				"destStorageBin":"",	

                "quantityReqType":"",
                "targetQtyFields":false,
                "targetQty":"",//Gmeng
                "targetUoM":"",//Erfme
				"dateValue":new Date()
				
			};

			
			locHeaderModel.setData(headerItem);
			locHeaderModel.setDefaultBindingMode("TwoWay");
			return locHeaderModel;

            },



		/*	Method: createValStateModel
		 *	Created By: IBM Fiori Team		 	|Created On: 23-02-2024
		 *	Description/Usage: create internal value state model
		 */
		createValStateModel: function () {
			var valueStateModel = new JSONModel();
			var oItem = {
				"workOrdValState": ValueState.None,
				"plantValState":ValueState.None,
				"warehouseValState":ValueState.None,
				"storageLocValState":ValueState.None,
				"dateTimeValState":ValueState.None,
				"movementTypeValState":ValueState.None,
				"ReqtNumberValState":ValueState.None,
				"ReqtDescValState":ValueState.None,
				"storageTypeValState":ValueState.None,
				"storageBinValState":ValueState.None
				
			};
			valueStateModel.setData(oItem);
			valueStateModel.setDefaultBindingMode("TwoWay");
			return valueStateModel;
		},

         /*	Method: createVHKeyModel
		 *	Created By: IBM Fiori Team		 	|Created On: Jan 5 2024
		 *	Last Updated: IBM Fiori Team	 	
		 *	Description/Usage: create internal value help key model
		 */
		createVHKeyModel: function () {
			var omModel = new JSONModel();
			var mItem = {
				"Title": "",
				"key": "",
				"descriptionKey": ""
			};
			omModel.setData(mItem);
			omModel.setDefaultBindingMode("TwoWay");
			return omModel;
        },
            /*	Method: createColumnModel
		    *	Created By: IBM Fiori Team		 	|Created On: Jan 5 2024
		    *	Last Updated: IBM Fiori Team	 	
		    *	Description/Usage: create internal column model
		    */
		 
		createColumnModel: function () {
			var oColModel = new JSONModel();
			var colItem = {
				
				"storageLoc": {
					"cols": [{
						"label": "{i18n>lblStorageLoc}",
						"template": "storageLoc"
					}, {
						"label": "{i18n>lblDescription}",
						"template": "Description"
					}]
				},
				"movementType": {
					"cols": [{
						"label": "{i18n>lblMovementType}",
						"template": "MovementType"
					}, {
						"label": "{i18n>lblDescription}",
						"template": "Description"
					}]
				},
				//column model for Plants
				"plants": {
					"cols": [{
						"label": "{i18n>lblPlant}",
						"template": "Plant"
					}, {
						"label": "{i18n>lblDescription}",
						"template": "Description"
					}]
				},
				"warehouse":{
					"cols": [{
						"label": "{i18n>lblWarehouseNumber}",
						"template": "WarehouseNumber"
					}, {
						"label": "{i18n>lblDescription}",
						"template": "Description"
					}]
				},

				//01-04-2024 For Valuehelp of Destination Storage Type
				"destStorageType":{
					"cols":[{
						"label": "{i18n>lblDestStorageType}",
						"template": "Storage Type"
					}, {
						"label": "{i18n>lblDescription}",
						"template": "Description"
					}]
				},

				//For Valuehelp of Destination Storage Bin
				"storageBin":{
					"cols":[{
						"label": "{i18n>lblStorageType}",
						"template": "Storage Type"
					}, {
						"label": "{i18n>lblStorageBin}",
						"template": "Storage Bin"
					}, {
						"label": "{i18n>lblPutawayBlock}",
						"template": "Putaway Block"
					}]
				}
			};
			oColModel.setData(colItem);
			oColModel.setDefaultBindingMode("TwoWay");
			return oColModel;
		},

        /*	Method: createValueHelpModel
		 *	Created By: IBM Fiori Team		 	|Created On: 
		 *	Description/Usage: create internal common value help model across application
		 */
		createValueHelpModel: function () {
			var oVHModel = new JSONModel();
			var vhItem = {
				"Plant": [],
				"WarehouseNumber": [],
				"MovementType": [],
				"DestStorageType":[],//01-04-2024 - For Destination Storage Type value help
				"StorageBin":[]//For Destination Storage Bin value help
				
			};
			oVHModel.setData(vhItem);
			oVHModel.setDefaultBindingMode("TwoWay");
			return oVHModel;
		},

		/*	Method: createlocalGoodsItemModel
		 *	Created By: IBM Fiori Team		 	|Created On: Jan 08 2024
		 *	Last Updated: IBM Fiori Team	 	
		 *	Description/Usage: create internal local goods item model
		 */
		 createlocalGoodsItemModel: function () {
			var locGoodsItemModel = new JSONModel();
			var goodsItem = [];
			locGoodsItemModel.setData(goodsItem);
			locGoodsItemModel.setDefaultBindingMode("TwoWay");
			return locGoodsItemModel;
		},

		/*	Method: createGoodsItemJSONModel
		 *	Created By: IBM Fiori Team		 	|Created On: Jan 08 2024
		 *	Last Updated: IBM Fiori Team	 	
		 *	Description/Usage: create internal goods item model
		 */
		 createGoodsItemJSONModel: function () {
			var goodsItemJSONModel = new JSONModel();
			var oItem = [];
			goodsItemJSONModel.setData(oItem);
			goodsItemJSONModel.setDefaultBindingMode("TwoWay");
			return goodsItemJSONModel;
		},

		
    };
});