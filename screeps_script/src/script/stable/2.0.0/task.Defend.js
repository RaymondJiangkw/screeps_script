/**
 * @exports taskDefendCollections
 */
const taskDefendCollections = module.exports =  {
    reserved(creeps,targetRoom) {
        const creepRun = (creep) =>{
            
        }
        let feedback = ERR_DELETE;
        for (const creep of creeps) feedback = feedback & creepRun(creep);
    },
    observed(creeps,targetRoom) {

    },
}