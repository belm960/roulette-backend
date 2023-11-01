import express from "express";
import  { Server } from "socket.io";
import  {Timer} from "easytimer.js";
import { createServer } from "http";

/** Server Handling */
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
    origin: "https://roulette-casino-game.vercel.app/"
  }
});


enum ValueType {
  NUMBER,
  NUMBERS_1_12,
  NUMBERS_2_12,
  NUMBERS_3_12,
  NUMBERS_1_18,
  NUMBERS_19_36,
  EVEN,
  ODD,
  RED,
  BLACK,
  DOUBLE_SPLIT,
  QUAD_SPLIT,
  TRIPLE_SPLIT,
  EMPTY
}


interface Item {
  type: ValueType;
  value: number;
  valueSplit: number[];
}

interface Tickets{
  chip: PlacedChip[],
  odd: number,
  balance: number,
}

interface PlacedChip {
  item: Item;
  sum: number;
  total: number;
}
type rouletteData = {
  numbers: number[];
};
type Winner = {
  username: string;
  sum: number;
  balance:number;
}

enum GameStages {
  PLACE_BET,
  NO_MORE_BETS,
  DRAW,
  WINNERS,
  NONE
}
type GameData = {
  stage: GameStages,
  time_remaining: number;
  value: number;
  wins: Winner[],
  history: number[],
}

var timer = new Timer();
var users = new Map<string, string>()
var balance = new Map<string, number>()
let gameData = {} as GameData;
let usersData = {} as Map<string, Tickets[]>;
let wins = [] as Winner[];
var number =0;
timer.addEventListener('secondsUpdated', function (e: any) {
  number+=1;
  if (number>80){number=1}
  var currentSeconds = number;
  gameData.time_remaining = currentSeconds
  if (currentSeconds == 1) {
    console.log("Place bet");
    wins= []
    usersData = new Map()
    gameData.stage = GameStages.PLACE_BET
    sendStageEvent(gameData)
  } else if (currentSeconds == 50) {
    gameData.stage = GameStages.NO_MORE_BETS
    gameData.value = 37;
    sendStageEvent(gameData)

  } else if (currentSeconds == 60) {
    gameData.stage= GameStages.DRAW
    gameData.value = getRandomNumberInt(0, 36);
    sendStageEvent(gameData)

    for(let key of Array.from( usersData.keys()) ) {
       var username = users.get(key);
       if (username != undefined) {
        var chipsPlaced = usersData.get(key) as Tickets[]
        var sumWon = calculateWinnings(gameData.value, chipsPlaced)
        var amount = balance.get(key)!;
        balance.set(key,amount+sumWon)
        wins.push({
            username: username,
            sum: sumWon,
            balance: balance.get(key)!
        });
      }
    }
  }
  else if (currentSeconds == 70) {
    console.log("Winners")
    gameData.stage = GameStages.WINNERS
    // sort winners desc
    if (gameData.history == undefined) {
      gameData.history = []
    } 
    gameData.history.push(gameData.value)

    if (gameData.history.length > 10) {
      gameData.history.shift();
    }
    gameData.wins = wins.sort((a,b) => b.sum - a.sum);
    sendStageEvent(gameData)
  }

});

io.on("connection", (socket: { on: (arg0: string, arg1: { (data: string): void; (data: string): void; (reason: any): void; }) => void; id: string; }) => {
  
  socket.on('enter', (data: string) => {
    users.set(socket.id, data);
    balance.set(socket.id,1000);    
    sendStageEvent(gameData);
  });

  socket.on('place-bet', (data: string) => {
    var gameData = JSON.parse(data) as Tickets[];
    usersData.set(socket.id, gameData);
    balance.set(socket.id,gameData[gameData.length-1].balance);
  });
  socket.on("disconnect", (reason) => {
    users.delete(socket.id);
    balance.delete(socket.id);
    usersData.delete(socket.id);
  });
});

httpServer.listen(8000, () =>{

  console.log(`Server is running on port 8000`);
  
  timer.start({precision: 'seconds'});
});

function getRandomNumberInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sendStageEvent(_gameData: GameData) { 
  var json = JSON.stringify(_gameData)
  console.log(json)
  io.emit('stage-change', json);
}

var blackNumbers = [ 2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 29, 28, 31, 33, 35 ];
var redNumbers = [ 1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36 ];

function calculateWinnings(winningNumber: number, tickets: Tickets[]) {
  var totalwin = 0;
  var ticketLength = tickets.length;
  for (var j = 0; j < ticketLength; j++) {
      var placedChips: PlacedChip[] = tickets[j].chip;
      var win = 0;
      var arrayLength = placedChips.length;
      for (var i = 0; i < arrayLength; i++) {

          var placedChip = placedChips[i]
          var placedChipType = placedChips[i].item.type
          var placedChipValue = placedChips[i].item.value
          var odd = tickets[j].odd
          var winner = false;
      if (placedChipType === ValueType.NUMBER &&  placedChipValue === winningNumber)
      {
          winner = true;
      }
      else if (placedChipType === ValueType.BLACK && blackNumbers.includes(winningNumber))
      { // if bet on black and win
        winner = true;
      }
      else if (placedChipType === ValueType.RED && redNumbers.includes(winningNumber))
      { // if bet on red and win
        winner = true;
      }
      else if (placedChipType === ValueType.NUMBERS_1_18 && (winningNumber >= 1 && winningNumber <= 18))
      { // if number is 1 to 18
        winner = true;
      }
      else if (placedChipType === ValueType.NUMBERS_19_36 && (winningNumber >= 19 && winningNumber <= 36))
      { // if number is 19 to 36
        winner = true;
      }
      else if (placedChipType === ValueType.NUMBERS_1_12 && (winningNumber >= 1 && winningNumber <= 12))
      { // if number is within range of row1
        winner = true;
      }
      else if (placedChipType === ValueType.NUMBERS_2_12 && (winningNumber >= 13 && winningNumber <= 24))
      { // if number is within range of row2
        winner = true;
      }
      else if (placedChipType === ValueType.NUMBERS_3_12 && (winningNumber >= 25 && winningNumber <= 36))
      { // if number is within range of row3
        winner = true;
      }
      else if (placedChipType === ValueType.EVEN || placedChipType === ValueType.ODD)
      { 
        if ( winningNumber % 2 == 0) {
             // if number even
             winner = true;
        } else {
            // if number is odd
            winner = true;
        }
      }
        if (winner) {win = (placedChip.sum*(placedChips.length))*(36/odd)}
      }
      totalwin+=win;
    }
  return totalwin;
}