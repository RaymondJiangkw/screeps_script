module.exports = function(){
    _.assign(Creep.prototype,groupExtension)
}
const groupExtension = {
    isGroup(){
        if (!this.memory.group || !this.memory.group.type || !this.memory.group.id) return false
        return true
    },
    groupMember(){
        const home = this.memory.home
        const groupType = this.memory.group.type
        const groupID = this.memory.group.id
        if (!Game.rooms[home].groupCreeps) Game.rooms[home].groupCreeps = {}
        if (!Game.rooms[home].groupCreeps[groupType]) Game.rooms[home].groupCreeps[groupType] = {}
        if (!Game.rooms[home].groupCreeps[groupType][groupID]) Game.rooms[home].groupCreeps[groupType][groupID] = _.groupBy(_.filter(Game.rooms[home].creeps,(creepID)=>{
            const creep = Game.getObjectById(creepID)
            return creep.memory.group && creep.memory.group.type === groupType && creep.memory.group.id === groupID
        }),(creepID)=>Game.getObjectById(creepID).memory.role)
        return Game.rooms[home].groupCreeps[groupType][groupID]
    },
    getGroupTask(){
        const groupType = this.memory.group.type
        const _groupMember = this.groupMember()
        let taskInfo = undefined
        for (let key in _groupMember){
            for (let memberID in _groupMember[key]){
                const member = Game.getObjectById(memberID)
                if (member.memory.taskInfo && member.memory.taskInfo.taskID){
                    taskInfo = member.memory.taskInfo
                    break
                }
            }
            if (taskInfo) break
        }
        if (!taskInfo) {
            this.getTask(groupType)
            taskInfo = this.memory.taskInfo
        }else this.memory.taskInfo = taskInfo
    },
    finishGroupTask(){
        const groupType = this.memory.group.type
        const _groupMember = this.groupMember()
        this.finishTask()
        for (let key in _groupMember){
            for (let memberID in _groupMember[key]){
                if (memberID === this.id) continue
                Game.getObjectById(memberID).clearTask()
            }
        }
    }
}