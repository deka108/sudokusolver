const LENGTH = 9;
const ROW = "ABCDEFGHI";
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
   
    this.solve = () => {
        const consistent = this.arc3();

        if (consistent){
            if (this.unsolvedVars.size === 0){
                console.log("sudoku is already solved!")
            } else {
                let result = {};
                this.bts(result);
                if (this.isBoardSolved(result)){
                    console.log("solved!")
                } else {
                    Object.keys(result).forEach((key) => {
                        this.board[key] = result[key];
                    })
                }
            }
        } else {
            console.log("sudoku config is invalid!");
        }
    }

    this.isBoardSolved = (assignment) => Object.keys(assignment).length === this.unsolvedVars.size;

    this.arc3 = () => {
        let queue = Array.from(this.arcs);
        while (queue.length != 0){
            const [X1, X2] = queue.shift();

            if (this.revise(X1, X2)){
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

    this.revise = (X1, X2) => {
        let revise = false;
        let domainVarsX1 = new Set(this.domainVars[X1]);
        domainVarsX1.forEach((x) => {
            // no value y in Dj allows (x, y) to satisfy the constraints between Xi and Xj
            // violation in sudoku case: choosing x will cause len(Dj) == 0
            if (this.domainVars[X2].size === 1 && this.domainVars[X2].has(x)){
                this.domainVars[X1].delete(x);
                revise = true;
            }
        })
        return revise;
    }

    this.bts = (assignment) => {
        // assignment is complete
        // console.log( Object.keys(assignment).length, this.unsolvedVars.size, this.solvedVars.size);
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
     * Minimum Remaining Value Heuristics: choose unassigned var having the least domain values
     */
    this.selectUnassigned = (assignment) => {
        let minDomainLength = Number.MAX_VALUE;
        let minVar = "";
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
    this.orderDomainValues = (variable) => {
        // map val to count
        let valCount = [];

        this.domainVars[variable].forEach((val) => {
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
                if (curCount == 0){
                    consistent = false;
                    break;
                }
            }

            if (consistent){
                valCount.push([val, count]);
            }
        });

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
    this.reduceDomainValues = (variable, val) => {
        let legal = true;
        let removedVars = new Set();
        
        // propagate new assignment, neighbours can't have the same value with the assigned var's value
        for (const n of this.neighbours[variable]) {
            if (this.domainVars[n].has(val)){
                this.domainVars[n].delete(val);
                removedVars.add(variable);
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
    this.recoverDomainValues = (val, removedVars) => {
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
    this.checkAssignmentConsistency = (assignment, variable, val) => {
        // go over the assignment of the variable's neighbours
        for (const n of this.neighbours[variable]){
            if (assignment.hasOwnProperty(n)){
                // check if a previous assignment is assigned to the same value
                if (assignment[n] === val){
                    return false;
                }
            }
        }

        return true;
    }
}

// 000000000
// 000000000
// 000000000
// 000000000
// 000000000
// 000000000
// 000000000
// 000000000
// 000000000

// 100007090030020008009600500005300900010080002600004000300000010040000007007000390

// let board = parseBoard("800000000003600000070090200050007000000045700000100030001000068008500010090000400")
let board = parseBoard("906070403000400200070023010500000100040208060003040005030700050007005000405010708")
printBoard(board);
let sudokuSolver = new SudokuSolver(board);
sudokuSolver.solve();