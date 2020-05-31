module.exports = function () {
    for (const roomName of global.info.rooms.my) {
        for (const groupType in Game.rooms[roomName].groupCreeps) {
            for (const groupName in Game.rooms[roomName].groupCreeps[groupType]) {
                if (global.creepsTask.isIdle(groupName)) {
                    
                }
            }
        }
    }
}