const reference = require('reference')
const helpFunc = {
    abs:function(number){
        if (number < 0) {
            return -number
        }
        return number
    },
    max:function(a,b){
        if (a > b) {
            return a
        }else{
            return b
        }
    },
    min:function(a,b){
        if (a > b){
            return b
        }else{
            return a
        }
    },
    pos:function(_object_1_id,_object_2_id) {
        const _object_1 = Game.getObjectById(_object_1_id)
        const _object_2 = Game.getObjectById(_object_2_id)
        let x_diff = this.abs(_object_1.pos.x - _object_2.pos.x)
        let y_diff = this.abs(_object_1.pos.y - _object_2.pos.y)
        return x_diff * x_diff + y_diff * y_diff
    },
    m_pos:function(_object_1_id,_object_2_id) {
        const _object_1 = Game.getObjectById(_object_1_id)
        const _object_2 = Game.getObjectById(_object_2_id)
        let x_diff = this.abs(_object_1.pos.x - _object_2.pos.x)
        let y_diff = this.abs(_object_1.pos.y - _object_2.pos.y)
        return x_diff + y_diff
    },
    adjacent:function(_object_1_id,_object_2_id){
        if (this.pos(_object_1_id,_object_2_id) <= 2) {
            return true
        }
        return false
    },
    m_adjacent:function(_object_1_id,_object_2_id,distance = 2){
        if (this.m_pos(_object_1_id,_object_2_id) <= distance) {
            return true
        }
        return false
    },
    accumulateArray:function(_array){
        let result = 0
        for (let i = 0; i < _array.length; i++){
            result += _array[i]
        }
        return result
    },
    meanArray:function(_array){
        let sum = 0
        sum = this.accumulateArray(_array)
        return sum / _array.length
    },
    countProperties:function(_object){
        let result = 0
        for(let property in _object) {
            if (_object.hasOwnProperty(property)){
                result += 1
            }
        }
        return result
    },
    getRank:function(number,ranks){
        const rankNum = this.countProperties(ranks)
        for (let i = 0; i < rankNum;i++){
            if (number >= ranks[i.toString()]){
                return i
            }
        }
        return rankNum
    },
    getHitRatio:function(_structure_id){
        const _structure = Game.getObjectById(_structure_id)
        if (_structure !== undefined) {
            return _structure.hits / _structure.hitsMax
        }else{
            return 1
        }
    },
    getId:function(_object){
        return _object.id
    },
    isHave:function(array){
        return array.length > 0
    },
    countCreeps:function(roleName,roomName){
        const _creeps = _.filter(Game.spawns['Origin'].memory.init.access.creeps[roomName],(creep_id)=>{
            return Game.getObjectById(creep_id).memory.role === roleName
        })
        return _creeps.length
    },
    dotApply:function(_object,factor){
        let newObject = Object.assign({},_object)
        for (let key in newObject){
            newObject[key] = newObject[key] * factor
        }
        return newObject
    },
    getCreepTasks:function(taskStr,roomName){
        let TaskArr = taskStr.split('-')
        for (let i = 0; i < TaskArr.length; ++i) {
            if (TaskArr[i].indexOf("?")!==-1){
                const subStr = TaskArr[i].split("?")
                let condition = subStr[0]
                let tasks = subStr[1].split(":")
                if (eval(condition)){
                    TaskArr[i] = reference.work.interpret[tasks[0]]
                }else{
                    TaskArr[i] = reference.work.interpret[tasks[1]]
                }
            }else{
                TaskArr[i] = reference.work.interpret[TaskArr[i]]
            }
        }
        return TaskArr
    },
    adjacentMove:function(creep_id,target_id){
        if (this.adjacent(creep_id,target_id)){
            return OK;
        }else{
            const creep = Game.getObjectById(creep_id)
            const target = Game.getObjectById(target_id)
            creep.moveTo(target)
        }
    },
    creepWithdrawAll:function(creep_id,target_id){
        const creep = Game.getObjectById(creep_id)
        const target = Game.getObjectById(target_id)
        let feedBack = undefined
        for (let i = 0; i < reference.constants.resourceList.length; i++){
            feedBack = creep.withdraw(target,reference.constants.resourceList[i])
            if (feedBack === ERR_NOT_IN_RANGE || feedBack === OK) {
                return feedBack
            }
        }

    },
    creepTransferAll:function(creep_id,target_id){
        const creep = Game.getObjectById(creep_id)
        const target = Game.getObjectById(target_id)
        let feedBack = undefined
        for (let i = 0; i < reference.constants.resourceList.length; i++){
            feedBack = creep.transfer(target,reference.constants.resourceList[i])
            if (feedBack === ERR_NOT_IN_RANGE || feedBack === OK) {
                return feedBack
            }
        }
    },
    getUsedCapacity:function(structure_id,_default = null){
      let _defaultResult = Game.getObjectById(structure_id).store.getUsedCapacity(_default)
      if (_defaultResult === null){
        return Game.getObjectById(structure_id).store.getUsedCapacity(RESOURCE_ENERGY)
      }
      return _defaultResult
    },
    getFreeCapacity:function(structure_id,_default = null){
      let _defaultResult = Game.getObjectById(structure_id).store.getFreeCapacity(_default)
      if (_defaultResult === null){
        return Game.getObjectById(structure_id).store.getFreeCapacity(RESOURCE_ENERGY)
      }
      return _defaultResult
    },
    getCapacity:function(structure_id,_default = null){
      let _defaultResult = Game.getObjectById(structure_id).store.getCapacity(_default)
      if (_defaultResult === null){
        return Game.getObjectById(structure_id).store.getCapacity(RESOURCE_ENERGY)
      }
      return _defaultResult
    },
    storeFilternSort:function(_structureIdArr,reversed = false){
      let _tmp = [].concat(_structureIdArr)
      _tmp = _.filter(_tmp,(structure_id)=>{
          if (reversed === false){
            return this.getUsedCapacity(structure_id) > 0
          }
          return this.getFreeCapacity(structure_id) > 0
      })
      _tmp.sort((structureIdA,structureIdB)=>{
        if (reversed === false){
          return this.getUsedCapacity(structureIdB) - this.getUsedCapacity(structureIdA)
        }
          return this.getUsedCapacity(structureIdA) - this.getUsedCapacity(structureIdB)
      })
      return _tmp
    }
}
module.exports = helpFunc
