const reference = require("reference")
const helpFunc = require("func")
// Some absolute calls may cause errors or bugs.
// Improvements for resourceHarvest & containerHarvest::
// resource: creep.room.find
// containerHarvest: once choose, fixed, unless the transferer is died
const JobOK = 0
const JobERR = 1
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
        let allNeededStructures = _.filter(Game.spawns['Origin'].memory.init.access.all[roomName]["neededRepair"],(structure_id)=>{
            const _structure = Game.getObjectById(structure_id)
            return _structure.structureType !== STRUCTURE_WALL && _structure.structureType !== STRUCTURE_RAMPART
        })
        allNeededStructures.sort((structureA,structureB)=>{
            return helpFunc.getHitRatio(structureA.id) - helpFunc.getHitRatio(structureB.id)
        })
        if (allNeededStructures.length > 0){
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
    prepareCreep:function(creep){

    },
    chargeEnergyBehavior:function(creep,absolute = false){
        const roomName = creep.memory.home
        let feedBack = JobERR
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.building = false
        }
        if ((Game.spawns['Origin'].memory.assess.access.is.neededCharge[roomName] && creep.memory.building) || absolute === true){
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
            //console.log(creep,_feedBack,chosenStructure)
            if (_feedBack === ERR_NOT_IN_RANGE){
                creep.moveTo(chosenStructure)
            }else if (_feedBack !== OK){
                feedBack = JobERR 
            }
        }
        return feedBack
    },
    chargeLabBehavior:function(creep,absolute = false){
        const roomName = creep.room.name 
        let feedBack = JobERR
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.building = false
        }
        if ((Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["labs"].length > 0 && creep.memory.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            const chosenStructure = Game.getObjectById(Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["labs"][0])
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
        const roomName = creep.room.name
        let feedBack = JobERR
        let constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES)
        if (constructionSites.length === 0){ // Help Others to Build Spawn
            const controlledRooms = Object.values(Game.rooms).filter(room => room.controller.my)
            for (let i = 0; i < controlledRooms.length; i++){
                if (Game.spawns['Origin'].memory.init.access.spawns[controlledRooms[i].name].length === 0 || Game.rooms[controlledRooms[i].name].controller.level <= reference.assess.work.build.helpBuildControllerLevel){ // Determine whether the room has the ability to build by itself
                    constructionSites = Game.rooms[controlledRooms[i].name].find(FIND_CONSTRUCTION_SITES)
                    if (constructionSites.length !== 0){
                        break
                    }
                }
            }
        }
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.building = false
        }
        if ((constructionSites.length > 0 && creep.memory.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.build(constructionSites[0]) === ERR_NOT_IN_RANGE){
                creep.moveTo(constructionSites[0])
            }else{

            }
        }
        return feedBack
    },
    upgradeBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0){
            creep.memory.building = false
        }
        if (creep.memory.building || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.upgradeController(Game.getObjectById(Game.spawns['Origin'].memory.init.access.controllers[roomName].id)) === ERR_NOT_IN_RANGE){
                creep.moveTo(Game.getObjectById(Game.spawns['Origin'].memory.init.access.controllers[roomName].id))
            }else{

            }
        }
        return feedBack
    },
    storeBehavior:function(creep,absolute = false){
        // Need to consider the special case of miner
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getUsedCapacity() === 0){
            creep.memory.building = false
        }
        if (((Game.spawns['Origin'].memory.assess.access.is.storages[roomName].neededChargeEnergy ||
              Game.spawns['Origin'].memory.init.groupedContainers.backUp[roomName].available.length > 0 ||
              ((creep.memory.role === 'miner' || creep.memory.role === 'pickuper') &&
              Game.spawns['Origin'].memory.assess.access.is.storages[roomName].exists === true)) && // Deal with the case of storing minerals
              creep.memory.building) || absolute === true){
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
            }else{
                
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
            creep.memory.building = false
        }
        if (creep.memory.chargeTarget &&  (helpFunc.getCapacity(creep.memory.chargeTarget) - helpFunc.getUsedCapacity(creep.memory.chargeTarget) <= helpFunc.getCapacity(creep.id))){ // Loose the condition to let more towers be charged
            creep.memory.chargeTarget = undefined
        }
        if (( (Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["towers"].length > 0 ||
              creep.memory.chargeTarget ) &&
             creep.memory.building) || absolute === true){
                 feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.memory.hasOwnProperty("chargeTarget") === false ||
            creep.memory.chargeTarget === undefined){
                creep.memory.chargeTarget = Game.spawns['Origin'].memory.assess.access.structures[roomName]["neededCharge"]["towers"][0]
            }
            const _feedBack = creep.transfer(Game.getObjectById(creep.memory.chargeTarget),RESOURCE_ENERGY)
            if (_feedBack === ERR_NOT_IN_RANGE){
                creep.moveTo(Game.getObjectById(creep.memory.chargeTarget))
            }else{
                
            }
        }
        return feedBack
    },
    repairBehavior:function(object, absolute = false){
        const roomName = object.room.name
        let feedBack = JobERR
        if (object.memory && object.store.getUsedCapacity(RESOURCE_ENERGY) === 0){ //Determine its a creep
            object.memory.building = false
            object.memory.repairTarget = undefined
        }
        if ( (( (object.memory && object.memory.building) ||
               (object.structureType && object.structureType === STRUCTURE_TOWER && _isTowerEnergyEnough(object.id)) ) &&
              Game.spawns['Origin'].memory.assess.access.is.neededRepair[roomName] === true) || absolute === true) {
                feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (object.memory){ // Determine whether the subject is creep
                // For creeps, repair all structures needed to be repaired
                if (object.memory.hasOwnProperty("repairTarget") === false ||
                object.memory.repairTarget === undefined || 
                helpFunc.getHitRatio(object.memory.repairTarget) === 1){
                    object.memory.repairTarget = _getRepairObject(roomName,true)
                }
                const repairTargetObject = Game.getObjectById(object.memory.repairTarget)
                if (object.repair(repairTargetObject) === ERR_NOT_IN_RANGE){
                    object.moveTo(repairTargetObject)
                }else{

                }
            }else if (object.structureType === STRUCTURE_TOWER && _isTowerEnergyEnough(object.id) === true) {
                // For Tower, only repair structures which can't be beared
                object.repair(Game.getObjectById(_getRepairObject(roomName)))
            }
        }
        return feedBack
    },
    defendTowerBehavior:function(tower, absolute = false){
        const roomName = tower.room.name
        let feedBack = JobERR
        if ((Game.spawns['Origin'].memory.assess.access.stateLevel.war[roomName] < (helpFunc.countProperties(reference.assess.war.assessAmount)-1)) || absolute === true){
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
    pickUpBehavior:function(creep, absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR

        const targetDroppedResources = (creep.room.find(FIND_DROPPED_RESOURCES,{
            filter:(resource)=>{
                return resource.resourceType !== RESOURCE_ENERGY
            }
        })).sort((resourceA,resourceB)=>resourceB.amount - resourceA.amount)
        const targetTombStones = _.filter(creep.room.find(FIND_TOMBSTONES),(tombStone)=>tombStone.store.getUsedCapacity()!==0).sort((tombStoneA,tombStoneB)=>{
            return tombStoneB.store.getUsedCapacity() - tombStoneA.store.getUsedCapacity()
        })

        if ((creep.store.getFreeCapacity() == 0) || (targetDroppedResources.length + targetTombStones.length == 0)){
            creep.memory.building = true
        }else{
            creep.memory.building = false
        }

        if ((creep.store.getFreeCapacity() > 0 && !creep.memory.building) || absolute === true){
            feedBack = JobOK
        }

        if (feedBack === JobOK){
            let targetPickUpObject = undefined
            if (targetTombStones.length > 0){
                targetPickUpObject = targetTombStones[0]
                if (helpFunc.creepWithdrawAll(creep.id,targetPickUpObject.id) === ERR_NOT_IN_RANGE){
                    creep.moveTo(targetPickUpObject)
                }else{

                }
            }else if (targetDroppedResources.length > 0){
                targetPickUpObject = targetDroppedResources[0]
                if (creep.pickup(targetPickUpObject) === ERR_NOT_IN_RANGE){
                    creep.moveTo(targetPickUpObject)
                }else{

                }
            }
        }
        return feedBack
    },
    transferBehavior:function(creep, absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR

        return feedBack
    },
    attackBehavior:function(creep, absolute = false){
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
                const targetConstructionSite = Game.rooms[targetRoom].find(FIND_HOSTILE_CONSTRUCTION_SITES)
                const targetTowers = _.filter(targetStructures,(structure)=>structure.structureType === STRUCTURE_TOWER)
                const targetRamparts = _.filter(targetStructures,(structure)=>structure.structureType === STRUCTURE_RAMPART)
                let chosenTargetId = undefined
                if (targetTowers.length > 0){
                    chosenTargetId = targetTowers[0].id
                }else if (targetCreeps.length > 0){
                    chosenTargetId = targetCreeps[0].id
                }else if (targetSpawns.length > 0){
                    chosenTargetId = targetSpawns[0].id
                }else if (targetConstructionSite.length > 0){
                    chosenTargetId = targetConstructionSite[0].id
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
                    let __feedBack = creep.moveTo(new RoomPosition (targetObject.pos.x,targetObject.pos.y,creep.memory.targetRoom))
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
        if (creep.store.getUsedCapacity() === 0){
            creep.memory.building = false
        }
        if ((((Game.spawns['Origin'].memory.assess.access.is.links[roomName].from.resources && creep.memory.role === "transferer") ||
              (Game.spawns['Origin'].memory.assess.access.is.links[roomName].from.minerals && creep.memory.role === "miner")) &&
            creep.memory.building) || absolute === true){
                feedBack = JobOK
        }
        if (feedBack === JobOK){
            let targetLink = undefined
            // Determine the creep's role
            if (creep.memory.role === "transferer"){
                let _found = false
                for (let i = 0; i < Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].resources.length;i++){
                    if (helpFunc.adjacent(creep.id,Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].resources[i]) === true){
                        _found = true
                        targetLink = Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].resources[i]
                        targetLink = Game.getObjectById(targetLink)
                        break
                    }
                }
                if (_found === true){
                    if (targetLink.store.getFreeCapacity(RESOURCE_ENERGY) === 0){
                        feedBack = JobERR
                    }else{
                        creep.transfer(targetLink,RESOURCE_ENERGY)
                    }
                    
                }else{
                    feedBack = JobERR // Filter out the resource without a resource-link, considering the conditions of multiply links
                }
            }else if (creep.memory.role === "miner"){
                let _found = false
                for (let i = 0; i < Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].minerals.length;i++){
                    if (helpFunc.adjacent(creep.id,Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].minerals[i]) === true){
                        _found = true
                        targetLink = Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].minerals[i]
                        targetLink = Game.getObjectById(targetLink)
                        break
                    }
                }
                if (_found === true){
                    // Considering the cases of multi-minerals
                    for (let i = 0; i < Game.spawns['Origin'].memory.init.access.minerals[roomName].length;i++){
                        const mineral = Game.getObjectById(Game.spawns['Origin'].memory.init.access.minerals[roomName][i])
                        if (creep.transfer(targetLink,mineral.mineralType) === OK) {
                            break
                        }
                    }
                }else{
                    feedBack = JobERR
                }
            }
        }
        return feedBack
    },
    containerHarvestBehavior:function(creep, absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getFreeCapacity() === 0){
            creep.memory.building = true
            creep.memory.harvestContainerTarget = undefined
        }
        //console.log(roomName,creep,creep.memory.harvestContainerTarget,Game.spawns['Origin'].memory.assess.access.is.containers[roomName].cached.resources)
        if (Game.spawns['Origin'].memory.assess.access.is.containers[roomName].cached.resources === false || // Cleaning the cached memory in case of travelling through the rooms
            (creep.memory.harvestContainerTarget !== undefined && !creep.memory.harvestContainerTarget in Game.spawns['Origin'].memory.init.resourceCached.containers[roomName]) ||
            (creep.memory.harvestContainerTarget !== undefined && 
            Game.spawns['Origin'].memory.resourceOccupied[roomName][Game.spawns['Origin'].memory.init.resourceCached.containers[roomName][creep.memory.harvestContainerTarget]] === false &&
            Game.getObjectById(creep.memory.harvestContainerTarget).store.getUsedCapacity(RESOURCE_ENERGY) === 0)){
            creep.memory.harvestContainerTarget = undefined
        }
        if (!creep.memory.harvestContainerTarget){
            creep.memory.lastWaitingTime = undefined
            let availableContainers = []
            if (Game.spawns['Origin'].memory.assess.access.is.containers[roomName].cached.resources){
                availableContainers = _.filter(Game.spawns['Origin'].memory.init.groupedContainers.cachedResources[roomName],(container_id)=>{
                    const container = Game.getObjectById(container_id)
                    return container.store.getUsedCapacity(RESOURCE_ENERGY) !== 0 || Game.spawns['Origin'].memory.resourceOccupied[roomName][container_id] === true
                })
                availableContainers.sort((containerAid,containerBid)=>{
                    const containerA = Game.getObjectById(containerAid)
                    const containerB = Game.getObjectById(containerBid)
                    return containerB.store.getUsedCapacity(RESOURCE_ENERGY) - containerA.store.getUsedCapacity(RESOURCE_ENERGY)
                })
            }
            if (availableContainers.length > 0){
                creep.memory.harvestContainerTarget = availableContainers[0]
            }
        }
        if ((creep.memory.harvestContainerTarget &&
            !creep.memory.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            let _feedBack = creep.withdraw(Game.getObjectById(creep.memory.harvestContainerTarget),RESOURCE_ENERGY,creep.store.getFreeCapacity())
            if (_feedBack === ERR_NOT_IN_RANGE){
                helpFunc.adjacentMove(creep.id,creep.memory.harvestContainerTarget)
            }else if (_feedBack === ERR_NOT_ENOUGH_ENERGY){
                if (creep.memory.lastWaitingTime === undefined){
                    creep.memory.lastWaitingTime = Game.time
                }
                if (Game.time - creep.memory.lastWaitingTime >= reference.assess.work.creep.containerWaitingBearableTimeInterval){
                    creep.memory.harvestContainerTarget = undefined
                }
            }
        }
        return feedBack
    },
    resourceHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getFreeCapacity()=== 0){
            creep.memory.building = true
        }
        if ((Game.spawns['Origin'].memory.assess.access.creeps[roomName].transferers === 0 &&
             !creep.memory.building) || absolute === true){
                feedBack = JobOK
        }
        if (feedBack === JobOK){
            if (creep.memory.role !== "transferer") {
                let resourceIdArr = [].concat(Game.spawns['Origin'].memory.init.access.resources[roomName])
                resourceIdArr.sort((resourceIdA,resourceIdB)=>{
                    return helpFunc.pos(resourceIdA,creep.id) - helpFunc.pos(resourceIdB,creep.id)
                })
                if (creep.harvest(Game.getObjectById(resourceIdArr[0])) === ERR_NOT_IN_RANGE){
                    helpFunc.adjacentMove(creep.id,resourceIdArr[0])
                }else{

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
    mineralHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getFreeCapacity()===0){
            creep.memory.building = true
        }
        if ((true && creep.memory.building === false) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            let cachedContainerId = Game.spawns['Origin'].memory.init.resourceCached["minerals"][roomName][creep.memory.mineralId];
            if (cachedContainerId && helpFunc.pos(creep.id,cachedContainerId)!==0){
                creep.moveTo(Game.getObjectById(cachedContainerId))
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
    storageHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getFreeCapacity() === 0){
            creep.memory.building = true
        }
        if (((Game.spawns['Origin'].memory.assess.access.is.containers[roomName].backUp === true ||
             Game.spawns['Origin'].memory.assess.access.is.storages[roomName].exists === true) &&
            !creep.memory.building) || absolute === true){
                feedBack = JobOK
        }
        if (feedBack === JobOK){
            let targetWithdrawl = undefined
            const potentialBackUpContainer = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedContainers.backUp[roomName].all)
            if (Game.spawns['Origin'].memory.assess.access.is.containers[roomName].backUp === true && potentialBackUpContainer.length > 0){
                targetWithdrawl = potentialBackUpContainer[0]
                targetWithdrawl = Game.getObjectById(targetWithdrawl)
            }else if (Game.spawns['Origin'].memory.assess.access.is.storages[roomName].exists === true){
                if (Game.getObjectById(Game.spawns['Origin'].memory.init.access.storages[roomName][0]).store.getUsedCapacity(RESOURCE_ENERGY) > 0){
                    targetWithdrawl = Game.spawns['Origin'].memory.init.access.storages[roomName][0]
                    targetWithdrawl = Game.getObjectById(targetWithdrawl)
                }
            }
            if (targetWithdrawl === undefined) {
                feedBack = JobERR
            }else{
                if (creep.withdraw(targetWithdrawl,RESOURCE_ENERGY) === ERR_NOT_IN_RANGE){
                    creep.moveTo(targetWithdrawl)
                }else{

                }
            }
        }
        return feedBack
    },
    linkUpdateHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let LinksUpdate = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedLinks.emitTo[roomName].upgrade)
        let feedBack = JobERR
        if ((creep.store.getFreeCapacity() === 0) ||
        (Game.spawns['Origin'].memory.assess.access.is.links[roomName].from.resources === true && creep.store.getUsedCapacity() !== 0 && LinksUpdate.length === 0)){
            creep.memory.building = true
        }
        if ((Game.spawns['Origin'].memory.assess.access.is.links[roomName].to.upgrade === true &&
            LinksUpdate.length > 0 &&
            !creep.memory.building) || absolute === true){
                feedBack = JobOK
        }
        if (feedBack === JobOK){
            const _link = Game.getObjectById(LinksUpdate[0])
            if (creep.withdraw(_link,RESOURCE_ENERGY)===ERR_NOT_IN_RANGE){
                helpFunc.adjacentMove(creep.id,LinksUpdate[0])
            }else{
                
            }
        }
        return feedBack
    },
    linkStorageHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        let feedBack = JobERR
        if (creep.store.getFreeCapacity() === 0){
            creep.memory.building = true
        }
        if ((Game.spawns['Origin'].memory.assess.access.is.links[roomName].to.backUp === true &&
            !creep.memory.building) || absolute === true){
                feedBack = JobOK
        }
        if (feedBack === JobOK){
            const LinksBackUp = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedLinks.emitTo[roomName].backUp)
            if (LinksBackUp.length === 0){
                feedBack = JobERR
            }else{
                const _link = Game.getObjectById(LinksBackUp[0])
                if (creep.harvest(_link) === ERR_NOT_IN_RANGE){
                    helpFunc.adjacentMove(creep.id,LinksBackUp[0])
                }else{

                }
            }
        }
        return feedBack
    },
    mineralContainerHarvestBehavior:function(creep,absolute = false){
        const roomName = creep.room.name
        const cachedContainer = helpFunc.storeFilternSort(Game.spawns['Origin'].memory.init.groupedContainers.cachedMinerals[roomName])
        let feedBack = JobERR
        let _container = undefined
        if (creep.store.getFreeCapacity() === 0){
            creep.memory.building = true
        }
        if (cachedContainer.length > 0){
            _container = Game.getObjectById(cachedContainer[0])
            if (_container.store.getFreeCapacity() === 0){
                creep.memory.iftransfering = true
            }
        }
        if ((Game.spawns['Origin'].memory.assess.access.is.containers[roomName].cached.minerals === true &&
        creep.memory.iftransfering && !creep.memory.building) || absolute === true){
            feedBack = JobOK
        }
        if (feedBack === JobOK){
            for (let i = 0; i < Game.spawns['Origin'].memory.init.access.minerals[roomName].length;i++){
                const mineral = Game.getObjectById(Game.spawns['Origin'].memory.init.access.minerals[roomName][i])
                const _feedBack = creep.withdraw(_container,mineral.mineralType)
                if (_feedBack === OK) {
                    break
                }else if (_feedBack === ERR_NOT_IN_RANGE){
                    helpFunc.adjacentMove(creep.id,cachedContainer[0])
                    break
                }else if (_feedBack === ERR_NOT_ENOUGH_RESOURCES){
                    creep.memory.iftransfering = false
                    feedBack = JobERR
                    break
                }
            }
        }
        return feedBack
    },
    run:function(object,type = 'creep'){
        let roomName = undefined
        let role = undefined
        if (type === 'creep'){ // Case 1: creep
            this.prepareCreep(object)
            roomName = object.memory.home
            role = object.memory.role
        }else if (type === 'tower'){ // Case 2: structure
            roomName = object.room.name 
            role = object.structureType
        }
        let taskList = []
        let _workModeName = undefined
        for (let i = 0; i < reference.work.standard.standardNum; ++i){
            if (eval(reference.work.standard[i.toString()].standard)){
                if (reference.work[reference.work.standard[i.toString()].call].hasOwnProperty(role)){
                    _workModeName = reference.work.standard[i.toString()].call
                    taskList = helpFunc.getCreepTasks(object,reference.work[reference.work.standard[i.toString()].call][role],roomName)
                }
            }
        }
        for (let i = 0; i < taskList.length; ++i){
            const taskFunc = this[taskList[i] + "Behavior"]
            let feedBack = 0
            if (i == (taskList.length-1)){
                feedBack = taskFunc(object,true)
            }else{
                feedBack = taskFunc(object)
            }
            if (feedBack === JobOK) {
                console.log("Id:",object.id," Role:",role,"WorkMode:",_workModeName," ERRTask: ",taskList.slice(0,i)," OKTask:",taskList[i])
                break;
            }
        }
        return OK;
    }
}
module.exports = roleJob 

