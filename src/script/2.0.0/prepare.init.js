const utils = require('utils')
module.exports = function() {
    if (!global.rooms || global.rooms["_expirationTime"] <= Game.time) {
        global.rooms = {}
        global.rooms["_expirationTime"] = Game.time + utils.getCacheExpiration(5)
        global.rooms.observed = _.filter(Game.rooms,(room) => !room.controller || !room.controller.my).map(r => r.name)
        global.rooms.my = _.filter(Game.rooms,(room) => room.controller && room.controller.my).map(r => r.name)
    }
    if (!global.links || global.links["_expirationTime"] <= Game.time) {
        var roomName
        global.links = {}
        global.links["_expirationTime"] = Game.time + utils.getCacheExpiration()
        for (roomName of global.rooms.my) {
            global.links[roomName] = {
                resources:[],
                upgrade:[],
                charges:[]
            }
            var link
            for (link of Game.rooms[roomName]["links"]){
                if (utils.adjacent(link.id,Game.rooms[roomName].controller.id,3)) global.links[roomName].upgrade.push(link)
                else if (utils.Adjacent(link.id,Game.rooms[roomName]["energes"].map(r => r.id),2)) global.links[roomName].resources.push(link)
                else if (utils.Adjacent(link.id,Game.rooms[roomName]["spawns"].map(s => s.id))) global.links[roomName].charges.push(link)
            }
        }
    }
    if (!global.containers || global.containers["_expirationTime"] <= Game.time) {
        var roomName
        global.containers = {}
        global.containers["_expirationTime"] = Game.time + utils.getCacheExpiration()
        for (roomName of global.rooms.my) {
            global.containers[roomName] = {
                resources:[],
                mineral:undefined,
            }
        }
        var container
        for (container of Game.rooms[roomName]["containers"]){
            if (utils.Adjacent(container.id,Game.rooms[roomName]["energes"].map(r => r.id))) global.containers[roomName].resources.push(container)
            else if (utils.adjacent(container.id,Game.rooms[roomName]["mineral"].id)) global.containers[roomName].mineral = container
        }
    }
    
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
    }

    global.resources = {}
    for (var roomName of global.rooms.my) {
        global.resources[roomName] = {}
        const storedStructure = ["labs","storage","terminal","containers"]
        for (var structureName of storedStructure){
            for (var structure of Game.rooms[roomName][structureName]){
                var storedResources = Object.keys(structure.store)
                for (var resource of storedResources){
                    if (!global.resources[roomName][resource]) global.resources[roomName][resource] = {}
                    if (!global.resources[roomName][resource][structureName]) global.resources[roomName][resource][structureName] = 0
                    global.resources[roomName][resource][structureName] += structure.store.getUsedCapacity(resource)
                }
            }
        }
    }
}