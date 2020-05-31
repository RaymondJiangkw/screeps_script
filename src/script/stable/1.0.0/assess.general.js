const reference = require('reference')
const helpFunc = require('func')
const assessModule = {
    stateLevel:{
        war:{},
        economy:{},
        repair:{}
    },
    is:{
        containers:{
            /*
            cached:{
                resources,
                minerals
            },
            backUp:*/
        },
        storages:{
            /*
            exists:
            neededChargeEnergy:
            storage: info about storing resources
            */
        },
        terminals:{},
        labs:{},
        factories:{},
        extractors:{},
        links:{
            /*
            from:{
                resources,
                minerals
            },
            to:{
                upgrade,
                backUp
            }
            */
        },
        powerSpawns:{},
        nukers:{},
        neededCharge:{},
        neededRepair:{},
        neededStrengthen:{}
    },
    creeps:{
        /*
            harvesters:{},
            builders:{},
            transferers:{},
            upgraders:{},
            repairers:{},
            miners:{},
            pickupers:{},
            travelers:{}
        */
    },
    structures:{
        /*
        neededCharge:{
            towers:,
            spawns:,
            extensions:,
            labs:,
            factory:,
            nuker:
        }
        neededRepair:{
            roads:,
            containers:,
            walls:,
            ramparts:,
            mainStructures:,
        }
        usableLabs:{
            `mineralType`: // with some minerals in it, for every type, there should be only one
            vacant: // with no minerals in it, thus able to perform reaction, ordered by cooldown
            neededExhaust: // storing duplicate basic minerals lab
        } 
        terminalInfo:{

        }
        */
    },
    minerals:{
        /*
        usedCompounds:[]
        neededProduce:[] // ordered, mean that the latter is relied on the former
        neededTransfer:[] // non-ordered, mean that need to transfer compounds from storage / terminal to labs
        */
    }
}
const initAssess = function() {
    let controlledRooms = Game.spawns['Origin'].memory.init.infoRooms.controlled
    for (let i = 0; i < controlledRooms.length; i++){
        const roomName = controlledRooms[i]
        console.log("   === ",roomName,"Assessment Log ","===")
        // Assess the state level
        // War
        assessModule.stateLevel.war[roomName] = helpFunc.getRank(Game.spawns['Origin'].memory.init.access.enemies[roomName].length,reference.assess.war.assessAmount)
        // Economy
        const economyAvailableRatioRank = helpFunc.getRank(Game.spawns['Origin'].memory.init.infoResources.available[roomName].ratio,reference.assess.economy.availableRatio)
        const economyBackUpRatioRank = helpFunc.getRank(Game.spawns['Origin'].memory.init.infoResources.backUp[roomName].ratio,reference.assess.economy.backUpRatio)
        const economyStorageAmountRank = helpFunc.getRank(Game.spawns['Origin'].memory.init.infoResources.storage[roomName],reference.assess.economy.storageAmount)
        assessModule.stateLevel.economy[roomName] = reference.assess.economy.assessRatio['available'] * economyAvailableRatioRank + reference.assess.economy.assessRatio['backUp'] * economyBackUpRatioRank + reference.assess.economy.assessRatio['storage'] * economyStorageAmountRank
        // Repair
        let _commonStructure = []
        let _coreStructure = []
        _commonStructure = _commonStructure.concat(Game.spawns['Origin'].memory.init.access.containers[roomName])
        _commonStructure = _commonStructure.concat(Game.spawns['Origin'].memory.init.access.roads[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.towers[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.labs[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.factories[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.terminals[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.storages[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.spawns[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.links[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.extensions[roomName])
        _coreStructure = _coreStructure.concat(Game.spawns['Origin'].memory.init.access.extractors[roomName])
        const _commonStructureHitRatio = _commonStructure.map(helpFunc.getHitRatio)
        const _coreStructureHitRatio = _coreStructure.map(helpFunc.getHitRatio)
        const _meanHitRatioCommon = helpFunc.meanArray(_commonStructureHitRatio)
        const _meanHitRatioCore = helpFunc.meanArray(_coreStructureHitRatio)
        const _minHitRatioCommon = helpFunc.minArray(_commonStructureHitRatio)
        const _minHitRatioCore = helpFunc.minArray(_coreStructureHitRatio)
        console.log("       Common Structure [Average] Hits Ratio:",_meanHitRatioCommon," Core:",_meanHitRatioCore," [Min] Common:",_minHitRatioCommon,"Core:",_minHitRatioCore)
        const commonStructureRank = helpFunc.getRank(_meanHitRatioCommon,reference.assess.repair.hitRatio)
        const coreStructureRank = helpFunc.getRank(_meanHitRatioCore,reference.assess.repair.defendnCoreRatio)
        const minCommonStructureRank = helpFunc.getRank(_minHitRatioCommon,reference.assess.repair.hitRatio)
        const minCoreStructureRank = helpFunc.getRank(_minHitRatioCore,reference.assess.repair.defendnCoreRatio)
        assessModule.stateLevel.repair[roomName] = reference.assess.repair.assessRatio['average']['structure'] * commonStructureRank + reference.assess.repair.assessRatio['average']['core'] * coreStructureRank +
                                                   reference.assess.repair.assessRatio['min']['structure'] * minCommonStructureRank + reference.assess.repair.assessRatio['min']['core'] * minCoreStructureRank
        assessModule.stateLevel.repair[roomName] = assessModule.stateLevel.repair[roomName] * reference.assess.repair.downgradeFactor[Math.ceil(assessModule.stateLevel.economy[roomName]).toString()]
        
        console.log("       Economy Level:",assessModule.stateLevel.economy[roomName]," Repair:",assessModule.stateLevel.repair[roomName]," War:",assessModule.stateLevel.war[roomName])
        
        // is
        assessModule.is.containers[roomName] = {
            cached:{
                resources:false,
                minerals:false
            },
            backUp:false
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.groupedContainers.cachedResources[roomName])){
            assessModule.is.containers[roomName].cached.resources = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.groupedContainers.cachedMinerals[roomName])){
            assessModule.is.containers[roomName].cached.minerals = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.groupedContainers.backUp[roomName].all)){
            assessModule.is.containers[roomName].backUp = true
        }
        assessModule.is.storages[roomName] = {}
        assessModule.is.storages[roomName].exists = false
        assessModule.is.storages[roomName].neededChargeEnergy = false
        assessModule.is.storages[roomName].storage = {}
        assessModule.is.terminals[roomName] = false
        assessModule.is.labs[roomName] = false
        assessModule.is.factories[roomName] = false
        assessModule.is.extractors[roomName] = false
        assessModule.is.powerSpawns[roomName] = false
        assessModule.is.nukers[roomName] = false
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.access.storages[roomName])){
            assessModule.is.storages[roomName].exists = true
            const _storage = Game.getObjectById(Game.spawns['Origin'].memory.init.access.storages[roomName][0])
            if (_storage.store.getUsedCapacity(RESOURCE_ENERGY) <= reference.assess.economy.storageAmount["0"]){
                assessModule.is.storages[roomName].neededChargeEnergy = true
            }
            for (let resourceType in _storage.store){
                assessModule.is.storages[roomName].storage[resourceType] = _storage.store.getUsedCapacity(resourceType)
            }
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.access.terminals[roomName])){
            assessModule.is.terminals[roomName] = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.access.labs[roomName])){
            assessModule.is.labs[roomName] = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.access.factories[roomName])){
            assessModule.is.factories[roomName] = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.access.extractors[roomName])){
            assessModule.is.extractors[roomName] = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.access.powerSpawns[roomName])){
            assessModule.is.powerSpawns[roomName] = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.access.nukers[roomName])){
            assessModule.is.nukers[roomName] = true
        }
        assessModule.is.links[roomName] = {
            from:{
                resources:false,
                minerals:false
            },
            to:{
                upgrade:false,
                backUp:false
            }
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].resources)){
            assessModule.is.links[roomName].from.resources = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName].minerals)){
            assessModule.is.links[roomName].from.minerals = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.groupedLinks.emitTo[roomName].upgrade)){
            assessModule.is.links[roomName].to.upgrade = true
        }
        if (helpFunc.isHave(Game.spawns['Origin'].memory.init.groupedLinks.emitTo[roomName].backUp)){
            assessModule.is.links[roomName].to.backUp = true
        }
        // creeps
        assessModule.creeps[roomName] = {
            harvesters:0,
            builders:0,
            transferers:0,
            upgraders:0,
            repairers:0,
            miners:0,
            pickupers:0,
            travelers:0
        }
        assessModule.creeps[roomName].harvesters = helpFunc.countCreeps('harvester',roomName)
        assessModule.creeps[roomName].builders = helpFunc.countCreeps('builder',roomName)
        assessModule.creeps[roomName].transferers = helpFunc.countCreeps('transferer',roomName)
        assessModule.creeps[roomName].upgraders = helpFunc.countCreeps('upgrader',roomName)
        assessModule.creeps[roomName].repairers = helpFunc.countCreeps('repairer',roomName)
        assessModule.creeps[roomName].miners = helpFunc.countCreeps('miner',roomName)
        assessModule.creeps[roomName].pickupers = helpFunc.countCreeps('pickuper',roomName)
        assessModule.creeps[roomName].travelers = helpFunc.countCreeps('traveler',roomName)
        //structures
        const neededChargeStructures = _.filter([].concat(Game.spawns['Origin'].memory.init.access.spawns[roomName],
            Game.spawns['Origin'].memory.init.access.extensions[roomName],
            Game.spawns['Origin'].memory.init.access.labs[roomName],
            Game.spawns['Origin'].memory.init.access.towers[roomName],
            Game.spawns['Origin'].memory.init.access.nukers[roomName]),(structure_id)=>Game.getObjectById(structure_id).store.getFreeCapacity(RESOURCE_ENERGY)>0)
        assessModule.structures[roomName] = {
            neededCharge:{},
            neededRepair:{}
        }
        assessModule.structures[roomName]["neededCharge"]["towers"] = _.filter(neededChargeStructures,(structure_id)=>{
            return Game.getObjectById(structure_id).structureType === STRUCTURE_TOWER && ((helpFunc.getUsedCapacity(structure_id) / helpFunc.getCapacity(structure_id)) <= reference.assess.work.tower.leastWarEnergyRatio)
        })
        assessModule.structures[roomName]["neededCharge"]["towers"].sort((towerAid,towerBid)=>{
            const towerA = Game.getObjectById(towerAid)
            const towerB = Game.getObjectById(towerBid)
            const energyA = towerA.store.getUsedCapacity(RESOURCE_ENERGY)
            const energyB = towerB.store.getUsedCapacity(RESOURCE_ENERGY)
            return energyA - energyB
        })
        assessModule.structures[roomName]["neededCharge"]["spawns"] = _.filter(neededChargeStructures,(structure_id)=>Game.getObjectById(structure_id).structureType === STRUCTURE_SPAWN)
        assessModule.structures[roomName]["neededCharge"]["extensions"] = _.filter(neededChargeStructures,(structure_id)=>Game.getObjectById(structure_id).structureType === STRUCTURE_EXTENSION)
        assessModule.structures[roomName]["neededCharge"]["labs"] = _.filter(neededChargeStructures,(structure_id)=>Game.getObjectById(structure_id).structureType === STRUCTURE_LAB)
        assessModule.structures[roomName]["neededCharge"]["factory"] = []
        if (assessModule.is.factories[roomName]){
            const _factory = Game.getObjectById(Game.spawns['Origin'].memory.init.access.factories[roomName][0])
            if (_factory.store.getUsedCapacity(RESOURCE_ENERGY) <= reference.production.factory.stored.energy){
                assessModule.structures[roomName]["neededCharge"]["factory"].push(Game.spawns['Origin'].memory.init.access.factories[roomName][0])
            }
        }
        assessModule.structures[roomName]["neededCharge"]["nuker"] = _.filter(neededChargeStructures,(structure_id)=>Game.getObjectById(structure_id).structureType === STRUCTURE_NUKER)
        assessModule.is.neededCharge[roomName] = assessModule.structures[roomName]["neededCharge"]["spawns"].length > 0 ||
                                                 assessModule.structures[roomName]["neededCharge"]["extensions"].length > 0
        
        const bearableRatio = reference.assess.repair.hitRatio[reference.assess.repair.bearableHitLevel]
        assessModule.structures[roomName]["neededRepair"]["roads"] = (_.filter(_commonStructure,(structure_id)=>Game.getObjectById(structure_id).structureType===STRUCTURE_ROAD && Game.getObjectById(structure_id).hits / Game.getObjectById(structure_id).hitsMax <= bearableRatio)).sort((structureAid,structureBid)=>{
            const structureA = Game.getObjectById(structureAid)
            const structureB = Game.getObjectById(structureBid)
            return (structureA.hits / structureA.hitsMax) - (structureB.hits / structureB.hitsMax)
        })
        assessModule.structures[roomName]["neededRepair"]["containers"] = (_.filter(_commonStructure,(structure_id)=>Game.getObjectById(structure_id).structureType===STRUCTURE_CONTAINER && Game.getObjectById(structure_id).hits / Game.getObjectById(structure_id).hitsMax <= bearableRatio)).sort((structureAid,structureBid)=>{
            const structureA = Game.getObjectById(structureAid)
            const structureB = Game.getObjectById(structureBid)
            return (structureA.hits / structureA.hitsMax) - (structureB.hits / structureB.hitsMax)
        })
        assessModule.structures[roomName]["neededRepair"]["mainStructures"] = _.filter(_coreStructure,(structure_id)=>helpFunc.getHitRatio(structure_id) < 1).sort((structureAid,structureBid)=>{
            const structureA = Game.getObjectById(structureAid).structureType
            const structureB = Game.getObjectById(structureBid).structureType
            return reference.assess.repair.structureRank[structureA] - reference.assess.repair.structureRank[structureB]
        })
        assessModule.is.neededRepair[roomName] = assessModule.structures[roomName]["neededRepair"]["roads"].length > 0 ||
                                                 assessModule.structures[roomName]["neededRepair"]["containers"].length > 0 ||
                                                 assessModule.structures[roomName]["neededRepair"]["mainStructures"].length > 0
                                                 
        assessModule.structures[roomName]["neededRepair"]["walls"] = _.filter(Game.spawns['Origin'].memory.init.access.walls[roomName],(structure_id)=>helpFunc.getHitRatio(structure_id) < reference.assess.repair.strengthenDefense.wall[Game.spawns['Origin'].memory.init.access.controllers[roomName].level.toString()]).sort((structureAid,structureBid)=>{
            const structureA = Game.getObjectById(structureAid)
            const structureB = Game.getObjectById(structureBid)
            return (structureA.hits / structureA.hitsMax) - (structureB.hits / structureB.hitsMax)
        })
        assessModule.structures[roomName]["neededRepair"]["ramparts"] = _.filter(Game.spawns['Origin'].memory.init.access.ramparts[roomName],(structure_id)=>helpFunc.getHitRatio(structure_id) < reference.assess.repair.strengthenDefense.rampart[Game.spawns['Origin'].memory.init.access.controllers[roomName].level.toString()]).sort((structureAid,structureBid)=>{
            const structureA = Game.getObjectById(structureAid)
            const structureB = Game.getObjectById(structureBid)
            return (structureA.hits / structureA.hitsMax) - (structureB.hits / structureB.hitsMax)
        })
        assessModule.is.neededStrengthen[roomName] = assessModule.structures[roomName]["neededRepair"]["walls"].length > 0 ||
                                                     assessModule.structures[roomName]["neededRepair"]["ramparts"].length > 0
        assessModule.structures[roomName]["usableLabs"] = {}
        assessModule.structures[roomName]["usableLabs"]["vacant"] = _.filter(Game.spawns['Origin'].memory.init.access.labs[roomName],(labId)=>Game.getObjectById(labId).mineralType === undefined).sort((labIdA,labIdB)=>{
            const labA = Game.getObjectById(labIdA)
            const labB = Game.getObjectById(labIdB)
            return labA.cooldown - labB.cooldown
        })
        for (let i = 0; i < Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName].length;i++){
            const ___mineralType = Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName][i]
            assessModule.structures[roomName]["usableLabs"][___mineralType] = _.filter(Game.spawns['Origin'].memory.init.access.labs[roomName],(labId)=>Game.getObjectById(labId).mineralType === ___mineralType)
        }
        assessModule.structures[roomName]["terminalInfo"] = {}
        if (assessModule.is.terminals[roomName]){
            const _terminal = Game.getObjectById(Game.spawns['Origin'].memory.init.access.terminals[roomName][0])
            for (let resourceType in _terminal.store){
                assessModule.structures[roomName]["terminalInfo"][resourceType] = _terminal.store.getUsedCapacity(resourceType)
            }
        }
        // Dealing with the minerals Only consider when the economy is quite good
        if (!Game.spawns['Origin'].memory.assess || 
            !Game.spawns['Origin'].memory.assess.access.minerals ||
            !Game.spawns['Origin'].memory.assess.access.minerals[roomName]){
            assessModule.minerals[roomName] = {neededTransfer:[],neededProduce:[],usedCompounds:[]}
        }else{
            assessModule.minerals[roomName] = {}
            assessModule.minerals[roomName].neededProduce = []
            assessModule.minerals[roomName].usedCompounds = []
            assessModule.minerals[roomName].neededTransfer = Game.spawns['Origin'].memory.assess.access.minerals[roomName].neededTransfer
        }
        const roomLevel = (Game.rooms[roomName].controller.level).toString()
        let _mineralList = []
        let resultList = []
        for (let _role in reference.production.lab.allowedCompounds[roomLevel]){
            for (let _compound in reference.production.lab.allowedCompounds[roomLevel][_role]){
                const requiredAmount = reference.production.lab.allowedCompounds[roomLevel][_role][_compound]
                _mineralList.push([_compound,requiredAmount])
            }
        }
        let ptr = 0
        let whetherRenewTransferList = false
        if (assessModule.minerals[roomName].neededTransfer.length === 0){
                whetherRenewTransferList = true
        }
        while (ptr < _mineralList.length){ // Broadth-First Search
            const _type = _mineralList[ptr][0]
            const _amount = _mineralList[ptr][1]
            const currentAmount = Game.spawns['Origin'].memory.init.infoCompounds[roomName][_type].all
            const labAmount = Game.spawns['Origin'].memory.init.infoCompounds[roomName][_type].lab
            if (_amount > 0){
                assessModule.minerals[roomName].usedCompounds.push(_type)
            }
            if (currentAmount < _amount){ // Out One
                resultList.push([_type,_amount - currentAmount])
                if (reference.production.lab.basicIngredients.indexOf(_type) === -1){ // Out 2
                    for (let j = 0; j < reference.production.lab.formula[_type].length;j++){
                        _mineralList.push([reference.production.lab.formula[_type][j],(_amount - currentAmount)])
                    }
                }
            }
            if (whetherRenewTransferList && _amount > labAmount && currentAmount > labAmount){
                assessModule.minerals[roomName].neededTransfer.push([_type,helpFunc.min(currentAmount,_amount) - labAmount])
            }
            ptr++
        }
        assessModule.minerals[roomName].neededProduce = resultList.reverse()
        if (whetherRenewTransferList){
            if (assessModule.structures[roomName]["usableLabs"]["vacant"].length === 0){
                // Can Transfer
                assessModule.minerals[roomName].neededTransfer = _.filter(assessModule.minerals[roomName].neededTransfer,(arr)=>{
                    return Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName].indexOf(arr[0])!==-1 &&
                           assessModule.structures[roomName]["usableLabs"][arr[0]] &&
                           Game.getObjectById(assessModule.structures[roomName].usableLabs[arr[0]][0]).store.getFreeCapacity(arr[0]) > 0
                })
            }else{
                // Only Occupy One Lab
                assessModule.minerals[roomName].neededTransfer = _.filter(assessModule.minerals[roomName].neededTransfer,(arr)=>{
                    return Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName].indexOf(arr[0])===-1 ||
                           (assessModule.structures[roomName]["usableLabs"][arr[0]] &&
                           Game.getObjectById(assessModule.structures[roomName].usableLabs[arr[0]][0]).store.getFreeCapacity(arr[0]) > 0)
                           
                })
            }
        }
        // Dealing with the needed to exhaust case
        assessModule.structures[roomName]["usableLabs"]["neededExhaust"] = []
        for (let i = 0; i < Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName].length;i++){
            const __mineralType = Game.spawns['Origin'].memory.init.groupedLabs.storedMineralTypes[roomName][i]
            if ((!helpFunc.inArr(__mineralType,reference.production.lab.allowedStack) && assessModule.structures[roomName]["usableLabs"][__mineralType].length > 1) ||
                !helpFunc.inArr(__mineralType,assessModule.minerals[roomName].usedCompounds) ||
                Game.getObjectById(assessModule.structures[roomName].usableLabs[__mineralType][0]).store.getUsedCapacity(__mineralType) < 5){
                assessModule.structures[roomName]["usableLabs"]["neededExhaust"].push(__mineralType)
            }
        }
    }
}
module.exports = {
    init:initAssess,
    access:assessModule
}
