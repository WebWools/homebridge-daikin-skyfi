# homebridge-daikin-skyfi

Supports Daikin Air Conditioners (that use SKYFi) on HomeBridge.

# Installation

The following steps will install HomeBridge-DaikinSKYFi. In it's current form allows you to turn the power on or off, set heating or cooling mode and set the target temperature. The install may require you to run as an administrator (using a different login or sudo):

1. Install homebridge using: npm install -g homebridge
2. *** Installation instructions for the homebridge-daikin-skyfi plugin have not been written yet. Can I use npm? I will need to investigate as I have never done this before ... ***
3. Update your configuration file. See sample-config.json in this repository for a sample.


# Configuration

Configuration sample:

 ```
    {
        "bridge": {
            ...
        },
        
        "description": "...",

        "accessories": [
            {
                "accessory": "DaikinSKYFi",
                "name": "DaikinSKYFi",
                "apiroute": "http://192.168.X.X:2000",
                "pass": "XXXXX",
                "type": "SKYFi"
            }
        ],

        "platforms":[]
    }
```
# Notes on the CONFIG

The apiroute is the IP address of your with the port 2000 attached. Example: "http://192.168.0.30:2000". The pass is the passcode you use to access the unit using the Daikin SKYFi app on your phone. Example "01234".

# Credit

This whole plugin is based on the DirtyDevWork/homebridge-daikin plugin which is *based* on the homebridge-thermostat. Adapting DirtyDevWork's rather excellent js script for SKYFi was not as easy as I had first thought. Basically it required a rewrite of any code that sent HTTP commands as SKYFi and non-SKYFi units accept quite different commands and I also found that my Daikin SKYFi unit hates two HTTP commands being sent at the same time! More than happy for anyone to take this code and merge is back into DirtyDevWork's branch to create one Daikin module. 


# Further information on the Daikin commands:

http://192.168.X.X:2000/set.cgi?pass=XXXXX&p=1&t=20&f=1&m=2

Power On

p=1

Power Off

p=0

Set Temperature (to 20)

t=20

Set Fan Speed (1-3)

f=1

Set Mode (2 for Heat, 4 for Dry, 8 for Cool and 16 for Fan)

m=2
