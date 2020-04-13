const reference = require('reference')
const task = require('task.general')
const passiveTask = require('reference.task')
const helpFunc = require('func')
const forceCall = function(hostRoom,taskType,_object) {
    const targetRoom = _object.targetRoom
    let _params = []
    for (let key in _object.params){
        _params.push(_object.params[key])
    }
    if (task["add"+taskType](hostRoom,..._params)) {
        if (eval(_object["trigger"]["condition"])){
            const _call = _object["trigger"]["call"]
            forceCall(_call[1],_call[0],reference.task[_call[0]][_call[1]][_call[2]])
        }
    }
}
const passiveTriggerTask = function(home,parentID,parentType,taskType,taskList) {
    if (taskType === "Spawn"){
        for (let detail of taskList){
            const role = passiveTask.Spawn[detail[0]].params.role
            const creeps = _.filter(Game.rooms[home].creeps,(creepID)=>{
                const creep = Game.getObjectById(creepID)
                return creep.memory.group && creep.memory.group.id === parentID && creep.memory.role === role
            })
            if (creeps.length < detail[1]){
                const spawnTaskInfo = passiveTask.Spawn[detail[0]]
                task.addSpawn(home,role,spawnTaskInfo.components,{acceptedTask:spawnTaskInfo.params["_memory"].acceptedTask,
                    group:{
                        type:parentType,
                        ID:parentID
                    }
            })
            }
        }
    }
}
const checkTask = function() {
    const taskList = reference.task
    // Issue new Tasks Initiative
    for (let taskType in taskList) {
        for (let hostRoom in taskList[taskType]) {
            if (!helpFunc.inArr(hostRoom,Game.spawns['Origin'].memory.init.infoRooms.controlled)) continue
            for (let subTask in taskList[taskType][hostRoom]){
                const targetRoom = taskList[taskType][hostRoom][subTask]["targetRoom"]
                let _params = []
                for (let key in taskList[taskType][hostRoom][subTask]["params"]){
                    _params.push(taskList[taskType][hostRoom][subTask]["params"][key])
                }
                if (task["search" + taskType](hostRoom,..._params)){
                    // Ensure the triggering as long as existing
                    if (eval(taskList[taskType][hostRoom][subTask]["trigger"]["condition"])){
                        const _call = taskList[taskType][hostRoom][subTask]["trigger"]["call"]
                        forceCall(_call[1],_call[0],reference.task[_call[0]][_call[1]][_call[2]])
                    }
                }else{
                    if (eval(taskList[taskType][hostRoom][subTask]["standard"])) task["add"+taskType](hostRoom,..._params)
                }
                
            }
        }
    }
    // Issue new Tasks Passive
    const observedRooms = Game.spawns['Origin'].memory.init.access.infoRooms.observed
    for (let room in observedRooms){
        let deposits = Game.rooms[room].find(FIND_DEPOSITS)
        let powerBanks = Game.rooms[room].powerBanks
        for (let deposit of deposits){
            let potentialRooms = _.filter(Game.spawns['Origin'].memory.init.access.infoRooms.controlled,(roomName)=>Game.rooms[roomName].controller.level >= reference.assess.work.creep.task.mine.hostRoomLevel)
            potentialRooms.sort((roomA,roomB)=>Game.map.getRoomLinearDistance(roomA,room) - Game.map.getRoomLinearDistance(roomB,room))
            const feedBack = task.addMine(potentialRooms[0],room,deposit.depositType,deposit.id)
            if (feedBack !== false){
                for (let triggeredTaskType in passiveTask.Mine.deposit.trigger){
                    passiveTriggerTask(potentialRooms[0],feedBack,"mine",triggeredTaskType,passiveTask.Mine.deposit.trigger[triggeredTaskType])
                }
            }
        }
    }
}
module.exports = checkTask