sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/m/ColumnListItem",
	"sap/m/Label",
	"sap/m/Token",
	"sap/m/SearchField",
	"sap/m/MessageBox"
], function (Controller, JSONModel, Fragment, ColumnListItem, Label, Token, SearchField, MessageBox) {
	"use strict";
	var scanModel, scanProperty, oResourceBundle;
	return Controller.extend("com.reckitt.zpestockrequest.controller.BaseController", {
		/*	Method: onInit
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|Updated On: 
		 *	Description/Usage: Initialising controller entry ppoint
		 **/
		onInit: function () {
           
		},
		/*	Method: fnObjectToJSON
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|Updated On: 
		 *	Description/Usage: rearrange the object to json model and disconnect parent model relation.
		 **/
		fnObjectToJSON: function (object) {
			var obj = {};
			for (var keyproperty in object) {
				obj[keyproperty] = object[keyproperty];
			}
			return obj;
			
		},
		/*	Method: fnInitMessageManager
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|Updated On: 
		 *	Description/Usage: Initialising message manager for error management
		 **/
		fnInitMessageManager: function () {
			var oMessageManager, oModel, oView;
			oView = this.getView();
			oMessageManager = sap.ui.getCore().getMessageManager();
			this.getOwnerComponent().setModel(oMessageManager.getMessageModel(), "message");
			oMessageManager.registerObject(oView, true);
			oModel = new JSONModel({
				MandatoryInputValue: "",
				DateValue: null,
				IntegerValue: undefined,
				Messages: ""
			});
			oView.setModel(oModel);
		},
        /*	Method: fnValueHelpDialog
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|Updated On: 
		 *	Description/Usage: for input valuehelps dynamic columns are created with livesearch
		 **/
         fnValueHelpDialog: function (control, entityset, columnData, data) {
			this._oBasicSearchField = new SearchField({
				showSearchButton: false,
				liveChange: function (oEvent) {
					var sQuery = oEvent.getSource().getValue();
					var columns = [];
					columnData.cols.forEach(function (col) {
						var oFilter = new sap.ui.model.Filter(col.template, sap.ui.model.FilterOperator.Contains, sQuery);
						columns.push(oFilter);
					});
					var allFilter = new sap.ui.model.Filter(columns, false);
					var oBinding = oEvent.getSource().getParent().getParent().getParent().getItems()[1].getBinding("rows");
					oBinding.filter(allFilter);
				}
			});
			this._oInput = control;
			this.oColModel = new JSONModel();
			this.oColModel.setData(columnData);
			var aCols = this.oColModel.getData().cols;
			this.oVHModel = new JSONModel();
			var obj = {};
			obj[entityset] = data;
			this.oVHModel.setData(obj);
			control.setModel(this.oVHModel);
			Fragment.load({
				name: "com.reckitt.zpestockrequest.view.Fragments.ValueHelpDialog",
				controller: this
			}).then(function (oFragment) {
				this._oValueHelpDialog = oFragment;
				this.getView().addDependent(this._oValueHelpDialog);
				this._oValueHelpDialog.getFilterBar().setBasicSearch(this._oBasicSearchField);
				this._oValueHelpDialog.getFilterBar().setShowGoOnFB(false);
				this._oValueHelpDialog.getTableAsync().then(function (oTable) {
					oTable.setModel(this.oVHModel);
					oTable.setModel(this.oColModel, "columns");
					if (oTable.bindRows) {
						oTable.bindAggregation("rows", "/" + entityset);
					}
					if (oTable.bindItems) {
						var that = this;
						oTable.bindAggregation("items", "/" + entityset, function () {
							return new ColumnListItem({
								cells: aCols.map(function (column) {
									// Check if this column needs formatting (for quantity fields)
									if (column.formatter === "quantity") {
										return new Label({
											text: {
												path: column.template,
												formatter: that.formatQuantityWithSeparator.bind(that)
											}
										});
									} else {
										return new Label({
											text: "{" + column.template + "}"
										});
									}
								})
							});
						}.bind(this));
					}
					this._oValueHelpDialog.update();
				}.bind(this));
				var oToken = new Token();
				oToken.setKey(this._oInput.getSelectedKey());
				oToken.setText(this._oInput.getValue());
				this._oValueHelpDialog.setTokens([oToken]);
				this._oValueHelpDialog.open();
			}.bind(this));
		},
		/*	Method: onValueHelpOkPress
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|Updated On: 
		 *	Description/Usage: Valuehelp Ok event 
		 **/
		onValueHelpOkPress: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			var key = aTokens[0].getKey();
			this._oInput.setValue(key);
			if (oEvent.getSource().getKey() === "storageLoc") {
				this.onSubmitStoargeLoc();
			}
			if (oEvent.getSource().getKey() === "CostCenter") {
				this.onCostCenterEnter();
			}

			//01-04-2024 - if user chooses destination storage type from value help
			//Note: Removed auto-population of storage bin to prevent incorrect data mapping
			if (oEvent.getSource().getKey() === "Storage Type") {
				// Only set the storage type value, do not auto-populate storage bin
				// this.onSubmitDestStorageType(aTokens[0].getText());
			}

			//if user chooses storage bin from value help, this method is called
			if (oEvent.getSource().getKey() === "Storage Bin") {
				this.onSubmitDestStorageBin(aTokens[0].getKey());
			}

			this._oValueHelpDialog.close();
		},
		/*	Method: onValueHelpCancelPress
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|
		 *	Description/Usage: Valuehelp Cancel event 
		 **/
		onValueHelpCancelPress: function () {
			this._oValueHelpDialog.close();
		},
		/*	Method: onValueHelpAfterClose
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|
		 *	Description/Usage: Valuehelp Close event 
		 **/
		onValueHelpAfterClose: function () {
			this._oValueHelpDialog.destroy();
		},
		/*	Method: fnPreLoadingService
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|Updated On: 
		 *	Description/Usage: Loading of all the entity sets this function is called during the initial loading of the application in init function of main controller
		 **/
		fnPreLoadingService: function (oModel) {

			//SM15 - f4Model data has to be loaded in manifest.json
			//This model loads the f4 value help

			this.f4Model = this.getOwnerComponent().getModel("f4Model");
			var that = this;
			Promise.all([
				this.fnReadEntitySet(this.f4Model, "/WarehsenumSHSet", ""), //Warehouse number
				// this.fnReadEntitySet(this.f4Model, "/MovTypeSet", ""), 
				
				this.fnReadEntitySet(this.f4Model,"/PlantSHSet","")

			]).then(that.fnBuildSuccesslist.bind(that),
				that.fnHandleError.bind(that));
		},
		/*	Method: fnBuildSuccesslist
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|Updated On: 
		 *	Description/Usage: in this method we will set the entityset data to the local entityset
		 **/
		fnBuildSuccesslist: function (values) {
			this.fnFormatEntitySet(values[0].results, "/WarehsenumSHSet", "/WarehouseNumber");
			// this.fnFormatEntitySet(values[1].results, "/MovTypeSet", "/MovementType");
			this.fnFormatEntitySet(values[1].results, "/PlantSHSet", "/Plant");
		},


		/*	Method: fnHandleError
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|
		 *	Description/Usage: common promise error handler method used to capture any error while servive call
		 **/
		fnHandleError: function (reason) {
			MessageBox.error(reason);
		},
		/*	Method: fnReadEntitySet
		 *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
		 *	Last updated: IBM Fiori Team      	|Updated On: 
		 *	Description/Usage: To read the entitysets
		 **/
		fnReadEntitySet: function (oModel, sEntitySet, mParameters) {
			return new Promise(function (resolve, reject) {
				oModel.setUseBatch(false);
				oModel.read(sEntitySet, {
					filters: !mParameters ? mParameters.filters : "",
					// filters: mParameters ? mParameters.filters : "",
					sorters: !mParameters ? mParameters.sorters : "",
					success: function (oData) {
						resolve(oData);
					},
					error: function (error) {
						reject(error);
					}
				});
			});
		},/*	Method: fnFormatEntitySet
        *	Created By: IBM Fiori Team      	|Created On: Jan 09 2024
        *	Last updated: IBM Fiori Team      	|Updated On: 
        *	Description/Usage: Checking each entityset and taking the required properties and bind to the json model 
        **/
       fnFormatEntitySet: function (oDataResult, sEntitySet, sColumnSet) {
           var CommonValueHelpModel = this.getOwnerComponent().getModel("CommonValueHelpModel");
           switch (sEntitySet) {
               //Equipment Set
           case "/WarehsenumSHSet":
               var newData1 = [];
               oDataResult.forEach(function (obj) {
                   var nItem = {
                       "WarehouseNumber": obj.Lgnum,
                       "Description": obj.Lnumt
                       
                   };
                   newData1.push(nItem);
               });
               CommonValueHelpModel.setProperty(sColumnSet, newData1);
               CommonValueHelpModel.refresh();
               break;
           case "/MovTypeSet":
               var newData2 = [];
               oDataResult.forEach(function (obj) {
                   var nItem = {
                       "MovementType": obj.Bwlvs,
					   "Description":obj.Lbwat
                       
                   };
                   newData2.push(nItem);
               });
               CommonValueHelpModel.setProperty(sColumnSet, newData2);
               CommonValueHelpModel.refresh();
               break;
           
        	// 01-04-2024 Destination Storage Type value help
			case "/DestStorageTypSHSet":
				var destStorageTypes = [];
				oDataResult.forEach(function (obj) {
					var nItem = {
						"Storage Type": obj.LGTYP,
						"Description": obj.LTYPT
						
					};
					destStorageTypes.push(nItem);
				});
				CommonValueHelpModel.setProperty(sColumnSet, destStorageTypes);
				CommonValueHelpModel.refresh();	
			  	break;

			// Destination Storage Bin value help
			case "/StorageBinSHSet":
				var storageBins = [];
				oDataResult.forEach(function (obj) {
					var nItem = {
						"Storage Type": obj.Lgtyp,
						"Storage Bin": obj.Lgpla,
						"Putaway Block": obj.Skzue
					};
					storageBins.push(nItem);
				});
				CommonValueHelpModel.setProperty(sColumnSet, storageBins);
				CommonValueHelpModel.refresh();
				break;

			// Batch value help with formatted quantity
			case "/BatchSHSet":
				var batches = [];
				oDataResult.forEach(function (obj) {
					var nItem = {
						"Batch": obj.Charg,
						"Material": obj.Matnr,
						"Qty Still To Be Issued": obj.Clabs,
						"UoM": obj.Meins
					};
					batches.push(nItem);
				});
				CommonValueHelpModel.setProperty(sColumnSet, batches);
				CommonValueHelpModel.refresh();
				break;

           	case "/PlantSHSet":
               var plantData = [];
               oDataResult.forEach(function (obj) {
                   var nItem = {
                       "Plant": obj.Werks,
                       "Description": obj.Name1
                   };
                   plantData.push(nItem);
               });
               CommonValueHelpModel.setProperty(sColumnSet, plantData);
               CommonValueHelpModel.refresh();
               break;
           
           }
       },

	 

       /*	Method: fnOpenFragment
        *	Created By: IBM Fiori Team      	|Created On: 10-02-2022
        *	Last updated: IBM Fiori Team      	|Updated On: 10-02-2022
        *	Description/Usage: To Open Frgamnet it is the common function
        **/
       fnOpenFragment: function (fragmentname) {
           Fragment.load({
               name: "com.reckitt.zpestockrequest.view.Fragments." + fragmentname,
               controller: this
           }).then(function (oFragment) {
               this._oDialog = oFragment;
               this.getView().addDependent(this._oDialog);
               this._oDialog.open();
           }.bind(this));
       },

       /*	Method: formatQuantityWithSeparator
        *	Created By: IBM Fiori Team      	|Created On: Oct 2024
        *	Last updated: IBM Fiori Team      	|Updated On: 
        *	Description/Usage: Format quantity numbers with thousand separator (comma)
        **/
       formatQuantityWithSeparator: function (value) {
           if (!value || value === "" || isNaN(value)) {
               return value;
           }
           
           // Convert to number and format with thousand separator
           var numberValue = parseFloat(value);
           var formattedValue = numberValue.toLocaleString('en-US', {
               minimumFractionDigits: 0,
               maximumFractionDigits: 3
           });
           
           return formattedValue;
       }
   });
});