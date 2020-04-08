from base64 import b64decode
from io import StringIO,BytesIO
from gzip import GzipFile
from math import ceil,e
import json,re,requests
class Info:
    """
        Class for getting information from the server,
        including market,console,time,terminal module.

        Need to provide _TOKEN and SHARD.
        Variables & Constants:
            _URL : the url to execute api request.
            _TOKEN : the token.
            SHARD : the working shard.
            WORLD_SIZE : the size of the SHARD.

        Example:
        >>> Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
    """
    _URL = "https://screeps.com/api/"
    def __init__(self,TOKEN,SHARD):
        self._TOKEN = TOKEN
        self.SHARD = SHARD
        self._worldSize()
    def console(self,cmd):
        """
            A function to execute command remotely.
            params:
                cmd :: string, command.
        """
        url = self._URL + "user/console"
        params = {"_token":self._TOKEN,"expression":cmd,"shard":self.SHARD}
        requests.post(url,params)
    def time(self):
        """
            A function to get current time.
            return:
                time :: current tick.
        """
        url = self._URL + "game/time"
        params = {"_token":self._TOKEN,"shard":self.SHARD}
        result = requests.get(url,params).json()
        return result['time']
    def resourceOrder(self,resourceType):
        """
            A function to get current available orders for specific resourceType
            param::
                resourceType :: string, resourceType.
            return::
                A list of information of the orders, including:
                    _id: Transaction ID.
                    type: OrderType, 'sell' or 'buy'.
                    amount: available Amount.
                    remainingAmount: remaining Amount.
                    price : price.
                    roomName : owner's roomName
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.resourceOrder("H")
            [{
                '_id': '5e750f261cbdafe792217441',
                'type': 'sell',
                'amount': 4375,
                'remainingAmount': 11395,
                'price': 0.114,
                'roomName': 'W26N9'
             },...]
        """
        url = self._URL + "game/market/orders"
        params = {"_token":self._TOKEN,"resourceType":resourceType,"shard":self.SHARD}
        return requests.get(url,params).json()['list']
    def terminalInfo(self):
        """
            A function to get current resource type and amount in the terminal,if exists, of the controlled rooms.
            return ::
                A dictionary of the information about the terminal.
                    keys :: controlled room name, including mineralType and its amount.
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.terminalInfo()
            {'W21N24': {},
             'W22N25': {'energy': 60030, 'K': 1330, 'ghodium_melt': 600},
             'W23N25': {}}
        """
        url = self._URL + "user/memory"
        path = "spawns.Origin"
        params = {"_token":self._TOKEN,"path":path,"shard":self.SHARD}
        result = requests.get(url,params).json()
        if 'data' in result:
            try:
                gzip_input = StringIO(b64decode(result['data'][3:]))
            except:
                gzip_input = BytesIO(b64decode(result['data'][3:]))
            gzip_string = GzipFile(fileobj = gzip_input).read().decode("utf-8")
            result = json.loads(gzip_string)
            rooms = result['init']['infoRooms']['controlled']
            dic = {}
            for room in rooms:
                dic[room] = result['assess']['access']['structures'][room]['terminalInfo']
            return dic
        return {}
    def marketInfo(self):
        """
            A function to get current market condition for every resourceType.
            return ::
                A list of the information about the resourceType, including:
                    _id : transaction ID.
                    count : Total volumes in the history.
                    avgPrice : Transaction Average Price.
                    stddevPrice : std of the Transaction Price.
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.marketInfo()
            [{'_id': 'wire', 'count': 1000, 'avgPrice': 14.941, 'stddevPrice': 0.237},
             {'_id': 'phlegm', 'count': 3, 'avgPrice': 1481.155, 'stddevPrice': 518.845},
             {'_id': 'UL', 'count': 3435, 'avgPrice': 0.002, 'stddevPrice': 0},
             {'_id': 'tube', 'count': 136, 'avgPrice': 434.377, 'stddevPrice': 0},...]
        """
        url = self._URL + "game/market/orders-index"
        params = {"_token":self._TOKEN,"shard":self.SHARD}
        return requests.get(url,params).json()['list']
    def myOrder(self):
        """
            A function to get my orders' history.
            return ::
                A list of the information of the past transaction, including:
                    _id : transaction ID.
                    createdTimestamp : the time stamp when created.
                    user : id of the owner of the transaction.
                    active : True/False.
                    type : sell/buy.
                    amount : available Amount.
                    remainingAmount : remaining Amount.
                    resourceType : type of the resource.
                    price : price.
                    totalAmount : the Amount, when created.
                    roomName : owner's roomName.
                    created : the tick when the order was created.
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.myOrder()
            [{'_id': '5e88ad9da71a8c545a27a232',
              'createdTimestamp': 1586015645491,
              'user': '5e2315ea3df256e71aecade5',
              'active': False,
              'type': 'sell',
              'amount': 0,
              'remainingAmount': 0,
              'resourceType': 'H',
              'price': 0.085,
              'totalAmount': 86540,
              'roomName': 'W22N25',
              'created': 17101053}]
        """
        url = self._URL + "game/market/my-orders"
        params = {"_token":self._TOKEN}
        return requests.get(url,params).json()['shards'][self.SHARD]
    def cancelOrder(self,id):
        """
            A function to cancel an order.
            param::
                id :: string, the id of the transaction.
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.cancelOrder('5e88ad9da71a8c545a27a232')
        """
        self.console("Game.market.cancelOrder('{}')".format(id))
    def createOrder(self,orderType,resourceType,price,totalAmount,roomName):
        """
            A function to create an order.
            params::
                orderType :: string, sell/buy.
                resourceType :: string, type of the resource.
                price :: double, price.
                totalAmount :: int, selling/buying Amount.
                roomName :: string, sending room's name.
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.createOrder("buy","energy",0.01,10000,"W22N25")
        """
        self.console(f"Game.market.createOrder('{orderType}','{resourceType}',{price},{totalAmount},'{roomName}')")
    def dealOrder(self,id,amount,roomName):
        """
            A function to deal the order.
            params::
                id :: string, order ID.
                amount :: int, dealing Amount.
                roomName :: string, dealing roomName.
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.dealOrder("5e85d6d99df71e776cc8a6f0",1000,"W22N25")
        """
        self.console(f"Game.market.deal('{id}',{amount},'{roomName}')")
    def _worldSize(self):
        url = self._URL + "game/world-size"
        params = {"_token":self._TOKEN,"shard":self.SHARD}
        self.WORLD_SIZE = requests.get(url,params).json()
        self.WORLD_SIZE = [self.WORLD_SIZE['width'],self.WORLD_SIZE['height']]
    def _roomNameToXY(self,room):
        result = re.match(r"([EeWw])(\d+)([SsNn])(\d+)",room)
        xx = int(result.group(2))
        yy = int(result.group(4))
        horizontalDir = result.group(1).upper()
        verticalDir =  result.group(3).upper()
        if horizontalDir == 'W':
            xx = - xx - 1
        if verticalDir == 'N':
            yy = - yy - 1
        return (xx,yy)
    def calcFee(self,price,amount):
        """
            A function to calculate the fee.
            params::
                price :: double, price
                amount :: integer, amount
            return::
                the fee cost of credit
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.calcFee(1,1)
            0.05
        """
        return price * amount * 0.05
    def calcRoomsDistance(self,room1,room2):
        """
            A function to calculate the distance between rooms in the SHARD.
            params::
                room1 :: string, the name of the first room.
                room2 :: string, the name of the second room.
            return::
                the distance between the rooms.
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.calcRoomsDistance("W22N25","E3S4")
            30
        """
        x1,y1 = self._roomNameToXY(room1)
        x2,y2 = self._roomNameToXY(room2)
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        dx = min(self.WORLD_SIZE[0] - dx,dx)
        dy = min(self.WORLD_SIZE[1] - dy,dy)
        return max(dx,dy)
    def calcTransactionCost(self,amount,room1,room2):
        """
            A function to calculate the energy cost to deal between two rooms.
            params::
                amount :: integer, the transaction Amount.
                room1 :: string, the name of the first room.
                room2 :: string, the name of the second room.
            return::
                the energy cost to deal between two rooms.

            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.calcTransactionCost(1000,"W22N25","E3S4")
            633
        """
        return ceil(  amount * ( 1 - e ** (- self.calcRoomsDistance(room1,room2) / 30) )  )
    def getRecentBalance(self,page = 0):
        """
            A function to get the user's recent balance history.
            params::
                page :: int, the page number
                        default 0
                        can receive 'all' which will get all the records.
                            Or all-{pageNum} all the records since the pageNum.
            return::
                A list of dictionary.
                    keys:
                        _id :: string, deal id
                        date :: time, format:: e.g. 2020-04-08T02:46:57.259Z
                        tick :: int, the tick
                        user :: string, user id
                        type :: string, market.sell OR market.buy
                        balance :: real, balance
                        change :: real, change in the balance
                        market :: dictionary
                            keys:
                                resourceType :: string, such as "H"
                                roomName :: owner's roomName
                                targetRoomName :: dealer's roomName
                                price :: real, price
                                npc :: bool, whether one side is npc
                                owner :: owner's id
                                dealer :: dealer's id
                                amount :: int, the transaction amount
                        shard :: string
                A boolean(if not 'all') :: indicate whether there are more pages to show
            
            Example:
            >>> info = Info("3bdd1da7-3002-4aaa-be91-330562f54093","shard3")
            >>> info.getRecentBalance()
            [[{'_id': '5e8d3b210e7cf61989a9201b',
              'date': '2020-04-08T02:46:57.259Z',
              'tick': 17196120,
              'user': '5e2315ea3df256e71aecade5',
              'type': 'market.sell',
              'balance': 29845.822,
              'change': 40,
              'market': {'resourceType': 'H',
                  'roomName': 'W22N25',
                  'targetRoomName': 'E29S29',
                  'price': 0.08,
                  'npc': False,
                  'owner': '5e2315ea3df256e71aecade5',
                  'dealer': '58c6e6b7ddc5f2790254a787',
                  'amount': 500},
              'shard': 'shard3'},...],True]
        """
        url = self._URL + "user/money-history"
        page = str(page)
        params = {"_token":self._TOKEN,"page":page}
        if page == 'all' : page = 'all-0'
        if page.find('all') == -1:
            result = requests.get(url,params).json()
            return [result['list'],result['hasMore']]
        else:
            realPage = page.split('-')[1]
            params['page'] = realPage
            result = requests.get(url,params).json()
            if result['hasMore'] == True:
                return result['list'] + self.getRecentBalance('all-'+str(int(realPage) + 1))
            else:
                return result['list']