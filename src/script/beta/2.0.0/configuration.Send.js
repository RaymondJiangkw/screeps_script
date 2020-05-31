const configTerminal = require('configuration.Terminal')
class sendInfo{
    constructor(targetRoom,resourceType,baseAmount,sendAmount,targetStopAmount,targetStopCapacity){
        this.targetRoom = targetRoom
        this.resourceType = resourceType
        this.baseAmount = baseAmount
        this.sendAmount = sendAmount
        this.targetStopAmount = targetStopAmount
        this.targetStopCapacity = targetStopCapacity
    }
}
module.exports = {
    "W18N22":[],
    "W19N22":[new sendInfo("W22N25",RESOURCE_SILICON,0,1000,50000,300000),
              new sendInfo("W23N25",RESOURCE_ENERGY,configTerminal.baseReservedEnergy,10000,150000,250000),
              new sendInfo("W22N25",RESOURCE_ENERGY,configTerminal.baseReservedEnergy,10000,150000,250000)],
    "W22N25":[],
    "W23N25":[new sendInfo("W22N25",RESOURCE_KEANIUM,10000,2500,2500,250000),
              new sendInfo("W22N25",RESOURCE_ZYNTHIUM,2500,2500,10000,250000),
              new sendInfo("W22N25","XKHO2",3000,1000,3000,300000)],//new sendInfo("W22N25",RESOURCE_ENERGY,configTerminal.baseReservedEnergy,10000,150000,250000)],
    "W21N24":[new sendInfo("W22N25",RESOURCE_ENERGY,configTerminal.baseReservedEnergy,10000,150000,250000),
              new sendInfo("W23N25",RESOURCE_ENERGY,configTerminal.baseReservedEnergy,10000,150000,250000)]
}