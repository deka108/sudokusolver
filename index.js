$(document).ready(() => {
    // numbers only
    $('input[id^="text"]').keypress((e) => {
        if (!e.key.match(/[1-9]/)){
            e.preventDefault();
        } 
    });

    $('#reset').click(() => {
        resetSudoku();
    })

    $('#copy').click(() => {
        const text = getSudokuString();
        copyToClipboard(text);
    })

    $('#solve').click(() => {
        solveSudoku();
    });

    $('#checkSol').click((e) => {
        checkSolution();
    });

    $('#new').click((e) => {
        newSudoku();
    })
});

const solveSudoku = () => {
    let board = extractBoard();
    if (Object.keys(board).length == 81){
        let solver = new SudokuSolver(board);
        const solved = solver.solve();
        if(solved){
            Object.keys(board).forEach((cell) => {
                $(`input[id="text-${cell}"]`).val(board[cell]);
            })                
        }
    }        
}

const checkSolution = () => {
    let board = extractBoard();
    if (Object.keys(board).length == 81){
        let solver = new SudokuSolver(board);
        const solved = solver.ac3();
        if(solved){
            if (solver.unsolvedVars.size != 0){
                $("#check-config").text("Current Sudoku is valid so far");
            } else {
                $("#check-config").text("Congrats! Sudoku is solved!");
            }
            $("#check-config").removeClass("invalid-config");
            $("#check-config").addClass("valid-config");
        } else {
            $("#check-config").text("Check Again! Current Sudoku is invalid!");
            $("#check-config").removeClass("valid-config");
            $("#check-config").addClass("invalid-config");
        }
        $("#check-config").show();
    }   
}

const resetSudoku = () => {
    $('input[id^="text"]').each( (_, elem) => {
        $(elem).val("");
    });
    $("#check-config").hide();
}

const getSudokuString = () => {
    const board = extractBoard();
    rowString = ""
    for (let r=0; r<9; r++){
        for (let c=0; c<9; c++){
            rowString += board[ROW[r] + COL[c]].toString();
        }
        rowString += "\n";
    } 
    return rowString;
}

const extractBoard = () => {
    let board = {};
    $('input[id^="text"]').each(function () {
        let res = this.id.match(/text-(\w+)/);
        if (res != null) {
            const cell = res[1];
            let value = 0;
            if (!!this.value) {
                value = Number.parseInt(this.value);
            }
            board[cell] = value;
        }
    });
    return board;
}

const copyToClipboard = (val) => {
    var dummy = document.createElement("textarea");
    document.body.appendChild(dummy);

    dummy.setAttribute("id", "dummyId");
    document.getElementById("dummyId").textContent = val;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
}

const newSudoku = () => {
    // reset sudoku
    resetSudoku();

    // fill some
    let board = extractBoard();
    createSudoku(board);
    console.log(board);

    Object.keys(board).forEach((cell) => {
        $(`input[id="text-${cell}"]`).val(board[cell]);
    })
}