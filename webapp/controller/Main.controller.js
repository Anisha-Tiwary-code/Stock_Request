sap.ui.define([
    "./BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/ValueState",
    "sap/ui/core/format/DateFormat"

],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, Controller, JSONModel, MessageBox, ValueState, DateFormat) {
        "use strict";
        var oRes;
        var plannedDateFormat = "";
        const constStorageLoc = "2000";
        const reqtNumberN = "N";
        const reqtNumberP = "P";
        const manualReqMovement = "912"; //Additional Stock Request
        const reqForOrderMovement = "319"; //
        const maxMaterialsforManualReq = 25; // change to 25 when user testing is done
        var decimalNotation = ""; //X- 1,234,567.89, Y- 1 234 567,89, Z- 1.234.567,89
        var decimalFormat = "";

        return BaseController.extend("com.reckitt.zpestockrequest.controller.Main", {
            onInit: function () {
                oRes = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.fnInitMessageManager();



                //Planned Date Time should not let the user choose any date / time
                //prior to current date/time, hence setting minDate property to current Dt Time.
                this.getView().byId("planned").setMinDate(new Date());

                //Load the ECC user settings to check user's locale / timezone
                //accordingly, set the format of Planned Dt time.
                this.fnReadUserParameterstoSetDefaultValues();

                this.fnPreLoadingService();


            },

            fnReadUserParameterstoSetDefaultValues: function () {
                var stockReqModel = this.getOwnerComponent().getModel("stockReqModel");

                var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                var headerData = locHeaderModel.getData();
                var aFilters = [];

                var dateKey;
                var dateFormat = "MM/dd/YYYY HH:mm";

                stockReqModel.read("/StockReqHdrSet", {
                    filters: aFilters,
                    success: $.proxy(function (oRetrievedResult) {
                        sap.ui.core.BusyIndicator.hide();


                        if (oRetrievedResult.results[0]) {
                            headerData.plant = oRetrievedResult.results[0].Werks;
                            headerData.warehouseNumber = oRetrievedResult.results[0].Lgnum;
                            dateKey = oRetrievedResult.results[0].DatKey;
                            dateFormat = oRetrievedResult.results[0].DatText;

                            this.getView().getModel("locHeaderModel").refresh();
                            dateFormat = dateFormat.replaceAll("D", "d");//d has to be in lowercase for Date format

                            dateFormat = dateFormat.replaceAll("A", "Y");//Year field in date format is stored as AAAA in ECC for PT and ES

                            this.getView().byId("planned").setDisplayFormat(dateFormat + " HH:mm");

                            plannedDateFormat = dateFormat + " HH:mm";
                            /* Fetching decimal notation and format set by user by Veera Sudheer */
                            decimalFormat = oRetrievedResult.results[0].DecText;
                            decimalNotation = oRetrievedResult.results[0].DecKey;

                            // this.getView().byId("idPlannedDate").setDisplayFormat(dateFormat);

                        }

                    }, this),
                    error: $.proxy(function (oError) {
                        sap.ui.core.BusyIndicator.hide();

                        if (oError.responseText) {
                            var response = JSON.parse(oError.responseText);
                            var errorList = response.error.innererror.errordetails;
                            var errorMsgs = [];
                            var ERROR = "";
                            for (var i = 0; i < errorList.length; i++) {
                                errorMsgs.push(errorList[i].message);
                                ERROR = ERROR + errorList[i].message + "\n";
                            }
                            MessageBox.error(ERROR);
                        }

                    }, this)

                })

            },

            /*	Method: onAfterRendering
             *	Created By: IBM Fiori Team      	|Created On: Jan 05 2024
             *	Last updated: IBM Fiori Team      	
             *	Description/Usage: Method is called everytime when the view is rendered
             */
            onAfterRendering: function () {
                this.getView().getModel("locHeaderModel").refresh();
            },

            /* Method: onSelectStockRequestType
             * This method is called when the user Selects Stock Request Type
             * 
             * 
             */

            onSelectStockRequestType: function (event) {

                //default Storage Location to 2000
                this.getView().getModel("locHeaderModel").getData().storageLoc = constStorageLoc;

                //Set Stock Request type in local model

                var index = event.getParameter("selectedIndex");
                var stockReqType = event.getSource().getButtons()[index].getText();
                var headerData = this.getView().getModel("locHeaderModel").getData();
                headerData.stockReqType = stockReqType;

                this.clearItemsTable();//to clear the loaded data

                headerData.requirementDesc = "";
                headerData.orderNumber = "";

                if (index === 0) {//Request for Order
                    headerData.requirementNumber = reqtNumberP;
                    headerData.movementType = reqForOrderMovement;
                    headerData.reqForOrderFields = true;
                    headerData.manualRequestFields = false;

                    //Default Radio button selection to Request Remaining
                    this.getView().byId("idReqQty").setSelectedIndex(0);

                    //Requirement description to be auto-populated to order number in this case
                    headerData.reqtDescEnabled = false;

                    this.getView().byId("idOrderInput").setRequired(true);
                    this.onChangeOrderNumber();


                } else if (index === 1) {//Manual Request
                    headerData.requirementNumber = reqtNumberN;
                    headerData.movementType = manualReqMovement;
                    headerData.reqForOrderFields = false;
                    headerData.manualRequestFields = true;//to make the result table visible

                    headerData.reqtDescEnabled = true;
                    headerData.targetQtyFields = false;

                    this.getView().byId("idOrderInput").setRequired(false);
                }


                this.getView().getModel("locHeaderModel").refresh();

            },

            //Method called on selection of Remaining Quantity or Target Quantity radio button
            onSelectQtyRequestType: function (oEvent) {
                //If user chooses Target Quantity radio button, make other relevant fields visible
                this.clearItemsTable();//clear the Items table - load it only when user clicks on GO

                var index = oEvent.getParameter("selectedIndex");
                var quantityReqType = oEvent.getSource().getButtons()[index].getText();
                var headerData = this.getView().getModel("locHeaderModel").getData();
                headerData.quantityReqType = quantityReqType;

                if (index === 0) {//Request Remaining Quantity
                    headerData.targetQtyFields = false;

                } else if (index === 1) {//Request Target Quantity
                    headerData.targetQtyFields = true;
                }

                this.getView().getModel("locHeaderModel").refresh();

            },

            //Method called on F4 Value Help for Plant field
            onVHPlant: function (oEvent) {
                var control = oEvent.getSource();

                this.clearValueStates();

                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/Title", oRes.getText("lblPlant"));
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/key", "Plant");
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/descriptionKey", "Description");
                var columns = this.getOwnerComponent().getModel("ColumnModel").getObject("/plants");
                var data = this.getOwnerComponent().getModel("CommonValueHelpModel").getObject("/Plant");
                var entityset = "Plant";

                //fnValueHelpDialog is in Base Controller

                this.fnValueHelpDialog(control, entityset, columns, data);


            },

            //Method called on F4 Value Help for Warehouse Number field
            onVHWarehouseNumber: function (oEvent) {

                var control = oEvent.getSource();

                this.clearValueStates();

                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/Title", oRes.getText("lblWarehouseNumber"));
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/key", "WarehouseNumber");
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/descriptionKey", "Description");
                var columns = this.getOwnerComponent().getModel("ColumnModel").getObject("/warehouse");
                var data = this.getOwnerComponent().getModel("CommonValueHelpModel").getObject("/WarehouseNumber");
                var entityset = "WarehouseNumber";
                this.fnValueHelpDialog(control, entityset, columns, data);
            },

            //Method called on F4 Value Help for Movement Type field - implemented on Jan 9 2024
            onVHMovementType: function (oEvent) {
                var control = oEvent.getSource();

                this.clearValueStates();

                var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                var headerData = locHeaderModel.getData();

                var aFilters = [];
                var mParameters = {};
                var warehouseNumber = headerData.warehouseNumber;

                //pass warehouse Number as filter
                if (warehouseNumber) {
                    aFilters.push(new sap.ui.model.Filter("Lgnum", sap.ui.model.FilterOperator.EQ, warehouseNumber.trim().toUpperCase()));
                    mParameters.filters = aFilters;
                }

                // Promise.all([
                //     this.fnReadEntitySet(this.f4Model, "/MovTypeSet", mParameters)

                // ]).then(that.fnBuildSuccesslistforMovType.bind(that),
                //     // that.fnBuildSuccesslist.bind(that),
                //     that.fnHandleError.bind(that));
                var oModel = this.f4Model;
                oModel.setUseBatch(false);

                oModel.read("/MovTypeSet", {
                    filters: mParameters ? mParameters.filters : "",
                    sorters: !mParameters ? mParameters.sorters : "",
                    success: $.proxy(function (oRetrievedResult) {
                        sap.ui.core.BusyIndicator.hide();
                        this.fnFormatEntitySet(oRetrievedResult.results, "/MovTypeSet", "/MovementType");
                        this.loadMovementTypeValueHelp(control);

                    }, this),
                    error: $.proxy(function (oError) {
                        sap.ui.core.BusyIndicator.hide();

                        if (oError.responseText) {
                            var response = JSON.parse(oError.responseText);
                            var errorList = response.error.innererror.errordetails;
                            var errorMsgs = [];
                            var ERROR = "";
                            if (errorList) {
                                for (var i = 0; i < errorList.length; i++) {
                                    errorMsgs.push(errorList[i].message);
                                    ERROR = ERROR + errorList[i].message + "\n";
                                }
                            }
                            MessageBox.error(ERROR);
                        }

                    }, this)

                })

            },


            // fnBuildSuccesslistforMovType: function(values){
            //     this.fnFormatEntitySet(values[0].results, "/MovTypeSet", "/MovementType");

            // },

            loadMovementTypeValueHelp: function (control) {

                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/Title", oRes.getText("lblMovementType"));
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/key", "MovementType");
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/descriptionKey", "Description");
                var columns = this.getOwnerComponent().getModel("ColumnModel").getObject("/movementType");
                var data = this.getOwnerComponent().getModel("CommonValueHelpModel").getObject("/MovementType");
                var entityset = "MovementType";
                this.fnValueHelpDialog(control, entityset, columns, data);

            },

            //Method called on F4 Value Help for Destination Storage Type field to load data for Destination storage types
            //Implemented on Apr 1 2024 - by IBM Fiori team

            onVHDestStorageType: function (oEvent) {

                var control = oEvent.getSource();

                this.clearValueStates();

                var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                var headerData = locHeaderModel.getData();

                var aFilters = [];
                var mParameters = {};
                var warehouseNumber = headerData.warehouseNumber;

                //pass warehouse Number as filter
                if (warehouseNumber) {
                    aFilters.push(new sap.ui.model.Filter("LGNUM", sap.ui.model.FilterOperator.EQ, warehouseNumber.trim().toUpperCase()));
                    mParameters.filters = aFilters;
                }

                // var logonLanguage = sap.ui.getCore().getConfiguration().getLanguage();

                // //pass Language field Spras as filter
                // if(logonLanguage){
                //     aFilters.push(new sap.ui.model.Filter("Spras", sap.ui.model.FilterOperator.EQ, logonLanguage));

                //     mParameters.filters = aFilters;
                // }else{
                //     aFilters.push(new sap.ui.model.Filter("Spras", sap.ui.model.FilterOperator.EQ, "EN"));

                //     mParameters.filters = aFilters;
                // }


                var oModel = this.f4Model;
                oModel.setUseBatch(false);

                oModel.read("/DestStorageTypSHSet", {
                    filters: mParameters ? mParameters.filters : "",
                    sorters: !mParameters ? mParameters.sorters : "",
                    success: $.proxy(function (oRetrievedResult) {
                        sap.ui.core.BusyIndicator.hide();
                        this.fnFormatEntitySet(oRetrievedResult.results, "/DestStorageTypSHSet", "/DestStorageType");
                        this.loadStorageTypeValueHelp(control);

                    }, this),
                    error: $.proxy(function (oError) {
                        sap.ui.core.BusyIndicator.hide();

                        if (oError.responseText) {
                            var response = JSON.parse(oError.responseText);
                            var errorList = response.error.innererror.errordetails;
                            var errorMsgs = [];
                            var ERROR = "";
                            if (errorList) {
                                for (var i = 0; i < errorList.length; i++) {
                                    errorMsgs.push(errorList[i].message);
                                    ERROR = ERROR + errorList[i].message + "\n";
                                }
                            }
                            MessageBox.error(ERROR);
                        }

                    }, this)

                })

            },

            loadStorageTypeValueHelp: function (control) {

                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/Title", oRes.getText("lblDestStorageType"));

                //Key and value property texts are set from BaseController createColumnModel "cols" for destStorageType
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/key", "Storage Type");
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/descriptionKey", "Description");
                var columns = this.getOwnerComponent().getModel("ColumnModel").getObject("/destStorageType");//Defined in createColumnModel method in models.js
                var data = this.getOwnerComponent().getModel("CommonValueHelpModel").getObject("/DestStorageType");
                var entityset = "DestinationStorageType";
                this.fnValueHelpDialog(control, entityset, columns, data);

            },

            //Method to set Destination storage Bin after user chooses destination storage type
            //01-04-2024 - DEPRECATED: This method was causing incorrect auto-population
            //Removed to prevent description from auto-populating in storage bin field

            onSubmitDestStorageType: function (destStorageBin) {
                // This method is no longer used to prevent incorrect auto-population
                // Users should manually select storage bin from value help
                console.log("onSubmitDestStorageType called but auto-population disabled to prevent data mapping issues");
            },

            //Method called on F4 Value Help for Destination Storage Bin field
            //Implemented to load data from ZOD_PE_SEARCHHELPS_SRV/StorageBinSHSet by Anisha

            onVHDestStorageBin: function (oEvent) {
                console.log("onVHDestStorageBin called");
                var control = oEvent.getSource();

                this.clearValueStates();

                var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                var headerData = locHeaderModel.getData();

                var warehouseNumber = headerData.warehouseNumber;
                var destStorageType = headerData.destStorageType;
                // var oQuote = "'";
                // var destStorageTypeString = oQuote.concat(destStorageType, "'");

                //Validate that both warehouse number and storage type are present
                if (!warehouseNumber || warehouseNumber.trim().length === 0 || 
                    !destStorageType || destStorageType.trim().length === 0) {
                    MessageBox.error(oRes.getText("msgFillWarehouseAndStorageType"));
                    return;
                }

                var aFilters = [];
                var mParameters = {};

                //pass warehouse Number as filter (Lgnum)
                aFilters.push(new sap.ui.model.Filter("Lgnum", sap.ui.model.FilterOperator.EQ, warehouseNumber.trim().toUpperCase()));

                //pass destination storage type as filter (Lgtyp)
                aFilters.push(new sap.ui.model.Filter("Lgtyp", sap.ui.model.FilterOperator.EQ, destStorageType.trim()));

                mParameters.filters = aFilters;

                var oModel = this.f4Model;
                oModel.setUseBatch(false);

                oModel.read("/StorageBinSHSet", {
                    filters: mParameters ? mParameters.filters : "",
                    sorters: !mParameters ? mParameters.sorters : "",
                    success: $.proxy(function (oRetrievedResult) {
                        console.log("StorageBinSHSet success:", oRetrievedResult);
                        sap.ui.core.BusyIndicator.hide();
                        this.fnFormatEntitySet(oRetrievedResult.results, "/StorageBinSHSet", "/StorageBin");
                        this.loadStorageBinValueHelp(control);

                    }, this),
                    error: $.proxy(function (oError) {
                        sap.ui.core.BusyIndicator.hide();

                        if (oError.responseText) {
                            var response = JSON.parse(oError.responseText);
                            var errorList = response.error.innererror.errordetails;
                            var errorMsgs = [];
                            var ERROR = "";
                            if (errorList) {
                                for (var i = 0; i < errorList.length; i++) {
                                    errorMsgs.push(errorList[i].message);
                                    ERROR = ERROR + errorList[i].message + "\n";
                                }
                            }
                            MessageBox.error(ERROR);
                        }

                    }, this)

                })

            },

            loadStorageBinValueHelp: function (control) {
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/Title", oRes.getText("lblDestStorageBin"));

                //Key and value property texts are set from BaseController createColumnModel "cols" for storageBin
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/key", "Storage Bin");
                this.getOwnerComponent().getModel("VHKeyModel").setProperty("/descriptionKey", "Storage Type");
                var columns = this.getOwnerComponent().getModel("ColumnModel").getObject("/storageBin");//Defined in createColumnModel method in models.js
                var data = this.getOwnerComponent().getModel("CommonValueHelpModel").getObject("/StorageBin");
                var entityset = "StorageBin";
                this.fnValueHelpDialog(control, entityset, columns, data);

            },

            //Method to set Destination storage Bin after user chooses from value help
            onSubmitDestStorageBin: function (storageBin) {
                var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                var headerData = locHeaderModel.getData();

                headerData.destStorageBin = storageBin;

                locHeaderModel.refresh();

            },

            //Method called when user enters order number for Request for Order Stock type
            onChangeOrderNumber: function () {
                var headerData = this.getView().getModel("locHeaderModel").getData();
                headerData.requirementDesc = headerData.orderNumber;

                this.getView().getModel("locHeaderModel").refresh();

                this.clearItemsTable();//If order number is changed, Items have to be loaded again on click of GO
            },

            //Method called when there is a change in the field Planned Date & Time
            //This method logic is mainly used for languages other than English
            //Modified by IBM Fiori team - on 12-03-2024

            onChangeDateTime: function (oEvent) {
                var controlPlannedDateTime = this.getView().byId("planned");

                var headerData = this.getView().getModel("locHeaderModel").getData();
                var dateTime = controlPlannedDateTime.getDateValue();

                // dateTime = controlPlannedDateTime.getValue();

                // if(!controlPlannedDateTime.isValidValue()){
                //     MessageBox.error(oRes.getText("datePickerText"));
                // }

                var date = this.printDate(dateTime);

                var Pdatu = new Date(dateTime);
                // Pdatu = DateFormat.getDateInstance({pattern: plannedDateFormat}).format(Pdatu);
                var formatOptions = {};
                // formatOptions.pattern=plannedDateFormat;
                formatOptions.UTC = true;

                var lang = sap.ui.getCore().getConfiguration().getLanguage();

                Pdatu = DateFormat.getDateTimeInstance(formatOptions, new sap.ui.core.Locale(lang)).format(Pdatu);

                // headerData.plDateTime=Pdatu;

                this.getView().getModel("locHeaderModel").refresh();

            },

            /**
             * Method used to convert Planned Date time to OData format
             * Created on 22-02-2024
             * @param {*} date 
             * @returns 
             */
            printDate: function (date) {
                const pad = (i) => (i < 10) ? "0" + i : "" + i;

                if (date) {
                    return date.getFullYear() +
                        pad(1 + date.getMonth()) +
                        pad(date.getDate()) +
                        "," +
                        "PT" + pad(date.getHours()) + "H" +
                        pad(date.getMinutes()) + "M" +
                        pad(date.getSeconds()) + "S";
                }
                else return date;
            },

            /**
             * Method called on click of GO button to retreive data from entity set
             * StockReqHdrSet - Created by SM15 IBM Fiori team - 21-02-2024
             */

            onPressGo: function () {

                this.getView().getModel("goodsItemJSONModel").setData([]);
                this.getView().getModel("goodsItemJSONModel").refresh();
                this.getView().getModel("locGoodsItemModel").setData([]);
                this.getView().getModel("locGoodsItemModel").refresh();

                var validationSuccess = false;
                validationSuccess = this.validateonGo();

                //Read Stock Request Header EntitySet to retrieve data from backend

                var stockReqModel = this.getOwnerComponent().getModel("stockReqModel");

                var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                var headerData = locHeaderModel.getData();
                var stockReqType = headerData.stockReqType;

                //Radio button selection to Request Remaining or Request Target
                let reqQtyType = this.getView().byId("idReqQty").getSelectedIndex();
                var remTarg = "";
                if (headerData.reqForOrderFields) {
                    if (reqQtyType == 0) {//Request Remaining
                        remTarg = "RR";
                    } else if (reqQtyType == 1) {//Request Target
                        //If request target type, then fill in target qty and Target UoM
                        remTarg = "RT";
                    }
                }

                if (validationSuccess) {
                    if (stockReqType === oRes.getText("RequestforOrder") && (remTarg && remTarg === 'RT')) {
                        //Call OData service to get Base UoM , if Request Target Qty



                        var aFilters = [];
                        if (headerData.plant) {
                            headerData.plant = headerData.plant.trim().toUpperCase();
                        }
                        if (headerData.warehouseNumber) {
                            headerData.warehouseNumber = headerData.warehouseNumber.trim().toUpperCase();
                        }
                        locHeaderModel.refresh();

                        //pass order number (Aufnr), Request type - Order or Manual as filters,
                        // Plant, Warehousenumber, Storage location, Request Remaining/ Target
                        //Target Qty and Target UoM as filters


                        aFilters.push(new sap.ui.model.Filter("ReqOrd", sap.ui.model.FilterOperator.EQ, "X"));
                        aFilters.push(new sap.ui.model.Filter("ReqMan", sap.ui.model.FilterOperator.EQ, ""));

                        aFilters.push(new sap.ui.model.Filter("RemTarg", sap.ui.model.FilterOperator.EQ, remTarg));
                        aFilters.push(new sap.ui.model.Filter("Aufnr", sap.ui.model.FilterOperator.EQ, headerData.orderNumber));
                        aFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, headerData.plant));

                        //Warehouse number and Storage loc are to be sent as filters
                        aFilters.push(new sap.ui.model.Filter("Lgnum", sap.ui.model.FilterOperator.EQ, headerData.warehouseNumber));
                        aFilters.push(new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.EQ, headerData.storageLoc));

                        //Pass movement type as filter - Defect fixing - 14-03-2024
                        aFilters.push(new sap.ui.model.Filter("Bwart", sap.ui.model.FilterOperator.EQ, headerData.movementType));//Bwart

                        stockReqModel.read("/StockReqOrdItmsSet", {
                            filters: aFilters,
                            success: $.proxy(function (oRetrievedResult) {
                                sap.ui.core.BusyIndicator.hide();

                                if (stockReqType && stockReqType === oRes.getText(oRes.getText("RequestforOrder"))) {
                                    if (remTarg && remTarg === 'RT') {
                                        headerData.targetUoM = oRetrievedResult.results[0].TargUom;
                                        this.callODataServicetoValidate();
                                    }
                                    locHeaderModel.refresh();
                                }

                            }, this),
                            error: $.proxy(function (oError) {
                                sap.ui.core.BusyIndicator.hide();

                                if (oError.responseText) {
                                    var response = JSON.parse(oError.responseText);
                                    var errorList = response.error.innererror.errordetails;
                                    var errorMsgs = [];
                                    var ERROR = "";
                                    if (errorList) {
                                        for (var i = 0; i < errorList.length; i++) {
                                            errorMsgs.push(errorList[i].message);
                                            ERROR = ERROR + errorList[i].message + "\n";
                                        }
                                    }
                                    MessageBox.error(ERROR);
                                }

                            }, this)

                        })

                    }
                    else {
                        this.callODataServicetoValidate();
                    }
                    //end of ValidationSuccess true
                } else {
                    return validationSuccess;
                }

            },


            /**
             * Method called to do validations on click of Go button
             * 23-02-2024
             */

            validateonGo: function () {
                //Check if plant, warehouse number, planned date time, movement type
                //Reqt number, Reqt desc - mandatory
                // Dest storage type, Dest Storage bin - mandatory - only for Manual request

                this.clearValueStates();

                let locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                let headerData = locHeaderModel.getData();


                let valueStateModel = this.getOwnerComponent().getModel("valueStateModel");
                let valueStateModelData = valueStateModel.getData();


                let stockReqSelected = this.getView().byId("idStockReqType").getSelectedIndex();
                let stockReqType = headerData.stockReqType;

                var isValidationSuccess = true;

                let orderNumber = headerData.orderNumber;
                let plant = headerData.plant;
                let warehouseNumber = headerData.warehouseNumber;
                let plDateTime = headerData.plDateTime;
                let movementType = headerData.movementType;
                let storageLoc = headerData.storageLoc;

                let reqtNumber = headerData.requirementNumber;
                let reqtDesc = headerData.requirementDesc;

                let storageType = headerData.destStorageType;
                let storageBin = headerData.destStorageBin;

                let dateTime = this.getView().byId("planned").getDateValue();
                let date = this.printDate(dateTime);

                if (stockReqSelected != -1) {
                    //Stock Request Type is selected

                    if (headerData.reqForOrderFields) {
                        if (!orderNumber || orderNumber.trim().length == 0) {
                            valueStateModelData.workOrdValState = ValueState.Error;
                            isValidationSuccess = false;
                        }

                        let reqQtyType = this.getView().byId("idReqQty").getSelectedIndex();
                        var remTarg = "";
                        if (reqQtyType == 0) {//Request Remaining
                            remTarg = "RR";
                        } else if (reqQtyType == 1) {//Request Target
                            //If request target type, then fill in target qty and Target UoM
                            remTarg = "RT";
                        }

                        if (remTarg === "RT") {
                            //Check if Target Qty is entered
                            //Target UoM defaults from ECC on click of Go

                            if (!headerData.targetQty || !(headerData.targetQty.trim().length > 0)) {
                                MessageBox.error(oRes.getText("msgRequestTarget"));
                                isValidationSuccess = false;
                                return isValidationSuccess;
                            }
                        }

                    }

                    if (headerData.manualRequestFields) {
                        if (!storageType || storageType.trim().length == 0) {
                            valueStateModelData.storageTypeValState = ValueState.Error;
                            isValidationSuccess = false;
                        }

                        if (!storageBin || storageBin.trim().length == 0) {
                            valueStateModelData.storageBinValState = ValueState.Error;
                            isValidationSuccess = false;
                        }
                    }

                    valueStateModel.refresh();

                    if ((plant && plant.trim().length > 0) && (warehouseNumber && warehouseNumber.trim().length > 0)
                        && (plDateTime && plDateTime.trim().length > 0) && (movementType && movementType.trim().length > 0)
                        && (reqtNumber && reqtNumber.trim().length > 0) && (reqtDesc && reqtDesc.trim().length > 0)
                        && (storageLoc && storageLoc.trim().length > 0)) {

                        if (stockReqSelected === "0") {//Request for Order

                        }
                        else if (stockReqType === "1") {//Manual Request
                            if (!storageType || storageType.trim().length == 0) {
                                isValidationSuccess = false;
                                return isValidationSuccess;
                            }
                            if (!storageBin || storageBin.trim().length == 0) {
                                isValidationSuccess = false;
                                return isValidationSuccess;
                            }
                        }
                    } else {
                        //if any of plant, warehousenumber, planned date time , movement type
                        //are blank - throw an error

                        //set value states to error
                        if (!plant || plant.trim().length == 0) {
                            valueStateModelData.plantValState = ValueState.Error;
                        }

                        if (!warehouseNumber || warehouseNumber.trim().length == 0) {
                            valueStateModelData.warehouseValState = ValueState.Error;
                        }

                        if (!storageLoc || storageLoc.trim().length == 0) {
                            valueStateModelData.storageLocValState = ValueState.Error;
                        }

                        if (!movementType || movementType.trim().length == 0) {
                            valueStateModelData.movementTypeValState = ValueState.Error;
                        }

                        if (!plDateTime || plDateTime.trim().length == 0) {
                            valueStateModelData.dateTimeValState = ValueState.Error;
                        }

                        if (!reqtDesc || reqtDesc.trim().length == 0) {
                            valueStateModelData.ReqtDescValState = ValueState.Error;
                        }

                        if (headerData.reqForOrderFields) {
                            if (!orderNumber || orderNumber.trim().length == 0) {
                                valueStateModelData.orderNumber = ValueState.Error;
                            }
                        }

                        if (headerData.manualRequestFields) {
                            if (!storageType || storageType.trim().length == 0) {
                                valueStateModelData.storageTypeValState = ValueState.Error;
                            }

                            if (!storageBin || storageBin.trim().length == 0) {
                                valueStateModelData.storageBinValState = ValueState.Error;
                            }
                        }

                        valueStateModel.refresh();
                        isValidationSuccess = false;
                        return isValidationSuccess;
                    }
                    return isValidationSuccess;

                } else {
                    //No Request type is selected
                    MessageBox.error(oRes.getText("msgTextSelectStockRequestType"));
                    isValidationSuccess = false;
                    return isValidationSuccess;
                }


            },



            //Call Odata service to validate user inputs
            callODataServicetoValidate: function () {

                var stockReqModel = this.getOwnerComponent().getModel("stockReqModel");

                var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                var headerData = locHeaderModel.getData();
                var stockReqType = headerData.stockReqType;

                var goodsItemJSONModel = this.getView().getModel("goodsItemJSONModel");

                var dateTime = this.getView().byId("planned").getDateValue();
                var dateVal = this.getView().byId("planned").getValue();

                if (dateTime) {
                    var date = this.printDate(dateTime);
                    console.log("Date " + date + " Date Value" + dateVal);
                }


                //Radio button selection to Request Remaining or Request Target
                let reqQtyType = this.getView().byId("idReqQty").getSelectedIndex();
                var remTarg = "";
                if (headerData.reqForOrderFields) {
                    if (reqQtyType == 0) {//Request Remaining
                        remTarg = "RR";
                    } else if (reqQtyType == 1) {//Request Target
                        //If request target type, then fill in target qty and Target UoM
                        remTarg = "RT";
                    }
                }

                var aFilters = [];
                if (headerData.plant) {
                    headerData.plant = headerData.plant.trim().toUpperCase();
                }
                if (headerData.warehouseNumber) {
                    headerData.warehouseNumber = headerData.warehouseNumber.trim().toUpperCase();
                }
                locHeaderModel.refresh();

                //pass order number (Aufnr), Request type - Order or Manual as filters,
                // Plant, Warehousenumber, Storage location, Request Remaining/ Target
                //Target Qty and Target UoM as filters

                if (stockReqType === oRes.getText("RequestforOrder")) {
                    aFilters.push(new sap.ui.model.Filter("ReqOrd", sap.ui.model.FilterOperator.EQ, "X"));
                    aFilters.push(new sap.ui.model.Filter("ReqMan", sap.ui.model.FilterOperator.EQ, ""));

                    aFilters.push(new sap.ui.model.Filter("RemTarg", sap.ui.model.FilterOperator.EQ, remTarg));

                    // if(headerData.targetQty && headerData.targetUoM){
                    //     aFilters.push(new sap.ui.model.Filter("TargQty",sap.ui.model.FilterOperator.EQ,headerData.targetQty));
                    //     aFilters.push(new sap.ui.model.Filter("TargUom",sap.ui.model.FilterOperator.EQ,headerData.targetUoM));
                    // }

                    if (headerData.targetQty) {
                        aFilters.push(new sap.ui.model.Filter("TargQty", sap.ui.model.FilterOperator.EQ, headerData.targetQty));
                        aFilters.push(new sap.ui.model.Filter("TargUom", sap.ui.model.FilterOperator.EQ, headerData.targetUoM));
                    }

                } else if (stockReqType === oRes.getText("ManualRequest")) {
                    aFilters.push(new sap.ui.model.Filter("ReqOrd", sap.ui.model.FilterOperator.EQ, ""));
                    aFilters.push(new sap.ui.model.Filter("ReqMan", sap.ui.model.FilterOperator.EQ, "X"));

                    //Added on 13-03-24 - Dev defects fixing
                    if (headerData.destStorageBin) {
                        headerData.destStorageBin = headerData.destStorageBin.toUpperCase();
                    }
                    aFilters.push(new sap.ui.model.Filter("Nlpla", sap.ui.model.FilterOperator.EQ, headerData.destStorageBin));
                    aFilters.push(new sap.ui.model.Filter("Nltyp", sap.ui.model.FilterOperator.EQ, headerData.destStorageType));//Nltyp - storagetype
                }
                aFilters.push(new sap.ui.model.Filter("Aufnr", sap.ui.model.FilterOperator.EQ, headerData.orderNumber));
                aFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, headerData.plant));

                //Warehouse number and Storage loc are to be sent as filters
                aFilters.push(new sap.ui.model.Filter("Lgnum", sap.ui.model.FilterOperator.EQ, headerData.warehouseNumber));
                aFilters.push(new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.EQ, headerData.storageLoc));

                //Pass movement type as filter - Defect fixing - 14-03-2024
                aFilters.push(new sap.ui.model.Filter("Bwart", sap.ui.model.FilterOperator.EQ, headerData.movementType));//Bwart


                // aFilters.push(new sap.ui.model.Filter("Tbpri", sap.ui.model.FilterOperator.EQ, headerData.transferPriority));
                // return new Promise(function(resolve, reject){
                stockReqModel.read("/StockReqOrdItmsSet", {
                    filters: aFilters,
                    success: $.proxy(function (oRetrievedResult) {
                        sap.ui.core.BusyIndicator.hide();
                        // goodsItemJSONModel.setData(oRetrievedResult.results);

                        // resolve(oRetrievedResult);

                        if (stockReqType && stockReqType === oRes.getText(oRes.getText("RequestforOrder"))) {
                            if (remTarg && remTarg === 'RT') {
                                headerData.targetUoM = oRetrievedResult.results[0].TargUom;
                            }
                            goodsItemJSONModel.setData(oRetrievedResult.results);
                            locHeaderModel.refresh();
                        }
                        else if (stockReqType && stockReqType === oRes.getText("ManualRequest")) {
                            this.openMaterialDialog();
                        }

                    }, this),
                    error: $.proxy(function (oError) {
                        sap.ui.core.BusyIndicator.hide();

                        if (oError.responseText) {
                            var ERROR = "";
                            // ERROR = oError.responseText.split("<message xml:lang=\"en\">")[1].split("</message>")[0];

                            var response = JSON.parse(oError.responseText);
                            var errorList = response.error.innererror.errordetails;
                            var errorMsgs = [];

                            if (errorList) {
                                for (var i = 0; i < errorList.length; i++) {
                                    errorMsgs.push(errorList[i].message);
                                    ERROR = ERROR + errorList[i].message + "\n";
                                }
                            }
                            MessageBox.error(ERROR);
                        }

                    }, this)

                })
                // });
            },


            //Method to open the Add Materials (Add Goods Items) Fragment on click
            //of + button to add materials for Manual Request 
            //Created on Jan 12 2024

            onAddGoodsItem: function (oEvent) {
                this.clearValueStates();

                //check if plant, warehousenumber, storage location combination is valid

                try {
                    var validationSuccess = this.validateonGo();
                    if (!validationSuccess) {
                        throw new Error(oRes.getText("msgHeaderDataError"));
                    } else {
                        this.callODataServicetoValidate();
                    }

                } catch (err) {
                    MessageBox.error(err.message);
                }

            },

            /**
             * Method to open the Material pop-up in case of Manual Request
             * This method is called if all validations are successful 
             * Created on 01-03-2024
             */

            openMaterialDialog: function () {

                var numOfMaterials = this.getOwnerComponent().getModel("goodsItemJSONModel").getData().length;
                // console.log("Material table size "+ numOfMaterials);

                // Reset locGoodItemModel to refresh the pop-up fragment to add new Material
                this.fnResetlocGoodsItemModel(this.getOwnerComponent().getModel("locGoodsItemModel").getData());

                //check if there are already 25 materials in the table
                if (numOfMaterials < maxMaterialsforManualReq) {
                    if (!this._goodsItemDialog) {
                        this._goodsItemDialog = sap.ui.xmlfragment("goodsItemDialog",
                            "com.reckitt.zpestockrequest.view.Fragments.AddMaterials",
                            this
                        );
                        this.getView().addDependent(this._goodsItemDialog);
                    }

                    this._goodsItemDialog.open();

                } else {
                    MessageBox.warning(oRes.getText("msgTextNumberofMaterialsExceeded"));
                }
            },

            //Method called to reset Items data, when user clicks on + button to add new data
            fnResetlocGoodsItemModel: function (modelData) {
                modelData.Matnr = "";
                // modelData.Menge = "";
                // modelData.Einheit = "";
                modelData.Ofmng = "";
                modelData.Menga = "";
                modelData.Altme = "";
                modelData.Meins = "";
                modelData.Charg = "";

                modelData.Draft = false;
                modelData.Delete = false;
                modelData.Edit = false;
                this.getOwnerComponent().getModel("locGoodsItemModel").refresh();
            },

            //Method called when 'Add' button is clicked in the Fragment AddMaterials
            //to add more materials in Manual request
            //CREATED ON: 14 JAN 2024
            //By IBM FIORI TEAM 

            onAddMaterialsToTable: function (oEvent) {
                if (this.validateFragGoodsItems()) {
                    var itemData = this.fnObjectToJSON(this.getOwnerComponent().getModel("locGoodsItemModel").getData());
                    //itemData.Draft = false;

                    //check if User has entered valid material, Quantity and UoM
                    //For valid material - oData method has to be called to see if material is valid
                    var stockReqModel = this.getOwnerComponent().getModel("stockReqModel");
                    var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                    var headerData = locHeaderModel.getData();
                    var stockReqType = headerData.stockReqType;


                    var aFilters = [];
                    if (headerData.plant) {
                        headerData.plant = headerData.plant.trim().toUpperCase();
                    }
                    if (headerData.warehouseNumber) {
                        headerData.warehouseNumber = headerData.warehouseNumber.trim().toUpperCase();
                    }
                    locHeaderModel.refresh();

                    //pass Request type - Order or Manual as filters,
                    // Plant, Warehousenumber, Storage location, Material number

                    if (stockReqType === oRes.getText("ManualRequest")) {
                        aFilters.push(new sap.ui.model.Filter("ReqOrd", sap.ui.model.FilterOperator.EQ, ""));
                        aFilters.push(new sap.ui.model.Filter("ReqMan", sap.ui.model.FilterOperator.EQ, "X"));
                    }
                    aFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, headerData.plant));

                    //Warehouse number and Storage loc are to be sent as filters
                    aFilters.push(new sap.ui.model.Filter("Lgnum", sap.ui.model.FilterOperator.EQ, headerData.warehouseNumber));
                    aFilters.push(new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.EQ, headerData.storageLoc));

                    aFilters.push(new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, itemData.Matnr));

                    //Altme is sent as filter to validate if it is a valid Alternative UoM
                    aFilters.push(new sap.ui.model.Filter("Altme", sap.ui.model.FilterOperator.EQ, itemData.Altme.trim().toUpperCase()));

                    //Menga is passed as filter to get calculated value of requested qty Ofmng based on Altme and Base UoM
                    aFilters.push(new sap.ui.model.Filter("Menga", sap.ui.model.FilterOperator.EQ, itemData.Menga));

                    //Pass movement type as filter - Defect fixing - 14-03-2024
                    aFilters.push(new sap.ui.model.Filter("Bwart", sap.ui.model.FilterOperator.EQ, headerData.movementType));//Bwart

                    // return new Promise(function(resolve, reject){
                    stockReqModel.read("/StockReqOrdItmsSet", {
                        filters: aFilters,
                        success: $.proxy(function (oRetrievedResult) {
                            sap.ui.core.BusyIndicator.hide();
                            //    goodsItemJSONModel.setData(oRetrievedResult.results);

                            if (oRetrievedResult.results[0]) {
                                itemData.Ofmng = oRetrievedResult.results[0].Ofmng;
                            }

                            // resolve(oRetrievedResult);
                            if (oRetrievedResult && (stockReqType && stockReqType === oRes.getText("ManualRequest"))) {
                                this.getOwnerComponent().getModel("goodsItemJSONModel").getData().push(itemData);
                                this.getOwnerComponent().getModel("goodsItemJSONModel").refresh();

                                if (this._goodsItemDialog) {
                                    this._goodsItemDialog.close();
                                }
                            }

                        }, this),
                        error: $.proxy(function (oError) {
                            sap.ui.core.BusyIndicator.hide();
                            //If any error due to Alternative UoM
                            if (oError.responseText) {
                                var response = JSON.parse(oError.responseText);
                                var errorList = response.error.innererror.errordetails;
                                var errorMsgs = [];
                                var ERROR = "";
                                if (errorList) {
                                    for (var i = 0; i < errorList.length; i++) {
                                        errorMsgs.push(errorList[i].message);
                                        ERROR = ERROR + errorList[i].message + "\n";
                                    }
                                }
                                MessageBox.error(ERROR);
                            }

                        }, this)

                    })

                    //Clears the local model data
                    // this.fnResetlocGoodsItemModel(itemData);
                }
            },

            onChangeMaterialNumber: function () {
                var itemData = this.fnObjectToJSON(this.getOwnerComponent().getModel("locGoodsItemModel").getData());
                //itemData.Draft = false;

                //check if User has entered valid material, Quantity and UoM
                //For valid material - oData method has to be called to see if material is valid
                var stockReqModel = this.getOwnerComponent().getModel("stockReqModel");
                var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                var headerData = locHeaderModel.getData();
                var stockReqType = headerData.stockReqType;


                var aFilters = [];
                if (headerData.plant) {
                    headerData.plant = headerData.plant.trim().toUpperCase();
                }
                if (headerData.warehouseNumber) {
                    headerData.warehouseNumber = headerData.warehouseNumber.trim().toUpperCase();
                }
                locHeaderModel.refresh();

                //pass Request type - Order or Manual as filters,
                // Plant, Warehousenumber, Storage location, Material number

                if (stockReqType === oRes.getText("ManualRequest")) {
                    aFilters.push(new sap.ui.model.Filter("ReqOrd", sap.ui.model.FilterOperator.EQ, ""));
                    aFilters.push(new sap.ui.model.Filter("ReqMan", sap.ui.model.FilterOperator.EQ, "X"));
                }
                aFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, headerData.plant));

                //Warehouse number and Storage loc are to be sent as filters
                aFilters.push(new sap.ui.model.Filter("Lgnum", sap.ui.model.FilterOperator.EQ, headerData.warehouseNumber));
                aFilters.push(new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.EQ, headerData.storageLoc));

                aFilters.push(new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, itemData.Matnr));

                //Pass movement type as filter - Defect fixing - 14-03-2024
                aFilters.push(new sap.ui.model.Filter("Bwart", sap.ui.model.FilterOperator.EQ, headerData.movementType));//Bwart

                // return new Promise(function(resolve, reject){
                stockReqModel.read("/StockReqOrdItmsSet", {
                    filters: aFilters,
                    success: $.proxy(function (oRetrievedResult) {
                        sap.ui.core.BusyIndicator.hide();

                        itemData.Meins = oRetrievedResult.results[0].Meins;//UoM
                        itemData.Altme = oRetrievedResult.results[0].Meins;//Alternative UoM

                        this.getOwnerComponent().getModel("locGoodsItemModel").setData(itemData);

                        // resolve(oRetrievedResult);


                    }, this),
                    error: $.proxy(function (oError) {
                        sap.ui.core.BusyIndicator.hide();

                        if (oError.responseText) {
                            var response = JSON.parse(oError.responseText);
                            var errorList = response.error.innererror.errordetails;
                            var errorMsgs = [];
                            var ERROR = "";
                            if (errorList) {
                                for (var i = 0; i < errorList.length; i++) {
                                    errorMsgs.push(errorList[i].message);
                                    ERROR = ERROR + errorList[i].message + "\n";
                                }
                            }
                            MessageBox.error(ERROR);
                        }

                    }, this)

                })
            },

            /* 
           *Validation logic implemented for each of the decimal notation by Veera Sudheer
            */
            onValidation: function (oEvent) {
                var oRegex;
                var oValue = oEvent.getSource().getValue();
                if (decimalNotation == "0001") {
                    oRegex = /^(\d{1,3}(\.\d{3})*|\d+)(,\d{1,3})?$/;
                    if (oValue && !oRegex.test(oValue)) {
                        MessageBox.error("Input must be in the format __.___.___,__");
                        oEvent.getSource().setValue("");
                    }
                }

                if (decimalNotation == "0002") {
                    oRegex = /^(\d{1,3}(,\d{3})*|\d+)(\.\d{1,3})?$/;
                    if (oValue && !oRegex.test(oValue)) {
                        MessageBox.error("Input must be in the format __,___,___.__");
                        oEvent.getSource().setValue("");
                    }
                }

                if (decimalNotation == "0003") {
                    oRegex = /^(\d{1,3}( \d{3})+|\d+)(,\d{1,3})?$/;
                    if (oValue && !oRegex.test(oValue)) {
                        MessageBox.error("Input must be in the format __ ___ ___,___");
                        oEvent.getSource().setValue("");
                    }
                }
            },

            //Method called to validate values entered in Add Materials pop-up
            validateFragGoodsItems: function () {

                //check for mandatory fields
                this.clearValueStates();
                var validationResult = true;
                var localItem = this.getOwnerComponent().getModel("locGoodsItemModel").getData();
                var material = localItem.Matnr;
                var quantity = localItem.Menga;
                var unitOfMeasure = localItem.Altme;
                var valueStateData = this.getOwnerComponent().getModel("valueStateModel").getData();
                if (material.length === 0) {
                    validationResult = false;
                    valueStateData.fragMatValState = ValueState.Error;
                }
                if (quantity.length === 0) {
                    validationResult = false;
                    valueStateData.fragQuanValState = ValueState.Error;
                }
                if (unitOfMeasure.length === 0) {
                    valueStateData.fragUoMValState = ValueState.Error;
                    validationResult = false;
                }
                this.getOwnerComponent().getModel("valueStateModel").refresh();
                return validationResult;
            },

            /*	Method: clearValueStates
             *	Created By: IBM Fiori Team      	|Created On: 17-JAN-2024
             *	Last updated: 
             *	Description/Usage: Method is to clear all the valuestates
             */
            clearValueStates: function () {
                var valueStateData = this.getOwnerComponent().getModel("valueStateModel").getData();
                valueStateData.fragMatValState = ValueState.None;
                valueStateData.fragQuanValState = ValueState.None;
                valueStateData.fragUoMValState = ValueState.None;

                valueStateData.workOrdValState = ValueState.None;
                valueStateData.plantValState = ValueState.None;
                valueStateData.warehouseValState = ValueState.None;
                valueStateData.dateTimeValState = ValueState.None;
                valueStateData.movementTypeValState = ValueState.None;
                valueStateData.storageLocValState = ValueState.None;

                valueStateData.ReqtNumberValState = ValueState.None;
                valueStateData.ReqtDescValState = ValueState.None;

                valueStateData.storageTypeValState = ValueState.None;
                valueStateData.storageBinValState = ValueState.None;

                this.getOwnerComponent().getModel("valueStateModel").refresh();
            },

            //Method called to close the 'Add Materials' fragment pop-up
            //On click of Close button on the dialog - Created on Jan 12 2024

            onAddMaterialsItemDialogClose: function () {
                if (this._goodsItemDialog) {
                    this._goodsItemDialog.close();
                }
                this.getOwnerComponent().getModel("goodsItemJSONModel").refresh();
            },


            // //Called when a table row in Manual request table is pressed - 
            // //Created on: 17-01-2024

            // onGoodsItemSelected: function(oEvent){
            //     console.log("Table item pressed "+oEvent.getParameters().length);
            //     console.log("oEvent "+oEvent.getSource());


            //     this.getOwnerComponent().getModel("goodsItemJSONModel").getData();
            //     this.getOwnerComponent().getModel("goodsItemJSONModel").refresh();
            // },



            //This method can be used if Delete parameter is used in Main view for Table UI
            //This event is triggered when user presses delete Button for a row - 17-01-2024

            onDeleteEvent: function (oEvent) {
                // console.log("Delete Event fired "+oEvent.getParameters().length);
                console.log("oEvent " + oEvent.getSource().getParent());
                //delete oEvent.getParameters().listItem;

                var selectedItem = oEvent.getSource().getParent();
                var goodsItemModel = this.getOwnerComponent().getModel("goodsItemJSONModel");
                var oTempData = goodsItemModel.getData();

                var selectedRow = selectedItem.getBindingContext("goodsItemJSONModel").getObject();
                var indexSelectedItem = oTempData.indexOf(selectedRow);

                oTempData.splice(indexSelectedItem, 1);


                this.getOwnerComponent().getModel("goodsItemJSONModel").getData();
                this.getOwnerComponent().getModel("goodsItemJSONModel").refresh();
            },

            //This event is triggered when user presses Edit Button icon for an Item row for Manual Request
            //CREATED ON - 17-01-2024

            onEditEvent: function (oEvent) {
                // console.log("oEvent "+oEvent.getSource().getParent());
                //delete oEvent.getParameters().listItem;

                var selectedItem = oEvent.getSource().getParent();
                var goodsItemModel = this.getOwnerComponent().getModel("goodsItemJSONModel");
                var oTempData = goodsItemModel.getData();

                var selectedRow = selectedItem.getBindingContext("goodsItemJSONModel").getObject();
                var indexSelectedItem = oTempData.indexOf(selectedRow);
                console.log("Index of selected item " + indexSelectedItem + " Item " + selectedRow.Matnr);


                //Make the table row selected
                // this.getView().byId("idGoodsItemTable").setSelectedItem(selectedItem);

                var itemtoBeUpdated = this.fnObjectToJSON(selectedRow);
                itemtoBeUpdated.Draft = true;

                var oPath = selectedItem.getBindingContext("goodsItemJSONModel").getPath();
                this.getOwnerComponent().getModel("locGoodsItemModel").setData(itemtoBeUpdated);

                //Open dialog box with selected Item to update
                if (!this._goodsItemDialog) {
                    this._goodsItemDialog = sap.ui.xmlfragment("goodsItemDialog",
                        "com.reckitt.zpestockrequest.view.Fragments.AddMaterials",
                        this
                    );
                    this.getView().addDependent(this._goodsItemDialog);
                }
                this._goodsItemDialog.open();
                this._goodsItemDialog.bindElement({
                    path: oPath,
                    model: "goodsItemJSONModel"
                });

                // this._goodsItemDialog.setBindingContext(selectedRow.getBindingContext("goodsItemJSONModel"), "goodsItemJSONModel");
                var itemData = this.fnObjectToJSON(this.getOwnerComponent().getModel("locGoodsItemModel").getData());

                // console.log("Item data in Edit "+itemData.Matnr+", UoM"+itemData.Ofmng+" ,Qty"+itemData.Meins);

                this.getOwnerComponent().getModel("goodsItemJSONModel").refresh();

            },


            onSelectItem: function (oEvent) {
                //Make Delete and Edit buttons enabled
                var selectedItem = this.getView().byId("idGoodsItemTable").getSelectedItem();
                var selectedRow = selectedItem.getBindingContext("goodsItemJSONModel").getObject();
                selectedRow.Delete = true;
                selectedRow.Edit = true;

                this.getOwnerComponent().getModel("goodsItemJSONModel").refresh();
            },

            //CREATED ON 17-01-2024
            //Called on click of UPDATE in fragment pop-up
            updateGoodsItem: function (oEvent, goodsItemTableData) {
                //replace existing item data with edited data

                var goodsItemModel = this.getOwnerComponent().getModel("goodsItemJSONModel");
                var oTempData = goodsItemModel.getData();
                var selectedItem = oEvent.getSource().getParent();

                // var selectedItem = this.getView().byId("idGoodsItemTable").getSelectedItem();
                var selectedRow = selectedItem.getBindingContext("goodsItemJSONModel").getObject();
                var indexSelectedItem = oTempData.indexOf(selectedRow);

                var objItemUpdated = this.getOwnerComponent().getModel("locGoodsItemModel").getData();


                //check if User has entered valid material, Quantity and UoM
                //For valid material - oData method has to be called to see if material is valid

                if (this.validateFragGoodsItems()) {
                    var itemData = this.fnObjectToJSON(this.getOwnerComponent().getModel("locGoodsItemModel").getData());
                    //itemData.Draft = false;


                    var stockReqModel = this.getOwnerComponent().getModel("stockReqModel");
                    var locHeaderModel = this.getOwnerComponent().getModel("locHeaderModel");
                    var headerData = locHeaderModel.getData();
                    var stockReqType = headerData.stockReqType;

                    var goodsItemJSONModel = this.getView().getModel("goodsItemJSONModel");

                    var aFilters = [];
                    if (headerData.plant) {
                        headerData.plant = headerData.plant.trim().toUpperCase();
                    }
                    if (headerData.warehouseNumber) {
                        headerData.warehouseNumber = headerData.warehouseNumber.trim().toUpperCase();
                    }
                    locHeaderModel.refresh();

                    //pass Request type - Order or Manual as filters,
                    // Plant, Warehousenumber, Storage location, Material number

                    if (stockReqType === oRes.getText("ManualRequest")) {
                        aFilters.push(new sap.ui.model.Filter("ReqOrd", sap.ui.model.FilterOperator.EQ, ""));
                        aFilters.push(new sap.ui.model.Filter("ReqMan", sap.ui.model.FilterOperator.EQ, "X"));
                    }
                    aFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, headerData.plant));

                    //Warehouse number and Storage loc are to be sent as filters
                    aFilters.push(new sap.ui.model.Filter("Lgnum", sap.ui.model.FilterOperator.EQ, headerData.warehouseNumber));
                    aFilters.push(new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.EQ, headerData.storageLoc));

                    aFilters.push(new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, itemData.Matnr));
                    //    aFilters.push(new sap.ui.model.Filter("Meins",sap.ui.model.FilterOperator.EQ,itemData.Meins));

                    //Altme is sent as filter to validate if it is a valid Alternative UoM
                    aFilters.push(new sap.ui.model.Filter("Altme", sap.ui.model.FilterOperator.EQ, itemData.Altme.trim().toUpperCase()));

                    //Menga is passed as filter to get calculated value of requested qty Ofmng based on Altme and Base UoM
                    aFilters.push(new sap.ui.model.Filter("Menga", sap.ui.model.FilterOperator.EQ, itemData.Menga));

                    //Pass movement type as filter - Defect fixing - 14-03-2024
                    aFilters.push(new sap.ui.model.Filter("Bwart", sap.ui.model.FilterOperator.EQ, headerData.movementType));//Bwart

                    // return new Promise(function(resolve, reject){
                    stockReqModel.read("/StockReqOrdItmsSet", {
                        filters: aFilters,
                        success: $.proxy(function (oRetrievedResult) {
                            sap.ui.core.BusyIndicator.hide();

                            // resolve(oRetrievedResult);
                            if (oRetrievedResult && (stockReqType && stockReqType === oRes.getText("ManualRequest"))) {
                                //this.getOwnerComponent().getModel("goodsItemJSONModel").getData().push(itemData);
                                //this.getOwnerComponent().getModel("goodsItemJSONModel").refresh();

                                oTempData[indexSelectedItem].Matnr = objItemUpdated.Matnr;
                                // oTempData[indexSelectedItem].Meins = objItemUpdated.Meins;
                                // oTempData[indexSelectedItem].Ofmng = objItemUpdated.Ofmng;

                                oTempData[indexSelectedItem].Altme = objItemUpdated.Altme;
                                oTempData[indexSelectedItem].Menga = objItemUpdated.Menga;
                                oTempData[indexSelectedItem].Charg = objItemUpdated.Charg;

                                if (oRetrievedResult.results[0]) {
                                    oTempData[indexSelectedItem].Ofmng = oRetrievedResult.results[0].Ofmng;
                                }

                                // goodsItemJSONModel.getData().splice(indexSelectedItem, 1, oTempData[indexSelectedItem]);
                                goodsItemJSONModel.setData(oTempData);

                                if (this._goodsItemDialog) {
                                    this._goodsItemDialog.close();
                                }
                            }

                        }, this),
                        error: $.proxy(function (oError) {
                            sap.ui.core.BusyIndicator.hide();

                            if (oError.responseText) {
                                var response = JSON.parse(oError.responseText);
                                var errorList = response.error.innererror.errordetails;
                                var errorMsgs = [];
                                var ERROR = "";
                                if (errorList) {
                                    for (var i = 0; i < errorList.length; i++) {
                                        errorMsgs.push(errorList[i].message);
                                        ERROR = ERROR + errorList[i].message + "\n";
                                    }
                                }
                                MessageBox.error(ERROR);
                            }

                        }, this)

                    })

                }

                this.getOwnerComponent().getModel("goodsItemJSONModel").refresh();
            },

            //Method called when user clicks on Create TR button to Create Transfer Requirement
            onCreateTR: function (oEvent) {
                //Check if For Request for Order, whether Requirement Description is auto populated
                var oStr;
                var headerData = this.getView().getModel("locHeaderModel").getData();
                var itemData = [];

                var stockReqType = headerData.stockReqType;
                var ReqOrd = "";
                var ReqMan = "";

                if (stockReqType === oRes.getText("RequestforOrder")) {
                    ReqOrd = "X";
                    ReqMan = "";
                } else if (stockReqType === oRes.getText("ManualRequest")) {
                    ReqOrd = "";
                    ReqMan = "X";
                }

                var dateTime = this.getView().byId("planned").getDateValue();
                var date = this.printDate(dateTime);

                // var dateVal = this.getView().byId("planned").getValue(); 

                // Pdatu and Pzeit - Planned Date & Time
                if (date) {
                    const arrDateTime = date.split(",");
                    console.log("Date " + arrDateTime[0] + ": Time " + arrDateTime[1]);
                    var Pdatu = arrDateTime[0];
                    var Pzeit = arrDateTime[1];
                }

                Pdatu = new Date(dateTime);

                //Default Radio button selection to Request Remaining or Request Target
                let reqQtyType = this.getView().byId("idReqQty").getSelectedIndex();
                var remTarg = "";
                var targetQty = "0";
                var targetUoM = "";

                if (reqQtyType == 0) {//Request Remaining
                    remTarg = "RR";
                } else if (reqQtyType == 1) {//Request Target
                    //If request target type, then fill in target qty and Target UoM
                    remTarg = "RT";
                }

                if (remTarg && remTarg == "RT") {
                    targetQty = headerData.targetQty;
                    targetUoM = headerData.targetUoM;

                }

                if (headerData.destStorageBin) {
                    headerData.destStorageBin = headerData.destStorageBin.trim().toUpperCase();
                }

                var goodsItems = this.getView().getModel("goodsItemJSONModel").getData();
                if (goodsItems.length > 0) {

                    var itemPosition = 0;
                    try {
                        //29-03-2024 - to fix the defect - if user chooses suggested value in chrome browser
                        //Date format is different and date gets saved as 01.01.1970
                        if (dateTime === undefined || dateTime === null) {
                            //console.log("Date time value is undefined on Create TR");
                            throw new Error(oRes.getText("validPlannedDate"));
                        }
                        // else if(Pdatu){
                        //     if(Pdatu <= new Date()){
                        //         throw new Error(oRes.getText("validPlannedDate"));
                        //     }

                        // }

                        goodsItems.forEach(function (object) {
                            itemPosition++;
                            var requestedQty = object.Ofmng;

                            //User has to enter valid positive quantity in Requested Quantity field
                            if ((ReqOrd === 'X') && (object.Ofmng != null && (object.Ofmng == "" || object.Ofmng.trim().length == 0))) {
                                object.Ofmng = "0";
                                requestedQty = object.Ofmng;
                            }

                            if (ReqMan === 'X') {
                                if ((object.Menga != null && (object.Menga == "" || object.Menga.trim().length == 0))) {
                                    object.Menga = "0";
                                    requestedQty = object.Menga;
                                }
                                // object.Ofmng = object.Menga;
                                //Ofmng is set while Matnr and Altme are validated on click of Add
                            }

                            // if (ReqMan === 'X') {
                            //     var reqQtyAU = object.Ofmng;
                            //     var uomAlternate = object.Meins;
                            // }
                            // if((requestedQty && requestedQty<0)){

                            //     throw new Error(oRes.getText("msgTextReqQtyPositive"));
                            // }
                            // else{
                            /* Adjusting the payload for the field requestQty according to decimal notation of the user by Veera Sudheer */
                            if (requestedQty && decimalNotation == "0001") {
                                let oNumberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
                                    groupingEnabled: true,
                                    groupingSeparator: ".",
                                    decimalSeparator: ","
                                });
                                oStr = String(oNumberFormat.parse(requestedQty));


                            } else if (requestedQty && decimalNotation == "0002") {
                                let oNumberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
                                    groupingEnabled: true,
                                    groupingSeparator: ",",
                                    decimalSeparator: "."
                                });
                                oStr = String(oNumberFormat.parse(requestedQty));
                            } else {
                                let oNumberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
                                    groupingEnabled: true,
                                    groupingSeparator: " ",
                                    decimalSeparator: ","
                                });
                                oStr = String(oNumberFormat.parse(requestedQty));
                            }
                            if (itemPosition) {
                                var strItemPosition = itemPosition.toString();
                            }
                            var oItem = {
                                "Tbpos": strItemPosition,
                                "Matnr": object.Matnr,//Material number or Material
                                "Matxt": object.Matxt,//Material description
                                "Bdmng": object.Bdmng,//Requirement Qty
                                //"Ofmng": object.Ofmng,//Requested Qty
                                "Ofmng": oStr,//Requested Qty
                                "Tbmng": object.Tbmng,//Already Requested
                                "Meins": object.Meins,//UoM

                                "Menga": object.Menga,//Transfer Reqt qty in alternate unit
                                "Altme": object.Altme,//Alternate UoM for stockeeping unit

                                "Charg": object.Charg,//Batch

                                "Werks": headerData.plant,//Werks
                                "Lgnum": headerData.warehouseNumber,//Lgnum
                                // "Bwart":headerData.movementType,//Bwart
                                "Aufnr": headerData.orderNumber,//Aufnr

                                "TargQty": targetQty,
                                "TargUom": targetUoM,

                                "RemTarg": remTarg//Request Remaining (RR) or Request Target (RT)

                            };

                            itemData.push(oItem);

                            //}//end of Else block
                        });//end of forEach

                        var payload = {
                            "ReqOrd": ReqOrd,//OData - ReqOrd or ReqMan
                            "ReqMan": ReqMan,
                            "Werks": headerData.plant,//Werks
                            "Lgnum": headerData.warehouseNumber,//Lgnum
                            "Pdatu": Pdatu,//Pdatu and Pzeit - planned date and time
                            // "Pdatu":"datetime\'2024-12-12T12:00\'",
                            // "Pzeit":"PT13H20M",
                            "Pzeit": Pzeit,//Pdatu and Pzeit - planned date and time
                            "Tbpri": headerData.transferPriority,//Tbpri	
                            "Bwart": headerData.movementType,//Bwart
                            "Aufnr": headerData.orderNumber,//Aufnr
                            "Betyp": headerData.requirementNumber,//betyp - reqt type(N or P)
                            "Benum": headerData.requirementDesc,//benum - reqt desc

                            "Lgort": headerData.storageLoc,//Lgort
                            "Nltyp": headerData.destStorageType,//Nltyp
                            "Nlpla": headerData.destStorageBin,//Nlpla	

                            "HdrToItemsNav": itemData
                        };

                        this.createTR(payload);

                    } catch (err) {
                        MessageBox.error(err.message);
                    }



                } //End of block goodsItem length > 0

            },

            /**
             * 
             * @param {*} payload 
             */
            createTR: function (payload) {
                var stockReqModel = this.getOwnerComponent().getModel("stockReqModel");
                stockReqModel.create("/StockReqHdrSet", payload, {
                    success: $.proxy(function (oRetrievedResult) {

                        if (oRetrievedResult.UpdStatus && oRetrievedResult.UpdStatus === 'S') {
                            if (oRetrievedResult.ReqMan === 'X' && oRetrievedResult.Tbnum) {
                                var Tbnum = oRetrievedResult.Tbnum;
                                MessageBox.success(oRes.getText("msgCreateTRSuccess") + " " + Tbnum + " "
                                    + oRes.getText("msgCreated"));
                            } else {
                                if (oRetrievedResult.ReqOrd === 'X') {
                                    MessageBox.success(oRes.getText("msgWMStagingSuccess") + "\n\n"
                                        + oRes.getText("msgCreateTRSuccess") + " "
                                        + oRes.getText("msgCreated"));
                                }
                            }

                            // MessageBox.success(oRes.getText("msgWMStagingSuccess")+ "\n\n"
                            //                     +oRes.getText("msgCreateTRSuccess")+" "+Tbnum+" "
                            //                     +oRes.getText("msgCreated")); 
                            this.clearScreen();
                        }


                    }, this),
                    error: $.proxy(function (oError) {
                        if (oError.responseText) {
                            var ERROR = "";
                            ERROR = oError.responseText.split("<message xml:lang=\"en\">")[1].split("</message>")[0];

                            try {
                                var response = JSON.parse(oError.responseText);
                                var errorList = response.error.innererror.errordetails;
                                if (errorList.length > 0) {
                                    var errorMsgs = [];

                                    for (var i = 0; i < errorList.length; i++) {
                                        errorMsgs.push(errorList[i].message);
                                        ERROR = ERROR + errorList[i].message + "\n";
                                    }
                                } else {
                                    if (response.error.message) {
                                        ERROR = response.error.message.value;
                                    }
                                }
                                MessageBox.error(ERROR);
                            } catch (err) {
                                MessageBox.error(ERROR);
                            }
                        }
                    }, this)
                });
            },

            /**
             * Method to clear the scrren on successful creation of TR - Transfer Requirement
             * Feb 28 2024
             */
            clearScreen: function () {
                this.clearValueStates();
                this.getOwnerComponent().getModel("message").setData([]);
                var headerModel = this.getView().getModel("locHeaderModel");
                var headerData = headerModel.getData();
                headerData.plDateTime = "";
                headerData.orderNumber = "";
                headerData.transferPriority = "";
                // headerData.movementType = "";
                headerData.requirementDesc = "";
                headerData.destStorageType = "";
                headerData.destStorageBin = "";

                headerData.targetQty = "";
                headerData.targetUoM = "";

                headerModel.refresh();
                this.getView().getModel("goodsItemJSONModel").setData([]);
                this.getView().getModel("goodsItemJSONModel").refresh();
                this.getView().getModel("locGoodsItemModel").setData([]);
                this.getView().getModel("locGoodsItemModel").refresh();
            },

            /**
             * Method called to reset goods item model, when any header data is changed
             * - Created on 29-02-2024
             */

            clearItemsTable: function () {
                this.getView().getModel("goodsItemJSONModel").setData([]);
                this.getView().getModel("goodsItemJSONModel").refresh();
                this.getView().getModel("locGoodsItemModel").setData([]);
                this.getView().getModel("locGoodsItemModel").refresh();
            }
        });
    });
