import sqlite3,re
class Database:
    """
        A class to manipulate the data retrieved from the market.
        Constants:
            _START_TIME :: "2020-01-01"
            OUTDATED_TIME :: 365
            _SELL    ::  0
            _BUY     ::  1
        Database Structure:
            Table:
                Resource: FIELDS    id
                                    name
                Room:     FIELDS    id
                                    name
                Market:   FIELDS    id
                                    resource_id
                                    count
                                    avgPrice
                                    stddevPrice
                                    time :: a decimal number indicates the counting of day from _START_TIME
                Deal:     FIELDS    _id
                                    resource_id
                                    room_id
                                    orderType :: "buy" -> _BUY, "sell" -> _SELL
                                    amount
                                    remainingAmount
                                    price
    
    """
    _START_TIME = "2020-01-01"
    OUTDATED_TIME = 365
    _SELL = 0
    _BUY = 1
    def __init__(self,sqlName = 'market',reset = False):
        """
            Init Function
            params:
                sqlName :: the name of the sqlite file(with/without .sqlite) to store and retrieve
                           default: market.sqlite
                reset :: bool, whether to reset the database after opening
                           default: False
        """
        if sqlName.find('.') == -1:
            self._sqlName = sqlName + '.sqlite'
        else:
            self._sqlName = sqlName
        self._conn = sqlite3.connect(self._sqlName)
        self._cur = self._conn.cursor()
        if reset:
            self.reset()
        self._cur.executescript(f"""
        CREATE TABLE IF NOT EXISTS Resource (
            id  INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            name    TEXT UNIQUE
        );
        CREATE TABLE IF NOT EXISTS Room (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            name    TEXT UNIQUE
        );
        CREATE TABLE IF NOT EXISTS Market (
            id  INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            resource_id INTEGER,
            count INTEGER,
            avgPrice REAL,
            stddevPrice REAL,
            time    REAL NOT NULL DEFAULT (julianday('now') - julianday('{self._START_TIME}'))
        );
        CREATE TABLE IF NOT EXISTS Deal (
            _id TEXT NOT NULL PRIMARY KEY UNIQUE,
            resource_id INTEGER,
            room_id INTEGER,
            orderType    INTEGER,
            amount  INTEGER,
            remainingAmount INTEGER,
            price   REAL
        );
        """)
    def _upperRoomName(self,roomName):
        result = re.match(r"([EeWw])(\d+)([SsNn])(\d+)",roomName)
        xx = result.group(2)
        yy = result.group(4)
        horizontalDir = result.group(1).upper()
        verticalDir =  result.group(3).upper()
        return horizontalDir + xx + verticalDir + yy
    def _retDay(self,time = "now"):
        self._cur.execute(f"SELECT julianday('{time}') - julianday('{self._START_TIME}')")
        return self._cur.fetchone()[0]
    def _getResourceID(self,resource):
        self._cur.execute("""INSERT OR IGNORE INTO Resource (name) VALUES ( ? )""",(resource,))
        self._cur.execute("""SELECT id FROM Resource WHERE name = ?""",(resource,))
        return self._cur.fetchone()[0]
    def _getRoomID(self,roomName):
        roomName = self._upperRoomName(roomName)
        self._cur.execute("""INSERT OR IGNORE INTO Room (name) VALUES ( ? )""",(roomName,))
        self._cur.execute("""SELECT id FROM Room WHERE name = ?""",(roomName,))
        return self._cur.fetchone()[0]
    def _getRoomNameFromID(self,id):
        self._cur.execute("""SELECT name FROM Room WHERE id = ?""",(id,))
        result = self._cur.fetchone()
        if result is None:
            return None
        else:
            return result[0]
    def _getResourceFromID(self,id):
        self._cur.execute("""SELECT name FROM Resource WHERE id = ?""",(id,))
        result = self._cur.fetchone()
        if result is None:
            return None
        else:
            return result[0]
    def _getAllDealID(self,resource = ""):
        if resource == "":
            self._cur.execute("SELECT _id FROM Deal")
        else:
            resource_id = self._getResourceID(resource)
            self._cur.execute("SELECT _id FROM Deal WHERE resource_id = ?",(resource_id,))
        return [info[0] for info in self._cur.fetchall()]
    def _interpretOrderType(self,orderType):
        if type(orderType) is not str:
            raise ValueError("Expect string")
        orderType = orderType.lower()
        if orderType == 'sell':
            orderType = self._SELL
        elif orderType == 'buy':
            orderType = self._BUY
        else:
            raise ValueError("Inappropriate Value for orderType, expect 'sell' or 'buy'")
        return orderType
    def _interpretNum2OrderType(self,rep):
        if rep == self._SELL:
            return "sell"
        elif rep == self._BUY:
            return "buy"
        else:
            raise ValueError(f"Inappropriate Value, expecting {self._SELL} or {self._BUY}")
    def insertMarketInfo(self,resource,count,avgPrice,stddevPrice):
        """
            A function to insert Market Information.
            params::
                resource :: string, such as, "H"
                count :: int
                avgPrice :: double
                stddevPrice :: double
        """
        resource_id = self._getResourceID(resource)
        self._cur.execute("""INSERT INTO Market (resource_id,count,avgPrice,stddevPrice) VALUES ( ?, ?, ?, ? )""",(resource_id,count,avgPrice,stddevPrice))
        self._cur.execute("""SELECT id FROM Market WHERE resource_id = ? AND count = ? AND avgPrice = ? AND stddevPrice = ?""",(resource_id,count,avgPrice,stddevPrice))
        return self._cur.fetchone()[0]
    def insertDealInfo(self,_id,resource,roomName,orderType,amount,remainingAmount,price):
        """
            A function to insert Deal Information
            params::
                _id :: the id of deal
                resource :: string, such as "H"
                roomName :: string, such as "W22N25"
                orderType :: "buy" OR "sell"
                amount :: int
                remainingAmount :: int
                price :: double
        """
        resource_id = self._getResourceID(resource)
        room_id = self._getRoomID(roomName)
        orderType = self._interpretOrderType(orderType)
        self._cur.execute("""INSERT OR REPLACE INTO Deal (_id,resource_id,room_id,orderType,amount,remainingAmount,price) VALUES (?,?,?,?,?,?,?)""",(_id,resource_id,room_id,orderType,amount,remainingAmount,price))
        self._cur.execute("SELECT _id FROM Deal WHERE _id = ?",(_id,))
        return self._cur.fetchone()[0]
    def deleteFinishedDeal(self,resource,activeIDList):
        """
            A function to delete finished deals, namely disappear in the returned list from API request or remainingAmount = 0.
            params::
                resource :: string, such as "H"
                activeIDList :: list, the ids of active deals, expecting to be retrieved from the API request.
            This function will automatic commit the change.
        """
        resource_id = self._getResourceID(resource)
        allIDList = self._getAllDealID(resource)
        self._cur.execute("""DELETE FROM Deal WHERE remainingAmount = 0 AND resource_id = ?""",(resource_id,))
        inactiveIDList = [_id for _id in allIDList if _id not in activeIDList]
        for _id in inactiveIDList:
            self._cur.execute("""DELETE FROM Deal WHERE _id = ?""",(_id,))
        self.commit()
    def deleteOutdatedMarketInfo(self,outdatedTime = OUTDATED_TIME):
        """
            A function to delete outdated market information by restricting the available days from today.
            params::
                outdatedTime :: int, the days that are available from today.
                                default:: OUTDATED_TIME
            This function will automatic commit the change.
        """
        currentTime = self._retDay()
        lastAvailableTime = int(currentTime - outdatedTime)
        self._cur.execute("""DELETE FROM Market WHERE time <= ?""",(lastAvailableTime,))
        self.commit()
    def seleteMarketInfo(self,resource,availableTime = OUTDATED_TIME):
        """
            A function to get specific market information on a resource and in a restricting time interval from today.
            params::
                resource :: string, such as "H"
                availableTime :: int, the days that are available from today.
                                 default:: OUTDATED_TIME
            returns::
                A list of dictionaries::
                    keys::
                        resource :: string, such as "H"
                        count :: int, the total transaction volume
                        avgPrice :: double
                        stddevPrice :: double
                        time :: the time when this was recorded, expecting to be the days from _START_TIME
        """
        resource_id = self._getResourceID(resource)
        currentTime = self._retDay()
        if availableTime == "now":
            availableTime = 0
        lastAvailableTime = int(currentTime - availableTime)
        self._cur.execute("""SELECT * FROM Market WHERE time >= ? AND resource_id = ?""",(lastAvailableTime,resource_id))
        return [{"resource":resource,"count":count,"avgPrice":avgPrice,"stddevPrice":stddevPrice,"time":int(time)} for _,_,count,avgPrice,stddevPrice,time in self._cur.fetchall()]
    def seleteAvailableDeal(self,orderType,resource):
        """
            A function to get specific deal information on a resource and a specific type.
            params::
                orderType :: "buy" OR "sell"
                resource :: string, such as "H"
            returns::
                A list of dictionaries::
                    keys::
                        _id
                        resourceType
                        room
                        orderType
                        amount
                        remainingAmount
                        price
                    Ordered by price (descend if buy, ascend if sell) first, then amount descend
        """
        resource_id = self._getResourceID(resource)
        orderType = self._interpretOrderType(orderType)
        _order = "ASC"
        if orderType == self._BUY:
            _order = "DESC"
        self._cur.execute("""SELECT * FROM Deal WHERE resource_id = ? AND orderType = ? ORDER BY price ?,amount DESC""",(resource_id,orderType,_order))
        dic = self._cur.fetchall()
        result = [{"_id":_id,"resourceType":resource,"room":self._getRoomNameFromID(room_id),"orderType":orderType,"amount":amount,"remainingAmount":remainingAmount,"price":price} for _id,_,room_id,_,amount,remainingAmount,price in dic]
        return result
    def reset(self):
        """
            A function to reset all the data.
            This function will commit the changes automatically.
        """
        self._cur.execute("""DROP TABLE IF EXISTS Resource;
                            DROP TABLE IF EXISTS Room;
                            DROP TABLE IF EXISTS Deal;
                            DROP TABLE IF EXISTS Market;""")
        self.commit()
    def commit(self):
        """
            A function to commit the changes.
        """
        self._conn.commit()
    def __del__(self):
        self._conn.close()