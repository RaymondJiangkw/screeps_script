const roomAdvancedTaskExtension = {
    AddAidTask(from,fromRoom,to,toRoom,resourceType,stopAmount,toStopAmount,groupsNum = 1,changeable = false,silence = false,getRepeat = false){
        var toTarget = Game.getObjectById(to)
        if (toTarget && toTarget.store.getUsedCapacity() > toStopAmount) return undefined
        const data = {from,fromRoom,to,toRoom,resourceType,stopAmount,toStopAmount}
        return this.AddTask("transfer","aid",data,groupsNum,changeable,silence,getRepeat)
    },
}
_.assign(Room.prototype,roomAdvancedTaskExtension)