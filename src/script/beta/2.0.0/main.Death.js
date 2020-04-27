const utils = require('utils')
module.exports = function() {
    if (!global.unexpectedDeath) global.unexpectedDeath = {}
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            if (Memory.creeps[name].taskFingerprint) {
                if (!global.unexpectedDeath[Memory.creeps[name].home]) global.unexpectedDeath[Memory.creeps[name].home] = 0
                global.unexpectedDeath[Memory.creeps[name].home]++;
                if (utils.isRolePrimary(Memory.creeps[name].group.type,Memory.creeps[name].role)) Game.rooms[Memory.creeps[name].home].renewTask(Memory.creeps[name].taskFingerprint);
                else Game.rooms[Memory.creeps[name].home].deleteTask(Memory.creeps[name].taskFingerprint)
            }
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
}