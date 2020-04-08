from get.get import Info
from database.database import Database
class Interface:
    def __init__(self,TOKEN,SHARD,sqlName = 'market',reset = False):
        self.info = Info(TOKEN,SHARD)
        self.database = Database(sqlName,reset)
    def insertMarketInfo(self):
        ret = self.info.marketInfo()
        for _ in range(len(ret)):
            try:
                ret[_]['resource'] = ret[_]['_id']
                del ret[_]['_id']
            except:
                pass
            self.database.insertMarketInfo(**ret[_])
        self.database.commit()
    def insertResourceOrder(self,resource):
        ret = self.info.resourceOrder(resource)
        for _ in range(len(ret)):
            try:
                ret[_]['orderType'] = ret[_]['type']
                del ret[_]['type']
            except:
                pass
            self.database.insertDealInfo(resource = resource,**ret[_])
        self.database.commit()
    def insertAllResourceOrder(self):
        resources = self.database.getAllResourceType()
        for resource in resources:
            self.insertResourceOrder(resource)
    def insertCreditRecord(self,command = ''):
        """
            Accepted Params:: 'all','recent','' and number or string-number.
            default: ""
        """
        if command == "recent" or command == "":
            command = "0"
        elif type(command) == int:
            command = str(command)
        elif not command == "all":
            raise ValueError("Unexpected Value from (command,{})".format(command))
        ret = self.info.getRecentBalance(command)
        if type(ret[1]) == bool:
            ret = ret[0]
        for _ in range(len(ret)):
            if ret[_]["shard"] != self.info.SHARD or ret[_]["type"] == 'market.fee': 
                continue
            ret[_]["orderType"] = ret[_]["type"]
            ret[_]["resource"] = ret[_]["market"]["resourceType"]
            ret[_]["room"] = ret[_]["market"]["roomName"]
            ret[_]["targetRoom"] = ret[_]["market"]["targetRoomName"]
            ret[_]["npc"] = ret[_]["market"]["npc"]
            ret[_]["amount"] = ret[_]["market"]["amount"]
            del ret[_]['user']
            del ret[_]["type"]
            del ret[_]["market"]
            del ret[_]["shard"]
            print(ret[_])
            self.database.insertRecordInfo(**ret[_])
        self.database.commit()
    def clearInactiveOrder(self):
        ret = self.info.myOrder()
        for _ in range(len(ret)):
            if ret[_]['active'] == False:
                self.info.cancelOrder(ret[_]['_id'])