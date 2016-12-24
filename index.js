/*
{
    "bridge": {
    	...
    },

    "description": "...",

    "accessories": [
        {
            "accessory": "DaikinSKYFi",
            "name": "Daikin Demo",
            "apiroute": "http://myurl.com:2000",
	    "type": "SKYfi"
        }
    ],

    "platforms":[]
}

*/


var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-daikin-skyfi", "DaikinSKYFi", DaikinSKYFi);
};


function convertDaikinToJSON(input) {
	// Daikin systems respond with HTTP response strings, not JSON objects. JSON is much easier to parse, so we convert it with some RegExp here.
	var stageOne;
	var stageTwo;
	
	stageOne = replaceAll(input, "\=", "\":\"");
	stageTwo = replaceAll(stageOne, "\&", "\",\"");
	
	return "{\"" + stageTwo + "\"}";
}

function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\]\")/g, "\\$1");
	// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
}

function replaceAll(str, find, replace) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	// From http://stackoverflow.com/a/1144788
}

function DaikinSKYFi(log, config) {

	this.log = log;
	
	this.httpRequestGetInfo = config.apiroute + "/set.cgi?pass=" + config.pass;
	this.httpSetTempature = this.httpRequestGetInfo + "&t=";
	this.httpSetMode = this.httpRequestGetInfo + "&m=";
	this.httpCurrentlyRequestingInfo = false;
	this.httpAttemptsSinceLastCompletedRequest - 0;
		
	this.service = new Service.Thermostat(this.name);
		
	this.targetTemperatureCallback = null;
	this.targetTemperatureRequested = null;
	this.targetCoolingStateFunction = null;

	this.currentTemperatureCallback = null;
	this.currentCoolingStateFunction = null;
	
	this.maxTemp = 32.0;
      }

