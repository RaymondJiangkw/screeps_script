const utils = require('utils')
module.exports = function() {
    if (!global.task.build) global.task.build = {}
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].buildTargets.length > 0) Game.rooms[roomName].AddBuildTask("build")
    }
    for (var roomName of global.rooms.observed){
        if (Game.rooms[roomName].controller && Game.rooms[roomName].owner) continue
        if (!global.task.build[roomName]) global.task.build[roomName] = []
        var home = utils.getClosetSuitableRoom(roomName,7)
        const constructionSites = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES)
        for (var constructionSite of constructionSites){
            if (global.task.build[roomName].find(constructionSite.id)) continue
            Game.rooms[home].AddBuildTask(constructionSite.id,constructionSite.pos)
            global.task.build[roomName].push(constructionSite.id)
        }
    }
}