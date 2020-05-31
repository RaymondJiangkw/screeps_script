module.exports = function() {
    var hasWaitingToSpawn = false
    var waitingSpawnPowerCreeps = []
    for (var powerCreep in Game.powerCreeps) {
        //console.log(Game.powerCreeps[powerCreep],Game.powerCreeps[powerCreep].ticksToLive)
        if (Game.powerCreeps[powerCreep].ticksToLive) Game.powerCreeps[powerCreep].run();
        //else {
        //    hasWaitingToSpawn = true
        //    waitingSpawnPowerCreeps.push(Game.powerCreeps[powerCreep])
        //    console.log(waitingSpawnPowerCreeps)
        //}
    }
    /*if (hasWaitingToSpawn){
        var ownedPowerCreepRoom = _.map(Game.powerCreeps,(p)=>p.memory.home)
        var hasPowerSpawnRoom = _.filter(global.rooms.my,(r)=>Game.rooms[r].powerSpawn)
        var differenceRoom = _.difference(hasPowerSpawnRoom,ownedPowerCreepRoom)
        for (var powerCreep of waitingSpawnPowerCreeps){
            if (differenceRoom.length > 0){
                var home = differenceRoom.shift()
                powerCreep.spawn(Game.rooms[home].powerSpawn)
            }else powerCreep.spawn(Game.rooms[_.sample(hasPowerSpawnRoom)].powerSpawn)
        }
    }*/
}