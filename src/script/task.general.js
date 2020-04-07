const task = {
    // Task
    // common Property
    // working::int 0 unretrieved; -1 finished; 1 working
    // Game.spawns['Origin'].memory.task.transfer.[terminal > powerSpawn > lab > factory > nuker > storage > container]
    // Specific task: .type.[amount,working]    retrieved as [target,type,amount]
    searchTask:function(roomName,taskType,target,type){
        if (!Game.spawns['Origin'].memory.task[taskType]) return false
        if (!Game.spawns['Origin'].memory.task[taskType][target]) return false
        if (!Game.spawns['Origin'].memory.task[taskType][target][roomName]) return false
        if (!Game.spawns['Origin'].memory.task[taskType][target][roomName][type]) return false
        if (Game.spawns['Origin'].memory.task[taskType][target][roomName][type]["working"] == -1) return false
        return true;
    },
    addTransfer:function(roomName,target,type,num){
        //target :: string to be understood by creep
        if (!Game.spawns['Origin'].memory.task.transfer[target][roomName]) Game.spawns['Origin'].memory.task.transfer[target][roomName] = {}
        if (!this.searchTask(roomName,"transfer",target,type)){
            Game.spawns['Origin'].memory.task.transfer[target][roomName][type] = {
                amount:num,
                working:0
            }
        }
    },
    renewTransfer:function(roomName,target,type,newNum){
        if (!Game.spawns['Origin'].memory.task.transfer[target][roomName]) Game.spawns['Origin'].memory.task.transfer[target][roomName] = {}
        if (this.searchTask(roomName,"transfer",target,type)){
            Game.spawns['Origin'].memory.task.transfer[target][roomName][type] = {
                amount:newNum,
                working:0
            }
        }
    },
    getTask:function(roomName,taskType){
        if (!Game.spawns['Origin'].memory.task[taskType]) return null
        if (taskType == 'transfer'){
            const order = ["terminal","powerSpawn","lab","factory","nuker","storage","container"]
            for (let _ = 0; _ < order.length;_++){
                for (let type in Game.spawns['Origin'].memory.task["transfer"][order[_]][roomName]){
                    if (Game.spawns['Origin'].memory.task["transfer"][order[_]][roomName][type].working == 0){
                        Game.spawns['Origin'].memory.task["transfer"][order[_]][roomName][type].working = 1
                        return [order[_],type,Game.spawns['Origin'].memory.task["transfer"][order[_]][roomName][type].amount]
                    }
                }
            }
        }
        return null
    },
    finishTransferTask:function(roomName,target,type){
        delete Game.spawns['Origin'].memory.task.transfer[target][roomName][type];
    },
    deleteTransferTask:function(roomName,target,type){
        this.finishTransferTask(roomName,target,type)
    }
}
module.exports = task;