const utils = require('utils')
const constants = require('constants')
const creepConfig = require('configuration.Creep')
const terminalConfig = require('configuration.Terminal')
const claimRoomConfig = require('configuration.targetRooms')
const ERR_SWITCH = "switch"
const FINISH = "finish"
const ERR_DELETE = "delete"
const ERR_RENEW = "renew"
const ERR_REPEAT = "repeat"
const ERR_PENDING = "pending"
module.exports = function() {
    _.assign(Creep.prototype,creepRunExtensions)
}
const hasEnergy = function(object,amount = 0){
    return object.store.getUsedCapacity(RESOURCE_ENERGY) >= amount
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
    _Move(targetPos, accAdj = false){
        if (this.pos.x != targetPos.x || this.pos.y != targetPos.y || this.pos.roomName != targetPos.roomName){
            this.travelTo(new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName))
            if (accAdj && utils.adjacentPos(this.pos,targetPos)) return OK
            else return ERR_NOT_IN_RANGE
        }else return OK
    },
    _boost(){
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

            Game.getObjectById(this.memory.boostTarget).boostCreep(this)

            this.memory.boostTarget = undefined
            this.memory.boostTargetPos = undefined

            this.memory["_tmp"]["bodyAnalysis"] = utils.analyseCreep(this.id)
            if (this.memory["_tmp"]["bodyAnalysis"][boostBodyPart][0] === this.memory["_tmp"]["bodyAnalysis"][boostBodyPart][4].length){
                this.memory.boostCompounds.splice(this.memory.boostCompounds.indexOf(boostCompound),1)
            }
        }
        return FINISH
    },
    _withdraw(targetID,resourceType,amount = Infinity){
        if (amount == "full" || amount == "exhaust") amount = Infinity

        const target = Game.getObjectById(targetID)
        if (!resourceType && target.store.getUsedCapacity() === 0) return [ERR_NOT_ENOUGH_RESOURCES,0]
        else if (resourceType && target.store.getUsedCapacity(resourceType) === 0) return [ERR_NOT_ENOUGH_RESOURCES,0]

        var Amount = 0
        var ret;
        var baseAmount = Math.min(this.store.getFreeCapacity(),amount)
        if (resourceType) baseAmount = Math.min(baseAmount,target.store.getUsedCapacity(resourceType))

        if (resourceType) {
            ret = this.withdraw(target,resourceType,baseAmount)
            if (ret === OK) Amount = baseAmount
        }else {
            for (var resource in target.store){
                var _baseAmount = Math.min(baseAmount,target.store.getUsedCapacity(resource))
                ret = this.withdraw(target,resource,_baseAmount)
                Amount += _baseAmount
            }
        }

        return [ret,Amount]
    },
    _harvestEnergy(targetID){
        const target = Game.getObjectById(targetID)
        var amount = Math.min(target.energy,this.memory["_tmp"]["bodyAnalysis"]["work"][1] * 2)
        var ret = this.harvest(target)
        return [ret, amount]
    },
    _getEnergy(taskType){ //Most cases used for RESOURCE_ENERGY
        if (!this.memory.get.getTarget || !this.memory.get.getTargetPos) {
            var chosenObject = undefined
            var hasEnergyContainers = _.filter(global.containers[this.memory.home].resources, c=>c.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            var hasEnoughEnergyContainers = _.filter(global.containers[this.memory.home].resources,c=>c.store.getUsedCapacity(RESOURCE_ENERGY) >= this.store.getFreeCapacity())
            hasEnoughEnergyContainers.sort((containerA,containerB)=>utils.distancePos(this.pos,containerA.pos) - utils.distancePos(this.pos,containerB.pos))
            
            if (taskType === "upgradeController" && global.links[this.memory.home].upgrade.length > 0) chosenObject = global.links[this.memory.home].upgrade[0]
            else if (taskType === "transfer" && global.links[this.memory.home].charges.length > 0) chosenObject = global.links[this.memory.home].charges[0]
            else if (taskType === "build" && Game.rooms[this.memory.home].storage && hasEnergy(Game.rooms[this.memory.home].storage)) chosenObject = Game.rooms[this.memory.home].storage
            else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && Game.rooms[this.memory.home].storage && hasEnergy(Game.rooms[this.memory.home].storage)) chosenObject = Game.rooms[this.memory.home].storage
            else if (hasEnoughEnergyContainers.length > 0) chosenObject = hasEnoughEnergyContainers[0]
            else if (hasEnergyContainers.length > 0) chosenObject = hasEnergyContainers[0]
            else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && Game.rooms[this.memory.home].terminal && hasEnergy(Game.rooms[this.memory.home].terminal,terminalConfig.baseReservedEnergy)) chosenObject = Game.rooms[this.memory.home].terminal
            else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && Game.rooms[this.memory.home].factory && hasEnergy(Game.rooms[this.memory.home].factory)) chosenObject = Game.rooms[this.memory.home].factory
            else if (Game.rooms[this.memory.home].storage && hasEnergy(Game.rooms[this.memory.home].storage)) chosenObject = Game.rooms[this.memory.home].storage
            else if (Game.rooms[this.memory.home].terminal && hasEnergy(Game.rooms[this.memory.home].terminal)) this.memory.get.getTarget = Game.rooms[this.memory.home].terminal.id
            else{
                var droppedEnergys = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES,(r)=>r.resourceType === RESOURCE_ENERGY)
                if (droppedEnergys) chosenObject = droppedEnergys
                else if (this.memory["_tmp"]["bodyAnalysis"]["work"]){
                    var activeSources = this.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
                    if (activeSources) chosenObject = activeSources
                }
            }

            if (chosenObject) {this.memory.get.getTarget = chosenObject.id;this.memory.get.getTargetPos = chosenObject.pos}
        }
        if (this.memory.get.getTarget && this.memory.get.getTargetPos) {
            if (!utils.canGetObjectById(this.memory.get.getTarget,this.memory.get.getTargetPos,this.pos)){
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_SWITCH
            }
            
            var moveFeedback = this["_adjMove"](this.memory.get.getTargetPos)
            if (moveFeedback === ERR_NOT_IN_RANGE) return OK
            
            const target = Game.getObjectById(this.memory.get.getTarget)
            var feedback = undefined
            if (target.structureType) feedback = this._withdraw(this.memory.get.getTarget,RESOURCE_ENERGY)
            else if (target.amount) {
                var amount = Math.min(target.amount,this.store.getFreeCapacity());
                feedback = [this.pickup(Game.getObjectById(this.memory.get.getTarget)),amount]
            }else feedback = this._harvestEnergy(this.memory.get.getTarget)
            
            if (feedback[0] === OK || feedback[0] === ERR_FULL) return OK
            else if (feedback[0] === ERR_INVALID_TARGET || feedback[0] === ERR_NOT_ENOUGH_RESOURCES) {
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_REPEAT
            }
        }else return ERR_NOT_FOUND
    },
    _getResource(resourceType,amount){ // excludes the lab
        if (!global.resources[this.memory.home][resourceType]) return ERR_NOT_FOUND,0
        if (!this.memory.get.getTarget && !this.memory.get.getTargetPos){
            var checkOrders = ["storage","terminal","factory"]
            for (var retrievedStructure of checkOrders){
                if (!global.resources[this.memory.home][resourceType][retrievedStructure]) continue
                this.memory.get.getTarget = Game.rooms[this.memory.home][retrievedStructure].id
                this.memory.get.getTargetPos = Game.rooms[this.memory.home][retrievedStructure].pos
            }
        }
        if (this.memory.get.getTarget && this.memory.get.getTargetPos){
            if (!utils.canGetObjectById(this.memory.get.getTarget,this.memory.get.getTargetPos,this.pos)){
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_SWITCH
            }

            var moveFeedback = this["_adjMove"](this.memory.get.getTargetPos)
            if (moveFeedback === ERR_NOT_IN_RANGE) return OK,0

            const target = Game.getObjectById(this.memory.get.getTarget)
            var feedback = undefined
            feedback = this._withdraw(target.id,resourceType,amount)

            if (feedback[0] === OK || feedback[0] === ERR_FULL) return OK
            else if (feedback[0] === ERR_INVALID_TARGET || feedback[0] === ERR_NOT_ENOUGH_RESOURCES) {
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_REPEAT
            }else return ERR_NOT_FOUND
        }
    },
    __afterGet(taskType,resourceType,amount){
        var feedback = undefined
        if (this.store.getFreeCapacity(resourceType) === 0) {
            this.memory.get.getTarget = undefined
            this.memory.get.getTargetPos = undefined
            this.memory.working = true
            return FINISH
        }
        if (resourceType === RESOURCE_ENERGY) feedback = this._getEnergy(taskType)
        else feedback = this._getResource(resourceType,amount)
        if (feedback === OK) return OK
        else if (feedback === ERR_REPEAT) return ERR_REPEAT
        else if (feedback === ERR_NOT_FOUND) {
            if (this.store.getUsedCapacity(resourceType) > 0) this.memory.working = true
            else return ERR_RENEW
        }
    },
    _harvest(subTaskType,signals){
        this.initTask()
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (!utils.canGetObjectById(taskInfo.targetID,taskInfo.targetPos,this.pos)) return ERR_DELETE
        if (taskInfo.data.cachedContainerId){
            if (!utils.canGetObjectById(taskInfo.data.cachedContainerId,taskInfo.data.cachedContainerPos,this.pos)) {
                taskInfo.data.cachedContainerId = undefined
                taskInfo.data.cachedContainerPos = undefined
            }
        }
        if (!taskInfo.data.cachedContainerId){
            if (global.containers[taskInfo.targetPos.roomName]){
                taskInfo.data.cachedContainerId = global.containers[taskInfo.targetPos.roomName].map[taskInfo.targetID]
                if (taskInfo.data.cachedContainerId) taskInfo.data.cachedContainerPos = Game.getObjectById(taskInfo.data.cachedContainerId).pos
            }
        }

        var moveFeedback = undefined
        if (taskInfo.data.cachedContainerPos) moveFeedback = this["_Move"](taskInfo.data.cachedContainerPos,true)
        else moveFeedback = this["_adjMove"](taskInfo.targetPos)
        if (moveFeedback === ERR_NOT_IN_RANGE) return OK

        if (this.store.getFreeCapacity() === 0){
            if (global.links[this.room.name] && global.links[this.room.name].map[taskInfo.targetID]) this.transfer(Game.getObjectById(global.links[this.room.name].map[taskInfo.targetID]),RESOURCE_ENERGY)
            if (signals["drop"]) for (var carryResourceType in this.store) this.drop(carryResourceType)
            if (signals["transfer"]) for (var carryResourceType in this.store) this.transfer(Game.getObjectById(signal["transfer"]),carryResourceType)
            if (taskInfo.settings.changeable) return ERR_RENEW
        }

        var target = Game.getObjectById(taskInfo.targetID)
        var feedback = this.harvest(target)

        if (feedback === OK) return OK
        else if (feedback === ERR_BUSY) return OK
        else if (feedback === ERR_INVALID_TARGET) return ERR_DELETE
        else if (feedback === ERR_NOT_ENOUGH_RESOURCES) return ERR_DELETE
    },
    _transfer(subTaskType,signals){
        if (!this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (taskInfo.data.from === "energy"){
                var feedback = this.__afterGet("transfer",RESOURCE_ENERGY)
                if (!this.memory.working) return feedback
            }else if (taskInfo.data.from === "resource"){
                var feedback = this.__afterGet("transfer",taskInfo.data.resourceType,taskInfo.data.amount)
                if (!this.memory.working) return feedback
            }else if (taskInfo.data.from === "creep"){
                if (!Game.getObjectById(this.memory.get.getTarget)) this.memory.get.getTarget = undefined
                if (!this.memory.get.getTarget) this.memory.get.getTarget = signals["creep"]
                this.memory.get.getTargetPos = Game.getObjectById(this.memory.get.getTarget).pos

                var moveFeedback = this["_adjMove"](this.memory.get.getTargetPos)
                if (moveFeedback === ERR_NOT_IN_RANGE) return OK
                
                if (this.store.getFreeCapacity(taskInfo.data.resourceType) === 0 || signals["finish"]){
                    this.memory.working = true;
                    this.memory.get.getTarget = undefined
                    this.memory.get.getTargetPos = undefined    
                }else return OK
            }else if (taskInfo.data.from === "power"){
                if (!this.memory.get.getTarget || !this.memory.get.getTargetPos){
                    if (!Game.rooms[taskInfo.data.fromRoom]) this["_Move"](new RoomPosition(15,15,taskInfo.data.fromRoom))
                    else{
                        var ruins = Game.rooms[taskInfo.data.fromRoom].find(FIND_RUINS,(r)=>r.store.getUsedCapacity(RESOURCE_POWER) > 0)
                        var droppedPower = Game.rooms[taskInfo.data.fromRoom].find(FIND_DROPPED_RESOURCES,(r) => r.resourceType === RESOURCE_POWER)
                        if (ruins.length + droppedPower.length === 0){
                            return FINISH
                        }else{
                            droppedPower.sort((a,b)=>b.amount - a.amount)
                            if (ruins.length > 0){
                                this.memory.get.getTarget = ruins[0].id
                                this.memory.get.getTargetPos = ruins[0].pos
                            }else if (droppedPower.length > 0){
                                this.memory.get.getTarget = droppedPower[0].id
                                this.memory.get.getTargetPos = droppedPower[1].pos
                            }else return FINISH
                        }
                    }
                }
                if (this.memory.get.getTarget && this.memory.get.getTargetPos){
                    if (this["_adjMove"](this.memory.get.getTargetPos) === ERR_NOT_IN_RANGE) return OK

                    var target = Game.getObjectById(this.memory.get.getTarget)
                    var feedback = undefined
                    if (target.amount) feedback = this.pickup(target)
                    else feedback = this.withdraw(feedback,RESOURCE_POWER)
                    if (feedback === OK) this.memory.working = true
                    this.memory.get.getTarget = undefined
                    this.memory.get.getTargetPos = undefined
                    return OK
                }
            }else{
                if (!this.memory.get.getTarget || !this.memory.get.getTargetPos){
                    if (taskInfo.data.from === "lab"){
                        try {
                            this.memory.get.getTarget = _.filter(Game.rooms[this.memory.home].labs,(lab)=>lab.mineralType == taskInfo.data.resourceType)[0].id
                        } catch (error) {
                            return ERR_DELETE
                        }
                    }else this.memory.get.getTarget = taskInfo.data.from
                    this.memory.get.getTargetPos = Game.getObjectById(this.memory.get.getTarget).pos
                }
                if (!utils.canGetObjectById(this.memory.get.getTarget,this.memory.get.getTargetPos,this.pos)) {
                    this.memory.get.getTarget = undefined
                    this.memory.get.getTargetPos = undefined
                    return ERR_DELETE
                }
                if (this.memory.get.getTarget && this.memory.get.getTargetPos){
                    var moveFeedback =  this["_adjMove"](this.memory.get.getTargetPos)
                    if (moveFeedback === ERR_NOT_IN_RANGE) return OK

                    var target = Game.getObjectById(this.memory.get.getTarget)
                    var feedback = undefined
                    if (taskInfo.data.amount === "exhaust"){
                        for (var resourceType in target.store) feedback = this.withdraw(target,resourceType)
                        if (this.store.getUsedCapacity() === 0) return ERR_DELETE
                    }else if (taskInfo.data.amount === "full") feedback = this.withdraw(target,taskInfo.data.resourceType)
                    else feedback = this._withdraw(this.memory.get.getTarget,taskInfo.data.resourceType,taskInfo.data.amount)

                    if (typeof(taskInfo.data.amount) === "number") {taskInfo.data.amount -= feedback[1];feedback = feedback[0]}

                    if (feedback === OK || feedback === ERR_FULL) {
                        this.memory.working = true;
                        this.memory.get.getTarget = undefined
                        this.memory.get.getTargetPos = undefined
                        return OK
                    }else if (feedback === ERR_INVALID_TARGET || feedback === ERR_NOT_ENOUGH_RESOURCES) return ERR_DELETE
                }       
            }
        }
        if (this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (taskInfo.data.resourceType && this.store.getUsedCapacity(taskInfo.data.resourceType) == 0) this.memory.working = false
            if (!taskInfo.data.resourceType && this.store.getUsedCapacity() == 0) this.memory.working = false
            if (!this.memory.working) return ERR_REPEAT

            if (!taskInfo.targetID || !taskInfo.targetPos){ 
                if (!Game.getObjectById(taskInfo.data.to)){
                    var minStore = Math.min.apply(Math,Game.rooms[this.memory.home][taskInfo.data.to].map((s)=>s.store.getUsedCapacity(taskInfo.data.resourceType)))
                    var potentialTargets = _.filter(Game.rooms[this.memory.home][taskInfo.data.to],(s)=>s.store.getUsedCapacity(taskInfo.data.resourceType) == minStore)
                    potentialTargets.sort((a,b)=>utils.distancePos(this.pos,a.pos) - utils.distancePos(this.pos,b.pos))
                    if (potentialTargets.length > 0) taskInfo.targetID = potentialTargets[0].id
                    else return ERR_DELETE
                }else taskInfo.targetID = taskInfo.data.to
                taskInfo.targetPos = Game.getObjectById(taskInfo.targetID).pos
            }
            var moveFeedback =  this["_adjMove"](taskInfo.targetPos)
            if (moveFeedback === ERR_NOT_IN_RANGE) return OK

            var feedback = undefined;
            if (taskInfo.data.resourceType) feedback = this.transfer(Game.getObjectById(taskInfo.targetID),taskInfo.data.resourceType)
            else for (var carry in this.store) feedback = this.transfer(Game.getObjectById(taskInfo.targetID),carry)

            if (feedback === OK){
                if (taskInfo.data.amount <= 0) return ERR_DELETE
                if (taskInfo.settings.changeable) return ERR_RENEW
                return OK
            }else if (feedback === ERR_FULL || feedback === ERR_INVALID_TARGET) return ERR_DELETE
        }
    },
    _work(taskType,subTaskType,signals){
        if (!this.memory.working) {
            var feedback = this.__afterGet(taskType,RESOURCE_ENERGY)
            if (!this.memory.working) return feedback
        }
        if (this.memory.working) {
            this.initTask()
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (!utils.canGetObjectById(taskInfo.targetID,taskInfo.targetPos,this.pos)) return ERR_DELETE
            var target = Game.getObjectById(taskInfo.targetID)
            
            if (taskType === "repair") if (target.hits === target.hitsMax) return ERR_DELETE
            
            var feedback = this[taskType](target)
            
            if (feedback === ERR_NOT_IN_RANGE) this["_adjMove"](taskInfo.targetPos)
            else if (feedback === ERR_INVALID_TARGET) return ERR_DELETE
            else if (feedback === ERR_NOT_ENOUGH_RESOURCES && taskInfo.settings.changeable) {
                this.memory.working = false
                return ERR_RENEW
            }else if (feedback === ERR_NOT_ENOUGH_RESOURCES && !taskInfo.settings.changeable){
                this.memory.working = false
                return ERR_REPEAT
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
        if (!this.memory.get) this.memory.get = {}
        if (!this.memory["_tmp"]) this.memory["_tmp"] = {}
        if (!this.memory["_tmp"]["bodyAnalysis"]) this.memory["_tmp"]["bodyAnalysis"] = utils.analyseCreep(this.id)
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
//        console.log(this,taskInfo.taskType)
        return this["_" + taskInfo.taskType](taskInfo.subTaskType,signals)
    }
}