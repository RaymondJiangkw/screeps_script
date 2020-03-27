const initModule = require("init.general")
const assessModule = require("assess.general")
const roleSpawn = require('role.spawn')
const roleLink = require('role.link')
const roleJob = require('role.job')
module.exports.loop = function () {
    // Prepare the information
    initModule.init()
    Game.spawns['Origin'].memory.init = {}
    Game.spawns['Origin'].memory.init.access = initModule.access
    Game.spawns['Origin'].memory.init.groupedContainers = initModule.groupedContainers
    Game.spawns['Origin'].memory.init.groupedLinks = initModule.groupedLinks
    Game.spawns['Origin'].memory.init.infoResources = initModule.infoResources
    Game.spawns['Origin'].memory.init.infoMarket = initModule.infoMarket
    Game.spawns['Origin'].memory.init.resourceCached = initModule.resourceCached
    // Init Memory
    if (Game.spawns['Origin'].memory.hasOwnProperty("resourceOccupied") === false) {
        Game.spawns['Origin'].memory["resourceOccupied"] = {}
    }
    if (Game.spawns['Origin'].memory.hasOwnProperty("mineralOccupied") === false) {
        Game.spawns['Origin'].memory['mineralOccupied'] = {}
    }
    // Assess the situation
    assessModule.init()
    Game.spawns['Origin'].memory.assess = {}
    Game.spawns['Origin'].memory.assess.access = assessModule.access
    // Clear Memory
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            // Reset the state
            const _creepRole = Memory.creeps[name].role
            if (_creepRole === 'transferer'){
                Game.spawns['Origin'].memory["resourceOccupied"][Memory.creeps[name].home][Memory.creeps[name].resourceId] = false
            }else if (_creepRole === 'miner'){
                Game.spawns['Origin'].memory["mineralOccupied"][Memory.creeps[name].home][Memory.creeps[name].mineralId] = false
            }
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    const controlledRooms = Object.values(Game.rooms).filter(room => room.controller.my)
    for (let i = 0; i < controlledRooms.length;i++){
        const roomName = controlledRooms[i].name
        // Spawn
        for (let j = 0; j < Game.spawns['Origin'].memory.init.access.spawns[roomName].length;j++){
            roleSpawn.run(Game.getObjectById(Game.spawns['Origin'].memory.init.access.spawns[roomName][j]))
        }
        // Link
        // Link can not transfer minerals now
        for (let j = 0; j < Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName]["resources"].length;j++){
            roleLink.run(Game.getObjectById(Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName]["resources"][j]),roomName)
        }
        console.log("===",roomName," Creeps & Towers Running log===")
        // Tower
        for (let j = 0; j < Game.spawns['Origin'].memory.init.access.towers[roomName].length;j++){
            roleJob.run(Game.getObjectById(Game.spawns['Origin'].memory.init.access.towers[roomName][j]),"tower")
        }
        // Creep
        for (let j = 0; j < Game.spawns['Origin'].memory.init.access.creeps[roomName].length;j++){
            roleJob.run(Game.getObjectById(Game.spawns['Origin'].memory.init.access.creeps[roomName][j]))
        }
    }
}