const utils = require('utils')
const configTower = require('configuration.Tower')
const hitsCompare = function(objectA,objectB) {
    return objectA.hits/objectA.hitsMax - objectB.hits/objectB.hitsMax
}
module.exports = function() {
    global.rooms = {}
    global.rooms.my = _.filter(Game.rooms,(room) => room.controller && room.controller.my).map(r => r.name)
    global.rooms.reserved = _.filter(Game.rooms,(room) => utils.ownRoom(room.name) === "reserved").map(r => r.name)
    global.rooms.observed = _.filter(Game.rooms,(room) => utils.ownRoom(room.name) === "highway").map(r => r.name)

    global.links = {}
    for (var roomName of global.rooms.my) {
        global.links[roomName] = {
            resources:[],
            upgrade:[],
            charges:[],
            map:{}
        }
        var link
        for (link of Game.rooms[roomName]["links"]){
            var adjacentEnergy = utils.Adjacent(link,Game.rooms[roomName]["energys"], 2)
            var adjacentSpawn = utils.Adjacent(link,Game.rooms[roomName]["spawns"], 2)
            if (adjacentEnergy) {global.links[roomName].resources.push(link);global.links[roomName].map[adjacentEnergy] = link.id;}
            else if (adjacentSpawn) {global.links[roomName].charges.push(link);global.links[roomName].map[adjacentSpawn] = link.id;}
            else global.links[roomName].upgrade.push(link)
        }
        const usedEnergyCompare = (linkA,linkB)=>linkB.store.getUsedCapacity(RESOURCE_ENERGY) - linkA.store.getUsedCapacity(RESOURCE_ENERGY)
        global.links[roomName]["resources"].sort(usedEnergyCompare)
        global.links[roomName]["upgrade"].sort(usedEnergyCompare)
        global.links[roomName]["charges"].sort(usedEnergyCompare)
    }
    
    global.containers = {}
    for (var roomName of [].concat(global.rooms.my,global.rooms.reserved)) {
        global.containers[roomName] = {
            resources:[],
            mineral:undefined,
            map:{}
        }
        var container
        for (container of Game.rooms[roomName]["containers"]){
            var adjacentEnergy = utils.Adjacent(container,Game.rooms[roomName]["energys"])
            if (adjacentEnergy) {global.containers[roomName].resources.push(container);global.containers[roomName].map[adjacentEnergy] = container.id;}
            else if (utils.adjacent(container,Game.rooms[roomName]["mineral"])) {global.containers[roomName].mineral = container;global.containers[roomName].map[Game.rooms[roomName]["mineral"].id] = container.id;}
        }
        global.containers[roomName]["resources"].sort((containerA,containerB)=>containerB.store.getUsedCapacity() - containerA.store.getUsedCapacity())
    }

    global.resources = {}
    for (var roomName of global.rooms.my) {
        global.resources[roomName] = {}
        const storedStructure = ["labs","storage","terminal","containers","factory"]
        for (var structureName of storedStructure){
            if (structureName.charAt(structureName.length - 1) == "s"){
                for (var structure of Game.rooms[roomName][structureName]){
                    for (var resource in structure.store){
                        if (!global.resources[roomName][resource]) global.resources[roomName][resource] = {}
                        if (!global.resources[roomName][resource][structureName]) global.resources[roomName][resource][structureName] = 0
                        global.resources[roomName][resource][structureName] += structure.store.getUsedCapacity(resource)
                    }
                }
            }else{
                structure = Game.rooms[roomName][structureName]
                if (structure){
                    for (var resource in structure.store){
                        if (!global.resources[roomName][resource]) global.resources[roomName][resource] = {}
                        if (!global.resources[roomName][resource][structureName]) global.resources[roomName][resource][structureName] = 0
                        global.resources[roomName][resource][structureName] += structure.store.getUsedCapacity(resource)
                    }
                }
            }
        }
        for (var resource in global.resources[roomName]){
            global.resources[roomName][resource]["total"] = 0
            global.resources[roomName][resource]["utils"] = 0
            for (var structureName of storedStructure){
                if (global.resources[roomName][resource][structureName]) {
                    global.resources[roomName][resource]["total"] += global.resources[roomName][resource][structureName];
                    if (structureName !== "labs") global.resources[roomName][resource]["utils"] += global.resources[roomName][resource][structureName];
                }else global.resources[roomName][resource][structureName] = 0
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
            var minX = Math.min(...(Game.rooms[roomName].labs.map((object)=>object.pos.x)));
            var maxX = Math.max(...(Game.rooms[roomName].labs.map((object)=>object.pos.x)));
            var minY = Math.min(...(Game.rooms[roomName].labs.map((object)=>object.pos.y)));
            var maxY = Math.max(...(Game.rooms[roomName].labs.map((object)=>object.pos.y)));
            global.labStructures[roomName]["XGroup"].push((_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.x === minX)).map(l => l.id));
            global.labStructures[roomName]["YGroup"].push((_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.y === minY)).map(l => l.id));
            if (maxX - minX >= 3) global.labStructures[roomName]["XGroup"].push((_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.x === maxX)).map(l => l.id));
            if (maxY - minY >= 3) global.labStructures[roomName]["YGroup"].push((_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.y === maxY)).map(l => l.id));
            var minXX = minX + 1;
            var minYY = minY + 1;
            var maxXX = maxX - 1;
            var maxYY = maxY - 1;
            if (maxX - minX < 3) maxXX = maxX
            if (maxY - minY < 3) maxYY = maxY
            global.labStructures[roomName]["core"] = (_.filter(Game.rooms[roomName],(lab)=>{
                return lab.pos.x >= minXX && lab.pos.x <= maxXX && lab.pos.y >= minYY && lab.pos.y<=maxYY
            })).map(l => l.id);
        }
    }

    global.labs = {}
    for (var roomName of global.rooms.my) {
        global.labs[roomName] = {}
        var auxiliaryLabs = [].concat(global.labStructures[roomName]["XGroup"],global.labStructures[roomName]["YGroup"]);
        for (var groupLabs of auxiliaryLabs){
            for (var labId of groupLabs){
                var lab = Game.getObjectById(labId)
                var mineralType = lab.mineralType
                if (!mineralType) mineralType = "vacant"
                if (!global.labs[roomName][mineralType]) global.labs[roomName][mineralType] = []
                global.labs[roomName][mineralType].push(lab)
            }
        }
        for (var mineralType in global.labs[roomName]) {
            if (mineralType === "vacant") continue
            global.labs[roomName][mineralType].sort((labA,labB)=>labB.store.getUsedCapacity(mineralType) - labA.store.getUsedCapacity(mineralType))
        }
    }

    if (!global.towerRepairs || global.towerRepairs["_expirationTime"] <= Game.time){
        global.towerRepairs = {}
        global.towerRepairs["_expirationTime"] = Game.time + utils.getCacheExpiration()
        for (var roomName of global.rooms.my){
            if (!global.towerRepairs[roomName]) global.towerRepairs[roomName] = {}
            var roads = (_.filter(Game.rooms[roomName].roads,(road)=>road.hits/road.hitsMax <= configTower.road)).map(r => r.id);
            var containers = (_.filter(Game.rooms[roomName].containers,(container)=>container.hits/container.hitsMax <= configTower.container)).map(c => c.id);
            var roomLevel = Game.rooms[roomName].controller.level.toString()
            global.towerRepairs[roomName].common = [].concat(roads,containers)
            global.towerRepairs[roomName].ramparts = (_.filter(Game.rooms[roomName].ramparts,(rampart)=>rampart.hits/rampart.hitsMax <= configTower.rampart[roomLevel])).map(r => r.id);
            global.towerRepairs[roomName].walls = (_.filter(Game.rooms[roomName].constructedWalls,(wall)=>wall.hits/wall.hitsMax <= configTower.wall[roomLevel])).map(w => w.id);
        }
    }

    global.state = {}
    for (var roomName of global.rooms.my){
        global.state[roomName] = {}
        global.state[roomName]["economy"] = Game.rooms[roomName].energyAvailable / Game.rooms[roomName].energyCapacityAvailable
    }
}