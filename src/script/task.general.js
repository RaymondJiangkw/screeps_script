const helpFunc = require('func')
const reference = require('reference')
const task = {
    // Task
    // common Property
    // working::int 0 unretrieved; -1 finished; 1 working
    // Game.spawns['Origin'].memory.task.transfer.[terminal > powerSpawn > lab > factory > nuker > storage > container]
    // Specific task: .type.[amount,working]    retrieved as [target,type,amount]
    searchTransferTask:function(roomName,taskType,target,type){
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
        if (!this.searchTransferTask(roomName,"transfer",target,type)){
            Game.spawns['Origin'].memory.task.transfer[target][roomName][type] = {
                amount:num,
                working:0
            }
        }
    },
    renewTransfer:function(roomName,target,type,newNum){
        if (!Game.spawns['Origin'].memory.task.transfer[target][roomName]) Game.spawns['Origin'].memory.task.transfer[target][roomName] = {}
        if (this.searchTransferTask(roomName,"transfer",target,type)){
            Game.spawns['Origin'].memory.task.transfer[target][roomName][type] = {
                amount:newNum,
                working:0
            }
        }
    },
    getTransferTask:function(roomName,taskType){
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
    },
    addQueue:function(type,roomName,settings = [],options = [],data = []){
        if (!Game.spawns['Origin'].memory.task[type]) Game.spawns['Origin'].memory.task[type] = {}
        if (!Game.spawns['Origin'].memory.task[type][roomName]) {
            let _taskPrototype = {
                id:"placeholder",
                target:undefined,
                targetPos:undefined,
                settings:{},
                options:{},
                data:{}
            }
            for (const key of settings){
                _taskPrototype.settings[key] = undefined
            }
            for (const key of options){
                _taskPrototype.options[key] = undefined
            }
            for (const key of data){
                _taskPrototype.data[key] = undefined
            }
            Game.spawns['Origin'].memory.task[type][roomName] = {
                taskList:[_taskPrototype],
                ptr:0
            }
        }
    },
    searchTravel:function(roomName,targetRoomName,structureType,resourceType){
        if (!Game.spawns['Origin'].memory.task['travel']) return false
        if (!Game.spawns['Origin'].memory.task['travel'][roomName]) return false
        for (const task of Game.spawns['Origin'].memory.task['travel'][roomName].taskList) {
            if (task.data.structureType === structureType && task.data.resourceType === resourceType &&
                task.settings.targetRoom === targetRoomName){
                return true
            }
        }
        return false
    },
    addTravel:function(roomName,targetRoomName,structureType,resourceType,stopAmount){
        this.addQueue('travel',roomName,["targetRoom","stopAmount"],[],["structureType","resourceType"])
        if (!this.searchTravel(roomName,targetRoomName,structureType,resourceType)){
            Game.spawns['Origin'].memory.task["travel"][roomName].taskList.push({
                id:helpFunc.gRandomSHA1(),
                target:undefined,
                targetPos:undefined,
                settings:{
                    "targetRoom":targetRoomName,
                    "stopAmount":stopAmount,
                },
                options:{},
                data:{
                    "structureType":structureType,
                    "resourceType":resourceType,
                }
            })
            return true
        }
        return false
    },
    searchSpawn:function(roomName,role){
        if (!Game.spawns['Origin'].memory.task['spawn']) return false
        if (!Game.spawns['Origin'].memory.task['spawn'][roomName]) return false
        for (const task of Game.spawns['Origin'].memory.task['spawn'][roomName].taskList) {
            if (task.data.role === role) {
                return true
            }
        }
        return false
    },
    addSpawn:function(roomName,role,components,_memory = {}){
        this.addQueue('spawn',roomName,[],[],["role","components","_memory"])
        if (!this.searchSpawn(roomName,role)){
            Game.spawns['Origin'].memory.task["spawn"][roomName].taskList.push({
                id:helpFunc.gRandomSHA1(),
                target:undefined,
                targetPos:undefined,
                settings:{},
                options:{},
                data:{
                    "role":role,
                    "components":components,
                    "_memory":_memory
                }
            })
            return true
        }
        return false
    },
    checkTask:function(taskType,roomName){
        if (!Game.spawns['Origin'].memory.task[taskType]) return undefined
        if (!Game.spawns['Origin'].memory.task[taskType][roomName]) return undefined
        return true
    },
    searchTask:function(taskType,roomName,id,pos = undefined){
        if (!this.checkTask(taskType,roomName)) return undefined
        if (pos === undefined) pos = Game.spawns['Origin'].memory.task[taskType][roomName].ptr
        for (let i = pos; i >= 0;i--){
            if (Game.spawns['Origin'].memory.task[taskType][roomName].taskList[i].id === id){
                return i
            }
        }
        return undefined
    },
    finishTask:function(taskType,roomName,id,pos = undefined){
        if (!this.checkTask(taskType,roomName)) return undefined
        if (pos === undefined) pos = Game.spawns['Origin'].memory.task[taskType][roomName].ptr
        for (let i = pos; i >= 0;i--){
            if (Game.spawns['Origin'].memory.task[taskType][roomName].taskList[i].id === id){
                Game.spawns['Origin'].memory.task[taskType][roomName].taskList.splice(i,1)
                Game.spawns['Origin'].memory.task[taskType][roomName].ptr--
            }
        }
    },
    renewTask:function(taskType,roomName,id,_pos = undefined){
        if (!this.checkTask(taskType,roomName)) return undefined
        const pos = this.searchTask(taskType,roomName,id,_pos)
        if (pos === undefined) return undefined
        let copiedObject = JSON.parse(JSON.stringify(Game.spawns['Origin'].memory.task[taskType][roomName].taskList[pos]))
        Game.spawns['Origin'].memory.task[taskType][roomName].taskList.push(copiedObject)
        this.finishTask(taskType,roomName,id,pos)
    },
    getTask:function(taskType,roomName){
        if (!this.checkTask(taskType,roomName)) return undefined
        if (Game.spawns['Origin'].memory.task[taskType][roomName].taskList.length <= Game.spawns['Origin'].memory.task[taskType][roomName].ptr + 1) return undefined
        Game.spawns['Origin'].memory.task[taskType][roomName].ptr++;
        return [Game.spawns['Origin'].memory.task[taskType][roomName].taskList[Game.spawns['Origin'].memory.task[taskType][roomName].ptr].id,Game.spawns['Origin'].memory.task[taskType][roomName].ptr]
    }
}
module.exports = task;