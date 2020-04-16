const utils = require('utils')
const ERR_SWITCH = "switch"
const FINISH = "finish"
const ERR_RENEW = "renew"
module.exports = function() {
    _.assign(Creep.prototype,creepRunExtensions)
}
const getLab = function(roomName,resourceType) {

}
const creepRunExtensions = {
    _adjMove(targetPos){
        if (!utils.adjacentPos(this.pos,targetPos)) {
            this.travelTo(new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName))
            return ERR_NOT_IN_RANGE
        }else return OK
    },
    _Move(targetPos){
        if (!this.pos.x === targetPos.x || !this.pos.y === targetPos.y || !this.pos.roomName === targetPos.roomName){
            this.travelTo(new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName))
            return ERR_NOT_IN_RANGE
        }else return OK
    },
    _withdraw(targetID,resourceType,amount){
        const target = Game.getObjectById(targetID)
        if (!target) return ERR_INVALID_TARGET,0
        if (!resourceType && target.store.getUsedCapacity() === 0) return ERR_NOT_ENOUGH_RESOURCES,0
        else if (resourceType && target.store.getUsedCapacity(resourceType) === 0) return ERR_NOT_ENOUGH_RESOURCES,0
        var Amount = this.store.getFreeCapacity()
        if (resourceType) Amount = Math.min(Amount,target.store.getUsedCapacity(resourceType))
        else Amount = Math.min(Amount,target.store.getUsedCapacity())
        if (amount) Amount = Math.min(Amount,amount)
        var ret;
        if (resourceType) this.withdraw(target,resourceType,Amount)
        else{
            for (var resource in target.store) this.withdraw(target,resource,Math.min(Amount,target.store.getUsedCapacity(resource)))
        }
        if (ret === OK) return OK,Amount
    },
    _harvestEnergy(targetID,targetPos){
        const target = Game.getObjectById(targetID)
        var ret = this.harvest(target)
        if (ret === OK) return OK,0
    },
    _getEnergy(taskType){ //Most cases used for RESOURCE_ENERGY
        if (!this.memory.get.getTarget || !this.memory.get.getTargetPos) {
            if (taskType === "upgradeController") {if (global.links[roomName].upgrade.length > 0) this.memory.get.getTarget = global.links[roomName].upgrade[0].id}
            else {if (global.links[roomName].charges.length > 0) this.memory.get.getTarget = global.links[roomName].charges[0].id}

            if (!this.memory.get.getTarget){
                if ((taskType === "build" || taskType === "repair") && this.room.name !== this.memory.home && Game.rooms[roomName].energys !== []) this.memory.get.getTarget = this.pos.findClosestByRange(RESOURCE_ENERGY).id
                else if (taskType === "build" && Game.rooms[this.memory.home].storage && Game.rooms[this.memory.home].storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].storage.id
                else if (global.containers[roomName].resources.length > 0) {
                    const goodContainers = _.filter(global.containers[roomName].resources,(container)=>container.store.getUsedCapacity(RESOURCE_ENERGY) >= this.store.getFreeCapacity(RESOURCE_ENERGY))
                    goodContainers.sort((containerA,containerB)=>utils.distancePos(this.pos,containerA.pos) - utils.distancePos(this.pos,containerB.pos))
                    if (goodContainers[0]) this.memory.get.getTarget = goodContainers[0].id
                    else this.memory.get.getTarget = global.containers[roomName].resources[0].id
                }else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && Game.rooms[this.memory.home].terminal && Game.rooms[this.memory.home].terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 30000) this.memory.get.getTarget = Game.rooms[this.memory.home].terminal.id
                else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && Game.rooms[this.memory.home].factory && Game.rooms[this.memory.home].factory.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].factory.id
                else if (Game.rooms[this.memory.home].storage && Game.rooms[this.memory.home].storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].storage.id
                else if (Game.rooms[this.memory.home].terminal && Game.rooms[this.memory.home].terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].terminal.id
            }
            if (!this.memory.get.getTarget) this.memory.get.getTarget = this.pos.findClosestByRange(RESOURCE_ENERGY).id
            if (this.memory.get.getTarget) this.memory.get.getTargetPos = Game.getObjectById(this.memory.get.getTarget).pos
        }
        if (this.memory.get.getTarget && this.memory.get.getTargetPos) {
            if (this.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return OK
            }
            if (this["_adjMove"](this.memory.get.getTargetPos) === ERR_NOT_IN_RANGE) return OK
            const target = Game.getObjectById(this.memory.get.getTarget)
            var feedback = undefined
            if (!target.energy) feedback = this._withdraw(this.memory.get.getTarget,RESOURCE_ENERGY,this.store.getFreeCapacity())
            else feedback = this._harvestEnergy(this.memory.get.getTarget)
            if (feedback[0] === OK) return OK
            else if (feedback[0] === ERR_INVALID_TARGET || feedback[0] === ERR_NOT_ENOUGH_RESOURCES) {
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_SWITCH
            }
        }else return ERR_NOT_FOUND
    },
    _getResource(resourceType,amount){ // excludes the lab
        if (!global.resources[this.memory.home][resourceType]) return ERR_NOT_FOUND,0
        if (!this.memory.get.getTarget && this.memory.get.getTargetPos){
            if (global.resources[this.memory.home][resourceType]["storage"]){
                this.memory.get.getTarget = Game.rooms[this.memory.home].storage.id
                this.memory.get.getTargetPos = Game.rooms[this.memory.home].storage.pos
            } else if (global.resources[this.memory.home][resourceType]["terminal"]){
                this.memory.get.getTarget = Game.rooms[this.memory.home].terminal.id
                this.memory.get.getTargetPos = Game.rooms[this.memory.home].terminal.pos
            } else if (global.resources[this.memory.home][resourceType]["factory"]){
                this.memory.get.getTarget = Game.rooms[this.memory.home].factory.id
                this.memory.get.getTargetPos = Game.rooms[this.memory.home].factory.pos
            }
        }
        if (this.memory.get.getTarget && this.memory.get.getTargetPos){
            if (this.store.getFreeCapacity(resourceType) === 0){
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return FINISH,0
            }
            if (!this.memory.get.getTarget && this.store.getUsedCapacity(resourceType) === 0) return ERR_NOT_FOUND,0
            else if (!this.memory.get.getTarget && this.store.getUsedCapacity(resourceType) > 0) return FINISH,0
            if (this["_adjMove"](this.memory.get.getTargetPos) === ERR_NOT_IN_RANGE) return OK,0
            const target = Game.getObjectById(this.memory.get.getTarget)
            var feedback = undefined
            feedback = this._withdraw(target.id,resourceType,amount)
            if (feedback[0] === OK) return OK,feedback[1]
            else if (feedback[0] === ERR_INVALID_TARGET || feedback[0] === ERR_NOT_ENOUGH_RESOURCES) {
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_SWITCH,0
            }else return ERR_NOT_FOUND,0
        }
    },
    _harvest(subtaskType,signals){
        this.initTask()
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (this["_adjMove"](taskInfo.targetPos) === ERR_NOT_IN_RANGE) return OK
        if (taskInfo.data.cachedContainerPos && this["_Move"](taskInfo.data.cachedContainerPos) === ERR_NOT_IN_RANGE) return OK
        var target = Game.getObjectById(taskInfo.targetID)
        if (this.store.getFreeCapacity() === 0){
            // Charge Link
            if (taskInfo.data.chargeLink) {
                for (var link of global.links[roomName][resources]){
                    if (utils.adjacent(this.id,link.id)) this.transfer(link,RESOURCE_ENERGY)
                }
            }
            for (var signal of signals){
                if (signal["drop"]) for (var carryResourceType in this.store) this.drop(carryResourceType)
                else if (signal["transfer"]) for (var carryResourceType in this.store) this.transfer(signal["transfer"],carryResourceType)
            }
            if (taskInfo.settings.changeable) return ERR_RENEW
        }
        var feedback = this.harvest(target)
        if (feedback === OK) return OK
        else if (feedback === ERR_BUSY) return OK
        else if (feedback === ERR_INVALID_TARGET) return FINISH
        else if (feedback === ERR_NOT_ENOUGH_RESOURCES) return FINISH
    },
    _transfer(subtaskType,signals){
        if (!this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (taskInfo.data.from === "energy"){
                var feedback = this._getEnergy("transfer")
                if (feedback === ERR_SWITCH) return OK
                else if (feedback === ERR_NOT_FOUND) return ERR_RENEW
                else if (feedback === OK) {
                    if (this.store.getFreeCapacity(RESOURCE_ENERGY) === 0) this.memory.working = true
                    else return OK
                }
            }else if (taskInfo.data.from === "resource"){
                var feedback = this._getResource(taskInfo.data.resourceType,taskInfo.data.amount)
                if (feedback[0] === ERR_SWITCH) return OK
                else if (feedback[0] === ERR_NOT_FOUND) return FINISH
                else if (feedback[0] === OK){
                    taskInfo.data.amount -= feedback[1]
                    return OK
                }else if (feedback[0] === FINISH) this.memory.working = true
            }else if (taskInfo.data.from === "creep"){
                if (!taskInfo.targetID) taskInfo.targetID = signals["creep"]
                taskInfo.targetPos = Game.getObjectById(taskInfo.targetID).pos
                if (!taskInfo.targetPos) return FINISH
                if (!utils.adjacentPos(this.pos,taskInfo.targetPos)) this.travelTo(Game.getObjectById(taskInfo.targetID))
                if (this.store.getFreeCapacity(taskInfo.data.resourceType) === 0 ||
                    this.store.getUsedCapacity(taskInfo.data.resourceType) === taskInfo.data.amount ||
                    signals["finish"]){
                    taskInfo.data.amount -= this.store.getUsedCapacity(taskInfo.data.resourceType)
                    this.memory.working = true;
                    taskInfo.targetID = undefined
                    taskInfo.targetPos = undefined    
                }else return OK
            }else{
                if (!taskInfo.targetID || !taskInfo.targetPos){
                    if (taskInfo.data.from === "lab"){
                        taskInfo.targetID = getLab(this.memory.home,taskInfo.data.resourceType)
                    }else taskInfo.targetID = taskInfo.data.from
                    taskInfo.targetPos = Game.getObjectById(taskInfo.targetID).pos
                }
                var target = Game.getObjectById(taskInfo.targetID)
                if (this.room.name === taskInfo.targetPos.roomName && (!target || target.store.getUsedCapacity() === 0)) return FINISH
                if (!utils.adjacentPos(this.pos,taskInfo.targetPos)) this["_adjMove"](taskInfo.targetPos)
                var feedback = this._withdraw(taskInfo.targetID,taskInfo.data.resourceType,taskInfo.data.amount)
                if (taskInfo.data.amount) taskInfo.data.amount -= feedback[1]
                if (feedback[0] === OK) {
                    this.memory.working = true;
                    taskInfo.targetID = undefined
                    taskInfo.targetPos = undefined
                    return OK
                }else if (feedback[0] === ERR_INVALID_TARGET || feedback[0] === ERR_NOT_ENOUGH_RESOURCES) return FINISH
            }
        }
        if (this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (!taskInfo.targetID || !taskInfo.targetPos){
                if (taskInfo.data.to === "lab"){
                    taskInfo.targetID = getLab(this.memory.home,taskInfo.data.resourceType)
                }else taskInfo.targetID = taskInfo.data.to
                taskInfo.targetPos = Game.getObjectById(taskInfo.targetID).pos
            }
            if (!utils.adjacentPos(this.pos,taskInfo.targetPos)) this["_adjMove"](taskInfo.targetPos)
            var feedback;
            if (taskInfo.data.resourceType) this.transfer(Game.getObjectById(taskInfo.targetID),taskInfo.data.resourceType)
            else{
                for (var carry in this.store) this.transfer(Game.getObjectById(taskInfo.targetID),carry)
            }
            if (feedback === OK && taskInfo.data.amount === 0) return FINISH
            else if (feedback === OK){
                this.memory.working = false
                if (taskInfo.settings.changeable) return ERR_RENEW
                else return OK
            }else if (feedback === ERR_FULL) return FINISH
            else if (feedback === ERR_INVALID_TARGET) return FINISH
        }
    },
    _work(taskType,subtaskType,signals){
        if (this.store.getFreeCapacity(RESOURCE_ENERGY) === 0) this.memory.working = true
        if (!this.memory.working) {
            var feedback = this._getEnergy(taskType)
            if (feedback === OK || feedback === ERR_SWITCH) return OK
            else if (feedback === ERR_NOT_FOUND) return ERR_RENEW
        }
        if (this.memory.working) {
            this.initTask()
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            var target = Game.getObjectById(taskInfo.targetID)
            if (!target) this["_adjMove"](taskInfo.targetPos)
            var feedback = this[taskType](target)
            if (feedback === ERR_NOT_IN_RANGE) this["_adjMove"](taskInfo.targetPos)
            else if (feedback === ERR_INVALID_TARGET) return FINISH
            else if (feedback === ERR_NOT_ENOUGH_RESOURCES && taskInfo.settings.changeable) return ERR_RENEW
            else if (feedback === ERR_NOT_ENOUGH_RESOURCES && !taskInfo.settings.changeable){
                this.memory.working = false
                return OK
            }
            else if (feedback === OK) return OK
        }
    },
    _build(subtaskType,signals){
        return this._work("build",subtaskType,signals)
    },
    _repair(subtaskType,signals){
        return this._work("repair",subtaskType,signals)
    },
    _upgrade(subtaskType,signals){
        return this._work("upgradeController",subtaskType,signals)
    },
    _pickup(subtaskType,signals){
        if (!this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            this.initTask()
            var target = Game.getObjectById(taskInfo.targetID)
            if (this.room.name === taskInfo.targetPos.roomName && !target) return FINISH
            if (this["_adjMove"](taskInfo.targetPos) === ERR_NOT_IN_RANGE) return OK
            var feedback = this.pickup(Game.getObjectById(taskInfo.targetID))
            if (feedback === OK) this.memory.working = true
            else if (feedback === ERR_INVALID_TARGET) return FINISH
        }
        if (this.memory.working) {
            if (!utils.adjacentPos(this.pos,Game.rooms[this.memory.home].storage.pos)) this["_adjMove"](Game.rooms[this.memory.home].storage.pos)
            var feedback;
            for (var carry in this.store) feedback = this.transfer(Game.rooms[this.memory.home].storage,carry)
            if (feedback === OK && !taskInfo.settings.changeable){
                this.memory.working = false
                return OK
            }else if (feedback === OK && taskInfo.settings.changeable) return ERR_RENEW
            else if (feedback === ERR_FULL) return FINISH
            else if (feedback === ERR_INVALID_TARGET) return FINISH
        }
    },
    _defend(subtaskType,signals){

    },
    _attack(subtaskType,signals){
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (subtaskType !== "heal" && this.room.name !== taskInfo.data.targetRoom){
            if (taskInfo.data.routes[0] === this.room.name) taskInfo.data.routes[0].shift()
            if (taskInfo.data.routes[0]){
                this["_adjMove"](new RoomPosition(25,25,taskInfo.data.routes[0]))
            }else this["_adjMove"](new RoomPosition(25,25,taskInfo.data.targetRoom))
            return OK
        }
        if (subtaskType === "harvest"){
            const target = Game.getObjectById(taskInfo.data.target)
            if (!taskInfo.data.targetPos) taskInfo.data.targetPos = target.pos
            if (this["_adjMove"](taskInfo.data.targetPos) === ERR_NOT_IN_RANGE) return OK
            const bodySituation = utils.analyseCreep(this.id)
            if (bodySituation["move"][1] === 0 && bodySituation["attack"][1] / (bodySituation["attack"][0] * 100) <= 0.5) return OK
            this.attack(target)
        }else if (subtaskType === "heal"){
            if (taskInfo.data.target === "creep") taskInfo.data.target = signals["creep"]
            this.moveTo(Game.getObjectById(taskInfo.data.target))
            const masterSituation = utils.analyseCreep(taskInfo.data.target)
            if (masterSituation["attack"][3] === true || masterSituation["move"][3] === true){
                this.heal(Game.getObjectById(taskInfo.data.target))
            }else{
                this.heal(this)
            }
        }else if (subtaskType === "claim"){
            if (!Game.rooms[taskInfo.data.targetRoom].controller || Game.rooms[taskInfo.data.targetRoom].controller.my) return OK
            const controller = Game.rooms[taskInfo.data.targetRoom].controller
            if (this["_adjMove"](controller.pos) === ERR_NOT_IN_RANGE) return OK
            if (!controller.my && controller.owner){
                this.attackController(controller)
            }else{
                var feedback = this.claimController(controller)
                if (feedback === ERR_GCL_NOT_ENOUGH) this.reserveController(controller)
            }
        }else if (subtaskType === "attack"){
            if (!taskInfo.data.targetID){
                const targetRoom = taskInfo.data.targetRoom
                if (!taskInfo.data.target){
                    const targetCreeps = Game.rooms[targetRoom].find(FIND_HOSTILE_CREEPS)
                    const targetSpawns = Game.rooms[targetRoom].find(FIND_HOSTILE_SPAWNS)
                    const targetTowers = _.filter(targetStructures,(structure)=>structure.structureType === STRUCTURE_TOWER)
                    let chosenTarget = undefined
                    if (targetTowers.length > 0) chosenTarget = targetTowers[0]
                    else if (targetCreeps.length > 0) chosenTarget = targetCreeps[0]
                    else if (targetSpawns.length > 0) chosenTarget = targetSpawns[0]
                    taskInfo.data.targetID = chosenTarget.id
                }
            }
            if (taskInfo.data.targetID){
                const target = Game.getObjectById(taskInfo.data.targetID)
                if (this.attack(target) === ERR_NOT_IN_RANGE) this.moveTo(target)
            }
        }
    },
    run(signals = []){
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        return this["_" + taskInfo.taskType](taskInfo.subtaskType,signals)
    }
}