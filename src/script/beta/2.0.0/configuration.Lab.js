const labConfiguration = {
    mostExistenceAmount:6000,
    mostReactionTime:3000,
    leastRefillAmount:5,
    leastTransferAmount:50,
    "W22N25":{
        mode:"default",
        allowedCompounds:["LH2O","XLH2O","KH2O","XKH2O","XLHO2","XZHO2","XUH2O"],
        reverse:["GO","ZH","UH","KO"],
        default:["KH","ZO","UH","OH","ZHO2","KH2O","UH2O","XUH2O","XZHO2","XKH2O"],
        focus:undefined,
        clear:undefined
    },
    "W23N25":{
        mode:"default",
        allowedCompounds:["KH","XKHO2"],
        reverse:["GO"],
        default:["KH","KO","OH","KHO2","XKHO2"],
        focus:undefined,
        clear:undefined
    },
    "W21N24":{
        mode:"default",
        allowedCompounds:["KH2O","XGHO2"],
        reverse:["GO","ZH","UH","KO"],
        default:["KH","OH","GHO2","XGHO2"],
        focus:undefined,
        clear:undefined
    },
    "W19N22":{
        mode:"default",
        allowedCompounds:[],
        reverse:["GO","ZH","UH","KO"],
        default:[],
        focus:undefined,
        clear:undefined
    },
    "W18N22":{
        mode:"default",
        allowedCompounds:[],
        reverse:["GO","ZH","UH","KO"],
        default:[],
        focus:undefined,
        clear:undefined
    },
    "sim":{
        mode:"default",
        allowedCompounds:[],
        reverse:[],
        default:[],
        focus:undefined,
        clear:undefined
    }
}
module.exports = labConfiguration