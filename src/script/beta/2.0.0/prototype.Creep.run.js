const utils = require('utils')
const constants = require('constants')
const creepConfig = require('configuration.Creep')
const terminalConfig = require('configuration.Terminal')
const towerConfig = require('configuration.Tower')
const claimRoomConfig = require('configuration.targetRooms').targetRooms
const observerConfig = require("configuration.Observer")
const buildConfig = require('configuration.Build')
const labConfig = require('configuration.Lab')
const factoryConfig = require('configuration.Factory')
const FINISH = "finish"
const ERR_DELETE = "delete"
const ERR_RENEW = "renew"
const ERR_REPEAT = "repeat"
const TRANSFER_DYING_TICK = 20
const COMMON_DYING_TICK = 5
const reachBoundary = function(x){
    return x < 1 || x > 48
}
const getVacantPlace = function(pos,adjPos = undefined) {
    var x = pos.x
    var y = pos.y
    var roomName = pos.roomName

    var direction = ["stay",TOP,TOP_RIGHT,RIGHT,BOTTOM_RIGHT,BOTTOM,BOTTOM_LEFT,LEFT,TOP_LEFT]
    var dx = [0,0,1,1,1,0,-1,-1,-1]
    var dy = [0,-1,-1,0,1,1,1,0,-1]
    
    const terrain = Game.rooms[roomName].getTerrain()

    for (var i = 0; i < direction.length; i++){
        var xx = x + dx[i], yy = y + dy[i]
        if (reachBoundary(xx) || reachBoundary(yy)) continue
        if (terrain.get(xx,yy) == TERRAIN_MASK_WALL) continue
        if (adjPos && !utils.adjacentPos(pos,adjPos)) continue

        var noRoad = true,walkable = true
        const structures = Game.rooms[roomName].lookForAt(LOOK_STRUCTURES,xx,yy)
        for (var structure of structures){
            if (structure.structureType !== STRUCTURE_ROAD &&
                structure.structureType !== STRUCTURE_CONTAINER &&
                structure.structureType !== STRUCTURE_RAMPART) {
                walkable = false
                break
            }
            if (structure.structureType === STRUCTURE_ROAD) {
                noRoad = false
                break
            }
        }
        if (noRoad && walkable) return direction[i]
    }
    return undefined
}
const hasEnergy = function(object,amount = 0){
    if (!object) return false
    return object.store.getUsedCapacity(RESOURCE_ENERGY) > amount
}
const creepRunExtensions = {
    Invisible(){
        if (this.memory.role === "harvester") return;
        if (this.hits < this.hitsMax && this.getActiveBodyparts(HEAL) > 0) this.heal(this);
        if (this.store.getUsedCapacity() > 0) return this["__store"]();
        var vacantDirection = getVacantPlace(this.pos)
        if (vacantDirection && vacantDirection !== "stay") this.move(vacantDirection)
    },
    _adjMove(targetPos,avoidBarrior = false){
        if (!utils.adjacentPos(this.pos,targetPos)) {
            var feedback = this.travelTo(new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName))
            // this.say(feedback)
            return ERR_NOT_IN_RANGE
        }else {
            if (!avoidBarrior) return OK
            var vacantDirection = getVacantPlace(this.pos,targetPos)
            if (!vacantDirection || vacantDirection == "stay") return OK
            else this.move(vacantDirection)
            return ERR_NOT_IN_RANGE
        }
    },
    _Move(targetPos, accAdj = false,avoidBarrior = false){
        if (this.pos.x != targetPos.x || this.pos.y != targetPos.y || this.pos.roomName != targetPos.roomName){
            var feedback = this.travelTo(new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName))
            if (accAdj && utils.adjacentPos(this.pos,targetPos)) {
                if (!avoidBarrior) return OK
                var vacantDirection = getVacantPlace(this.pos,targetPos)
                if (!vacantDirection || vacantDirection == "stay") return OK
                else this.move(vacantDirection)
                return ERR_NOT_IN_RANGE
            }else return ERR_NOT_IN_RANGE
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
                if (!labConfig[this.room.name] || labConfig[this.room.name].allowedCompounds.indexOf(boostCompound) < 0) continue;
                if (!global.resources[this.room.name][boostCompound]) continue;
                if (_.filter(this.body,(b)=>b.type === constants.compoundEffect[boostCompound] && !b.boost).length === 0) continue;

                if (global.resources[this.room.name][boostCompound]["labs"] >= COMPOUND_UNIT){
                    for (var lab of Game.rooms[this.room.name]["labs"]){
                        if (lab.store.getUsedCapacity(boostCompound) >= COMPOUND_UNIT && lab.store.getUsedCapacity(RESOURCE_ENERGY) >= ENERGY_UNIT){
                            this.memory.boostTarget = lab.id
                            this.memory.boostTargetPos = lab.pos
                            break;
                        }
                    }
                }
                if (this.memory.boostTarget && this.memory.boostTargetPos) break;
            }
        }
        if (this.memory.boostTarget && this.memory.boostTargetPos){
            const target = Game.getObjectById(this.memory.boostTarget)
            if (!target || this.memory.boostCompounds.indexOf(target.mineralType) < 0 || labConfig[this.room.name].allowedCompounds.indexOf(target.mineralType) < 0){
                this.memory.boostTarget = undefined;
                this.memory.boostTargetPos = undefined;
                return FINISH;
            }
            if (this["_adjMove"](this.memory.boostTargetPos) === ERR_NOT_IN_RANGE) return OK
            const boostCompound = target.mineralType;
            const boostBodyPart = constants.compoundEffect[boostCompound]

            target.boostCreep(this)

            this.memory.boostTarget = undefined
            this.memory.boostTargetPos = undefined
            if (!this.memory["_tmp"]) this.memory["_tmp"] = {}
            this.memory["_tmp"]["bodyAnalysis"] = utils.analyseCreep(this)
            if (this.memory["_tmp"]["bodyAnalysis"][boostBodyPart][0] === this.memory["_tmp"]["bodyAnalysis"][boostBodyPart][4].length){
                this.memory.boostCompounds.splice(this.memory.boostCompounds.indexOf(boostCompound),1)
            }
        }
        return FINISH
    },
    _withdraw(targetID,resourceType,amount = Infinity){
        if (amount === "full" || amount === "exhaust") amount = Infinity

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
                if (ret === OK) {Amount = _baseAmount;break;}
            }
        }
        return [ret,Amount]
    },
    _harvestEnergy(targetID){
        const target = Game.getObjectById(targetID)
        var amount = Math.min(target.energy,this.getActiveBodyparts(WORK) * 2)
        var ret = this.harvest(target)
        return [ret, amount]
    },
    _getEnergy(taskType,subTaskType){ //Most cases used for RESOURCE_ENERGY
        if (!this.memory.get.getTarget || !this.memory.get.getTargetPos) {
            var chosenObject = undefined
            var hasEnergyContainers = _.filter(global.containers[this.memory.home].resources, c=>c.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            var hasEnoughEnergyContainers = _.filter(global.containers[this.memory.home].resources,c=>c.store.getUsedCapacity(RESOURCE_ENERGY) >= this.store.getFreeCapacity())
            hasEnoughEnergyContainers.sort((containerA,containerB)=>this.pos.getRangeTo(containerA) - this.pos.getRangeTo(containerB))
            const huntEnergy = () => {
                var droppedEnergy = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES,{filter:{resourceType:RESOURCE_ENERGY}})
                var ruin = this.pos.findClosestByRange(FIND_RUINS,{filter:(r)=>r.store.getUsedCapacity(RESOURCE_ENERGY) > 0})
                var _hasEnergyContainers = _.filter(Game.rooms[this.room.name].containers,(c)=>c.store["energy"] > 0)
                _hasEnergyContainers.sort((a,b)=>b.store["energy"] - a.store["energy"])
                if (droppedEnergy) chosenObject = droppedEnergy;
                else if (ruin) chosenObject = ruin;
                else if (_hasEnergyContainers.length > 0) chosenObject = _hasEnergyContainers[0];
                else if (this.getActiveBodyparts(WORK) > 0 && observerConfig["utilsEnergy"].indexOf(this.room.name) < 0){
                    var activeSources = this.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
                    if (activeSources) chosenObject = activeSources;
                }
            }
            const filterEnergy = () => {
                var droppedEnergy = this.pos.findClosestByRange(FIND_DROPPED_RESOURCES,{filter:{resourceType:RESOURCE_ENERGY}})
                var ruin = this.pos.findClosestByRange(FIND_RUINS,{filter:(r)=>r.store.getUsedCapacity(RESOURCE_ENERGY) > 0})
                var _hasEnergyContainers = _.filter(Game.rooms[this.room.name].containers,(c)=>c.store["energy"] > 0)
                _hasEnergyContainers.sort((a,b)=>b.store["energy"] - a.store["energy"])
                if (droppedEnergy) chosenObject = droppedEnergy;
                else if (ruin) chosenObject = ruin;
                else if (_hasEnergyContainers.length > 0) chosenObject = _hasEnergyContainers[0];
                else if (this.getActiveBodyparts(WORK) > 0) chosenObject = (_.filter(_.map(remoteResources,Game.getObjectById),(r)=>r.energy))[0]
            }
            
            if (taskType === "upgradeController" && global.links[this.memory.home].upgrade.length > 0) chosenObject = global.links[this.memory.home].upgrade[0]

            const remoteResources = require('configuration.Observer').coreDominance[this.room.name];

            if ((taskType === "build" || taskType == "repair") && this.room.name !== this.memory.home && this.room.controller) huntEnergy();
            else if ((taskType === "build" || taskType == "repair") && this.room.name !== this.memory.home && remoteResources && (_.filter(_.map(remoteResources,Game.getObjectById),(r)=>r.energy)).length > 0) filterEnergy();
            else if (taskType === "build" && hasEnoughEnergyContainers.length > 0) chosenObject = hasEnoughEnergyContainers[0]
            else if (taskType === "build" && buildConfig.notUtilsStorage.indexOf(this.memory.home) < 0 && hasEnergy(Game.rooms[this.memory.home].storage,buildConfig.baseReserveEnergy)) chosenObject = Game.rooms[this.memory.home].storage
            else if (taskType === "build" && buildConfig.notUtilsStorage.indexOf(this.memory.home) < 0 && hasEnergy(Game.rooms[this.memory.home].terminal,terminalConfig.baseReservedEnergy)) chosenObject = Game.rooms[this.memory.home].terminal;
            else if (taskType === "build" && buildConfig.notUtilsStorage.indexOf(this.memory.home) < 0 && hasEnergy(Game.rooms[this.memory.home].factory,factoryConfig.reservedEnergy)) chosenObject = Game.rooms[this.memory.home].factory;
            
            if (taskType === "transfer" && global.links[this.memory.home].charges.length > 0) chosenObject = global.links[this.memory.home].charges[0];
            else if (taskType === "transfer" && _.filter(hasEnoughEnergyContainers,(c)=>c.pos.inRangeTo(this,11)).length > 0) chosenObject = hasEnoughEnergyContainers[0];
            else if (taskType === "transfer" && subTaskType === "core" && hasEnergy(Game.rooms[this.memory.home].storage)) chosenObject = Game.rooms[this.memory.home].storage;
            else if (taskType === "transfer" && subTaskType === "core" && hasEnergy(Game.rooms[this.memory.home].terminal)) chosenObject = Game.rooms[this.memory.home].terminal;
            else if (taskType === "transfer" && subTaskType === "core" && hasEnergy(Game.rooms[this.memory.home].factory)) chosenObject = Game.rooms[this.memory.home].factory;
            else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && hasEnergy(Game.rooms[this.memory.home].storage)) chosenObject = Game.rooms[this.memory.home].storage
            else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && hasEnergy(Game.rooms[this.memory.home].terminal)) chosenObject = Game.rooms[this.memory.home].terminal
            else if (taskType === "transfer" && global.state[this.memory.home].economy <= 0.6 && hasEnergy(Game.rooms[this.memory.home].factory)) chosenObject = Game.rooms[this.memory.home].factory
            else if (taskType === "transfer" && hasEnoughEnergyContainers.length > 0) chosenObject = hasEnoughEnergyContainers[0];
            
            if (!chosenObject){
                if (hasEnoughEnergyContainers.length > 0) chosenObject = hasEnoughEnergyContainers[0]
                else if (hasEnergyContainers.length > 0) chosenObject = hasEnergyContainers[0]
                else if (hasEnergy(Game.rooms[this.memory.home].storage)) chosenObject = Game.rooms[this.memory.home].storage
                else if (hasEnergy(Game.rooms[this.memory.home].terminal)) chosenObject = Game.rooms[this.memory.home].terminal
                else huntEnergy()
            }
            if (chosenObject) {this.memory.get.getTarget = chosenObject.id;this.memory.get.getTargetPos = chosenObject.pos}
        }
        if (this.memory.get.getTarget && this.memory.get.getTargetPos) {
            if (!utils.canGetObjectById(this.memory.get.getTarget,this.memory.get.getTargetPos)){
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_REPEAT
            }
            
            var moveFeedback = this["_adjMove"](this.memory.get.getTargetPos)
            if (moveFeedback === ERR_NOT_IN_RANGE) return OK
            
            const target = Game.getObjectById(this.memory.get.getTarget)
            var feedback = undefined
            if (target.store) feedback = this._withdraw(this.memory.get.getTarget,RESOURCE_ENERGY)
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
        if (!global.resources[this.memory.home][resourceType]) return ERR_NOT_FOUND
        if (!this.memory.get.getTarget || !this.memory.get.getTargetPos){
            var checkOrders = ["storage","terminal","factory"]
            for (var retrievedStructure of checkOrders){
                if (global.resources[this.memory.home][resourceType][retrievedStructure] === 0) continue
                this.memory.get.getTarget = Game.rooms[this.memory.home][retrievedStructure].id
                this.memory.get.getTargetPos = Game.rooms[this.memory.home][retrievedStructure].pos
            }
        }
        if (this.memory.get.getTarget && this.memory.get.getTargetPos){
            if (!utils.canGetObjectById(this.memory.get.getTarget,this.memory.get.getTargetPos)){
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_REPEAT
            }

            var moveFeedback = this["_adjMove"](this.memory.get.getTargetPos)
            if (moveFeedback === ERR_NOT_IN_RANGE) return OK,0

            const target = Game.getObjectById(this.memory.get.getTarget)
            var feedback = this._withdraw(target.id,resourceType,amount)

            if (feedback[0] === OK || feedback[0] === ERR_FULL) return OK
            else if (feedback[0] === ERR_INVALID_TARGET || feedback[0] === ERR_NOT_ENOUGH_RESOURCES) {
                this.memory.get.getTarget = undefined
                this.memory.get.getTargetPos = undefined
                return ERR_REPEAT
            }
        }else return ERR_NOT_FOUND
    },
    __recycle(){
        if (this.room.name !== this.memory.home) {this.travelTo(new RoomPosition(25,25,this.memory.home));return OK;}
        if (!this.memory.targetSpawn){
            var spawns = Game.rooms[this.memory.home].spawns;
            spawns.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this));
            if (spawns.length > 0) this.memory.targetSpawn = spawns[0].id;
        }
        if (this.memory.targetSpawn){
            var spawn = Game.getObjectById(this.memory.targetSpawn);
            if (spawn.recycleCreep(this) === ERR_NOT_IN_RANGE) this.travelTo(spawn);
            return OK;
        }else return false;
    },
    __store(){
        if (Game.rooms[this.memory.home].storage && Game.rooms[this.memory.home].storage.store.getFreeCapacity() > 0){
            if (!this.pos.inRangeTo(Game.rooms[this.memory.home].storage,1)) this.travelTo(Game.rooms[this.memory.home].storage);
            else {
                for (var carry in this.store) this.transfer(Game.rooms[this.memory.home].storage,carry);
            }
        }else for (var carry in this.store) this.drop(carry);
    },
    __afterGet(taskType,resourceType,amount,subTaskType){
        var feedback = undefined
        if (this.store.getFreeCapacity(resourceType) === 0) {
            this.memory.get.getTarget = undefined
            this.memory.get.getTargetPos = undefined
            if (this.store[resourceType] > 0) this.memory.working = true;
            else {
                this["__store"]();
                return FINISH;
            }
            return FINISH
        }
        if (resourceType === RESOURCE_ENERGY) feedback = this._getEnergy(taskType,subTaskType)
        else feedback = this._getResource(resourceType,amount)
        if (feedback === OK) return OK
        else if (feedback === ERR_REPEAT) return ERR_REPEAT
        else if (feedback === ERR_NOT_FOUND) {
            if (this.store.getUsedCapacity(resourceType) > 0) this.memory.working = true
            else return ERR_DELETE
        }
        return OK
    },
    _harvest(subTaskType,signals){
        this.initTask()
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (!utils.canGetObjectById(taskInfo.targetID,taskInfo.targetPos)) return ERR_DELETE
        if (taskInfo.data.cachedContainerId){
            if (!utils.canGetObjectById(taskInfo.data.cachedContainerId,taskInfo.data.cachedContainerPos)) {
                taskInfo.data.cachedContainerId = undefined;
                taskInfo.data.cachedContainerPos = undefined;
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
            if (signals["transfer"]) for (var carryResourceType in this.store) this.transfer(Game.getObjectById(signals["transfer"]),carryResourceType)
            if (taskInfo.settings.changeable) return ERR_RENEW
        }

        var target = Game.getObjectById(taskInfo.targetID)
        if (this.store.getFreeCapacity() === 0 && target.depositType) return OK
        
        var feedback = this.harvest(target)
        if (feedback === OK) return OK
        else if (feedback === ERR_BUSY) return OK
        else if (feedback === ERR_INVALID_TARGET) return ERR_DELETE
        else if (feedback === ERR_NOT_ENOUGH_RESOURCES) return OK
    },
    _transfer(subTaskType,signals){
        if (!this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (taskInfo.data.from === "energy"){
                var feedback = this.__afterGet("transfer",RESOURCE_ENERGY,undefined,subTaskType)
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
                
                var containerCached = _.filter(this.room.lookForAt(LOOK_STRUCTURES,this.memory.get.getTargetPos.x,this.memory.get.getTargetPos.y),(s)=>s.structureType === STRUCTURE_CONTAINER)
                var tombStones = _.filter(this.room.lookForAt(LOOK_TOMBSTONES,this.memory.get.getTargetPos.x,this.memory.get.getTargetPos.y),(t)=>t.store.getUsedCapacity() > 0)
                var _combinedWithdraw = [].concat(tombStones,containerCached)
                for (var structure of _combinedWithdraw) {
                    for (var store in structure.store) {
                        this.withdraw(structure,store);
                        break;
                    }
                    break;
                }
                
                var _dx = [0,0,1,0,-1],_dy=[0,1,0,-1,0];
                for (var i = 0; i < 5;i++){
                    try{
                        var droppedResources = this.room.lookForAt(LOOK_RESOURCES,this.memory.get.getTargetPos.x+_dx[i],this.memory.get.getTargetPos.y+_dy[i])
                        for (var droppedResource of droppedResources) this.pickup(droppedResource)
                    }catch (error){}
                }
                
                if (this.store.getFreeCapacity() === 0 || signals["finish"] || (this.hits / this.hitsMax <= 0.8 && this.store.getUsedCapacity() > 0)){
                    this.memory.working = true;
                    this.memory.get.getTarget = undefined;
                    this.memory.get.getTargetPos = undefined;
                }else return OK
            }else if (taskInfo.data.from === "power"){
                if (!this.memory.get.getTarget || !this.memory.get.getTargetPos){
                    if (this.room.name !== taskInfo.data.fromRoom) this["_Move"](new RoomPosition(25,25,taskInfo.data.fromRoom))
                    else{
                        var ruins = Game.rooms[taskInfo.data.fromRoom].find(FIND_RUINS,{filter:(r)=>r.store.getUsedCapacity(RESOURCE_POWER) > 0})
                        var droppedPower = Game.rooms[taskInfo.data.fromRoom].find(FIND_DROPPED_RESOURCES,{filter:{resourceType:RESOURCE_POWER}})
                        if (ruins.length + droppedPower.length === 0){
                            if (this["_adjMove"](Game.getObjectById(signals["creep"]).pos) === ERR_NOT_IN_RANGE) return OK;
                            return FINISH
                        }else{
                            droppedPower.sort((a,b)=>b.amount - a.amount)
                            if (ruins.length > 0){
                                this.memory.get.getTarget = ruins[0].id
                                this.memory.get.getTargetPos = ruins[0].pos
                            }else if (droppedPower.length > 0){
                                this.memory.get.getTarget = droppedPower[0].id
                                this.memory.get.getTargetPos = droppedPower[0].pos
                            }else return FINISH
                        }
                    }
                }
                if (this.memory.get.getTarget && this.memory.get.getTargetPos){
                    if (!utils.canGetObjectById(this.memory.get.getTarget,this.memory.get.getTargetPos)) {
                        this.memory.get.getTarget = undefined;
                        this.memory.get.getTargetPos = undefined;
                        return ERR_REPEAT;
                    }
                    if (this["_adjMove"](this.memory.get.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
                    var target = Game.getObjectById(this.memory.get.getTarget);
                    var feedback = undefined;
                    if (target.amount) feedback = this.pickup(target);
                    else feedback = this.withdraw(feedback,RESOURCE_POWER);
                    if (feedback === OK || feedback === ERR_FULL) this.memory.working = true;
                    this.memory.get.getTarget = undefined;
                    this.memory.get.getTargetPos = undefined;
                    return OK;
                }
            }else if (taskInfo.data.from === "ruin"){
                if (!this.memory.get.getTarget || !this.memory.get.getTargetPos){
                    if (!Game.rooms[taskInfo.data.fromRoom]) this["_Move"](new RoomPosition(25,25,taskInfo.data.fromRoom))
                    else{
                        var ruins = Game.rooms[taskInfo.data.fromRoom].ruins
                        if (ruins.length === 0) {
                            if (this.store.getUsedCapacity() === 0) return ERR_DELETE;
                            else this.memory.working = true
                        }else{
                            ruins = _.filter(ruins,(r)=>r.store.getUsedCapacity() > 0);
                            ruins.sort((a,b)=>b.store.getUsedCapacity() - a.store.getUsedCapacity());
                            this.memory.get.getTarget = ruins[0].id;
                            this.memory.get.getTargetPos = ruins[0].pos;
                        }
                    }
                }
                if (this.memory.get.getTarget && this.memory.get.getTargetPos){
                    if (!utils.canGetObjectById(this.memory.get.getTarget,this.memory.get.getTargetPos)){
                        this.memory.get.getTarget = undefined;
                        this.memory.get.getTargetPos = undefined;
                        return ERR_REPEAT;
                    }
                    if (this["_adjMove"](this.memory.get.getTargetPos) === ERR_NOT_IN_RANGE) return OK

                    var target = Game.getObjectById(this.memory.get.getTarget)
                    var feedback = undefined
                    for (var carry in target.store) feedback = this.withdraw(target,carry)
                    if (this.store.getFreeCapacity() === 0) this.memory.working = true
                    if (feedback !== OK) {
                        this.memory.get.getTarget = undefined
                        this.memory.get.getTargetPos = undefined
                    }
                    return OK
                }
            }else{
                if (!this.memory.get.getTarget || !this.memory.get.getTargetPos){
                    if (taskInfo.data.from === "lab" || taskInfo.data.from === "labs"){
                        try {
                            var room = taskInfo.data.fromRoom || this.memory.home;
                            this.memory.get.getTarget = global.labs[room][taskInfo.data.resourceType][0].id;
                        } catch (error) {return ERR_DELETE}
                    }else if (taskInfo.data.from === "terminal" || taskInfo.data.from === "storage" || taskInfo.data.from === "factory"){
                        try {
                            var room = taskInfo.data.fromRoom || this.memory.home;
                            this.memory.get.getTarget = Game.rooms[room][taskInfo.data.from].id;
                        } catch (error) {return ERR_DELETE}
                    }else this.memory.get.getTarget = taskInfo.data.from
                    if (Game.getObjectById(this.memory.get.getTarget)) {
                        var target = Game.getObjectById(this.memory.get.getTarget)
                        if ((target.store.getUsedCapacity() > 0 && target.structureType !== STRUCTURE_CONTAINER) || (target.structureType === STRUCTURE_CONTAINER && target.store.getUsedCapacity() >= 50)) this.memory.get.getTargetPos = Game.getObjectById(this.memory.get.getTarget).pos;
                        else{
                            this.memory.get.getTarget = undefined;
                            this.memory.get.getTargetPos = undefined;
                            return ERR_DELETE;
                        }
                    }
                    else if (!taskInfo.data.fromRoom || Game.rooms[taskInfo.data.fromRoom]) return ERR_DELETE;
                }
                if (this.memory.get.getTarget || this.memory.get.getTargetPos){
                    if (!utils.canGetObjectById(this.memory.get.getTarget,this.memory.get.getTargetPos)) {
                        this.memory.get.getTarget = undefined;
                        this.memory.get.getTargetPos = undefined;
                        return ERR_DELETE;
                    }
                    if (subTaskType === "aid" || subTaskType === "limit"){
                        if (Game.getObjectById(this.memory.get.getTarget).store[taskInfo.data.resourceType] < taskInfo.data.stopAmount) return ERR_DELETE;
                    }
                    
                    if (taskInfo.data.resourceType && this.store[taskInfo.data.resourceType] === 0 && this.store.getFreeCapacity() === 0) return this["__store"]();
                    
                    var moveFeedback =  this["_adjMove"](this.memory.get.getTargetPos)
                    if (moveFeedback === ERR_NOT_IN_RANGE) return OK

                    var target = Game.getObjectById(this.memory.get.getTarget)
                    var feedback = undefined
                    if (taskInfo.data.amount === "exhaust"){
                        if (taskInfo.data.resourceType) feedback = this.withdraw(target,taskInfo.data.resourceType);
                        else {
                            for (var resourceType in target.store) {
                                if (target.structureType === STRUCTURE_LAB && resourceType === RESOURCE_ENERGY) continue;
                                feedback = this.withdraw(target,resourceType)
                            }
                        }
                    }else if (taskInfo.data.amount === "full") feedback = this.withdraw(target,taskInfo.data.resourceType)
                    else {
                        feedback = this._withdraw(this.memory.get.getTarget,taskInfo.data.resourceType,taskInfo.data.amount);
                        feedback = feedback[0];
                    }
                    if (feedback === OK || feedback === ERR_FULL) {
                        if ((taskInfo.data.resourceType && this.store[taskInfo.data.resourceType] > 0) || !taskInfo.data.resourceType) this.memory.working = true;
                        else this["__store"]();
                        this.memory.get.getTarget = undefined
                        this.memory.get.getTargetPos = undefined
                        return OK
                    }else if (feedback === ERR_INVALID_TARGET || feedback === ERR_NOT_ENOUGH_RESOURCES || !feedback) return ERR_DELETE;
                }       
            }
        }
        if (this.memory.working) {
            const taskInfo = Game.rooms[this.memory.home].memory.task.info[this.memory.taskFingerprint]
            if (taskInfo.data.resourceType && this.store.getUsedCapacity(taskInfo.data.resourceType) == 0) this.memory.working = false
            if (!taskInfo.data.resourceType && this.store.getUsedCapacity() == 0) this.memory.working = false
            if (!this.memory.working) return ERR_REPEAT

            if (!taskInfo.targetID || !taskInfo.targetPos){
                if ((taskInfo.data.to === "lab" || taskInfo.data.to === "labs") && taskInfo.data.resourceType !== RESOURCE_ENERGY){
                    try{
                        var room = taskInfo.data.toRoom || this.memory.home;
                        if (global.labs[room][taskInfo.data.resourceType].length > 0) taskInfo.targetID = global.labs[room][taskInfo.data.resourceType][0].id;
                        else taskInfo.targetID = global.labs[room]["vacant"][0].id;
                    }catch (error){
                        return ERR_DELETE
                    }
                }else if (taskInfo.data.to === "towers"){
                    var towers = _.filter(Game.rooms[this.memory.home].towers,(t)=>t.store.getUsedCapacity(RESOURCE_ENERGY) <= towerConfig.reservedEnergy)
                    towers.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this));
                    if (towers.length > 0) taskInfo.targetID = towers[0].id;
                    else return ERR_DELETE;
                }else if (!Game.getObjectById(taskInfo.data.to)){
                    var potentialTargets = []
                    if (taskInfo.data.to.charAt(taskInfo.data.to.length - 1) === "s"){
                        var minStore = Math.min.apply(Math,Game.rooms[this.memory.home][taskInfo.data.to].map((s)=>s.store.getUsedCapacity(taskInfo.data.resourceType)));
                        potentialTargets = _.filter(Game.rooms[this.memory.home][taskInfo.data.to],(s)=>s.store.getUsedCapacity(taskInfo.data.resourceType) == minStore)
                        potentialTargets.sort((a,b)=>this.pos.getRangeTo(a) - this.pos.getRangeTo(b));
                    }else potentialTargets = [Game.rooms[this.memory.home][taskInfo.data.to]];
                    if (potentialTargets.length > 0) taskInfo.targetID = potentialTargets[0].id
                    else return ERR_DELETE
                }else taskInfo.targetID = taskInfo.data.to
                if (Game.getObjectById(taskInfo.targetID)) taskInfo.targetPos = Game.getObjectById(taskInfo.targetID).pos;
                else if (!taskInfo.data.toRoom || Game.rooms[taskInfo.data.toRoom]) return ERR_DELETE;
            }
            
            if (!utils.canGetObjectById(taskInfo.targetID,taskInfo.targetPos)) {
                taskInfo.targetID = undefined;
                taskInfo.targetPos = undefined;
                return ERR_REPEAT;
            }

            if (subTaskType === "aid" || subTaskType === "limit"){
                if (Game.getObjectById(taskInfo.targetID).store[taskInfo.data.resourceType] >= taskInfo.data.toStopAmount) return ERR_DELETE    
            }
            
            var target = Game.getObjectById(taskInfo.targetID)
            if (target.store.getFreeCapacity() === 0) return ERR_DELETE
            
            var moveFeedback =  this["_adjMove"](taskInfo.targetPos);
            if (moveFeedback === ERR_NOT_IN_RANGE) return OK

            var feedback = undefined,transferCapacity = 0;
            if (taskInfo.data.resourceType) {
                transferCapacity = Math.min(target.store.getFreeCapacity(taskInfo.data.resourceType),this.store[taskInfo.data.resourceType]);
                feedback = this.transfer(target,taskInfo.data.resourceType)
            }else {
                for (var carry in this.store) {
                    transferCapacity = Math.min(target.store.getFreeCapacity(carry),this.store[carry]);
                    feedback = this.transfer(target,carry)
                    break;
                }
            }

            if (feedback === OK){
                taskInfo.targetID = undefined;
                taskInfo.targetPos = undefined;
                if (typeof(taskInfo.data.amount) === "number") taskInfo.data.amount -= transferCapacity;
                if (taskInfo.data.amount <= 0) return ERR_DELETE;
                if (taskInfo.data.amount === "full" && (Game.getObjectById(taskInfo.data.to) || taskInfo.data.to.charAt(taskInfo.data.to.length - 1) !== "s")){
                    if (taskInfo.data.resourceType) console.log(this,taskInfo.data.resourceType,transferCapacity,target.store.getFreeCapacity(taskInfo.data.resourceType))
                    if (taskInfo.data.resourceType && target.store.getFreeCapacity(taskInfo.data.resourceType) <= transferCapacity) return ERR_DELETE;
                    if (!taskInfo.data.resourceType && target.store.getFreeCapacity() <= transferCapacity) return ERR_DELETE;
                }
                if (taskInfo.settings.changeable) return ERR_RENEW;
                return OK;
            }else if (feedback === ERR_FULL || feedback === ERR_INVALID_TARGET) return ERR_DELETE;
        }
    },
    _work(taskType,subTaskType,signals){
        if (!this.memory.working) {
            var feedback = this.__afterGet(taskType,RESOURCE_ENERGY,undefined,subTaskType);
            if (!this.memory.working) return feedback;
        }
        if (this.memory.working) {
            this.initTask()
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (!taskInfo.targetID && (!taskInfo.targetPos || Game.rooms[taskInfo.targetPos.roomName])) return ERR_DELETE

            if (!utils.canGetObjectById(taskInfo.targetID,taskInfo.targetPos)) {
                taskInfo.targetID = undefined;
                taskInfo.targetPos = undefined;
                return ERR_REPEAT;
            }
            if (this.room.name !== taskInfo.targetPos.roomName) {this["_adjMove"](taskInfo.targetPos,true);return OK;}

            var target = Game.getObjectById(taskInfo.targetID)
            
            if (taskType === "repair" && target.hits === target.hitsMax) {
                taskInfo.targetID = undefined;
                taskInfo.targetPos = undefined;
                return ERR_REPEAT;
            }
            
            var feedback = this[taskType](target)
            
            if (feedback === ERR_NOT_IN_RANGE) this["_adjMove"](taskInfo.targetPos,true)
            else if (feedback === ERR_INVALID_TARGET) {
                taskInfo.targetID = undefined;
                taskInfo.targetPos = undefined;
                return ERR_REPEAT;
            }else if (feedback === ERR_NOT_ENOUGH_RESOURCES) {
                this.memory.working = false;
                if (taskInfo.settings.changeable) return ERR_RENEW;
                else if (!taskInfo.settings.changeable) return ERR_REPEAT;
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
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (!this.memory.working) {
            this.initTask()
            if (!taskInfo.targetID && (!taskInfo.targetPos || Game.rooms[taskInfo.targetPos.roomName])) return ERR_DELETE

            if (!utils.canGetObjectById(taskInfo.targetID,taskInfo.targetPos)){
                taskInfo.targetID = undefined;
                taskInfo.targetPos = undefined;
                return ERR_REPEAT;
            }
            
            if (this["_adjMove"](taskInfo.targetPos) === ERR_NOT_IN_RANGE) return OK

            var target = Game.getObjectById(taskInfo.targetID)
            var feedback = this.pickup(target)

            if (feedback === OK || feedback === ERR_FULL) this.memory.working = true
            else if (feedback === ERR_INVALID_TARGET) {
                taskInfo.targetID = undefined;
                taskInfo.targetPos = undefined;
                return ERR_REPEAT;
            }
        }
        if (this.memory.working) {
            if (this.store.getUsedCapacity() === 0) {
                this.memory.working = false;
                if (!taskInfo.settings.changeable) return OK;
                else return ERR_RENEW;
            }
            var target = Game.getObjectById(taskInfo.data.toTarget);
            if (this["_adjMove"](target.pos) === ERR_NOT_IN_RANGE) return OK;

            var feedback = undefined;
            for (var carry in this.store) feedback = this.transfer(target,carry);

            if (feedback === OK) return OK;
            else if (feedback === ERR_FULL) return ERR_DELETE;
        }
    },
    _travel(subTaskType,signals){
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (!taskInfo.data.roomList) taskInfo.data.roomList = []
        if (!taskInfo.targetPos){
            if (taskInfo.data.roomList.length == 0){
                var roomName = taskInfo.data.targetRoom
                taskInfo.data.roomList = utils.divideRoomList(roomName)
                if (!taskInfo.data.roomList){
                    if (!observerConfig[this.memory.home] || observerConfig[this.memory.home].length == 0) return ERR_DELETE;
                    taskInfo.data.roomList = [].concat(observerConfig[this.memory.home]);
                }
            }
            if (taskInfo.data.roomList.length > 0){
                taskInfo.targetPos = new RoomPosition(25,25,taskInfo.data.roomList[0]);
                taskInfo.data.roomList.shift();
            }
        }
        if (taskInfo.targetPos){
            this["_Move"](taskInfo.targetPos)
            if (this.room.name == taskInfo.targetPos.roomName) taskInfo.targetPos = undefined 
            return OK
        }
    },
    __renew(){
        if (this.ticksToLive >= 1490) {
            this.memory.renew = false;
            this.memory.targetSpawn = undefined;
            return FINISH;
        }
        if (this.room.name !== this.memory.home) {this.travelTo(new RoomPosition(25,25,this.memory.home));return OK;}
        if (!this.memory.targetSpawn){
            var spawns = Game.rooms[this.memory.home].spawns;
            spawns.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this));
            if (spawns.length > 0) this.memory.targetSpawn = spawns[0].id;
        }
        if (this.memory.targetSpawn){
            var spawn = Game.getObjectById(this.memory.targetSpawn);
            var feedback = spawn.renewCreep(this)
            if (feedback === ERR_NOT_IN_RANGE) this.travelTo(spawn);
            if (feedback === ERR_BUSY && !this.pos.inRangeTo(spawn,1)) this.travelTo(spawn);
            return OK;
        };
    },
    _defend(subTaskType,signals){
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (subTaskType == "reserved"){
            if ((this.hits < this.hitsMax || this.room.name === taskInfo.data.targetRoom) && (!this.memory.attackTarget || !Game.getObjectById(this.memory.attackTarget))) {
                const target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(o)=>o.getActiveBodyparts(ATTACK) > 0 || o.getActiveBodyparts(RANGED_ATTACK) > 0})
                if (target) this.memory.attackTarget = target.id;
                else this.memory.attackTarget = undefined;
            }
            if (this.hits < this.hitsMax) this.heal(this);
            if (this.memory.healTarget) {
                var target = Game.getObjectById(this.memory.healTarget)
                if (!target) {
                    if (!global.unexpectedDeath[this.memory.healTargetHome]) global.unexpectedDeath[this.memory.healTargetHome] = 1;
                    else global.unexpectedDeath[this.memory.healTargetHome]++;
                    this.memory.healTarget = undefined
                    this.memory.healTargetHome = undefined
                }else if (target.hits === target.hitsMax){
                    this.memory.healTarget = undefined
                    this.memory.healTargetHome = undefined
                }
            }

            if (this.memory.attackTarget){
                var target = Game.getObjectById(this.memory.attackTarget)
                if (this.pos.inRangeTo(target,1)) this.attack(target)
                if (this.pos.inRangeTo(target,3)) {
                    var hostileCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS,3)
                    if (hostileCreep.length > 1) this.rangedMassAttack()
                    else this.rangedAttack(target)
                }else this.moveTo(target)
            }else if (this.memory.healTarget && Game.getObjectById(this.memory.healTarget)){
                var target = Game.getObjectById(this.memory.healTarget)
                if (this.pos.inRangeTo(target,1)) this.heal(target)
                if (this.pos.inRangeTo(target,3)) this.rangedHeal(target)
                else this.moveTo(target)
            }else if (this.room.name !== taskInfo.data.targetRoom) {this["_Move"](new RoomPosition(25,25,taskInfo.data.targetRoom))}
            else{
                const posNear = (a,b) => a.pos.getRangeTo(this) - b.pos.getRangeTo(this);
                var neededHealer = _.filter(Game.rooms[taskInfo.data.targetRoom].inCreeps,(c)=>c.hits < c.hitsMax)
                neededHealer.sort(posNear)
                if (neededHealer.length > 0) {
                    this.memory.healTarget = neededHealer[0].id;
                    this.memory.healTargetHome = neededHealer[0].memory.home;
                }else this.say(constants.emoji.hunt)
            }
        }else if (subTaskType === "central"){
            const RENEW_TICKS = 400
            if (this.memory.renew) return this["__renew"]();
            if (this.room.name !== taskInfo.data.targetRoom) this["_Move"](new RoomPosition(25,25,taskInfo.data.targetRoom));
            else{
                if (!this.memory.attackTarget){
                    const remoteResources = require('configuration.Observer').coreDominance[taskInfo.data.targetRoom];
                    if (remoteResources && remoteResources.length > 0){
                        const enemies = _.filter(this.room.enemies,(c)=>utils.Adjacent(c,_.map(remoteResources,Game.getObjectById),3));
                        enemies.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this));
                        if (!this.memory["_tmp"]) this.memory["_tmp"] = {}
                        if (!this.memory["_tmp"]["bodyAnalysis"]) this.memory["_tmp"]["bodyAnalysis"] = utils.analyseCreep(this)
                        if (enemies.length > 0) this.memory.attackTarget = enemies[0].id;
                        else if (this.hits < this.hitsMax && (this.ticksToLive >= RENEW_TICKS || this.memory["_tmp"]["bodyAnalysis"]["move"][0] < this.memory["_tmp"]["bodyAnalysis"]["move"][1])) this.heal(this);
                        else if (this.ticksToLive < RENEW_TICKS) this.memory.renew = true;
                        else{
                            if (!this.memory.healTarget){
                                var targets = _.filter(this.room.inCreeps,(c)=>c.hits < c.hitsMax)
                                targets.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this))
                                if (targets.length > 0) this.memory.healTarget = targets[0].id
                            }
                            if (this.memory.healTarget) {
                                var target = Game.getObjectById(this.memory.healTarget)
                                if (this.heal(target) === ERR_NOT_IN_RANGE) this.travelTo(target)
                                if (target.hits === target.hitsMax || target.room.name !== taskInfo.data.targetRoom) this.memory.healTarget = undefined;
                            }else this.Invisible();
                        }
                    }else{
                        if (this.hits < this.hitsMax && this.ticksToLive > COMMON_DYING_TICK + 1) this.heal(this);
                        else return ERR_DELETE;
                    }
                }
                if (this.memory.attackTarget && !Game.getObjectById(this.memory.attackTarget)){
                    if (this.hits < this.hitsMax) this.heal(this);
                    else this.memory.attackTarget = undefined;
                }
                if (this.memory.attackTarget && Game.getObjectById(this.memory.attackTarget)){
                    const enemy = Game.getObjectById(this.memory.attackTarget)
                    if (enemy.pos.inRangeTo(this,3)) this.rangedAttack(enemy);
                    if (enemy.pos.inRangeTo(this,1)) this.attack(enemy);
                    else{
                        this["_Move"](enemy.pos);
                        if (this.hits < this.hitsMax) this.heal(this);
                    }
                }
            }
            return OK
        }
        return OK
    },
    _attack(subTaskType,signals){
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (subTaskType !== "heal" && this.room.name !== taskInfo.data.targetRoom){
            if (taskInfo.data.routes[0] === this.room.name) taskInfo.data.routes[0].shift();
            if (taskInfo.data.routes[0]){
                this["_adjMove"](new RoomPosition(25,25,taskInfo.data.targetRoom));
            }else this["_adjMove"](new RoomPosition(25,25,taskInfo.data.targetRoom));
            return OK;
        }
        if (subTaskType === "harvest"){
            if (!taskInfo.targetID) taskInfo.targetID = taskInfo.data.target;
            const target = Game.getObjectById(taskInfo.targetID);
            if (!target) return ERR_DELETE;
            if (!taskInfo.targetPos) taskInfo.targetPos = target.pos;

            if (target.hits <= 75000){
                var existingCapacity = _.reduce(signals["transferers"],(result,item)=>result+=Game.getObjectById(item).store.getCapacity(),0)
                if (target.power - existingCapacity >= creepConfig.components["transferer"]["carry"] * 100){
                    var saltList = utils.getSaltList(this.memory.home,this.memory.group.type,this.memory.group.name,"transferer");
                    Game.rooms[this.memory.home].AddSpawnTask("transferer",creepConfig.components["transferer"],this.memory.group.type,this.memory.group.name,utils.getBoosts("transferer",this.memory.group.type),saltList.length);
                }
            }

            if (this["_adjMove"](taskInfo.targetPos) === ERR_NOT_IN_RANGE) return OK;
            
            const bodySituation = utils.analyseCreep(this)
            if (bodySituation["move"][1] === 0 && bodySituation["attack"][1] / bodySituation["attack"][0] <= 0.5) {
                this.memory.waitingHeal = true
                return OK
            }
            if (this.memory.waitingHeal) if (bodySituation["attack"][2] === false) this.memory.waitingHeal = false
            
            if (!this.memory.waitingHeal){
                var feedback = this.attack(target)
                if (feedback === ERR_INVALID_TARGET) return ERR_DELETE
            }
        }else if (subTaskType === "heal"){
            if (!Game.getObjectById(taskInfo.targetID)) taskInfo.targetID = signals["creep"]
            var target = Game.getObjectById(taskInfo.targetID)
            this.moveTo(target)

            if (target.hits < target.hitsMax) this.heal(target);
            else if (this.hits < this.hitsMax) this.heal(this);
        }else if (subTaskType === "claim"){
            if (!Game.rooms[taskInfo.data.targetRoom].controller) return OK
            const controller = Game.rooms[taskInfo.data.targetRoom].controller
            const reservedText = "Reserved by @BoosterKevin."
            if (controller.my) {if (controller.sign.text !== "") this.signController(controller,"");return ERR_DELETE;}
            
            if (this["_adjMove"](controller.pos) === ERR_NOT_IN_RANGE) return OK
            
            if (utils.ownRoom(taskInfo.data.targetRoom) === false){
                this.attackController(controller)
            }else{
                if (claimRoomConfig.indexOf(taskInfo.data.targetRoom) >= 0){
                    var feedback = this.claimController(controller)
                    if (feedback === ERR_GCL_NOT_ENOUGH) {this.reserveController(controller);if (!controller.sign || controller.sign.text !== reservedText) this.signController(controller,reservedText);}
                }else {this.reserveController(controller);if (!controller.sign || controller.sign.text !== reservedText) this.signController(controller,reservedText);}
            }
            return OK
        }else if (subTaskType === "attack"){
            if (!taskInfo.targetID){
                const flag = this.pos.findClosestByRange(FIND_FLAGS,{filter:{color:COLOR_RED}});
                if (flag){
                    const targets = this.room.lookAt(flag.pos.x,flag.pos.y);
                    for (var target of targets){
                        if (target.type === "terrain") continue;
                        taskInfo.targetID = chosenTarget.id;
                        break;
                    }
                }
                if (!taskInfo.targetID){
                    const targetCreeps = this.room.find(FIND_HOSTILE_CREEPS);
                    const targetSpawns = this.room.find(FIND_HOSTILE_SPAWNS);
                    const targetTowers = this.room.find(FIND_STRUCTURES,{filter:{structureType:STRUCTURE_TOWER}});
                    let chosenTarget = undefined
                    if (targetTowers.length > 0) chosenTarget = targetTowers[0];
                    else if (targetCreeps.length > 0) chosenTarget = targetCreeps[0];
                    else if (targetSpawns.length > 0) chosenTarget = targetSpawns[0];
                    taskInfo.targetID = chosenTarget.id
                }
            }
            if (taskInfo.targetID){
                const target = Game.getObjectById(taskInfo.targetID)
                var feedback = this.attack(target)
                if (feedback === ERR_NOT_IN_RANGE) this.moveTo(target)
                else if (feedback === ERR_INVALID_TARGET) taskInfo.targetID = undefined
            }else {
                if (Game.rooms[taskInfo.data.targetRoom].droppedResources.length > 0){
                    var home = utils.getClosetSuitableRoom(taskInfo.data.targetRoom,4,true)
                    Game.rooms[home].AddPickUpTask("remote","pickUp",new RoomPosition(25,25,taskInfo.data.targetRoom),Game.rooms[home].storage.id)
                }
                if (Game.rooms[taskInfo.data.targetRoom].ruins.length > 0){
                    var home = utils.getClosetSuitableRoom(taskInfo.data.targetRoom,4,true)
                    Game.rooms[home].AddTransferTask("remote","ruin",Game.rooms[home].storage.id,undefined,"exhaust",this.room.name,home)
                }
                return OK
            }
        }
        return OK
    },
    toDeath(primary = false,canGetTask = false){
        if (!this.isIdle()) {
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (primary) {
                if (taskInfo.taskType == "harvest" && taskInfo.subTaskType == "local") this.deleteTask()
                else if (taskInfo.taskType == "harvest" && taskInfo.subTaskType == "remote"){
                    var target = Game.getObjectById(taskInfo.targetID)
                    if (!target) this.renewTask()
                    else{
                        if (target.lastCooldown >= utils.getAcceptableCoolTime(this.memory.home,taskInfo.targetPos.roomName)) this.deleteTask()
                        else if (target.energy || target.mineralType) this.deleteTask()
                        else this.renewTask()
                    }
                }else if (taskInfo.taskType === "attack" && taskInfo.subTaskType === "harvest") this.renewTask();
                else if (taskInfo.taskType === "attack" || taskInfo.taskType === "defend") this.deleteTask()
                else this.renewTask()
            }else this.deleteTask()
        }
        if (!this.memory.reSpawn && this.memory.role !== "upgrader" && ((this.ticksToLive <= COMMON_DYING_TICK / 2 && this.getTask(true)) || canGetTask)) {
            this.memory.reSpawn = true
            Game.rooms[this.memory.home].AddSpawnTask(this.memory.role,creepConfig.components[this.memory.role],this.memory.group.type,this.memory.group.name,utils.getBoosts(this.memory.role,this.memory.group.type),this.memory.salt);
        }
        var backRoles = ["transferer","worker","repairer"]
        if (backRoles.indexOf(this.memory.role) >= 0 && Game.rooms[this.memory.home].storage){
            this.travelTo(Game.rooms[this.memory.home].storage)
            for (var carryObject in this.store) this.transfer(Game.rooms[this.memory.home].storage,carryObject)
        }
    },
    dying(){
        if (this.memory.dying) return true
        if (this.memory.role === "transferer"){
            if (this.isIdle()) return this.ticksToLive <= TRANSFER_DYING_TICK
            const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
            if (taskInfo.taskType === "transfer"){
                if (taskInfo.subTaskType === "remote") {
                    const TICKS_PER_ROOM = 50
                    const distance = utils.calcRoomsDistance(this.memory.home,taskInfo.data.fromRoom)
                    return this.ticksToLive <= distance * TICKS_PER_ROOM
                }
            }
            return this.ticksToLive <= TRANSFER_DYING_TICK
        }else return this.ticksToLive <= COMMON_DYING_TICK
    },
    run(signals = {}){
        try{
            if (!this.memory.get) this.memory.get = {}
            if (!this.memory["_tmp"]) this.memory["_tmp"] = {}
            if (!this.memory["_tmp"]["bodyAnalysis"]) this.memory["_tmp"]["bodyAnalysis"] = utils.analyseCreep(this)
        }catch(error){
            console.log(this);
        }
        const taskInfo = Game.rooms[this.memory.home].memory.task.info[this.memory.taskFingerprint]
//        console.log(this,this.memory.taskFingerprint)
//        this.say(taskInfo.taskType);
        return this["_" + taskInfo.taskType](taskInfo.subTaskType,signals)
    }
}

_.assign(Creep.prototype,creepRunExtensions)