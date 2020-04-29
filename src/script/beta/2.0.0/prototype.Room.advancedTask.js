const roomAdvancedTaskExtension = {
    AddAidTask(from,fromRoom,to,toRoom,resourceType,stopAmount,toStopAmount,groupsNum = 1,changeable = false,silence = false,getRepeat = false){
        var toTarget = Game.getObjectById(to)
        if (toTarget && toTarget.store.getUsedCapacity() > toStopAmount) return undefined
        const data = {from,fromRoom,to,toRoom,resourceType,stopAmount,toStopAmount}
        return this.AddTask("transfer","aid",data,groupsNum,changeable,silence,getRepeat)
    },
    AddLimitTransferTask(from,to,resourceType,stopAmount,settings = {toStopAmount:undefined,groupsNum:1,changeable:false,silence:false,getRepeat:false}){
        settings.toStopAmount = settings.toStopAmount || undefined
        settings.groupsNum = settings.groupsNum || 1
        settings.changeable = settings.changeable || false
        settings.silence = settings.silence || false
        settings.getRepeat = settings.getRepeat || false
        
        var fromTarget = Game.getObjectById(from)
        var toTarget = Game.getObjectById(to)
        if (toTarget && toTarget.store.getUsedCapacity() > settings.toStopAmount) return undefined
        if (fromTarget && fromTarget.store.getUsedCapacity(resourceType) < stopAmount) return undefined
        const data = {from,to,resourceType,stopAmount,toStopAmount:settings.toStopAmount}
        return this.AddTask("transfer","limit",data,settings.groupsNum,settings.changeable,settings.silence,settings.getRepeat)
    }
}
_.assign(Room.prototype,roomAdvancedTaskExtension)