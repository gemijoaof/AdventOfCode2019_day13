const fs = require('fs');
const input = fs.readFileSync('./input.txt').toString();
let arrayinput = input.split(',').map(str => Number(str));

const resizeArray = (arrayProgram, newSize, defaultValue) => {
  let arr = [...arrayProgram];
  arr.length = newSize;

  return arrayProgram.map(item => (item === undefined ? defaultValue : item));
};

const runProgram = (array, arraySettings = [], index = 0, relativeBase = 0) => {
  let arrayProgram = [...array];
  let result = null;
  let memory = [];
  let arrayInputNumber = [...arraySettings];

  while (true) {
    let valueStr = arrayProgram[index].toString();
    valueStr = valueStr.padStart(5, '0');
    const opcode = calcOpcode(valueStr);
    let listParamModes = calcListParamModes(valueStr);
    let param1 = calcParamIndex(
      arrayProgram,
      index,
      1,
      listParamModes[2],
      relativeBase
    );
    let param2 = calcParamIndex(
      arrayProgram,
      index,
      2,
      listParamModes[1],
      relativeBase
    );
    let param3 = calcParamIndex(
      arrayProgram,
      index,
      3,
      listParamModes[0],
      relativeBase
    );

    //guard close for negative index
    if (
      opcode === '01' ||
      opcode === '02' ||
      opcode === '07' ||
      opcode === '08'
    ) {
      if (param3 < 0) {
        return console.log(
          `ERROR: paramIndex3 can't be smaller than 0 when opcode is 1,2,7,8`
        );
      } else if (param3 > arrayProgram.length) {
        arrayProgram = resizeArray(arrayProgram, param3, 0);
      }
    } else if (opcode === '03' && param1 < 0) {
      return console.log(
        `ERROR: paramIndex1 can't be smaller than 0 when opcode is 3`
      );
    } else if (opcode === '03' && param1 > arrayProgram.length) {
      arrayProgram = resizeArray(arrayProgram, param1, 0);
    }

    switch (opcode) {
      case '01':
        arrayProgram[param3] = arrayProgram[param1] + arrayProgram[param2];
        index += 4;
        break;
      case '02':
        arrayProgram[param3] = arrayProgram[param1] * arrayProgram[param2];
        index += 4;
        break;
      case '03':
        //console.log(arrayInputNumber.length);
        if (arrayInputNumber.length === 0) {
          return {
            lastOutput: result,
            halted: false,
            index: index,
            relativeBase: relativeBase,
            program: arrayProgram,
            listOutput: memory
          };
        } else {
          arrayProgram[param1] = arrayInputNumber.shift();
        }
        index += 2;
        break;
      case '04':
        result = arrayProgram[param1];
        memory.push(result);
        index += 2;
        break;
      case '05':
        if (arrayProgram[param1] !== 0) {
          index = arrayProgram[param2];
        } else {
          index += 3;
        }
        break;
      case '06':
        if (arrayProgram[param1] === 0) {
          index = arrayProgram[param2];
        } else {
          index += 3;
        }
        break;
      case '07':
        if (arrayProgram[param1] < arrayProgram[param2]) {
          arrayProgram[param3] = 1;
        } else {
          arrayProgram[param3] = 0;
        }
        index += 4;
        break;
      case '08':
        if (arrayProgram[param1] === arrayProgram[param2]) {
          arrayProgram[param3] = 1;
        } else {
          arrayProgram[param3] = 0;
        }
        index += 4;
        break;
      case '09':
        //adjust the relative base
        relativeBase += arrayProgram[param1];
        index += 2;
        break;
      case '99':
        return {
          lastOutput: result,
          halted: true,
          index: 0,
          relativeBase: 0,
          program: arrayProgram,
          listOutput: memory
        };
      default:
        return console.log(`ERROR: opcode: ${opcode}`);
    }
  }
};

const calcOpcode = str => {
  return str[3] + str[4];
};

const calcListParamModes = completeOpcode => {
  return [
    Number(completeOpcode[0]),
    Number(completeOpcode[1]),
    Number(completeOpcode[2])
  ];
};

