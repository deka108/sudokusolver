const LENGTH = 9;
const ROW = "abcdefghi";
const COL = "123456789";

const BOX_INDEX = {};
Array(9).fill().map((_, i) => {
    BOX_INDEX[i] = []
    for (let r=0; r<3; r++){
        for(let c=0; c<3; c++){
            BOX_INDEX[i].push(ROW[3 * Math.trunc(i/3) + r] + COL[3 * (i % 3) + c]);
        }
    }    
});

let ALL_INDICES = []
for (let r=0; r<ROW.length; r++){
    for (let c=0; c<COL.length; c++){
        ALL_INDICES.push(ROW[r] + COL[c]);
    }
}
/**
 * Gets the domain values of a sudoku board.
 * 
 * @param {object[string]: number} board
 * 
 * @returns 
 */
const getDomain = (board) => {
    let domainVars = {}
    let unsolvedVars = new Set();
    let solvedVars = new Set();

    Object.keys(board).forEach(key => {
        let vals = new Set();
        if (board[key] == 0){
            unsolvedVars.add(key);    
            Array(9).fill().map((_, i) => {
                vals.add(i+1)
            });
        } else {
            solvedVars.add(key);
            vals.add(board[key]);
        }
        domainVars[key] = vals;
    });

    return {
        domainVars,
        unsolvedVars,
        solvedVars
    }
}

const parseBoard = (line) => {
    let board = {};
    for (let r=0; r<9; r++){
        for (let c=0; c<9; c++){
            board[ROW[r] + COL[c]] = parseInt(line[9*r + c]);
        }
    }

    return board;
}

const boardToString = (board) => {
    let boardString = "";
    for (let r=0; r<9; r++){
        for (let c=0; c<9; c++){
            boardString += board[ROW[r] + COL[c]].toString();
        }
    }

    return boardString;
}

const printBoard = (board) => {
    console.log("-----------------")
    for (let r=0; r<9; r++){
        rowString = ""
        for (let c=0; c<9; c++){
            rowString += board[ROW[r] + COL[c]].toString();
        }
        console.log(rowString);
    } 
}

const getArcsNeighbours = () => {
    let arcId = new Set();
    let arcs = [];

    for (let r=0; r<9; r++){
        for (let c=0; c<9; c++){
            let curCell = ROW[r] + COL[c];
            for (let i=0; i<9; i++){
                // Same row
                let otherCell = ROW[r] + COL[i];
                if (otherCell != curCell){
                    addNewArc(curCell, otherCell, arcId, arcs);
                }

                // same col
                otherCell = ROW[i] + COL[c];
                if (otherCell !=  curCell){
                    addNewArc(curCell, otherCell, arcId, arcs)
                }
            }
        }
    } 

    // same box
    Object.values(BOX_INDEX).forEach((cells) =>{
        Array(9).fill().map((_,i) => {
            Array(9).fill().map((_, j) => {
                if (i != j){
                    let curCell = cells[i];
                    let otherCell = cells[j];
                    if (curCell != otherCell){
                        addNewArc(curCell, otherCell, arcId, arcs);
                    }
                }
            })
        });
    });

    // convert to neighbours
    const neighbours = {};
    arcs.forEach((arc) => {
        if (!neighbours.hasOwnProperty(arc[0])){
            neighbours[arc[0]] = new Set();
        }
        if (!neighbours.hasOwnProperty(arc[1])){
            neighbours[arc[1]] = new Set();
        }
        neighbours[arc[0]].add(arc[1]);
        neighbours[arc[1]].add(arc[0]);
    })

    return {
        arcs,
        neighbours
    };
}

const addNewArc = (curCell, otherCell, arcId, arcs) => {
    let arc = curCell + otherCell;
    let otherArc = otherCell + curCell;
    if (!arcId.has(arc)) {
        arcs.push([curCell, otherCell]);
        arcId.add(arc);
    }
    if (!arcId.has(otherArc)){
        arcs.push([otherCell, curCell]);
        arcId.add(otherArc);
    }
}

function SudokuSolver(board) {
    this.board = board;
    // precompute vars
    let { domainVars, unsolvedVars, solvedVars} = getDomain(board);
    this.domainVars = domainVars;
    this.unsolvedVars = unsolvedVars;
    this.solvedVars = solvedVars;

    // precompute arcs and neighbours
    const {arcs, neighbours} = getArcsNeighbours();
    this.arcs = arcs;
    this.neighbours = neighbours;
}

/**
 * 
 */
SudokuSolver.prototype.isBoardSolved = function(assignment){
    return Object.keys(assignment).length === this.unsolvedVars.size
} ;

/**
 * 
 */
SudokuSolver.prototype.ac3 = function(){
    let modifiedVars = {};
    let queue = Array.from(this.arcs);
    while (queue.length != 0){
        const [X1, X2] = queue.shift();

        if (this.revise(X1, X2, modifiedVars)){
            // arc inconsistency found
           if (this.domainVars[X1].size === 0){
                return false;
            }

            this.neighbours[X1].forEach((n) => {
                if (n != X2){
                    queue.push([n, X1]);
                }
            });
        }
    }

    return true;
}

SudokuSolver.prototype.revise = function (X1, X2, modified){
    let revise = false;
    let domainVarsX1 = new Set(this.domainVars[X1]);
    domainVarsX1.forEach((x) => {
        // no value y in Dj allows (x, y) to satisfy the constraints between Xi and Xj
        // violation in sudoku case: choosing x will cause len(Dj) == 0
        if (this.domainVars[X2].size === 1 && this.domainVars[X2].has(x)){
            this.domainVars[X1].delete(x);

            if (modified.hasOwnProperty(X1)){
                modified[X1].push(x);
            } else{
                modified[X1] = [x];
            }

            revise = true;
        }
    })
    return revise;
}

