const reference = require('reference')
const task = require('task.general')
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
const checkTask = function() {
    const taskList = reference.task
    for (let taskType in taskList) {
        for (let hostRoom in taskList[taskType]) {
            if (!helpFunc.inArr(hostRoom,Game.spawns['Origin'].memory.init.infoRooms.controlled)) continue
            for (let subTask in taskList[taskType][hostRoom]){
                const targetRoom = taskList[taskType][hostRoom][subTask]["targetRoom"]
                console.log(targetRoom)
                if (eval(taskList[taskType][hostRoom][subTask]["standard"])){
                    let _params = []
                    for (let key in taskList[taskType][hostRoom][subTask]["params"]){
                        _params.push(taskList[taskType][hostRoom][subTask]["params"][key])
                    }
                    if (task["add"+taskType](hostRoom,..._params)){
                        if (eval(taskList[taskType][hostRoom][subTask]["trigger"]["condition"])){
                            const _call = taskList[taskType][hostRoom][subTask]["trigger"]["call"]
                            forceCall(_call[1],_call[0],reference.task[_call[0]][_call[1]][_call[2]])
                        }
                    }
                }
            }
        }
    }
}
module.exports = checkTask