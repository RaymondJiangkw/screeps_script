const utils = require('utils')
const configTower = require('configuration.Tower')
const hitsCompare = function(objectA,objectB) {
    return objectA.hits/objectA.hitsMax - objectB.hits/objectB.hitsMax
}
module.exports = function() {
    global.rooms = {}
    global.rooms.my = _.filter(Game.rooms,(room) => room.controller && room.controller.my).map(r => r.name)
    global.rooms.observed = _.filter(Game.rooms,(room) => !room.controller || !room.controller.my).map(r => r.name)

//    if (!global.links || global.links["_expirationTime"] <= Game.time) {
        var roomName
        global.links = {}
//        global.links["_expirationTime"] = Game.time + utils.getCacheExpiration()
        for (roomName of global.rooms.my) {
            global.links[roomName] = {
                resources:[],
                upgrade:[],
                charges:[],
                map:{}
            }
            var link
            for (link of Game.rooms[roomName]["links"]){
                var adjacentEnergy = utils.Adjacent(link.id,Game.rooms[roomName]["energys"].map(r => r.id),2)
                var adjacentSpawn = utils.Adjacent(link.id,Game.rooms[roomName]["spawns"].map(s => s.id))
                if (utils.adjacent(link.id,Game.rooms[roomName].controller.id,3)) global.links[roomName].upgrade.push(link)
                else if (adjacentEnergy) {global.links[roomName].resources.push(link);global.links[roomName].map[adjacentEnergy] = link.id;}
                else if (adjacentSpawn) {global.links[roomName].charges.push(link);global.links[roomName].map[adjacentSpawn] = link.id;}
            }
        }
//    }
    const usedEnergyCompare = (linkA,linkB)=>linkB.store.getUsedCapacity(RESOURCE_ENERGY) - linkA.store.getUsedCapacity(RESOURCE_ENERGY)
    global.links[roomName]["resources"].sort(usedEnergyCompare)
    global.links[roomName]["upgrade"].sort(usedEnergyCompare)
    global.links[roomName]["charges"].sort(usedEnergyCompare)

//    if (!global.containers || global.containers["_expirationTime"] <= Game.time) {
        var roomName
        global.containers = {}
//        global.containers["_expirationTime"] = Game.time + utils.getCacheExpiration()
        for (roomName of global.rooms.my) {
            global.containers[roomName] = {
                resources:[],
                mineral:undefined,
                map:{}
            }
            var container
            for (container of Game.rooms[roomName]["containers"]){
                var adjacentEnergy = utils.Adjacent(container.id,Game.rooms[roomName]["energys"].map(r => r.id))
                if (adjacentEnergy) {global.containers[roomName].resources.push(container);global.containers[roomName].map[adjacentEnergy] = container.id;}
                else if (utils.adjacent(container.id,Game.rooms[roomName]["mineral"].id)) {global.containers[roomName].mineral = container;global.containers[roomName].map[Game.rooms[roomName]["mineral"].id] = container.id;}
            }
        }
//    }
    global.containers[roomName]["resources"].sort((containerA,containerB)=>containerB.store.getUsedCapacity() - containerA.store.getUsedCapacity())

    global.labs = {}
    for (var roomName of global.rooms.my) {
        global.labs[roomName] = {}
        var lab
        for (lab of Game.rooms[roomName]["labs"]){
            var mineralType = lab.mineralType
            if (!mineralType) mineralType = "vacant"
            if (!global.labs[roomName][mineralType]) global.labs[roomName][mineralType] = []
            global.labs[roomName][mineralType].push(lab)
        }
        for (var mineralType in global.labs[roomName]) {
            if (mineralType === "vacant") continue
            global.labs[roomName][mineralType].sort((labA,labB)=>labB.store.getUsedCapacity(mineralType) - labA.store.getUsedCapacity(mineralType))
        }
    }

    global.resources = {}
    for (var roomName of global.rooms.my) {
        global.resources[roomName] = {}
        const storedStructure = ["labs","storage","terminal","containers","factory"]
        for (var structureName of storedStructure){
            if (structureName.charAt(structureName.length-1) == "s"){
                for (var structure of Game.rooms[roomName][structureName]){
                    var storedResources = Object.keys(structure.store)
                    for (var resource of storedResources){
                        if (!global.resources[roomName][resource]) global.resources[roomName][resource] = {}
                        if (!global.resources[roomName][resource][structureName]) global.resources[roomName][resource][structureName] = 0
                        global.resources[roomName][resource][structureName] += structure.store.getUsedCapacity(resource)
                    }
                }
            }else{
                structure = Game.rooms[roomName][structureName]
                if (structure){
                    var storedResources = Object.keys(structure.store)
                    for (var resource of storedResources){
                        if (!global.resources[roomName][resource]) global.resources[roomName][resource] = {}
                        if (!global.resources[roomName][resource][structureName]) global.resources[roomName][resource][structureName] = 0
                        global.resources[roomName][resource][structureName] += structure.store.getUsedCapacity(resource)
                    }
                }
            }
        }
        for (var resource in global.resources[roomName]){
            global.resources[roomName][resource]["total"] = 0
            for (var structureName of storedStructure){
                if (global.resources[roomName][resource][structureName]) global.resources[roomName][resource]["total"] += global.resources[roomName][resource][structureName]
            }
        }
    }
    if (!global.labStructures || global.labStructures["_expirationTime"] <= Game.time){
        global.labStructures = {}
        global.labStructures["_expirationTime"] = Game.time + utils.getCacheExpiration(100)
        for (var roomName of global.rooms.my){
            if (Game.rooms[roomName].labs.length === 0) continue
            global.labStructures[roomName] = {
                core:[],
                XGroup:[],
                YGroup:[]
            }
            var minX = Math.min.apply(null,Game.rooms[roomName].labs.map((object)=>object.pos.x))
            var maxX = Math.max.apply(null,Game.rooms[roomName].labs.map((object)=>object.pos.x))
            var minY = Math.min.apply(null,Game.rooms[roomName].labs.map((object)=>object.pos.y))
            var maxY = Math.max.apply(null,Game.rooms[roomName].labs.map((object)=>object.pos.y))
            global.labStructures[roomName]["XGroup"].push(_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.x === minX).map(Game.getObjectById))
            global.labStructures[roomName]["YGroup"].push(_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.y === minY).map(Game.getObjectById))
            if (maxX - minX >= 3) global.labStructures[roomName]["XGroup"].push(_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.x === maxX).map(Game.getObjectById))
            if (maxY - minY >= 3) global.labStructures[roomName]["YGroup"].push(_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.y === maxY).map(Game.getObjectById))
            var minXX = minX + 1;
            var minYY = minY + 1;
            var maxXX = maxX - 1;
            var maxYY = maxY - 1;
            if (maxX - minX < 3) maxXX = maxX
            if (maxY - minY < 3) maxYY = maxY
            global.labStructures[roomName]["core"] = _.filter(Game.rooms[roomName],(lab)=>{
                return lab.pos.x >= minXX && lab.pos.x <= maxXX && lab.pos.y >= minYY && lab.pos.y<=maxYY
            }).map(Game.getObjectById)
        }
    }
    if (!global.towerRepairs || global.towerRepairs["_expirationTime"] <= Game.time){
        global.towerRepairs = {}
        global.towerRepairs["_expirationTime"] = Game.time + utils.getCacheExpiration()
        for (var roomName of global.rooms.my){
            if (!global.towerRepairs[roomName]) global.towerRepairs[roomName] = {}
            var roads = _.filter(Game.rooms[roomName].roads,(road)=>road.hits/road.hitsMax <= configTower.road)
            var containers = _.filter(Game.rooms[roomName].containers,(container)=>container.hits/container.hitsMax <= configTower.container)
            var roomLevel = Game.rooms[roomName].controller.level.toString()
            global.towerRepairs[roomName].common = [].concat(roads,containers)
            global.towerRepairs[roomName].ramparts = _.filter(Game.rooms[roomName].ramparts,(rampart)=>rampart.hits/rampart.hitsMax <= configTower.rampart[roomLevel])
            global.towerRepairs[roomName].walls = _.filter(Game.rooms[roomName].constructedWalls,(wall)=>wall.hits/wall.hitsMax <= configTower.wall[roomLevel])
            // console.log(global.towerRepairs[roomName].walls,Game.rooms[roomName].walls)
        }
    }

    global.state = {}
    for (var roomName of global.rooms.my){
        global.state[roomName] = {}
        global.state[roomName]["economy"] = Game.rooms[roomName].energyAvailable / Game.rooms[roomName].energyCapacityAvailable
    }
}