const helpFunc = require('func')
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
    ramparts:{},
    all:{
        /*
        neededRepair:
        */
    }
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
    resources.available[roomName].ratio = resources.available[roomName].available / resources.available[roomName].fullCapacity
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
    resources.backUp[roomName].ratio = resources.backUp[roomName].available / resources.backUp[roomName].fullCapacity
}
const getMarketInfo = function(roomName) {

}
const initFunction = function() {
    const controlledRooms = Object.values(Game.rooms).filter(room => room.controller.my)
    for (let i = 0; i < controlledRooms.length; i++){
        const roomName = controlledRooms[i].name
        initModule.resources[roomName] = Game.rooms[roomName].find(FIND_SOURCES).map(helpFunc.getId)
        initModule.minerals[roomName] = Game.rooms[roomName].find(FIND_MINERALS).map(helpFunc.getId)
        initModule.creeps[roomName] = _.filter(Game.creeps,(creep)=>{
            return creep.memory.home === roomName
        }).map(helpFunc.getId) 
        initModule.enemies[roomName] = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).map(helpFunc.getId)
        initModule.controllers[roomName] = {}
        initModule.controllers[roomName]["id"] = Game.rooms[roomName].controller.id
        initModule.controllers[roomName]["level"] = Game.rooms[roomName].controller.level
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
        initModule.all[roomName] = {}
        initModule.all[roomName]["neededRepair"] = _.filter(allStructures,(structure)=>helpFunc.getHitRatio(structure.id) < 1).map(helpFunc.getId)
        groupFunction(roomName)
        getInfo(roomName)
    }
}
module.exports = {
    init:initFunction,
    access: initModule,
    groupedContainers: containers,
    groupedLinks: links,
    infoResources:resources,
    infoMarket:getMarketInfo,
    resourceCached:isCached
}