const calcParamIndex = (
  arrayProgram,
  index,
  param,
  paramMode,
  relativeBase
) => {
  let result = 0;

  if (paramMode === 0) {
    result = arrayProgram[index + param];
  } else if (paramMode === 1) {
    result = index + param;
    //relative mode
  } else if (paramMode === 2) {
    result = arrayProgram[index + param] + relativeBase;
  }
  return result;
};

//////////// END OF INTCODE ////////////////

const part1 = () => {
  let output = runProgram(arrayinput);
  let listInstructions = getListIntructions(output.listOutput);
  let counter = countIDTile(listInstructions);

  return counter;
};

const countIDTile = listIntructions => {
  let counter = 0;

  for (const instruction of listIntructions) {
    if (instruction.tileID === 2) {
      counter++;
    }
  }

  return counter;
};

const getListIntructions = listOutputs => {
  let listInstructions = [];

  for (let index = 0; index < listOutputs.length; index += 3) {
    listInstructions.push({
      x: listOutputs[index],
      y: listOutputs[index + 1],
      tileID: listOutputs[index + 2]
    });
  }

  return listInstructions;
};

const part2 = () => {
  let output = runProgram(arrayinput);
  let listGameState = getListIntructions(output.listOutput);
  let program = output.program;
  let arraySettings = [moveJoystick(listGameState)];
  let relativeBase = 0;
  let index = 0;
  let halted = false;

  //play
  program[0] = 2;

  while (true) {
    console.log(printGame(listGameState));

    output = runProgram(program, arraySettings, 0, 0);
    index = output.index;
    program = output.program;

    relativeBase = output.relativeBase;
    halted = output.halted;

    listGameState = getListIntructions(output.listOutput);
    arraySettings = [moveJoystick(listGameState)];

    //win
    if (halted) break;
  }

  return getScore(listGameState);
};

const moveJoystick = listGameState => {
  let ballCoordinates = [];
  let paddleCoordinates = [];
  const [neutral, left, right] = [0, -1, 1];

  if (listGameState.length === 0) return 0;

  for (const gameState of listGameState) {
    if (gameState.tileID === 4) {
      ballCoordinates = [gameState.x, gameState.y];
    }

    if (gameState.tileID === 3) {
      paddleCoordinates = [gameState.x, gameState.y];
    }
  }

  //move joystick in direction of the ball
  if (ballCoordinates[0] > paddleCoordinates[0]) {
    return right;
  } else if (ballCoordinates[0] < paddleCoordinates[0]) {
    return left;
  } else if ((ballCoordinates[0] = paddleCoordinates[0])) {
    return neutral;
  }
};

const getScore = listGameState => {
  for (const gameState of listGameState) {
    if (gameState.x === -1 && gameState.y === 0 && gameState.tileID > 4) {
      return gameState.tileID;
    }
  }

  return 0;
};

const printGame = listGameState => {
  let maxX = 0;
  let maxY = 0;
  let grid = [];
  let resultStr = '';

  //find maxY and maxX
  for (const gameState of listGameState) {
    if (gameState.x > maxX) {
      maxX = gameState.x;
    }

    if (gameState.y > maxY) {
      maxY = gameState.y;
    }
  }

  //create grid
  for (let y = 0; y < maxY + 1; y++) {
    let line = [];
    for (let x = 0; x < maxX + 1; x++) {
      line.push(printTile(listGameState, [x, y]));
    }
    grid.push(line.join(''));
  }

  //create string result
  for (const line of grid) {
    resultStr += line + '\n';
  }

  return resultStr;
};

const printTile = (listGameState, coordinates) => {
  for (const gameState of listGameState) {
    if (gameState.x === coordinates[0] && gameState.y === coordinates[1]) {
      switch (gameState.tileID) {
        case 0:
          return ' ';
        case 1:
          return '█';
        case 2:
          return '▄';
        case 3:
          return '▬';
        case 4:
          return 'O';
        default:
          break;
      }
    }
  }
};

console.time('part2');
console.log(part2());
console.timeEnd('part2');
console.log(' ');
console.time('part1');
console.log(part1());
console.timeEnd('part1');
