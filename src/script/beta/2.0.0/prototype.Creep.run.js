const utils = require('utils')
const constants = require('constants')
const creepConfig = require('configuration.Creep')
const claimRoomConfig = require('configuration.targetRooms')
const ERR_SWITCH = "switch"
const FINISH = "finish"
const ERR_DELETE = "delete"
const ERR_RENEW = "renew"
module.exports = function() {
    _.assign(Creep.prototype,creepRunExtensions)
}
const getLab = function(roomName,resourceType) {

}
const creepRunExtensions = {
    _adjMove(targetPos){
        if (!targetPos) return OK
        if (!utils.adjacentPos(this.pos,targetPos)) {
            this.moveTo(new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName))
            return ERR_NOT_IN_RANGE
        }else return OK
    },
    _Move(targetPos){
        if (!this.pos.x === targetPos.x || !this.pos.y === targetPos.y || !this.pos.roomName === targetPos.roomName){
            this.travelTo(new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName))
            if (!utils.adjacentPos(this.pos,targetPos)) return ERR_NOT_IN_RANGE
            else return OK
        }else return OK
    },
    _boost(){
        if (!this.memory["_tmp"]) this.memory["_tmp"] = {}
        if (!this.memory["_tmp"]["bodyAnalysis"]) this.memory["_tmp"]["bodyAnalysis"] = utils.analyseCreep(this.id)
        if (!this.memory.boostCompounds || this.memory.boostCompounds === []) return FINISH
        if (global.rooms.my.indexOf(this.room.name) < 0) return FINISH
        if (!this.memory.boostTarget || !this.memory.boostTargetPos){
            const COMPOUND_UNIT = 30
            const ENERGY_UNIT = 20    
            for (var i = 0;i < this.memory.boostCompounds.length;i++){
                const boostCompound = this.memory.boostCompounds[i]
                if (!global.resources[this.room.name][boostCompound]) continue
                //const NEED_COMPOUND = COMPOUND_UNIT * this.memory["_tmp"]["bodyAnalysis"][constants.compoundEffect[boostCompound]][0]
                //const NEED_ENERGY = ENERGY_UNIT * this.memory["_tmp"]["bodyAnalysis"][constants.compoundEffect[boostCompound]][0]
                if (global.resources[this.room.name][boostCompound]["labs"] >= COMPOUND_UNIT){
                    for (var lab of Game.rooms[this.room.name]){
                        if (lab.store.getUsedCapacity(boostCompound) >= COMPOUND_UNIT && lab.store.getUsedCapacity(RESOURCE_ENERGY) >= ENERGY_UNIT){
                            this.memory.boostTarget = lab.id
                            this.memory.boostTargetPos = lab.pos
                            break
                        }
                    }
                }
                if (this.memory.boostTarget && this.memory.boostTargetPos) break
            }
        }
        if (this.memory.boostTarget && this.memory.boostTargetPos){
            if (this["_adjMove"](tihs.memory.boostTargetPos) === ERR_NOT_IN_RANGE) return OK
            const boostCompound = Game.getObjectById(this.memory.boostTarget).mineralType;
            const boostBodyPart = utils.compoundEffect(boostCompound)
            if (!Game.getObjectById(this.memory.boostTarget)){
                this.memory.boostTarget = undefined
                this.memory.boostTargetPos = undefined
                return FINISH
            }
            var feedback = Game.getObjectById(this.memory.boostTarget).boostCreep(this)
            this.memory.boostTarget = undefined
            this.memory.boostTargetPos = undefined
            if (feedback !== OK) return FINISH
            this.memory["_tmp"]["bodyAnalysis"] = utils.analyseCreep(this.id)
            if (this.memory["_tmp"]["bodyAnalysis"][boostBodyPart][0] === this.memory["_tmp"]["bodyAnalysis"][boostBodyPart][2].length){
                this.memory.boostCompounds.splice(this.memory.boostCompounds.find(boostCompound),1)
            }
        }
        return FINISH
    },
    _withdraw(targetID,resourceType,amount){
        const target = Game.getObjectById(targetID)
        if (!target) return [ERR_INVALID_TARGET,0]
        if (!resourceType && target.store.getUsedCapacity() === 0) return [ERR_NOT_ENOUGH_RESOURCES,0]
        else if (resourceType && target.store.getUsedCapacity(resourceType) === 0) return [ERR_NOT_ENOUGH_RESOURCES,0]
        var Amount = this.store.getFreeCapacity()
        if (resourceType) Amount = Math.min(Amount,target.store.getUsedCapacity(resourceType))
        else Amount = Math.min(Amount,target.store.getUsedCapacity())
        if (amount) Amount = Math.min(Amount,amount)
        var ret;
        if (resourceType) ret = this.withdraw(target,resourceType,Amount)
        else{
            for (var resource in target.store) ret = this.withdraw(target,resource,Math.min(Amount,target.store.getUsedCapacity(resource)))
        }
        return [ret,Amount]
    },
    _harvestEnergy(targetID,targetPos){
        const target = Game.getObjectById(targetID)
        var ret = this.harvest(target)
        return [ret,0]
    },
    _getEnergy(taskType){ //Most cases used for RESOURCE_ENERGY
        if (!this.memory.get) this.memory.get = {}
        if (!this.memory.get.getTarget || !this.memory.get.getTargetPos) {
            if (taskType === "upgradeController") {if (global.links[this.memory.home].upgrade.length > 0) this.memory.get.getTarget = global.links[this.memory.home].upgrade[0].id}
            else {if (global.links[this.memory.home].charges.length > 0) this.memory.get.getTarget = global.links[this.memory.home].charges[0].id}

            if (!this.memory.get.getTarget){
                if ((taskType === "build" || taskType === "repair") && this.room.name !== this.memory.home && Game.rooms[this.room.name].energys !== []) this.memory.get.getTarget = this.pos.findClosestByRange(FIND_SOURCES_ACTIVE).id
                else if (taskType === "build" && Game.rooms[this.memory.home].storage && Game.rooms[this.memory.home].storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].storage.id
                else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && Game.rooms[this.memory.home].storage && Game.rooms[this.memory.home].storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].storage.id
                else if (_.filter(global.containers[this.memory.home].resources,c=>c.store.getUsedCapacity(RESOURCE_ENERGY) > 0).length > 0) {
                    const goodContainers = _.filter(global.containers[this.memory.home].resources,(container)=>container.store.getUsedCapacity(RESOURCE_ENERGY) >= this.store.getFreeCapacity(RESOURCE_ENERGY))
                    goodContainers.sort((containerA,containerB)=>utils.distancePos(this.pos,containerA.pos) - utils.distancePos(this.pos,containerB.pos))
                    if (goodContainers[0]) this.memory.get.getTarget = goodContainers[0].id
                    else this.memory.get.getTarget = global.containers[this.memory.home].resources[0].id
                }else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && Game.rooms[this.memory.home].terminal && Game.rooms[this.memory.home].terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 30000) this.memory.get.getTarget = Game.rooms[this.memory.home].terminal.id
                else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && Game.rooms[this.memory.home].factory && Game.rooms[this.memory.home].factory.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].factory.id
                else if (Game.rooms[this.memory.home].storage && Game.rooms[this.memory.home].storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].storage.id
                else if (Game.rooms[this.memory.home].terminal && Game.rooms[this.memory.home].terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.get.getTarget = Game.rooms[this.memory.home].terminal.id
            }
            if (!this.memory.get.getTarget && this.memory["_tmp"]["bodyAnalysis"]["work"]) {
                this.memory.get.getTarget = this.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
                if (this.memory.get.getTarget) this.memory.get.getTarget = this.memory.get.getTarget.id
            }
            if (!this.memory.get.getTarget) {
                this.memory.get.getTarget = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES,(r)=>r.resourceType === RESOURCE_ENERGY)
                if (this.memory.get.getTarget) this.memory.get.getTarget = this.memory.get.getTarget.id
            }
            if (this.memory.get.getTarget) this.memory.get.getTargetPos = Game.getObjectById(this.memory.get.getTarget).pos
        }
        if (this.memory.get.getTarget && this.memory.get.getTargetPos) {
            if (this["_adjMove"](this.memory.get.getTargetPos) === ERR_NOT_IN_RANGE) return OK
            const target = Game.getObjectById(this.memory.get.getTarget)
            if (!target){
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_SWITCH
            }
            var feedback = undefined
            if (target.structureType) feedback = this._withdraw(this.memory.get.getTarget,RESOURCE_ENERGY,this.store.getFreeCapacity()) 
            else if (target.amount) feedback = [this.pickup(Game.getObjectById(this.memory.get.getTarget)),0]
            else feedback = this._harvestEnergy(this.memory.get.getTarget)
            if (feedback[0] === OK) {
                if (this.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                    this.memory.get.getTarget = undefined
                    this.memory.get.getTargetPos = undefined
                }
                return OK
            }else if (feedback[0] === ERR_INVALID_TARGET || feedback[0] === ERR_NOT_ENOUGH_RESOURCES) {
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_SWITCH
            }
            return OK
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
    _harvest(subTaskType,signals){
        this.initTask()
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (this["_adjMove"](taskInfo.targetPos) === ERR_NOT_IN_RANGE) return OK
        if (taskInfo.data.cachedContainerPos && this["_Move"](taskInfo.data.cachedContainerPos) === ERR_NOT_IN_RANGE) return OK
        var target = Game.getObjectById(taskInfo.targetID)
        if (this.store.getFreeCapacity() === 0){
            // Charge Link
            if (taskInfo.data.chargeLink) {
                for (var link of global.links[this.memory.home]["resources"]){
                    if (utils.adjacent(this.id,link.id)) this.transfer(link,RESOURCE_ENERGY)
                }
            }
            if (signals["drop"]) for (var carryResourceType in this.store) this.drop(carryResourceType)
            else if (signals["transfer"]) for (var carryResourceType in this.store) this.transfer(Game.getObjectById(signal["transfer"]),carryResourceType)
            if (taskInfo.settings.changeable) return ERR_RENEW
        }
        var feedback = this.harvest(target)
        if (feedback === OK) return OK
        else if (feedback === ERR_BUSY) return OK
        else if (feedback === ERR_INVALID_TARGET) return FINISH
        else if (feedback === ERR_NOT_ENOUGH_RESOURCES) return FINISH
    },
    _transfer(subTaskType,signals){
        if (!this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (taskInfo.data.from === "energy"){
                var feedback = this._getEnergy("transfer")
                if (feedback === ERR_SWITCH) return OK
                else if (feedback === ERR_NOT_FOUND) {
                    if (this.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.working = true
                    return ERR_RENEW
                }
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
            }else if (taskInfo.data.from === "power"){
                if (!taskInfo.targetID || !taskInfo.targetPos){
                    if (!global.rooms.observed.find(taskInfo.data.fromRoom)){
                        this["_Move"](new RoomPosition(1,1,taskInfo.data.fromRoom))
                    }else{
                        var ruins = Game.rooms[taskInfo.data.fromRoom].find(FIND_RUINS,(r)=>r.store.getUsedCapacity(RESOURCE_POWER) > 0)
                        var droppedPower = Game.rooms[taskInfo.data.fromRoom].find(FIND_DROPPED_RESOURCES,(r) => r.resourceType === RESOURCE_POWER)
                        if (this.store.getFreeCapacity(RESOURCE_POWER) === 0 ||
                            ruins.length + droppedPower.length === 0){
                            this.memory.working = true
                        }else{
                            droppedPower.sort((a,b)=>b.amount - a.amount)
                            if (ruins.length > 0){
                                taskInfo.targetID = ruins[0].id
                                taskInfo.targetPos = ruins[0].pos
                            }else if (droppedPower.length > 0){
                                taskInfo.targetID = droppedPower[0].id
                                taskInfo.targetPos= droppedPower[1].pos
                            }else return FINISH
                        }
                    }
                }
                if (taskInfo.targetID && taskInfo.targetPos){
                    if (this["_adjMove"](taskInfo.targetPos) === ERR_NOT_IN_RANGE) return OK
                    var target = Game.getObjectById(taskInfo.targetID)
                    if (!target){
                        taskInfo.targetID = undefined
                        taskInfo.targetPos = undefined
                        return OK
                    }
                    if (target.amount){
                        // Dropped Power
                        var feedback = this.pickup(target)
                    }else{
                        // Ruin
                        var feedback = this.withdraw(feedback,RESOURCE_POWER)
                    }
                    taskInfo.targetID = undefined
                    taskInfo.targetPos = undefined
                    return OK
                }
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
            var transferAmount = 0;
            if (taskInfo.data.resourceType) {transferAmount+=this.store.getUsedCapacity(taskInfo.data.resourceType);feedback = this.transfer(Game.getObjectById(taskInfo.targetID),taskInfo.data.resourceType)}
            else{
                for (var carry in this.store) {transferAmount+=this.store.getUsedCapacity(carry);feedback = this.transfer(Game.getObjectById(taskInfo.targetID),carry);}
            }
            if (taskInfo.data.amount) taskInfo.data.amount -= transferAmount
            if (this.store.getUsedCapacity(RESOURCE_ENERGY) === 0) this.memory.working = false
            if (feedback === OK && taskInfo.data.amount <= 0) return FINISH
            else if (feedback === OK){
                if (taskInfo.settings.changeable) return ERR_RENEW
                else return OK
            }else if (feedback === ERR_NOT_ENOUGH_RESOURCES) return OK
            else if (feedback === ERR_FULL) return ERR_DELETE
            else if (feedback === ERR_INVALID_TARGET) return ERR_DELETE
        }
    },
    _work(taskType,subTaskType,signals){
        if (!this.memory.working) {
            var feedback = this._getEnergy(taskType)
            if (feedback === OK || feedback === ERR_SWITCH) {
                if (this.store.getFreeCapacity(RESOURCE_ENERGY) === 0) this.memory.working = true
                else return OK
            }else if (feedback === ERR_NOT_FOUND) {
                if (this.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.memory.working = true
                return ERR_RENEW
            }
        }
        if (this.memory.working) {
            this.initTask()
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            var target = Game.getObjectById(taskInfo.targetID)
            if (!target) this["_adjMove"](taskInfo.targetPos)
            var feedback = this[taskType](target)
            if (feedback === ERR_NOT_IN_RANGE) this["_adjMove"](taskInfo.targetPos)
            else if (feedback === ERR_INVALID_TARGET) return ERR_DELETE
            else if (feedback === ERR_NOT_ENOUGH_RESOURCES && taskInfo.settings.changeable) {
                this.memory.working = false
                return ERR_RENEW
            }else if (feedback === ERR_NOT_ENOUGH_RESOURCES && !taskInfo.settings.changeable){
                this.memory.working = false
                return OK
            }else if (taskType === "repair"){
                if (target.hits === target.hitsMax) return ERR_DELETE
                return OK
            }else if (feedback === OK) return OK
        }
    },
    _build(subTaskType,signals){
        return this._work("build",subTaskType,signals)
    },
    _repair(subTaskType,signals){
        return this._work("repair",subTaskType,signals)
    },
    _upgrade(subTaskType,signals){
        return this._work("upgradeController",subTaskType,signals)
    },
    _pickup(subTaskType,signals){
        if (!this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            this.initTask()
            var target = Game.getObjectById(taskInfo.targetID)
            if (this.room.name === taskInfo.targetPos.roomName && !target) return FINISH
            if (this["_adjMove"](taskInfo.targetPos) === ERR_NOT_IN_RANGE) return OK
            var feedback = this.pickup(Game.getObjectById(taskInfo.targetID))
            if (feedback === OK) this.memory.working = true
            else if (feedback === ERR_INVALID_TARGET) return ERR_DELETE
        }
        if (this.memory.working) {
            if (!Game.rooms[this.memory.home].storage) return FINISH
            if (!utils.adjacentPos(this.pos,Game.rooms[this.memory.home].storage.pos)) this["_adjMove"](Game.rooms[this.memory.home].storage.pos)
            var feedback;
            for (var carry in this.store) feedback = this.transfer(Game.rooms[this.memory.home].storage,carry)
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            this.memory.working = false
            if (feedback === OK && !taskInfo.settings.changeable) return OK
            else if (feedback === OK && taskInfo.settings.changeable) return ERR_RENEW
            else if (feedback === ERR_FULL) return ERR_DELETE
            else if (feedback === ERR_INVALID_TARGET) return ERR_DELETE
        }
    },
    _defend(subTaskType,signals){

    },
    _attack(subTaskType,signals){
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (subTaskType !== "heal" && this.room.name !== taskInfo.data.targetRoom){
            if (taskInfo.data.routes[0] === this.room.name) taskInfo.data.routes[0].shift()
            if (taskInfo.data.routes[0]){
                this["_adjMove"](new RoomPosition(25,25,taskInfo.data.routes[0]))
            }else this["_adjMove"](new RoomPosition(25,25,taskInfo.data.targetRoom))
            return OK
        }
        if (subTaskType === "harvest"){
            const target = Game.getObjectById(taskInfo.data.target)
            if (!taskInfo.data.targetPos) taskInfo.data.targetPos = target.pos
            if (this["_adjMove"](taskInfo.data.targetPos) === ERR_NOT_IN_RANGE) return OK
            const bodySituation = utils.analyseCreep(this.id)
            if (bodySituation["move"][1] === 0 && bodySituation["attack"][1] / (bodySituation["attack"][0] * 100) <= 0.5) return OK
            var feedback = this.attack(target)
            if (feedback === ERR_INVALID_TARGET) return FINISH
        }else if (subTaskType === "heal"){
            if (taskInfo.data.target === "creep") taskInfo.data.target = signals["creep"]
            this.moveTo(Game.getObjectById(taskInfo.data.target))
            const masterSituation = utils.analyseCreep(taskInfo.data.target)
            if (masterSituation["attack"][3] === true || masterSituation["move"][3] === true){
                this.heal(Game.getObjectById(taskInfo.data.target))
            }else{
                this.heal(this)
            }
        }else if (subTaskType === "claim"){
            if (!Game.rooms[taskInfo.data.targetRoom].controller || Game.rooms[taskInfo.data.targetRoom].controller.my) return OK
            const controller = Game.rooms[taskInfo.data.targetRoom].controller
            if (this["_adjMove"](controller.pos) === ERR_NOT_IN_RANGE) return OK
            if (!controller.my && controller.owner){
                this.attackController(controller)
            }else{
                if (claimRoomConfig.find(taskInfo.data.targetRoom)){
                    var feedback = this.claimController(controller)
                    if (feedback === ERR_GCL_NOT_ENOUGH) this.reserveController(controller)
                }else this.reserveController(controller)
            }
        }else if (subTaskType === "attack"){
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
            }else{
                return FINISH
            }
        }
        return OK
    },
    toDeath(primary = false,canGetTask = true){
        if (!this.isIdle()) {
            if (primary) this.renewTask()
            else this.finishTask()
        }
        if (canGetTask && !this.memory.reSpawn) {
            this.memory.reSpawn = true
            var boostCompounds = creepConfig.boosts[this.memory.role]
            if (!boostCompounds) boostCompounds = []
            Game.rooms[this.memory.home].AddSpawnTask(this.memory.role,creepConfig.components[this.memory.role],this.memory.group.type,this.memory.group.name,boostCompounds)
        }
        if (this.memory.role === "transferer" ||
            this.memory.role === "worker"     ||
            this.memory.role === "repairer"){
                if (Game.rooms[this.memory.home].storage){
                    this.travelTo(Game.rooms[this.memory.home].storage)
                    for (var carryObject in this.store){
                        this.transfer(Game.rooms[this.memory.home].storage,carryObject)
                    }
                }
        }
    },
    dying(){
        if (this.isIdle()) return this.ticksToLive <= 3
        if (this.memory.role === "transferer"){
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (taskInfo.subTaskType === "local") return this.ticksToLive <= 10
            if (taskInfo.subTaskType === "remote") {
                const TICKS_PER_ROOM = 38
                const distance = utils.calcRoomsDistance(this.memory.home,taskInfo.data.fromRoom)
                return this.ticksToLive <= distance * TICKS_PER_ROOM
            }
        }else return this.ticksToLive <= 5
    },
    run(signals = {}){
        if (!Game.rooms[this.memory.home].checkTaskExistence(this.memory.taskFingerprint)) {
            this.memory.taskFingerprint = null
            return ERR_INVALID_TARGET
        }
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
//        console.log(this,taskInfo.taskType)
        return this["_" + taskInfo.taskType](taskInfo.subTaskType,signals)
    }
}