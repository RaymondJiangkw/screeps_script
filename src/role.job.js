const reference = require("reference")
const helpFunc = require("func")
// Some absolute calls may cause errors or bugs.
// building:: finish the goal of the task
// JobOK/ERR:: satisfy the requirement of the task
/*
Mechanism
creep:: receive signal(as many as possible) :: Send signal when and only when the goal of the task has been reached
                        |
        respond signal                      :: Restart receiving signal only after having responded all
Pros: Multi-tasks mode
Cons: One Task One Loop
*/
const JobOK = 0
const JobERR = 1
const _isCreepSignalRespond = function(creep){
    if (!creep.memory.signals) {
        return true
    }
    for (let signal in creep.memory.signals){
        if (creep.memory.signals[signal] === true){
            return false
        }
    }
    return true
}
const _getRepairObject=function(roomName,absolute = false){ // Dealing with the case of perfectly repairing
    const repairObject = Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededRepair"]
    let chosenStructure = undefined
    if (repairObject["mainStructures"].length > 0){
        chosenStructure = repairObject["mainStructures"][0]
    }else if (repairObject["containers"].length > 0){
        chosenStructure = repairObject["containers"][0]
    }else if (repairObject["roads"].length > 0){
        chosenStructure = repairObject["roads"][0]
    }
    if (chosenStructure === undefined && absolute === true){
        let allNeededStructures = _.filter(Game.rooms[roomName].find(FIND_STRUCTURES),(structure)=>{
            return structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART && structure.hits < structure.hitsMax
        })
        if (allNeededStructures.length > 0){
            allNeededStructures.sort((structureA,structureB)=>{
                return helpFunc.getHitRatio(structureA.id) - helpFunc.getHitRatio(structureB.id)
            })
            chosenStructure = allNeededStructures[0].id
        }else{
            if (Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededRepair"]["ramparts"].length > 0){
                chosenStructure = Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededRepair"]["ramparts"][0]
            }else if (Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededRepair"]["walls"].length > 0){
                chosenStructure = Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededRepair"]["walls"][0]
            }
        }
    }
    return chosenStructure
}
const _isTowerEnergyEnough = function(tower_id){
    return helpFunc.getUsedCapacity(tower_id)/helpFunc.getCapacity(tower_id) >= reference.assess.work.tower.leastWarEnergyRatio
}
const roleJob = {
    /*
    return:: JobOK Work
             JobERR No Work needed to be done
             JobERR Work has been done
    */
    prepareCreep:function(creep){
        // creep.memory.hasBoosted Array
        // creep.memory.neededBoosted Array
        // creep.memory.boostDiffArr Array
        const role = creep.memory.role
        const roomName = creep.room.name
        const controllerLevel = Game.rooms[roomName].controller.level.toString()
        let feedBack = JobOK
        if (reference.production.lab.allowedCompounds[controllerLevel].hasOwnProperty(role) === false){
            feedBack = JobERR
        }else{
            if (!creep.memory.neededBoosted){
                creep.memory.neededBoosted = Object.keys(reference.production.lab.allowedCompounds[controllerLevel][role])
                creep.memory.hasBoosted = []
                creep.memory.boostDiffArr = creep.memory.neededBoosted
            }
        }
        if (feedBack === JobOK && 
            (creep.memory.hasBoosted.length === creep.memory.neededBoosted.length ||
             Game.spawns['Origin'].memory.init.infoCompounds[roomName][creep.memory.boostDiffArr[0]].lab < 
              reference.production.lab.minBoostCompound * creep.memory.bodyParts[reference.production.lab.effect[creep.memory.boostDiffArr[0] ] ] ) ){
            feedBack = JobERR
        }
        if (feedBack === JobOK){ // In order to save time, it only check the first one
            let chosenLabId = Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"][creep.memory.boostDiffArr[0]]
            chosenLabId = chosenLabId[0]
            if (Game.getObjectById(chosenLabId).store.getUsedCapacity(RESOURCE_ENERGY) >= 
                reference.production.lab.minBoostEnergy * creep.memory.bodyParts[reference.production.lab.effect[creep.memory.boostDiffArr[0]]]){
                let _feedBack = Game.getObjectById(chosenLabId).boostCreep(creep)
                if (_feedBack === ERR_NOT_IN_RANGE){
                    creep.moveTo(Game.getObjectById(chosenLabId))
                }else if (_feedBack === OK){
                    creep.memory.hasBoosted.push(creep.memory.boostDiffArr[0])
                    creep.memory.boostDiffArr.shift()
                }else if (_feedBack === ERR_NOT_ENOUGH_RESOURCES){
                    feedBack = JobERR
                }
            }else{
                feedBack = JobERR
            }
        }
        return feedBack
    },
    creepCachedMove:function(creep){
        if (creep.memory._move){
            const moveInfo = creep.memory._move
            const dest = moveInfo.dest
            if (creep.pos.x !== dest.x || creep.pos.y !== dest.y || creep.room.name !== dest.room){
                creep.moveTo(new RoomPosition(dest.x,dest.y,dest.room),{noPathFinding: true})
                return JobOK
            }
        }
        return JobERR
    },
    chargeEnergyBehavior:function(creep, absolute = false){
        const roomName = creep.memory.home
        let feedBack = JobERR
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.signals.building = false
        }
        if ((Game.spawns['Origin'].memory.assess.access.is.neededCharge[roomName] 
            && creep.memory.signals.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            const chargeStructures = Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]
            let chosenStructure = undefined;
            if (chargeStructures.spawns.length > 0){
                chosenStructure = chargeStructures.spawns[0]
            }else if (chargeStructures.extensions.length > 0){
                chosenStructure = chargeStructures.extensions[0]
            }
            chosenStructure = Game.getObjectById(chosenStructure)
            let _feedBack = creep.transfer(chosenStructure,RESOURCE_ENERGY)
            if (_feedBack === ERR_NOT_IN_RANGE){
                creep.moveTo(chosenStructure)
            }else if (_feedBack !== OK){
                feedBack = JobERR 
            }
        }
        return feedBack
    },
    chargeLabFactoryBehavior:function(creep,absolute = false){
        const roomName = creep.room.name 
        let feedBack = JobERR
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.signals.building = false
        }
        if (((Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["labs"].length > 0 ||
              Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["factory"].length > 0)
             && creep.memory.signals.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            let chosenStructure = undefined
            if (Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["labs"].length > 0){
                chosenStructure = Game.getObjectById(Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["labs"][0])
            }else if (Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["factory"].length > 0){
                chosenStructure = Game.getObjectById(Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["factory"][0])
            }
            let _feedBack = creep.transfer(chosenStructure,RESOURCE_ENERGY)
            if (_feedBack === ERR_NOT_IN_RANGE){
                creep.moveTo(chosenStructure)
            }else if (_feedBack !== OK){
                feedBack = JobERR
            }
        }
        return feedBack
    },
    buildBehavior:function(creep,absolute = false){
        const roomName = creep.memory.home
        let feedBack = JobERR
        let constructionSites = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES)
        if (constructionSites.length === 0 && creep.memory.role === "builder" && Game.rooms[roomName].controller.level >= reference.assess.work.build.helpBuildHomeControllerLevel){ // Help Others to Build Spawn
            const controlledRooms = Object.values(Game.rooms).filter(room => room.controller.my)
            for (let i = 0; i < controlledRooms.length; i++){
                if (Game.spawns['Origin'].memory.init.access.spawns[controlledRooms[i].name].length === 0 || 
                    Game.rooms[controlledRooms[i].name].controller.level <= reference.assess.work.build.helpBuildControllerLevel){ // Determine whether the room has the ability to build by itself
                    constructionSites = Game.rooms[controlledRooms[i].name].find(FIND_CONSTRUCTION_SITES)
                    if (constructionSites.length !== 0){
                        break
                    }
                }
            }
        }
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.signals.building = false
        }
        if ((constructionSites.length > 0 
            && creep.memory.signals.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.build(constructionSites[0]) === ERR_NOT_IN_RANGE){
                creep.moveTo(constructionSites[0])
            }
        }
        return feedBack
    },
    upgradeBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.signals.building = false
        }
        if (creep.memory.signals.building || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.upgradeController(Game.rooms[roomName].controller) === ERR_NOT_IN_RANGE){
                creep.moveTo(Game.rooms[roomName].controller)
            }
        }
        return feedBack
    },
    storeBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        let HasSignal = false
        for (let signal in creep.memory.signals){
            if (creep.memory.signals[signal] === true){
                HasSignal = true
            }
            if (creep.store.getUsedCapacity() === 0){
                creep.memory.signals[signal] = false
            }
            creep.memory.hasGoods = false
        }
        if ((      (Game.spawns['Origin'].memory.assess.access.is.storages[roomName].neededChargeEnergy ||
              Game.spawns['Origin'].memory.init.groupedContainers.backUp[roomName].available.length > 0 ||
              (         (creep.memory.role === 'miner' || creep.memory.role === 'pickuper') &&
              Game.spawns['Origin'].memory.assess.access.is.storages[roomName].exists === true))           && // Deal with the case of storing minerals
              HasSignal === true) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            let chosenStructure = undefined
            if (Game.spawns['Origin'].memory.init.groupedContainers.backUp[roomName].available.length > 0 && 
            creep.memory.role !== 'miner' && creep.memory.role !== 'pickuper'){ // Deal with the case of storing minerals
                chosenStructure = Game.spawns['Origin'].memory.init.groupedContainers.backUp[roomName].available[0]
            }else {
                chosenStructure = Game.spawns['Origin'].memory.init.access.storages[roomName][0]
            }
            chosenStructure = Game.getObjectById(chosenStructure)
            if (helpFunc.creepTransferAll(creep.id,chosenStructure.id) === ERR_NOT_IN_RANGE){
                creep.moveTo(chosenStructure)
            }
        }
        return feedBack
    },
    chargeDefenseBehavior:function( creep, absolute = false){
        // Once a tower's energy dropped to the level which is defined in the reference.assess.work.tower.leastWarEnergyRatio
        // Begin to charge
        const roomName = creep.memory.home
        let feedBack = JobERR
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.signals.building = false
        }
        if (creep.memory.chargeTarget && 
            Game.getObjectById(creep.memory.chargeTarget).store.getFreeCapacity(RESOURCE_ENERGY) <= creep.store.getCapacity(RESOURCE_ENERGY)){ // Loose the condition to let more towers be charged
            creep.memory.chargeTarget = undefined
        }
        if ( ( (creep.memory.chargeTarget ||
                Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["towers"].length > 0) &&
             creep.memory.signals.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (!creep.memory.chargeTarget){
                creep.memory.chargeTarget = Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["towers"][0]
            }
            const _feedBack = creep.transfer(Game.getObjectById(creep.memory.chargeTarget),RESOURCE_ENERGY)
            if (_feedBack === ERR_NOT_IN_RANGE){
                creep.moveTo(Game.getObjectById(creep.memory.chargeTarget))
            }
        }
        return feedBack
    },
    repairBehavior:function(object, absolute = false){
        const roomName = object.room.name
        let feedBack = JobERR
        if (object.memory && object.store.getUsedCapacity(RESOURCE_ENERGY) === 0){ //Determine its a creep
            object.memory.signals.building = false
            object.memory.repairTarget = undefined
        }
        const _neededRepair = Game.spawns['Origin'].memory.assess.access.is.neededRepair[roomName]
        if ( (object.memory && object.memory.signals.building && 
               (_neededRepair === true || object.memory.role === "repairer")) ||
             (object.structureType && _neededRepair===true && _isTowerEnergyEnough(object.id)) ||
             absolute === true) {
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (object.memory){ // Determine whether the subject is creep
                // For creeps, repair all structures needed to be repaired
                if (!object.memory.repairTarget || 
                    helpFunc.getHitRatio(object.memory.repairTarget) === 1){
                    object.memory.repairTarget = _getRepairObject(roomName,true)
                }
                if (object.memory.repairTarget === undefined){
                    feedBack = JobERR
                }else{
                    const repairTargetObject = Game.getObjectById(object.memory.repairTarget)
                    if (object.repair(repairTargetObject) === ERR_NOT_IN_RANGE){
                        object.moveTo(repairTargetObject)
                    }
                }
            }else if (object.structureType === STRUCTURE_TOWER && _isTowerEnergyEnough(object.id)) {
                // For Tower, only repair structures which can't be beared
                object.repair(Game.getObjectById(_getRepairObject(roomName)))
            }
        }
        return feedBack
    },
    defendTowerBehavior:function(tower, absolute = false){
        const roomName = tower.room.name
        let feedBack = JobERR
        if (Game.spawns['Origin'].memory.init.access.enemies[roomName].length > 0 || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (Game.spawns['Origin'].memory.init.access.enemies[roomName].length > 0){
                tower.attack(Game.getObjectById(Game.spawns['Origin'].memory.init.access.enemies[roomName][0]))
            }
        }
        return feedBack
    },
    strengthenTowerBehavior:function(tower, absolute = false){
        const roomName = tower.room.name
        let feedBack = JobERR
        const targetRampart = Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededRepair"]["ramparts"]
        const targetWalls = Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededRepair"]["walls"]
        if ((_isTowerEnergyEnough(tower.id)===true && Game.spawns['Origin'].memory.assess.access.is.neededStrengthen[roomName]) ||
        absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            let chosenStructure = undefined
            if (targetRampart.length > 0){
                chosenStructure = Game.getObjectById(targetRampart[0])
            }else if (targetWalls.length > 0){
                chosenStructure = Game.getObjectById(targetWalls[0])
            }
            tower.repair(chosenStructure)
        }
        return feedBack
    },
    SpickUpBehavior:function(creep, absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        const targetDroppedResources = (creep.room.find(FIND_DROPPED_RESOURCES)).sort((resourceA,resourceB)=>resourceB.amount - resourceA.amount)
        const targetTombStones = _.filter(creep.room.find(FIND_TOMBSTONES),(tombStone)=>tombStone.store.getUsedCapacity()!==0).sort((tombStoneA,tombStoneB)=>{
            return tombStoneB.store.getUsedCapacity() - tombStoneA.store.getUsedCapacity()
        })
        if (creep.memory.hasPickUp && 
            (creep.store.getFreeCapacity() === 0 || 
            targetDroppedResources.length + targetTombStones.length == 0)){
            creep.memory.signals.storing = true
            creep.memory.hasPickUp = false
        }
        if ((!creep.memory.signals.storing && targetDroppedResources.length + targetTombStones.length > 0 && creep.store.getFreeCapacity() > 0) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            let targetPickUpObject = undefined
            if (targetTombStones.length > 0){
                targetPickUpObject = targetTombStones[0]
                if (helpFunc.creepWithdrawAll(creep.id,targetPickUpObject.id) === ERR_NOT_IN_RANGE){
                    creep.moveTo(targetPickUpObject)
                }else{
                    creep.memory.hasPickUp = true
                }
            }else if (targetDroppedResources.length > 0){
                targetPickUpObject = targetDroppedResources[0]
                if (creep.pickup(targetPickUpObject) === ERR_NOT_IN_RANGE){
                    creep.moveTo(targetPickUpObject)
                }else{
                    creep.memory.hasPickUp = true
                }
            }
        }
        return feedBack
    },
    attackBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        const targetRoom = creep.memory.targetRoom
        let feedBack = JobERR
        if (targetRoom !== roomName){
            creep.moveTo(new RoomPosition(1,1,targetRoom))
            feedBack = JobOK
        }else{
            if (!creep.memory.targetId){
                // Only considering the claiming, ignoring the mode of war
                const targetCreeps = Game.rooms[targetRoom].find(FIND_HOSTILE_CREEPS)
                const targetStructures = Game.rooms[targetRoom].find(FIND_HOSTILE_STRUCTURES)
                const targetSpawns = Game.rooms[targetRoom].find(FIND_HOSTILE_SPAWNS)
                //const targetConstructionSite = Game.rooms[targetRoom].find(FIND_HOSTILE_CONSTRUCTION_SITES)
                const targetTowers = _.filter(targetStructures,(structure)=>structure.structureType === STRUCTURE_TOWER)
                //const targetRamparts = _.filter(targetStructures,(structure)=>structure.structureType === STRUCTURE_RAMPART)
                let chosenTargetId = undefined
                if (targetTowers.length > 0){
                    chosenTargetId = targetTowers[0].id
                }else if (targetCreeps.length > 0){
                    chosenTargetId = targetCreeps[0].id
                }else if (targetSpawns.length > 0){
                    chosenTargetId = targetSpawns[0].id
                }
                creep.memory.targetId = chosenTargetId
                if (creep.memory.targetId){
                    feedBack = JobOK
                }
            }
            if (creep.memory.targetId){
                const _feedBack = creep.attack(Game.getObjectById(creep.memory.targetId))
                feedBack = JobOK
                if (_feedBack === ERR_NOT_IN_RANGE){
                    const targetObject = Game.getObjectById(creep.memory.targetId)
                    let __feedBack = creep.moveTo(targetObject)
                    if (__feedBack === ERR_NO_PATH){
                        console.log("[ATTENTION][BUG]",creep,"in the process of attacking","ERR_NO_PATH")
                    }
                }else if (_feedBack === ERR_INVALID_TARGET){
                    creep.memory.targetId = undefined
                }else{
                    feedBack = JobERR
                }
            }
        }
        return feedBack
    },
    claimBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        const targetRoom = creep.memory.targetRoom
        let feedBack = JobERR
        if (targetRoom !== roomName){
            creep.moveTo(new RoomPosition(1,1,targetRoom))
            feedBack = JobOK
        }else{
            if (creep.claimController(Game.rooms[targetRoom].controller) === ERR_NOT_IN_RANGE){
                let _feedBack = creep.moveTo(Game.rooms[targetRoom].controller)
                if (_feedBack === ERR_NO_PATH){
                    console.log("[ATTENTION][BUG]",creep,"in the process of claiming","ERR_NO_PATH")
                }
            }
            feedBack = JobOK
        }
        return feedBack
    },
    healBehavior:function(creep, absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR

        return feedBack
    },
    chargeLinkBehavior:function(creep, absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.signals.building = false
        }
        if ((Game.spawns['Origin'].memory.assess.access.is.links[roomName].from.resources && 
             creep.memory.role === "transferer" &&
             creep.memory.signals.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            let targetLink = undefined
            for (let i = 0; i < Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].resources.length;i++){
                targetLink = Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].resources[i]
                targetLink = Game.getObjectById(targetLink)
                if (targetLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0){
                    if (creep.transfer(targetLink,RESOURCE_ENERGY) === OK){
                        return feedBack
                    }
                }
            }
            feedBack = JobERR
        }
        return feedBack
    },
    ScontainerHarvestBehavior:function(creep,absolute = false){
        // Same room harvest
        const roomName = creep.room.name
        let feedBack = JobERR
        if (!helpFunc.inArr(roomName,Game.spawns['Origin'].memory.init.infoRooms.controlled)) return feedBack
        const availableContainers = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedContainers.cachedResources[roomName])
        const fullContainers = _.filter(availableContainers,(containerId)=>Game.getObjectById(containerId).store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getFreeCapacity()).sort((containerIdA,containerIdB)=>{
            return helpFunc.pos(creep.id,containerIdA) - helpFunc.pos(creep.id,containerIdB)
        })
        if ((creep.store.getFreeCapacity() === 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) !== 0) ||
            (availableContainers.length === 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) !== 0)){
            creep.memory.signals.building = true
            creep.memory.harvestContainerTarget = undefined
        }
        if (creep.memory.harvestContainerTarget &&
            (Game.getObjectById(creep.memory.harvestContainerTarget).store.getUsedCapacity() === 0||
            Game.getObjectById(creep.memory.harvestContainerTarget).room.name !== roomName)){
            creep.memory.harvestContainerTarget = undefined
        }
        if (!creep.memory.signals.building && !creep.memory.harvestContainerTarget && availableContainers.length > 0){
            if (fullContainers.length > 0){
                creep.memory.harvestContainerTarget = fullContainers[0]
            }else{
                creep.memory.harvestContainerTarget = availableContainers[0]
            }
        }
        if ((!creep.memory.signals.building &&
            creep.memory.harvestContainerTarget &&
            creep.store.getFreeCapacity() > 0) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            let _feedBack = creep.withdraw(Game.getObjectById(creep.memory.harvestContainerTarget),RESOURCE_ENERGY)
            if (_feedBack === ERR_NOT_IN_RANGE){
                helpFunc.adjacentMove(creep.id,creep.memory.harvestContainerTarget)
            }else if (_feedBack === OK && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0){
                creep.memory.signals.building = true
                creep.memory.harvestContainerTarget = undefined
            }
        }
        return feedBack
    },
    SresourceHarvestBehavior:function(creep,absolute = false){
        /* 
        Since resourceHarvest is only available in the very first stage of the exploring,
        thus, we just need to let the creep to harvest the nearest active resources.
        */
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getFreeCapacity() === 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) !== 0){
            creep.memory.signals.building = true
        }
        if (!creep.memory.signals.building && creep.store.getFreeCapacity() > 0 || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.memory.role !== "transferer") {
                let targetResource = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
                if (creep.harvest(targetResource) === ERR_NOT_IN_RANGE){
                    helpFunc.adjacentMove(creep.id,targetResource.id)
                }
            }else{
                const resource = Game.getObjectById(creep.memory.resourceId)
                const cachedContainerId = Game.spawns['Origin'].memory.init.resourceCached["resources"][roomName][creep.memory.resourceId]
                if (creep.harvest(resource) === ERR_NOT_IN_RANGE || (cachedContainerId && helpFunc.pos(creep.id,cachedContainerId) !== 0)) {
                    creep.moveTo(Game.getObjectById(cachedContainerId))
                }
            }
        }
        return feedBack
    },
    SmineralHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        const mineralType = Game.getObjectById(creep.memory.mineralId).mineralType
        let feedBack = JobERR
        if ((creep.store.getFreeCapacity()===0 && creep.store.getUsedCapacity(mineralType) !== 0) ||
            (Game.getObjectById(creep.memory.mineralId).mineralAmount === 0 && creep.store.getUsedCapacity(mineralType) !== 0)){
            creep.memory.signals.mineralTransfer = true
        }
        if ((!creep.memory.signals.mineralTransfer && Game.getObjectById(creep.memory.mineralId).mineralAmount !== 0 &&
            creep.store.getFreeCapacity() > 0) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (!creep.memory.cachedContainerId){
                creep.memory.cachedContainerId = Game.spawns['Origin'].memory.init.resourceCached["minerals"][roomName][creep.memory.mineralId]
            }
            if (creep.memory.cachedContainerId && helpFunc.pos(creep.id,creep.memory.cachedContainerId) !== 0){
                creep.moveTo(Game.getObjectById(creep.memory.cachedContainerId))
            }else{
                let _feedBack = creep.harvest(Game.getObjectById(creep.memory.mineralId))
                if (_feedBack === ERR_NOT_IN_RANGE){
                    creep.moveTo(Game.getObjectById(creep.memory.mineralId))
                }else if (_feedBack === ERR_NOT_ENOUGH_RESOURCES){
                    feedBack = JobERR
                }
            }
        }
        return feedBack
    },
    SstorageHarvestBehavior:function(creep,absolute = false){
        // Thorough beforehand test(whether there is energy remaining) is time-consuming,
        // Thus we only test the existence and test further during the execution
        const roomName = creep.room.name
        let feedBack = JobERR
        if (!helpFunc.inArr(roomName,Game.spawns['Origin'].memory.init.infoRooms.controlled)) return feedBack
        if (creep.store.getFreeCapacity() === 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) !== 0){
            creep.memory.signals.building = true
        }
        if (((Game.spawns['Origin'].memory.assess.access.is.containers[roomName].backUp === true ||
             Game.spawns['Origin'].memory.assess.access.is.storages[roomName].exists === true ||
             Game.spawns['Origin'].memory.assess.access.is.terminals[roomName] === true) &&
            !creep.memory.signals.building &&
            creep.store.getFreeCapacity() > 0) || absolute === true){
                feedBack = JobOK
        }
        if (feedBack === JobOK){
            let targetWithdrawl = undefined
            const potentialBackUpContainer = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedContainers.backUp[roomName].all)
            if (Game.spawns['Origin'].memory.assess.access.is.terminals[roomName] === true &&
                (Game.getObjectById(Game.spawns['Origin'].memory.init.access.terminals[roomName][0]).store.getUsedCapacity(RESOURCE_ENERGY) > 0 && Game.spawns['Origin'].memory.assess.access.stateLevel.economy[roomName] >= reference.assess.work.creep.harvestTerminalReservedEnergyEconomyLevel ||
                Game.getObjectById(Game.spawns['Origin'].memory.init.access.terminals[roomName][0]).store.getUsedCapacity(RESOURCE_ENERGY) > reference.market.getReservedEnergy() ) ){
                targetWithdrawl = Game.spawns['Origin'].memory.init.access.terminals[roomName][0]
                targetWithdrawl = Game.getObjectById(targetWithdrawl)
            }else if (potentialBackUpContainer.length > 0){
                targetWithdrawl = potentialBackUpContainer[0]
                targetWithdrawl = Game.getObjectById(targetWithdrawl)
            }else if (Game.spawns['Origin'].memory.assess.access.is.storages[roomName].exists === true && Game.getObjectById(Game.spawns['Origin'].memory.init.access.storages[roomName][0]).store.getUsedCapacity(RESOURCE_ENERGY) > 0){
                targetWithdrawl = Game.spawns['Origin'].memory.init.access.storages[roomName][0]
                targetWithdrawl = Game.getObjectById(targetWithdrawl)
            }
            if (targetWithdrawl === undefined) {
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) !== 0){
                    creep.memory.signals.building = true
                }
                feedBack = JobERR
            }else{
                if (creep.withdraw(targetWithdrawl,RESOURCE_ENERGY) === ERR_NOT_IN_RANGE){
                    creep.moveTo(targetWithdrawl)
                }
            }
        }
        return feedBack
    },
    SlinkUpdateHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (!helpFunc.inArr(roomName,Game.spawns['Origin'].memory.init.infoRooms.controlled)) return feedBack
        let LinksUpdate = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedLinks.emitTo[roomName].upgrade)
        if ((creep.store.getFreeCapacity() === 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) ||
        (Game.spawns['Origin'].memory.assess.access.is.links[roomName].to.upgrade === true && 
         Game.spawns['Origin'].memory.assess.access.is.links[roomName].from.resources === true && LinksUpdate.length === 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0)){
            creep.memory.signals.building = true
        }
        if ((LinksUpdate.length > 0 && !creep.memory.signals.building && creep.store.getFreeCapacity() > 0) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            const _link = Game.getObjectById(LinksUpdate[0])
            if (creep.withdraw(_link,RESOURCE_ENERGY)===ERR_NOT_IN_RANGE){
                helpFunc.adjacentMove(creep.id,LinksUpdate[0])
            }
        }
        return feedBack
    },
    SlinkStorageHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (!helpFunc.inArr(roomName,Game.spawns['Origin'].memory.init.infoRooms.controlled)) return feedBack
        const LinksBackUp = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedLinks.emitTo[roomName].backUp)
        if ((creep.store.getFreeCapacity() === 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) ||
            (Game.spawns['Origin'].memory.assess.access.is.links[roomName].to.backUp === true && 
            Game.spawns['Origin'].memory.assess.access.is.links[roomName].from.resources === true && LinksBackUp.length === 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0)){
            creep.memory.signals.building = true
        }
        if ((LinksBackUp.length > 0 && !creep.memory.signals.building && creep.store.getFreeCapacity() > 0) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.harvest(Game.getObjectById(LinksBackUp[0])) === ERR_NOT_IN_RANGE){
                helpFunc.adjacentMove(creep.id,LinksBackUp[0])
            }
        }
        return feedBack
    },
    SmineralContainerHarvestBehavior:function(creep, absolute = false){
        // new memory
        // memory.iftransfering to ensure the creep begins to transfer only when the container is full
        // Only consider the single mineral case
        const roomName = creep.room.name
        const cachedContainer = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedContainers.cachedMinerals[roomName])
        const mineralType = Game.getObjectById(Game.spawns['Origin'].memory.init.access.minerals[roomName][0]).mineralType
        const mineralAmount = Game.getObjectById(Game.spawns['Origin'].memory.init.access.minerals[roomName][0]).mineralAmount
        let feedBack = JobERR
        if ((cachedContainer.length === 0 && creep.store.getUsedCapacity(mineralType) !== 0) || 
            (creep.store.getFreeCapacity() === 0 && creep.store.getUsedCapacity(mineralType) !== 0)){
            creep.memory.signals.mineralTransfer = true
        }
        if (!creep.memory.iftransfering &&
            (cachedContainer.length > 0 && (
                Game.getObjectById(cachedContainer[0]).store.getFreeCapacity() === 0 ||
                mineralAmount === 0 ) ) ){
            creep.memory.iftransfering = true
        }
        if ((Game.spawns['Origin'].memory.assess.access.is.containers[roomName].cached.minerals === true &&
        creep.memory.iftransfering && !creep.memory.signals.mineralTransfer &&
        creep.store.getFreeCapacity() > 0 && cachedContainer.length > 0) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            const _feedBack = helpFunc.creepWithdrawAll(creep.id,cachedContainer[0])
            if (_feedBack === ERR_NOT_IN_RANGE){
                helpFunc.adjacentMove(creep.id,cachedContainer[0])
            }else if (_feedBack === OK && Game.getObjectById(cachedContainer[0]).store.getUsedCapacity() === 0){
                creep.memory.iftransfering = false
                feedBack = JobERR
            }
        }
        return feedBack
    },
    ScompoundLabRetrieveBehavior:function(creep,absolute = false){
        // filter Task
        const roomName = creep.memory.home
        let feedBack = JobERR
        if (creep.memory.targetResource === undefined && 
            Game.spawns['Origin'].memory.assess.access.minerals[roomName].neededTransfer.length > 0){
            creep.memory.targetResource = Game.spawns['Origin'].memory.assess.access.minerals[roomName].neededTransfer.pop()
        }
        if (creep.memory.targetResource && creep.memory.targetRetrieve && 
            Game.getObjectById(creep.memory.targetRetrieve).store.getUsedCapacity(creep.memory.targetResource[0]) == 0){
            creep.memory.targetRetrieve = undefined
        }
        if (!creep.memory.signals.labTransfer && creep.memory.targetResource && creep.store.getUsedCapacity(creep.memory.targetResource[0]) > 0 &&
            (creep.store.getFreeCapacity() === 0 || creep.memory.targetResource[1] === 0)){
                creep.memory.signals.labTransfer = true
        }
        if ((creep.memory.targetResource !== undefined &&
             !creep.memory.signals.labTransfer &&
             creep.store.getFreeCapacity() > 0) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.memory.targetRetrieve === undefined){
                const mineralType = Game.getObjectById(Game.spawns['Origin'].memory.init.access.minerals[roomName][0]).mineralType
                if (Game.spawns['Origin'].memory.init.infoCompounds[roomName][creep.memory.targetResource[0]].terminal > 0 && creep.memory.targetResource[0] !== mineralType){
                    creep.memory.targetRetrieve = Game.spawns['Origin'].memory.init.access.terminals[roomName][0]
                }else if (Game.spawns['Origin'].memory.init.infoCompounds[roomName][creep.memory.targetResource[0]].storage > 0){
                    creep.memory.targetRetrieve = Game.spawns['Origin'].memory.init.access.storages[roomName][0]
                }else{
                    feedBack = JobERR
                }
            }
            if (creep.memory.targetRetrieve){
                const targetObject = Game.getObjectById(creep.memory.targetRetrieve)
                const retrieveNum = Math.min(creep.store.getFreeCapacity(),creep.memory.targetResource[1],targetObject.store.getUsedCapacity(creep.memory.targetResource[0]))
                if (retrieveNum == 0){
                    feedBack = JobERR
                }else{
                    let _feedBack = creep.withdraw(targetObject,creep.memory.targetResource[0],retrieveNum)
                    if (_feedBack === ERR_NOT_IN_RANGE){
                        creep.moveTo(targetObject)
                    }else if (_feedBack === OK){
                        creep.memory.targetResource[1] = creep.memory.targetResource[1] - retrieveNum
                    }
                }
            }
        }
        return feedBack
    },
    compoundLabTransferBehavior:function(creep, absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.memory.targetResource === undefined 
            || creep.store.getUsedCapacity(creep.memory.targetResource[0]) === 0){
            creep.memory.signals.labTransfer = false
            creep.memory.targetResource = undefined
            creep.memory.targetLab = undefined
        }
        if (creep.memory.signals.labTransfer || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (!creep.memory.targetLab){
                if (Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName].indexOf(creep.memory.targetResource[0]) !== -1 && 
                    Game.getObjectById(Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"][creep.memory.targetResource[0]][0]).store.getFreeCapacity(creep.memory.targetResource[0]) > 0){
                        creep.memory.targetLab = Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"][creep.memory.targetResource[0]][0]
                }else if (Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"]["vacant"].length > 0){
                    creep.memory.targetLab = Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"]["vacant"][0]
                }
            }
            if (creep.memory.targetLab){
                let _feedBack = creep.transfer(Game.getObjectById(creep.memory.targetLab),creep.memory.targetResource[0])
                if (_feedBack === ERR_NOT_IN_RANGE){
                    creep.moveTo(Game.getObjectById(creep.memory.targetLab))
                }else if (_feedBack === OK){
                    creep.memory.targetResource = undefined
                    creep.memory.targetLab = undefined
                    // delete Task
                }else if (_feedBack === ERR_FULL || _feedBack === ERR_INVALID_TARGET){
                    creep.memory.targetResource = undefined
                    creep.memory.targetLab = undefined
                    feedBack = JobERR
                }
            }else{
                creep.memory.targetResource = undefined
                feedBack = JobERR
            }
        }
        return feedBack
    },
    ScompoundMarketRetrieveBehavior:function(creep,absolute = false){
        // Function when and only when there are storage and terminal
        // Retrieve energy or goods from storage
        // Retrieve goods from lab, factory or storage
        // Transfer Order:
        // ReservedEnergy > SellingCommodities > SellingMineral > SellingEnergy > SellingCompound
        const roomName = creep.room.name
        let feedBack = JobERR
        if (!helpFunc.inArr(roomName,Game.spawns['Origin'].memory.init.infoRooms.controlled)) return feedBack
        if (!Game.spawns['Origin'].memory.assess.access.is.terminals[roomName]) return feedBack
        if (!Game.spawns['Origin'].memory.assess.access.is.storages[roomName].exists) return feedBack
        const _terminal = Game.getObjectById(Game.spawns['Origin'].memory.init.access.terminals[roomName][0])
        if (_terminal.store.getFreeCapacity() === 0) return feedBack
        if (!creep.memory.signals.marketTransfer && creep.memory.hasGoods){ // Considering it's withdraw, only needed to check whether have used capacity
            creep.memory.signals.marketTransfer = true
        }
        if ((!creep.memory.signals.marketTransfer && creep.store.getFreeCapacity() > 0) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (!creep.memory.marketTarget){
                const goodsMineralType = Game.getObjectById(Game.spawns['Origin'].memory.init.access.minerals[roomName][0]).mineralType
                const reservedEnergy = reference.market.getReservedEnergy()
                const sellingEnergy = reference.market.getReservedEnergy()
                const sellingMineral = reference.market.getSellingMineral()
                const sellingCommodities = reference.market.sell.commodities
                const sellingCompounds = reference.market.sell.compounds

                const _storage = Game.getObjectById(Game.spawns['Origin'].memory.init.access.storages[roomName][0])
                let _factory = undefined
                if (Game.spawns['Origin'].memory.assess.access.is.terminals[roomName]){
                    _factory = Game.getObjectById(Game.spawns['Origin'].memory.init.access.terminals[roomName][0])
                }

                // Reverse the writing order to overlap
                for (let i = 0; i < sellingCompounds.length;i++){
                    if (Game.spawns['Origin'].memory.init.infoCompounds[roomName][sellingCompounds[i]].lab > reference.market.storage.lab.compound){
                        creep.memory.marketTarget = [Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"][sellingCompounds[i]][0],sellingCompounds[i]]
                        break
                    }else if (Game.spawns['Origin'].memory.init.infoCompounds[roomName][sellingCompounds[i]].storage > reference.market.storage.storage.compound){
                        creep.memory.marketTarget = [_storage.id,sellingCompounds[i]]
                        break
                    }
                }
                if (_terminal.store.getUsedCapacity(RESOURCE_ENERGY) <= (reservedEnergy + sellingEnergy)){
                    if (Game.spawns['Origin'].memory.assess.access.stateLevel.economy[roomName] <= reference.market.storage.storage.beginEconomyLevel){
                        creep.memory.marketTarget = [_storage.id,RESOURCE_ENERGY]
                    }
                }
                if (_terminal.store.getUsedCapacity(goodsMineralType) <= sellingMineral){
                    if (_storage.store.getUsedCapacity(goodsMineralType) > reference.market.storage.storage.mineral){
                        creep.memory.marketTarget = [_storage.id,goodsMineralType]
                    }
                }
                for (let i = 0; i < sellingCommodities.length; i++){
                    // Only check the storage(2nd) and factory(1st)
                    if (_factory){
                        if (_factory.store.getUsedCapacity(sellingCommodities[i]) > 0){
                            creep.memory.marketTarget=[_factory.id,sellingCommodities[i]]
                            break
                        }
                    }else{
                        if (_storage.store.getUsedCapacity(sellingCommodities[i]) > 0){
                            creep.memory.marketTarget=[_factory.id,sellingCommodities[i]]
                            break
                        }
                    }
                }
                if (_terminal.store.getUsedCapacity(RESOURCE_ENERGY) <= reservedEnergy){
                    if (Game.spawns['Origin'].memory.assess.access.stateLevel.economy[roomName] <= reference.market.storage.storage.beginEconomyLevel){
                        creep.memory.marketTarget = [_storage.id,RESOURCE_ENERGY]
                    }
                }
            }
            if (creep.memory.marketTarget){
                const _feedBack = creep.withdraw(Game.getObjectById(creep.memory.marketTarget[0]),creep.memory.marketTarget[1])
                if (_feedBack === ERR_NOT_IN_RANGE){
                    creep.moveTo(Game.getObjectById(creep.memory.marketTarget[0]))
                }else if (_feedBack === ERR_NOT_ENOUGH_RESOURCES){
                    creep.memory.marketTarget = undefined
                }else if (_feedBack === OK){
                    creep.memory.hasGoods = true
                }
            }
            if (!creep.memory.marketTarget){
                feedBack = JobERR
            }
            
        }
        return feedBack
    },
    compoundMarketTransferBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (!helpFunc.inArr(roomName,Game.spawns['Origin'].memory.init.infoRooms.controlled)) return feedBack
        if (!Game.spawns['Origin'].memory.assess.access.is.terminals[roomName]) return feedBack
        const _terminal = Game.getObjectById(Game.spawns['Origin'].memory.init.access.terminals[roomName][0])
        if (!creep.memory.hasGoods && creep.memory.signals.marketTransfer){
            creep.memory.signals.marketTransfer = false
            creep.memory.marketTarget = undefined
        }
        if ((creep.memory.hasGoods && creep.memory.marketTarget) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            const _feedBack = creep.transfer(_terminal,creep.memory.marketTarget[1])
            if (_feedBack === ERR_NOT_IN_RANGE){
                creep.moveTo(_terminal)
            }else if (_feedBack === OK){
                creep.memory.hasGoods = false
                creep.memory.signals.marketTransfer = false
                creep.memory.marketTarget = undefined
            }else if (_feedBack === ERR_FULL){
                feedBack = JobERR
            }else if (_feedBack === ERR_NOT_ENOUGH_RESOURCES){
                creep.memory.hasGoods = false
                creep.memory.signals.marketTransfer = false
                creep.memory.marketTarget = undefined
                feedBack = JobERR
            }
        }
        return feedBack
    },
    ScompoundFactoryRetrieveBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        return feedBack
    },
    compoundFactoryTransferBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        return feedBack
    },
    chargePowerBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        return feedBack
    },
    SexhuastLabBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (!creep.memory.signals.labExhaust && creep.memory.labExhaustMineralType &&
            creep.store.getUsedCapacity(creep.memory.labExhaustMineralType) > 0 &&
            (creep.store.getFreeCapacity() === 0 ||
            Game.getObjectById(creep.memory.targetLabExhaust).store.getUsedCapacity(creep.memory.labExhaustMineralType) === 0)){
                creep.memory.signals.labExhaust = true
                if (Game.getObjectById(creep.memory.targetLabExhaust).store.getUsedCapacity(creep.memory.labExhaustMineralType) === 0){
                    creep.memory.targetLabExhaust = undefined
                    creep.memory.labExhaustMineralType = undefined
                }
        }
        if ((!creep.memory.signals.labExhaust && creep.store.getFreeCapacity() > 0 && Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"]["neededExhaust"].length > 0) ||
            absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (!creep.memory.targetLabExhaust){
                creep.memory.labExhaustMineralType = Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"]["neededExhaust"][0]
                creep.memory.targetLabExhaust = Game.spawns['Origin'].memory.assess.access.structures[roomName]["usableLabs"][creep.memory.labExhaustMineralType][0]
            }
            if (creep.memory.targetLabExhaust){
                const _feedBack = creep.withdraw(Game.getObjectById(creep.memory.targetLabExhaust),creep.memory.labExhaustMineralType)
                if (_feedBack === ERR_NOT_IN_RANGE){
                    creep.moveTo(Game.getObjectById(creep.memory.targetLabExhaust))
                }
            }
            if (!creep.memory.targetLabExhaust){
                feedBack = JobERR
            }
        }
        return feedBack
    },
    run:function(object, type = 'creep'){
        let roomName = undefined
        let role = undefined
        let taskList = []
        let _workModeName = undefined
        let signalResponded = undefined

        if (type === 'creep'){ // Case 1: creep
            // Init the memory
            if (!object.memory.bodyParts){
                helpFunc.getCreepBody(object)
            }
            if (object.memory.signals === undefined){
                object.memory.signals = {}
            }
            // Prepare the boosts
            let __feedBack = JobERR //this.creepCachedMove(object)
            let _feedBack = this.prepareCreep(object)
            if (_feedBack === JobOK || __feedBack === JobOK){
                return OK
            }
            // Collect basic info
            roomName = object.memory.home
            role = object.memory.role
            signalResponded = _isCreepSignalRespond(object)
        }else if (type === 'tower'){ // Case 2: structure
            roomName = object.room.name 
            role = object.structureType
        }
        for (let i = 0; i < reference.work.standard.standardNum; ++i){
            if (eval(reference.work.standard[i.toString()].standard)){
                if (reference.work[reference.work.standard[i.toString()].call].hasOwnProperty(role)){
                    _workModeName = reference.work.standard[i.toString()].call
                    taskList = helpFunc.getCreepTasks(object,reference.work[reference.work.standard[i.toString()].call][role],roomName)
                }
            }
        }
        for (let i = 0; i < taskList.length; ++i){
            if (taskList[i][0] === 'S' && 
                type === 'creep' && 
                signalResponded === false && 
                i < taskList.length - 1){
                continue
            }
            const taskFunc = this[taskList[i] + "Behavior"]
            let feedBack = 0
            if (i == (taskList.length-1)){
                feedBack = taskFunc(object,true)
            }else{
                feedBack = taskFunc(object)
            }
            if (feedBack === JobOK) {
                console.log("           Role:",role,"CPU:",Game.cpu.getUsed(),"WorkMode:",_workModeName," ERRTask: ",taskList.slice(0,i)," OKTask:",taskList[i])
                break
            }
            //console.log("   After running task",taskList[i],"the CPU usage is",Game.cpu.getUsed())
        }
        return OK;
    }
}
module.exports = roleJob 