DaikinSKYFi.prototype = {

	identify: function(callback) {
		this.log("Identify requested!");
		callback(null);
	},

	getServices: function() {

		this.log("getServices");

		this.service
			.getCharacteristic(Characteristic.Name)
			.on('get', this.getName.bind(this));

		this.service
			.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
			.on('get', this.getCurrentHeatingCoolingState.bind(this));

		this.service
			.getCharacteristic(Characteristic.TargetHeatingCoolingState)
			.on('get', this.getTargetHeatingCoolingState.bind(this))
			.on('set', this.setTargetHeatingCoolingState.bind(this));

		this.service
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getCurrentTemperature.bind(this));

		this.service
			.getCharacteristic(Characteristic.TargetTemperature)
			.on('get', this.getTargetTemperature.bind(this))
			.on('set', this.setTargetTemperature.bind(this));

		this.service
			.getCharacteristic(Characteristic.TemperatureDisplayUnits)
			.on('get', this.getTemperatureDisplayUnits.bind(this))
			.on('set', this.setTemperatureDisplayUnits.bind(this));

	      return [this.service];
	},
	
	getName: function(callback) {
	  callback(null, this.name);
	},
	
	sendCommandToDaikin: function (httpAddress, callbackFunction) {
	  if ( ! this.httpCurrentlyRequestingInfo ) {
	    this.httpCurrentlyRequestingInfo = true;
	    request(httpAddress, callbackFunction.bind({i:this})); 
	  }
	},
	
	receiveDaikinInfo: function (error, response, body) {
	  
	  this.i.httpCurrentlyRequestingInfo = false;
	  
	    if (!error && response.statusCode == 200) {
	      
	      this.i.httpAttemptsSinceLastCompletedRequest = 0;
	      
	      var json = JSON.parse(convertDaikinToJSON(body));
	      
	      responseTargetTemperature = parseFloat(json.settemp);
	      if( this.i.targetTemperatureCallback ) this.i.targetTemperatureCallback(null, responseTargetTemperature);
	      this.i.targetTemperatureCallback = null;
	      	      
	      responseCurrentTemperature = parseFloat(json.roomtemp);
	      if( this.i.currentTemperatureCallback ) this.i.currentTemperatureCallback(null, responseCurrentTemperature);
	      this.i.currentTemperatureCallback = null;
	      
	      responseHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;	      
	      if ( json.opmode == "1") {
		switch(json.acmode) {
		  case "2":
		    responseHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.HEAT;
		    this.i.log("Current state: HEAT, Target Temp: " + responseTargetTemperature + ", Current Temp: " + responseCurrentTemperature);
		  break;
  		  
		  case "8":
		    responseHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.COOL;
		    this.i.log("Current state: COOL, Target Temp: " + responseTargetTemperature + ", Current Temp: " + responseCurrentTemperature);
		  break;
  
		  case "9":
		    responseHeatingCoolingState = 3; // Characteristic.CurrentHeatingCoolingState.AUTO;
		    this.i.log("Current state: AUTO, Target Temp: " + responseTargetTemperature + ", Current Temp: " + responseCurrentTemperature);
		  break;

		  default:
		    responseHeatingCoolingState = 3; //Characteristic.CurrentHeatingCoolingState.AUTO;
		    this.i.log("Unknown cooling state returned from unit - defaulted to AUTO");
		  break;
	      }
	    }
	    
	    if( this.i.currentCoolingStateFunction ) this.i.currentCoolingStateFunction(null, responseHeatingCoolingState);
	    this.i.currentCoolingStateFunction = null;
	    
	    if( this.i.targetCoolingStateFunction ) this.i.targetCoolingStateFunction(null, responseHeatingCoolingState);
	    this.i.targetCoolingStateFunction = null;
	  		  
	    // Finally, if we are out of sync then attempt to sync
	    if ( this.i.targetTemperatureRequested == null) {
	    } else {
	      if ( this.i.targetTemperatureRequested != responseTargetTemperature ) {
		this.i.log("Temp out of sync. Current Target = " + responseTargetTemperature + ", Last Temp Requested = " + this.i.targetTemperatureRequested);
		this.i.sendTargetTemperature(this.i.targetTemperatureRequested);
	      }
	    }
	      	      
	  } else {
	    this.i.httpAttemptsSinceLastCompletedRequest ++;
            this.i.log("Received error so trying HTTP request again: " + error)
	    if ( this.i.httpAttemptsSinceLastCompletedRequest < 3 ) {
	      this.i.sendCommandToDaikin(this.i.httpRequestGetInfo, this.i.receiveDaikinInfo);
	    } else {
	      httpAttemptsSinceLastCompletedRequest = 0;
	      this.i.log("Error getting info. Given up: %s", error)
	      if( this.i.targetTemperatureCallback ) this.i.targetTemperatureCallback(error);
	      this.i.targetTemperatureCallback = null;

	      if( this.i.currentTemperatureCallback ) this.i.currentTemperatureCallback(error);
	      this.i.currentTemperatureCallback = null;

	      if( this.i.currentCoolingStateFunction ) this.i.currentCoolingStateFunction(error);
	      this.i.currentCoolingStateFunction = null;
	    }
	  }
	},
	  
	getCurrentHeatingCoolingState: function(callback) {
  	  this.currentCoolingStateFunction = callback;
	  this.sendCommandToDaikin(this.httpRequestGetInfo, this.receiveDaikinInfo);
	},

	getTargetHeatingCoolingState: function(callback) {
	  this.targetCoolingStateFunction = callback;
	  this.sendCommandToDaikin(this.httpRequestGetInfo, this.receiveDaikinInfo);
	},

	getTargetTemperature: function(callback) {
	  this.targetTemperatureCallback = callback;
	  this.sendCommandToDaikin(this.httpRequestGetInfo, this.receiveDaikinInfo);
	},
	
	getCurrentTemperature: function(callback) {
	  this.currentTemperatureCallback = callback;
	  this.sendCommandToDaikin(this.httpRequestGetInfo, this.receiveDaikinInfo);
	},

	sendTargetTemperature: function(value) {
	  this.sendCommandToDaikin(this.httpSetTempature + value, this.receiveDaikinInfo);
	},
	
	setTargetTemperature: function(value, callback) {
	  newTemp = value;
	  if ( parseFloat(value) > this.maxTemp ) {
	    this.log("Temp requestsed: " + value + " Max temp: " + this.maxTemp);
	    newTemp = this.maxTemp;
	  }

	  this.targetTemperatureRequested = newTemp;
	  this.log("setTargetTemperature: " + this.targetTemperatureRequested);
	  this.sendTargetTemperature(this.targetTemperatureRequested);
	  callback(null);
	},

	setTargetHeatingCoolingState: function(value, callback) {
      
          targetHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.AUTO;
	  targetPower = 0;
	  	  
	  switch(value) {
		  case Characteristic.CurrentHeatingCoolingState.OFF:
		    break;		    
		    
		  case Characteristic.CurrentHeatingCoolingState.HEAT:
		    targetHeatingCoolingState = 2;
		    targetPower = 1;
		  break;
  		  
		  case Characteristic.CurrentHeatingCoolingState.COOL:
		    targetHeatingCoolingState = 8;
		    targetPower = 1;
		  break;
  
		  case 3: // Characteristic.CurrentHeatingCoolingState.AUTO:
		    targetHeatingCoolingState = 9;
		    targetPower = 1;
		  break;

		  default:
		    this.log("Unknown cooling state returned from unit (" + value + ")" + "- defaulted to OFF");
		  break;
	      }
	  this.sendCommandToDaikin(this.httpSetMode + targetHeatingCoolingState + "&p=" + targetPower, this.receiveDaikinInfo);
	  callback(null);
	},

	getTemperatureDisplayUnits: function(callback) {
	  callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
	},

	setTemperatureDisplayUnits: function(value, callback) {
	  callback(null);
	}
}
