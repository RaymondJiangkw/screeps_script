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
            var feedback = this.moveTo(new RoomPosition(targetPos.x,targetPos.y,targetPos.roomName))
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
                    for (var groupLabs of [].concat(global.labStructures[this.room.name]["XGroup"],global.labStructures[this.room.name]["YGroup"])){
                        for (var labId of groupLabs){
                            var lab = Game.getObjectById(labId);
                            if (lab.store.getUsedCapacity(boostCompound) >= COMPOUND_UNIT && lab.store.getUsedCapacity(RESOURCE_ENERGY) >= ENERGY_UNIT){
                                this.memory.boostTarget = lab.id
                                this.memory.boostTargetPos = lab.pos
                                break;
                            }
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
            if (this.adjMove(this.memory.boostTargetPos) === ERR_NOT_IN_RANGE) return OK
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
        else moveFeedback = this.adjMove(taskInfo.targetPos)
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
        const info = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint);
        // Check for working ?
        // Condition: full | reach maximum amount
        if (!this.memory.working && (this.store.getFreeCapacity() === 0 || this.store.getUsedCapacity(info.data.resourceType) >= info.data.amount)) {
            this.memory.working = true;
            // Reset the state of getTarget.
            this.resetGet();
        }
        // Check for not working ?
        if (this.memory.working && this.store.getUsedCapacity() === 0) {
            this.memory.working = false;
            // Reset the state of info.
            [info.targetId,info.targetPos] = [undefined,undefined];
            // Do not check "exhaust" or "full" here.
            if (info.data.amount <= 0) return ERR_DELETE;
            if (info.settings.changeable) return ERR_RENEW;
            else return OK;
        }
        if (!this.memory.working) {
            if (info.data.from.target === "creep") {
                const creep = Game.getObjectById(signals["creep"]);
                const pos = utils.getPos(creep.pos);
                if (pos.roomName !== creep.memory.home) return this.Collect(pos);
            }
            if (!this.memory.getTargetId || !this.memory.getTargetPos) {
                // Ensure Visibility.
                if (!Game.rooms[info.data.from.roomName]) return OK & this.adjMove({x:25,y:25,roomName:info.data.from.roomName});
                // get Target.
                const getRet = Game.rooms[info.data.from.roomName].getFromStructure(info.data.from.target,{creep:this,identity:info.taskType,subIdentity:info.subTaskType,resourceType:info.data.resourceType,amount:info.data.amount});
                // Decide whether found.
                switch (getRet) {
                    case ERR_NOT_FOUND:
                        if (!info.data.resourceType && this.store.getUsedCapacity() > 0) this.memory.working = true;
                        else if (info.data.resourceType && this.store[info.data.resourceType] > 0) this.memory.working = true;
                        else return ERR_DELETE;
                        break;
                    case ERR_WAITING:
                        if (this.Margin()) this.adjMove({x:25,y:25,roomName:info.data.from.roomName});
                        return OK;
                    case ERR_RECYCLE:
                        this.memory.recycle = true;
                        return ERR_DELETE;
                    default:
                        if (subTaskType === "aid") {
                            const target = Game.getObjectById(getRet[0]);
                            if (target.store.getUsedCapacity(info.data.resourceType) <= info.data.complements.stopAmount) return ERR_DELETE;
                        }
                        [this.memory.getTargetId,this.memory.getTargetPos] = getRet;
                        break;
                }
            }
            if (this.memory.getTargetId && this.memory.getTargetPos) {
                if (this.adjMove(this.memory.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
                // Lazy check.
                const target = Game.getObjectById(this.memory.getTargetId);
                if (!target || (target.store && (target.store.getUsedCapacity(info.data.resourceType) === 0 || target.store.getUsedCapacity() === 0)) || target.amount === 0) {
                    this.resetGet();
                    return ERR_REPEAT;
                }
                const feedback = this.Get(target,info.data.resourceType,info.data.amount);
                this.say(feedback)
                switch (feedback) {
                    case OK:
                        return OK;
                    case ERR_NOT_ENOUGH_RESOURCES:
                        this.resetGet();
                        return OK;
                    case ERR_FULL:
                        this.memory.storing = true;
                        this.resetGet();
                        return OK;
                }
            }
        }
        if (this.memory.working) {
            // Try to get "to" target.
            if (!info.targetId || !info.targetPos) {
                if (!Game.rooms[info.data.to.roomName]) return OK & this.adjMove({x:25,y:25,roomName:info.data.to.roomName});
                // get Target.
                const getRet = Game.rooms[info.data.to.roomName].getToStructure(info.data.to.target,{creep:this,identity:info.taskType,subIdentity:info.subTaskType,resourceType:info.data.resourceType});
                // Decide whether found.
                switch (getRet) {
                    case ERR_NOT_FOUND:
                        this.memory.working = false;
                        this.resetGet();
                        return ERR_DELETE;
                    default:
                        if (subTaskType === "aid") {
                            const target = Game.getObjectById(getRet[0]);
                            if (target.store.getUsedCapacity(info.data.resourceType) >= info.data.complements.toStopAmount) return ERR_DELETE;
                        }
                        [info.targetId,info.targetPos] = getRet;
                        break;
                }
            }
            if (info.targetId && info.targetPos) {
                if (this.adjMove(info.targetPos) === ERR_NOT_IN_RANGE) return OK;
                const target = Game.getObjectById(info.targetId);
                // Lazy Check.
                if (!target || target.store.getFreeCapacity() === 0 || target.store.getFreeCapacity(info.data.resourceType) === 0) {
                    [info.targetId,info.targetPos] = [undefined,undefined];
                    return ERR_REPEAT;
                }
                // Calculate transfer amount.
                let transferAmount = 0;
                // Preset the transferAmount.
                if (typeof(info.data.amount) === "number") transferAmount = info.data.amount;
                for (const carry in this.store) {
                    if (info.data.resourceType && carry === info.data.resourceType) transferAmount = Math.min(target.store.getFreeCapacity(info.data.resourceType),this.store[carry]);
                    if (this.transfer(target,carry,transferAmount || undefined) === ERR_FULL){
                        this.memory.working = false;
                        this.resetGet();
                        return ERR_DELETE;
                    }
                    // break;
                }
                // Modify the amount.
                if (typeof(info.data.amount) === "number") info.data.amount -= transferAmount;
            }
        }
        return OK;
    },
    _work(taskType,subTaskType,signals){
        const action = taskType;
        const info = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint);
        // Check for the working state.
        if (this.memory.working && this.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            this.memory.working = false;
            [info.targetID,info.targetPos] = [undefined,undefined];
            if (info.settings.changeable) return ERR_RENEW;
        }
        if (!this.memory.working && this.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            this.resetGet();
            this.memory.working = true;
        }
        // Get the energy and consider the edge case: not enough energy, but stores some. In this case, it will going to work.
        if (!this.memory.working) {
            if (!this.memory.getTargetId || !this.memory.getTargetPos) {
                const feedback = this._getEnergy(action,"default",this.memory.home);
                switch (feedback) {
                    case ERR_NOT_FOUND:
                        return OK;
                    case ERR_FULL:
                        return ERR_REPEAT;
                    default:
                        [this.memory.getTargetId,this.memory.getTargetPos] = [feedback[0],feedback[1]];
                }
            }
            if (this.memory.getTargetId && this.memory.getTargetPos) {
                if (this.adjMove(this.memory.getTargetPos) === ERR_NOT_IN_RANGE) return OK;
                const target = Game.getObjectById(this.memory.getTargetId);
                if (!target || this.Get(target,RESOURCE_ENERGY) !== OK) {
                    this.resetGet();
                    return ERR_REPEAT;
                }
            }
        }
        if (this.memory.working) {
            // Lazy check to improve efficiency.
            this.initTask();
            if (!info.targetID && (!info.targetPos || Game.rooms[info.targetPos.roomName])) return ERR_DELETE;
            if (this.room.name !== info.targetPos.roomName) return OK & this.adjMove(info.targetPos);
            const target = Game.getObjectById(info.targetID);
            if (!target || (action === "repair" && target.hits === target.hitsMax)) {
                [info.targetID,info.targetPos] = [undefined,undefined];
                return ERR_REPEAT;
            }
            const feedback = this[action](target);
            if (feedback === ERR_NOT_IN_RANGE) this.adjMove(target.pos,{travel:true});
            return OK;
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
        if (!this.memory.working && this.store.getFreeCapacity() === 0) this.memory.working = true;
        if (!this.memory.working) {
            this.initTask()
            if (!taskInfo.targetID && (!taskInfo.targetPos || Game.rooms[taskInfo.targetPos.roomName])) {
                if (this.store.getUsedCapacity() > 0) this.memory.working = true;
                else return ERR_DELETE;
            }else{
                if (!utils.canGetObjectById(taskInfo.targetID,taskInfo.targetPos)){
                    taskInfo.targetID = undefined;
                    taskInfo.targetPos = undefined;
                    return ERR_REPEAT;
                }
                
                if (this.adjMove(taskInfo.targetPos) === ERR_NOT_IN_RANGE) return OK
    
                var target = Game.getObjectById(taskInfo.targetID)
                var feedback = this.pickup(target)
    
                if (feedback === ERR_FULL) this.memory.working = true
                else if (feedback === ERR_INVALID_TARGET) {
                    taskInfo.targetID = undefined;
                    taskInfo.targetPos = undefined;
                    return ERR_REPEAT;
                }
            }
        }
        if (this.memory.working) {
            if (this.store.getUsedCapacity() === 0) {
                this.memory.working = false;
                if (!taskInfo.settings.changeable) return OK;
                else return ERR_RENEW;
            }
            var target = Game.getObjectById(taskInfo.data.toTarget);
            if (this.adjMove(target.pos) === ERR_NOT_IN_RANGE) return OK;

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
                var target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(o)=>{
                        return o.getActiveBodyparts(ATTACK) > 0 || o.getActiveBodyparts(RANGED_ATTACK) > 0;
                    }})
                if (target) this.memory.attackTarget = target.id;
                else {
                    target = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES);
                    if (target) this.memory.attackTarget = target.id;
                    else this.memory.attackTarget = undefined;
                }
            }
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
            var hasAttacked = false;
            if (this.memory.attackTarget){
                var closeTarget = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(o)=>o.getActiveBodyparts(ATTACK) > 0 || o.getActiveBodyparts(RANGED_ATTACK) > 0});
                if (closeTarget && (closeTarget.id !== this.memory.attackTarget)) this.memory.attackTarget = closeTarget.id;
                var target = Game.getObjectById(this.memory.attackTarget);
                try{
                    if (this.pos.inRangeTo(target,1)) {
                        this.attack(target)
                        hasAttacked = true;
                    }
                    if (this.pos.inRangeTo(target,3)) {
                        var hostileCreep = this.pos.findInRange(FIND_HOSTILE_CREEPS,3)
                        if (hostileCreep.length > 1) this.rangedMassAttack()
                        else this.rangedAttack(target)
                    }
                    this.moveTo(target)
                }catch(error){this.memory.attackTarget = undefined;}
            }else if (this.memory.healTarget && Game.getObjectById(this.memory.healTarget)){
                var target = Game.getObjectById(this.memory.healTarget)
                if (this.pos.inRangeTo(target,1)) this.heal(target)
                else this.moveTo(target)
                if (this.pos.inRangeTo(target,3)) this.rangedHeal(target)
            }else if (this.room.name !== taskInfo.data.targetRoom) {this["_Move"](new RoomPosition(25,25,taskInfo.data.targetRoom))}
            else{
                const posNear = (a,b) => a.pos.getRangeTo(this) - b.pos.getRangeTo(this);
                var neededHealer = _.filter(Game.rooms[taskInfo.data.targetRoom].inCreeps,(c)=>c.hits < c.hitsMax)
                neededHealer.sort(posNear)
                if (neededHealer.length > 0) {
                    this.memory.healTarget = neededHealer[0].id;
                    this.memory.healTargetHome = neededHealer[0].memory.home;
                }else {
                    this.say(constants.emoji.hunt);this.Invisible();
                }
            }
            if (this.hits < this.hitsMax && !hasAttacked) this.heal(this);
        }else if (subTaskType === "observed"){
            if (!this.memory.attackTarget || !Game.getObjectById(this.memory.attackTarget)) {
                var target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(o)=> o.getActiveBodyparts(ATTACK) === 0 && o.getActiveBodyparts(RANGED_ATTACK) === 0  && constants.enemies.indexOf(o.owner.username) >= 0});
                if (target) this.memory.attackTarget = target.id;
                else this.memory.attackTarget = undefined;
            }
            if (!this.memory.avoidTarget || !Game.getObjectById(this.memory.avoidTarget)) {
                var target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(o)=>{
                        return (o.getActiveBodyparts(ATTACK) > 0 || o.getActiveBodyparts(RANGED_ATTACK) > 0) && constants.enemies.indexOf(o.owner.username) >= 0;
                    }})
                if (target) this.memory.avoidTarget = target.id;
                else this.memory.avoidTarget = undefined;
            }
            const _moveTo = (pos,flee = true) => {
                let ret = PathFinder.search(this.pos,pos,{flee});
                this.move(this.pos.getDirectionTo(ret.path[0]));
            }
            if (this.memory.attackTarget){
                var closeTarget = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(o)=> o.getActiveBodyparts(ATTACK) === 0 && o.getActiveBodyparts(RANGED_ATTACK) === 0  && constants.enemies.indexOf(o.owner.username) >= 0});
                if (closeTarget && (closeTarget.id !== this.memory.attackTarget)) this.memory.attackTarget = closeTarget.id;
            }
            if (this.memory.avoidTarget){
                var closeTarget = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS,{filter:(o)=>{
                        return (o.getActiveBodyparts(ATTACK) > 0 || o.getActiveBodyparts(RANGED_ATTACK) > 0) && constants.enemies.indexOf(o.owner.username) >= 0;
                    }});
                if (closeTarget && (closeTarget.id !== this.memory.avoidTarget)) this.memory.avoidTarget = closeTarget.id;
            }
            if (this.memory.attackTarget) {
                const target = Game.getObjectById(this.memory.attackTarget);
                _moveTo(target.pos,false);
            }else if (this.memory.avoidTarget) {
                const target = Game.getObjectById(this.memory.avoidTarget);
                if (this.hits < this.hitsMax) _moveTo(target.pos,true);
                else _moveTo(target.pos,false);
            }else if (this.room.name !== taskInfo.data.targetRoom) this["_Move"](new RoomPosition(25,25,taskInfo.data.targetRoom));
            const targets = this.pos.findInRange(FIND_HOSTILE_CREEPS,3,{filter:(o)=>constants.enemies.indexOf(o.owner.username) >= 0});
            if (targets.length > 1) this.rangedMassAttack();
            else if (targets.length === 1) this.rangedAttack(targets[0]);
            if (this.memory.avoidTarget || this.memory.attackTarget || this.hits < this.hitsMax) this.heal(this);
            if (this.room.name === taskInfo.data.targetRoom && !this.memory.avoidTarget && !this.memory.attackTarget) return ERR_DELETE;
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
            if (this.getActiveBodyparts(HEAL) > 0 && this.hits < this.hitsMax) this.heal(this);
            if (taskInfo.data.routes[0] === this.room.name) taskInfo.data.routes[0].shift();
            if (taskInfo.data.routes[0]){
                this.adjMove(new RoomPosition(25,25,taskInfo.data.targetRoom));
            }else this.adjMove(new RoomPosition(25,25,taskInfo.data.targetRoom));
            return OK;
        }
        if (subTaskType === "invade"){
            if (this.hits < this.hitsMax) this.heal(this);
            if (!this.memory.attackTarget || !Game.getObjectById(this.memory.attackTarget)) {
                let flags = this.room.find(FIND_FLAGS,{filter:{color:COLOR_RED}});
                flags.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this));
                for (let flag of flags) {
                    const structures = _.filter(this.room.lookForAt(LOOK_STRUCTURES,flag),s => s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD);
                    const creeps = _.filter(this.room.lookForAt(LOOK_CREEPS,flag),c => c.owner.username !== "BoosterKevin");
                    if (structures.length > 0){
                        this.memory.attackTarget = structures[0].id;
                        break;
                    }
                    if (creeps.length > 0){
                        this.memory.attackTarget = creeps[0].id;
                        break;
                    }
                }
                if (!Game.getObjectById(this.memory.attackTarget)) {
                    const creeps = _.filter(this.room.find(FIND_HOSTILE_CREEPS),(c) => c.pos.getRangeTo(this) <= 4);
                    if (creeps.length > 0) this.memory.attackTarget = creeps[0].id;
                }
            }
            if (!this.memory.attackTarget || !Game.getObjectById(this.memory.attackTarget)) {
                const structures = this.room.find(FIND_HOSTILE_STRUCTURES,{filter:(s) => s.structureType !== STRUCTURE_RAMPART && s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_KEEPER_LAIR});
                const creeps = _.filter(this.room.find(FIND_HOSTILE_CREEPS),(c) => c.pos.getRangeTo(this) <= 4);
                if (structures.length === 0 && creeps.length === 0) {
                    this.say("Clean!");
                    const ruins = this.room.find(FIND_RUINS,{filter:(r) => r.store.getUsedCapacity() > 0});
                    if (ruins.length > 0) Game.rooms[this.memory.home].AddTransferTask("remote",{target:"ruin",roomName:taskInfo.data.targetRoom},{target:"storage",roomName:this.memory.home},undefined,"exhaust");
                    const droppedResources = this.room.find(FIND_DROPPED_RESOURCES);
                    if (droppedResources.length > 0) Game.rooms[this.memory.home].AddPickUpTask("remote","pickUp",{x:25,y:25,roomName:taskInfo.data.targetRoom,fake:true},Game.rooms[this.memory.home].storage.id);
                    const containers = this.room.find(FIND_STRUCTURES,{filter:{structureType:STRUCTURE_CONTAINER}});
                    for (let container of containers) {
                        const rampart = _.filter(this.room.lookForAt(LOOK_STRUCTURES,container),s => s.structureType === STRUCTURE_RAMPART);
                        if (rampart.length === 0) Game.rooms[this.memory.home].AddTransferTask("remote",{target:container.id,roomName:taskInfo.data.targetRoom},{target:"storage",roomName:this.memory.home},undefined,"exhaust");
                    }
                    return ERR_DELETE;
                }
            }
            if (this.memory.attackTarget && Game.getObjectById(this.memory.attackTarget)) {
                const target = Game.getObjectById(this.memory.attackTarget);
                if (this.getActiveBodyparts(ATTACK) > 0 && target.structureType === STRUCTURE_TOWER && target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.heal(this);
                else if (this.getActiveBodyparts(ATTACK) === 0 || this.hits < this.hitsMax) this.heal(this);
                if (this.getActiveBodyparts(ATTACK) > 0 && this.attack(target) === ERR_NOT_IN_RANGE) this.moveTo(target);
                if (this.getActiveBodyparts(RANGED_ATTACK) > 0 && this.rangedAttack(target) === ERR_NOT_IN_RANGE) this.moveTo(target);
            }
        }else if (subTaskType === "harvest"){
            if (!taskInfo.targetID) taskInfo.targetID = taskInfo.data.target;
            const target = Game.getObjectById(taskInfo.targetID);
            if (!target && Game.rooms[taskInfo.data.targetRoom]) {
                this.memory.recycle = true;
                return ERR_DELETE;
            }
            if (!taskInfo.targetPos) taskInfo.targetPos = target.pos;

            if (this.adjMove(taskInfo.targetPos,{travel:true}) === ERR_NOT_IN_RANGE) return OK;
            
            if (target.hits <= 150000 && !this.memory.hasIssued){
                this.memory.hasIssued = true;
                Game.rooms[this.memory.home].AddTransferTask("remote",{target:"power",roomName:taskInfo.data.targetRoom},{target:"storage",roomName:this.memory.home},RESOURCE_POWER,"exhaust",{groupsNum:Math.floor(target.power / (creepConfig.components["transferer"]["carry"] * 100))});
            }
            
            const bodySituation = utils.analyseCreep(this)
            if (bodySituation["move"][1] === 0 && bodySituation["attack"][1] / bodySituation["attack"][0] <= 0.5) {
                this.memory.waitingHeal = true
                return OK
            }
            if (this.memory.waitingHeal) if (bodySituation["attack"][2] === false) this.memory.waitingHeal = false
            
            if (!this.memory.waitingHeal){
                var feedback = this.attack(target)
                if (feedback === ERR_INVALID_TARGET) return this["__recycle"]();
            }
        }else if (subTaskType === "heal"){
            if (signals["finish"]) this.memory.recycle = true;
            if (!Game.getObjectById(taskInfo.targetID)) taskInfo.targetID = signals["creep"];
            var target = Game.getObjectById(taskInfo.targetID);
            if (!target) return ERR_DELETE;
            if (!target.pos) return OK;
            if (!utils.adjacentPos(target.pos,this.pos)) this.travelTo(target);

            if (target.hits < target.hitsMax) this.heal(target);
            else if (this.hits < this.hitsMax) this.heal(this);
        }else if (subTaskType === "claim"){
            if (!Game.rooms[taskInfo.data.targetRoom].controller) return OK
            const controller = Game.rooms[taskInfo.data.targetRoom].controller
            const reservedText = "Reserved by @BoosterKevin."
            if (controller.my) {if (controller.sign.text !== "") this.signController(controller,"");return ERR_DELETE;}
            
            if (this.adjMove(controller.pos,{travel:true}) === ERR_NOT_IN_RANGE) return OK
            
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
                    Game.rooms[home].AddTransferTask("remote",{target:"ruin",roomName:this.room.name},{target:"storage",roomName:this.memory.home},undefined,"exhaust");
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
                if (taskInfo.subTaskType === "remote" && taskInfo.data.fromRoom) {
                    const TICKS_PER_ROOM = 125
                    const distance = utils.calcRoomsDistance(this.memory.home,taskInfo.data.fromRoom)
                    return this.ticksToLive <= distance * TICKS_PER_ROOM
                }
            }
            return this.ticksToLive <= TRANSFER_DYING_TICK
        }else return this.ticksToLive <= COMMON_DYING_TICK
    },
    run(signals = {}){
        const notNotifyGroups = ["Defend_observed","remoteHarvest","remotePickUper"];
        if (notNotifyGroups.indexOf(this.memory.group.type) >= 0){ //&& !this.memory.notNotify){
            //this.memory.notNotify = true;
            this.notifyWhenAttacked(false);
        }
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