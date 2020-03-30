const helpFunc = require('func')
const reference = require('reference')
let initModule = {
    resources:{},
    minerals:{},
    creeps:{},
    towers:{},
    enemies:{},
    controllers:{
        /*
        id:,
        level:
        */
    },
    labs:{},
    factories:{},
    terminals:{},
    containers:{},
    storages:{},
    spawns:{},
    links:{},
    extensions:{},
    roads:{},
    extractors:{},
    walls:{},
    ramparts:{}
}
let containers = {
    cachedResources:{},
    cachedMinerals:{},
    backUp:{
        /*
        available:
        all:
        */
    }
}
let links = {
    emitFrom:{
        /*
        resources:{},
        minerals:{}
        */
    },
    emitTo:{
        /*
        upgrade:{},
        backUp:{}
        */
    }
}
let resources = {
    available:{
        /*
        available:0,
        fullCapacity:0,
        ratio:0
        */
    },
    backUp:{
        /*
        available:0,
        fullCapacity:0,
        ratio:0
        */
    },
    storage:{}
}
let mineralsnCompounds = {
    /*
    `Type`:{storage:,terminal:,lab:,all:}
    */
}
let labs = {
    core:{
        /*
            adjacentRelationship: [lab1Id][lab2Id] => array of both adjacent labs
            length: in case of new Labs added
            // Recheck only when the reactionCenter is not ajacent to the other
        */
    },
    storedMineralTypes:{}
}
let isCached = {
    resources:{}, // resources -> container_id
    minerals:{}, // minerals -> container_id
    containers:{} // container_id -> resources/minerals
}
const groupFunction = function(roomName){
    isCached.containers[roomName] = {}
    isCached.resources[roomName] = {}
    containers.cachedResources[roomName] = _.filter(initModule.containers[roomName],(container_id)=>{
        for (let i = 0; i <initModule.resources[roomName].length;i++){
            if (helpFunc.adjacent(container_id,initModule.resources[roomName][i])) {
                isCached.resources[roomName][initModule.resources[roomName][i]] = container_id
                isCached.containers[roomName][container_id] = initModule.resources[roomName][i]
                return true
            }
        }
        return false
    })
    isCached.minerals[roomName] = {}
    containers.cachedMinerals[roomName] = _.filter(initModule.containers[roomName],(container_id)=>{
        for (let i = 0; i <initModule.minerals[roomName].length;i++){
            if (helpFunc.adjacent(container_id,initModule.minerals[roomName][i])) {
                isCached.minerals[roomName][initModule.minerals[roomName][i]] = container_id
                isCached.containers[roomName][container_id] = initModule.minerals[roomName][i]
                return true
            }
        }
        return false
    })
    containers.backUp[roomName] = {}
    containers.backUp[roomName].all = _.filter(initModule.containers[roomName],(container_id)=>{
        for (let i = 0; i <initModule.storages[roomName].length;i++){
            if (helpFunc.adjacent(container_id,initModule.storages[roomName][i])) {
                return true
            }
        }
        for (let i = 0; i < initModule.spawns[roomName].length;i++){
            if (helpFunc.adjacent(container_id,initModule.spawns[roomName][i])) {
                return true
            }
        }
        return false
    })
    containers.backUp[roomName].available = _.filter(containers.backUp[roomName].all,(container_id)=>{
        const container = Game.getObjectById(container_id)
        return container.store.getFreeCapacity() > 0
    })
    links.emitFrom[roomName] = {}
    links.emitTo[roomName] = {}
    links.emitFrom[roomName]['resources'] = _.filter(initModule.links[roomName],(link_id)=>{
        for (let i = 0; i < initModule.resources[roomName].length;i++){
            if (helpFunc.m_adjacent(link_id,initModule.resources[roomName][i],3) === true){
                return true
            }
        }
        return false
    })
    links.emitFrom[roomName]['resources'].sort((linkIdA,linkIdB)=>Game.getObjectById(linkIdB).store.getUsedCapacity(RESOURCE_ENERGY)-Game.getObjectById(linkIdA).store.getUsedCapacity(RESOURCE_ENERGY))
    links.emitFrom[roomName]['minerals'] = [] // Links cannot transfer minerals now
    /*links.emitFrom[roomName]['minerals'] = _.filter(initModule.links[roomName],(link_id)=>{
        for (let i = 0; i < initModule.minerals[roomName].length;i++){
            if (helpFunc.adjacent(link_id,initModule.minerals[roomName][i])){
                return true
            }
        }
        return false
    })*/
    links.emitTo[roomName]['upgrade'] = _.filter(initModule.links[roomName],(link_id)=>{
        if (helpFunc.m_adjacent(link_id,initModule.controllers[roomName].id,5) && 
        links.emitFrom[roomName]['resources'].indexOf(link_id) === -1 && links.emitFrom[roomName]['minerals'].indexOf(link_id) === -1){
            return true
        }
        return false
    })
    links.emitTo[roomName]['backUp'] = _.filter(initModule.links[roomName],(link_id)=>{
        for (let i = 0; i < initModule.storages[roomName].length;i++){
            if (helpFunc.adjacent(link_id,initModule.storages[roomName][i]) && 
        links.emitFrom[roomName]['resources'].indexOf(link_id) === -1 && links.emitFrom[roomName]['minerals'].indexOf(link_id) === -1 && links.emitTo[roomName]['upgrade'].indexOf(link_id) === -1){
                return true
            }
        }
        for (let i = 0; i < containers.backUp[roomName].length;i++){
            if (helpFunc.adjacent(link_id,containers.backUp[roomName][i]) && 
        links.emitFrom[roomName]['resources'].indexOf(link_id) === -1 && links.emitFrom[roomName]['minerals'].indexOf(link_id) === -1 && links.emitTo[roomName]['upgrade'].indexOf(link_id) === -1){
                return true
            }
        }
        return false
    })
    // Memory Cost and Save Time
    if (labs.core.hasOwnProperty(roomName) === false || labs.core[roomName].length !== initModule.labs[roomName].length){
        labs.core[roomName] = {
            adjacentRelationship:{},
            length:initModule.labs[roomName].length
        }
        let remainingLabs = [].concat(initModule.labs[roomName])
        let _adjacentLabs = {}
        for (let i = 0; i < initModule.labs[roomName].length;i++){
            _adjacentLabs[initModule.labs[roomName][i]] = []
        }
        for (let i = 0; i < initModule.labs[roomName].length;i++){
            for (let j = i + 1; j < initModule.labs[roomName].length;j++){
                if (helpFunc.square_adjacent(initModule.labs[roomName][i],initModule.labs[roomName][j]) === true){
                    _adjacentLabs[initModule.labs[roomName][i]].push(initModule.labs[roomName][j])
                    _adjacentLabs[initModule.labs[roomName][j]].push(initModule.labs[roomName][i])
                }
            }
        }
        for (let i = 0; i < initModule.labs[roomName].length;i++){
            labs.core[roomName].adjacentRelationship[initModule.labs[roomName][i]] = {}
            for (let j = 0; j <initModule.labs[roomName].length;j++){
                if (i !== j){
                    labs.core[roomName].adjacentRelationship[initModule.labs[roomName][i]][initModule.labs[roomName][j]] = _.filter(_adjacentLabs[initModule.labs[roomName][i]],(labId)=>{
                        return labId in _adjacentLabs[initModule.labs[roomName][j]]
                    })
                }
            }
        }
    }
    labs.storedMineralTypes[roomName] = []
    mineralsnCompounds[roomName] = {}
    for (let i = 0; i < initModule.labs[roomName].length;i++){
        let __mineralType = Game.getObjectById(initModule.labs[roomName][i]).mineralType
        if (__mineralType !== undefined){
            if (!mineralsnCompounds[roomName].hasOwnProperty(__mineralType)){
                mineralsnCompounds[roomName][__mineralType] = {
                    storage:0,
                    terminal:0,
                    lab:0,
                    all:0
                }
            }
            if (labs.storedMineralTypes[roomName].indexOf(__mineralType) === -1){
                labs.storedMineralTypes[roomName].push(__mineralType)
            }
            mineralsnCompounds[roomName][__mineralType].lab += Game.getObjectById(initModule.labs[roomName][i]).store.getUsedCapacity(__mineralType)
        }
    }
}
const getInfo = function(roomName) {
    resources.available[roomName] = {}
    resources.available[roomName].available = 0
    resources.available[roomName].fullCapacity = 0
    resources.available[roomName].ratio = 0
    for (let i = 0; i < initModule.extensions[roomName].length;i++){
        resources.available[roomName].available += Game.getObjectById(initModule.extensions[roomName][i]).store.getUsedCapacity(RESOURCE_ENERGY)
        resources.available[roomName].fullCapacity += Game.getObjectById(initModule.extensions[roomName][i]).store.getCapacity(RESOURCE_ENERGY)
    }
    for (let i = 0; i < initModule.spawns[roomName].length;i++){
        resources.available[roomName].available += Game.getObjectById(initModule.spawns[roomName][i]).store.getUsedCapacity(RESOURCE_ENERGY)
        resources.available[roomName].fullCapacity += Game.getObjectById(initModule.spawns[roomName][i]).store.getCapacity(RESOURCE_ENERGY)
    }
    if (resources.available[roomName].fullCapacity === 0){
        resources.available[roomName].ratio = 1
    }else{
        resources.available[roomName].ratio = resources.available[roomName].available / resources.available[roomName].fullCapacity
    }
    resources.storage[roomName] = 0
    for (let i = 0; i < initModule.storages[roomName].length;i++){
        resources.storage[roomName] += Game.getObjectById(initModule.storages[roomName][i]).store.getUsedCapacity(RESOURCE_ENERGY);
    }
    resources.backUp[roomName] = {}
    resources.backUp[roomName].available = 0
    resources.backUp[roomName].fullCapacity = 0
    resources.backUp[roomName].ratio = 0 
    for (let i = 0; i < containers.backUp[roomName].all.length;i++){
        resources.backUp[roomName].available += Game.getObjectById(containers.backUp[roomName].all[i]).store.getUsedCapacity(RESOURCE_ENERGY)
        resources.backUp[roomName].fullCapacity += Game.getObjectById(containers.backUp[roomName].all[i]).store.getCapacity(RESOURCE_ENERGY)
    }
    if (resources.backUp[roomName].fullCapacity === 0){
        resources.backUp[roomName].ratio = 1
    }else{
        resources.backUp[roomName].ratio = resources.backUp[roomName].available / resources.backUp[roomName].fullCapacity
    }
    // Dealing with mineralsnCompounds
    // mineralsnCompounds[roomName] = {} initialize at groupFunction()
    for (let i = 0; i < reference.constants.resourceList.length;i++){
        const productType = reference.constants.resourceList[i]
        if (!mineralsnCompounds[roomName].hasOwnProperty(productType)){
            mineralsnCompounds[roomName][productType] = {
                storage:0,
                terminal:0,
                lab:0,
                all:0
            }
        }
        if (initModule.storages[roomName].length > 0){
            mineralsnCompounds[roomName][productType]['storage'] = Game.getObjectById(initModule.storages[roomName][0]).store.getUsedCapacity(productType)
        }
        if (initModule.terminals[roomName].length > 0){
            mineralsnCompounds[roomName][productType]['terminal'] = Game.getObjectById(initModule.terminals[roomName][0]).store.getUsedCapacity(productType)
        }
        mineralsnCompounds[roomName][productType]['all'] = mineralsnCompounds[roomName][productType]['storage'] +
                                                           mineralsnCompounds[roomName][productType]['terminal'] +
                                                           mineralsnCompounds[roomName][productType]['lab']
    }
}
const getMarketInfo = function(roomName) {

}
const initFunction = function() {
    // Considering the case of only-need-one-time initializing
    const controlledRooms = Object.values(Game.rooms).filter(room => room.controller.my)
    for (let i = 0; i < controlledRooms.length; i++){
        const roomName = controlledRooms[i].name
        console.log("Room",roomName," begin to initialize",Game.cpu.getUsed())
        initModule.resources[roomName] = Game.rooms[roomName].find(FIND_SOURCES).map(helpFunc.getId)
        initModule.minerals[roomName] = Game.rooms[roomName].find(FIND_MINERALS).map(helpFunc.getId)
        initModule.controllers[roomName] = {}
        initModule.controllers[roomName]["id"] = Game.rooms[roomName].controller.id
        initModule.controllers[roomName]["level"] = Game.rooms[roomName].controller.level
        console.log("   Fixed assets init",Game.cpu.getUsed())
        initModule.creeps[roomName] = _.filter(Game.creeps,(creep)=>{
            return creep.memory.home === roomName
        }).map(helpFunc.getId) 
        initModule.enemies[roomName] = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).map(helpFunc.getId)
        console.log("   Creeps init",Game.cpu.getUsed())
        const allStructures = Game.rooms[roomName].find(FIND_STRUCTURES)
        initModule.towers[roomName] = _.filter(allStructures,(structure)=>structure.structureType === STRUCTURE_TOWER).map(helpFunc.getId)
        initModule.labs[roomName] = _.filter(allStructures,(structure)=>structure.structureType=== STRUCTURE_LAB).map(helpFunc.getId)
        initModule.factories[roomName] = _.filter(allStructures,(structure)=>structure.structureType === STRUCTURE_FACTORY).map(helpFunc.getId)
        initModule.terminals[roomName] = _.filter(allStructures,(structure)=>structure.structureType===STRUCTURE_TERMINAL).map(helpFunc.getId)
        initModule.containers[roomName] = _.filter(allStructures,(structure)=>structure.structureType===STRUCTURE_CONTAINER).map(helpFunc.getId)
        initModule.storages[roomName] = _.filter(allStructures,(structure)=>structure.structureType===STRUCTURE_STORAGE).map(helpFunc.getId)
        initModule.spawns[roomName] = _.filter(allStructures,(structure)=>structure.structureType === STRUCTURE_SPAWN).map(helpFunc.getId)
        initModule.links[roomName] = _.filter(allStructures,(structure)=>structure.structureType===STRUCTURE_LINK).map(helpFunc.getId)
        initModule.extensions[roomName] = _.filter(allStructures,(structure)=>structure.structureType===STRUCTURE_EXTENSION).map(helpFunc.getId)
        initModule.roads[roomName] = _.filter(allStructures,(structure)=>structure.structureType===STRUCTURE_ROAD).map(helpFunc.getId)
        initModule.extractors[roomName] = _.filter(allStructures,(structure)=>structure.structureType===STRUCTURE_EXTRACTOR).map(helpFunc.getId)
        initModule.walls[roomName] = _.filter(allStructures,(structure)=>structure.structureType === STRUCTURE_WALL).map(helpFunc.getId)
        initModule.ramparts[roomName] = _.filter(allStructures,(structure)=>structure.structureType === STRUCTURE_RAMPART).map(helpFunc.getId)
        console.log("   Structures init",Game.cpu.getUsed())
        groupFunction(roomName)
        console.log("   Group Structures init",Game.cpu.getUsed())
        getInfo(roomName)
        console.log("   Get Info init",Game.cpu.getUsed()) 
    }
}
module.exports = {
    init:initFunction,
    access: initModule,
    groupedContainers: containers,
    groupedLinks: links,
    groupedLabs: labs,
    infoResources:resources,
    infoCompounds:mineralsnCompounds,
    infoMarket:getMarketInfo,
    resourceCached:isCached
}
