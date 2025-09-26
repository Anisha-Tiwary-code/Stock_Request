/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comreckitt/zpe_stockrequest/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
