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
    "W19N22":[],
    "W22N25":[],
    "W23N25":[],
    "W21N24":[new sendInfo("W19N22",RESOURCE_ENERGY,configTerminal.baseReservedEnergy,10000,150000,150000)]
}