/**
 * Minimum Remaining Value Heuristics: choose unassigned var having the least domain values
 */
SudokuSolver.prototype.selectUnassigned = function (assignment){
    let minDomainLength = Number.MAX_VALUE;
    let minVar = null;
    this.unsolvedVars.forEach((x) => {
        // unsolved var is not yet assigned
        if (!assignment.hasOwnProperty(x)){
            if (this.domainVars[x].size < minDomainLength) {
                minDomainLength = this.domainVars[x].size;
                minVar = x;
            }
        }
    });

    return minVar;
}

/**
 * Least Constraining Value heuristics
 * 
 * order the values s.t. the value of the assigned var start from least constraining
 *  effects on neighbouring cells
 */
SudokuSolver.prototype.orderDomainValues = function (variable) {
    // map val to count
    let valCount = [];

    for (const val of this.domainVars[variable]){
        let count = 0;
        let consistent = true;

        for (const n of this.neighbours[variable]) {
            let curCount = this.domainVars[n].size;
            if (this.domainVars[n].has(val)) {
                curCount -= 1;
            }
            count += curCount;

            // FC: if the value causes any of the neighbour's domain variables to be 0
            // it's an illegal move
            if (curCount === 0){
                consistent = false;
                break;
            }
        }

        if (consistent){
            valCount.push([val, count]);
        }
    };

    valCount.sort((first, second) => {
        return -(first[1] - second[1]);
    });

    return valCount;
}


/**
 * Forward checking + propagate new assignment to its neighbours
 * 
 * @param {*} variable 
 * @param {*} val 
 */
SudokuSolver.prototype.reduceDomainValues = function (variable, val) {
    let legal = true;
    let removedVars = new Set();
    
    // propagate new assignment, neighbours can't have the same value with the assigned var's value
    for (const n of this.neighbours[variable]) {
        if (this.domainVars[n].has(val)){
            this.domainVars[n].delete(val);
            removedVars.add(n);
        }
        
        // a move is illegal if it's causing the neighbouring's var to be 0
        if (this.domainVars[n].size === 0){
            legal = false;
            break;
        }
    };

    return {
        legal, 
        removedVars
    };
}

/**
 * When backtracking, undo values that were modified during FC
 * 
 * @param {*} val 
 * @param {*} removedVars 
 */
SudokuSolver.prototype.recoverDomainValues = function (val, removedVars){
    for (const r of removedVars){
        this.domainVars[r].add(val);
    }
}

/**
 * Check if the new assignment is consistent with the previous assignments
 * 
 * @param {*} assignment 
 * @param {*} variable 
 * @param {*} val 
 */
SudokuSolver.prototype.checkAssignmentConsistency = function (assignment, variable, val) {
    // go over the assignment of the variable's neighbours
    for (const n of this.neighbours[variable]){
        // check if a previous assignment is assigned to the same value
        if (assignment.hasOwnProperty(n) && assignment[n] == val ){
            return false;
        }
    }

    return true;
}

SudokuSolver.prototype.bts = function(assignment){
    // assignment is complete
    if (this.isBoardSolved(assignment)){
        return assignment;
    } else {
        const variable = this.selectUnassigned(assignment);
        const domainVals = this.orderDomainValues(variable);

        for (const item of domainVals){
            const [val, _ ] = item;

            // only assign if it's consistent
            if (this.checkAssignmentConsistency(assignment, variable, val)){
                assignment[variable] = val;
                const {legal, removedVars} = this.reduceDomainValues(variable, val);
                
                // recover from bad move fast due to fc, only search for legal moves only
                if (legal){
                    let result = this.bts(assignment);
                    if (result != null){
                        return result;
                    }
                }
                
                this.recoverDomainValues(val, removedVars);
                delete assignment[variable];
            }
        };
    }
}

/**
 * 
 */
SudokuSolver.prototype.solve = function (){
    const consistent = this.ac3();

    if (consistent){
        if (this.unsolvedVars.size === 0){
            console.log("sudoku is already solved!")
            return true;
        } else {
            let result = {};
            this.bts(result);
            if (this.isBoardSolved(result)){
                Object.keys(result).forEach((key) => {
                    this.board[key] = result[key];
                })
                return true;
            } else {
                console.log("unable to solve the puzzle!");
                return false;
            }
        }
    } else {
        console.log("sudoku config is invalid!");
        return false;
    }
}

const testSudoku = () => {
    let board = parseBoard("800000000003600000070090200050007000000045700000100030001000068008500010090000400")
    // let board = parseBoard("094000130000000000000076002080010000032000000000200060000050400000008007006304008");
    printBoard(board);
    let solver = new SudokuSolver(board);
    solver.solve();
    printBoard(solver.board);
}

const createSudoku = (board) => {
    // pick a random cell
    let keys = Object.keys(board);
    let randKey = keys[Math.floor(keys.length * Math.random())]

    // set a random value on that cell
    let randVal = Math.floor(Math.random() * 9) + 1  
    board[randKey] = randVal
    
    // solve the puzzle
    let solver = new SudokuSolver(board);
    solver.solve()

    // reset random cells between 16-64, reset them to 0
    let randHidden = Math.floor(Math.random() * (64-16+1) + 16)
    let bitMask = new Array(keys.length).fill(false);
    while (randHidden > 0) {
        let randIdx = Math.floor(keys.length * Math.random())
        randKey = keys[randIdx]
        if (!bitMask[randKey]){
            board[randKey] = 0
            bitMask[randKey] = true
            randHidden--
        }
    }
}

// testSudoku()