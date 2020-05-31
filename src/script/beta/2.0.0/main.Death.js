const utils = require('utils')
const creepConfig = require('configuration.Creep')
module.exports = function() {
    if (!global.unexpectedDeath) global.unexpectedDeath = {}
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            if (Memory.creeps[name].taskFingerprint) {
                if (!global.unexpectedDeath[Memory.creeps[name].home]) global.unexpectedDeath[Memory.creeps[name].home] = 0
                global.unexpectedDeath[Memory.creeps[name].home]++;

                const rolePrimary = utils.isRolePrimary(Memory.creeps[name].group.type,Memory.creeps[name].role)
                if (rolePrimary === true) Game.rooms[Memory.creeps[name].home].deleteTask(Memory.creeps[name].taskFingerprint);
                else {
                    var allCreeps = utils.getAllCreeps(Memory.creeps[name].home);
                    var primaryCreeps = _.filter(allCreeps,(c)=>c.memory && c.memory.group.type === Memory.creeps[name].group.type && c.memory.group.name === Memory.creeps[name].group.name && c.memory.role === rolePrimary);
                    if (primaryCreeps.length > 0) {
                        Game.rooms[Memory.creeps[name].home].AddSpawnTask(Memory.creeps[name].role,creepConfig.components[Memory.creeps[name].role],Memory.creeps[name].group.type,Memory.creeps[name].group.name,utils.getBoosts(Memory.creeps[name].role,Memory.creeps[name].group.type),Memory.creeps[name].salt);
                    }
                    Game.rooms[Memory.creeps[name].home].deleteTask(Memory.creeps[name].taskFingerprint)
                }
            }
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
}