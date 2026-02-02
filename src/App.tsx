import React, { useState, useEffect, useCallback } from 'react'

const GRID_SIZE = 4
const WINNING_VALUE = 2048

type Direction = 'up' | 'down' | 'left' | 'right'

const createEmptyBoard = () => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0))

const getRandomEmptyCell = (board: number[][]): [number, number] | null => {
    const emptyCells: [number, number][] = []
    for (let row = 0; row < GRID_SIZE; row++) 
    {
        for (let col = 0; col < GRID_SIZE; col++) 
        {
            if (board[row][col] === 0) 
              emptyCells.push([row, col])
        }
    }
    return emptyCells.length > 0 ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : null
};

const addNewTile = (board: number[][]): number[][] => {
    const newBoard = board.map(row => [...row])
    const emptyCell = getRandomEmptyCell(newBoard)
    if (emptyCell) 
    {
        const [row, col] = emptyCell;
        newBoard[row][col] = Math.random() < 0.9 ? 2 : 4
    }
    return newBoard;
};

const rotateMatrix = (matrix: number[][], clockwise = true): number[][] => {
    const result = createEmptyBoard()
    for (let row = 0; row < GRID_SIZE; row++) 
    {
        for (let col = 0; col < GRID_SIZE; col++)
        {
            if (clockwise)
                result[col][GRID_SIZE - 1 - row] = matrix[row][col]
            else
                result[GRID_SIZE - 1 - col][row] = matrix[row][col]
        }
    }
    return result
}

const moveTiles = (board: number[][], direction: Direction): { board: number[][]; scoreIncrease: number } => {
    let newBoard = board.map(row => [...row])
    let scoreIncrease = 0
    
    if (direction === 'right') 
        newBoard = rotateMatrix(rotateMatrix(newBoard))
    else if (direction === 'down') 
        newBoard = rotateMatrix(newBoard, false)
    else if (direction === 'up') 
        newBoard = rotateMatrix(newBoard, true)
    
    for (let row = 0; row < GRID_SIZE; row++) 
    {
        const nonZero = newBoard[row].filter(tile => tile !== 0)
        
        for (let i = 0; i < nonZero.length - 1; i++) 
        {
            if (nonZero[i] === nonZero[i + 1]) 
            {
                nonZero[i] *= 2
                scoreIncrease += nonZero[i]
                nonZero.splice(i + 1, 1)
            }
        }
        
        while (nonZero.length < GRID_SIZE) 
            nonZero.push(0)
        newBoard[row] = nonZero
    }
    
    if (direction === 'right') 
        newBoard = rotateMatrix(rotateMatrix(newBoard))
    else if (direction === 'down') 
        newBoard = rotateMatrix(newBoard, true)
    else if (direction === 'up') 
        newBoard = rotateMatrix(newBoard, false)
    
    return { board: newBoard, scoreIncrease }
};

const hasMovesAvailable = (board: number[][]): boolean => {
    for (let row = 0; row < GRID_SIZE; row++)
    {
        for (let col = 0; col < GRID_SIZE; col++) 
        {
            if (board[row][col] === 0) 
                return true
            
            if (col < GRID_SIZE - 1 && board[row][col] === board[row][col + 1]) 
                return true
            if (row < GRID_SIZE - 1 && board[row][col] === board[row + 1][col]) 
                return true
        }
    }
    return false
}

function App() {
    const [board, setBoard] = useState<number[][]>(createEmptyBoard())
    const [score, setScore] = useState<number>(0)
    const [bestScore, setBestScore] = useState<number>(0)
    const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

    const initGame = useCallback(() => {
        let newBoard = createEmptyBoard()
        newBoard = addNewTile(newBoard)
        newBoard = addNewTile(newBoard)
        setBoard(newBoard)
        setScore(0)
        setGameStatus('playing')
    }, [])

    const checkGameStatus = useCallback((currentBoard: number[][]) => {
        for (let row = 0; row < GRID_SIZE; ++row)
        {
            for (let col = 0; col < GRID_SIZE; ++col)
            {
                if (currentBoard[row][col] === WINNING_VALUE) 
                    return 'won'
            }
        }
        return hasMovesAvailable(currentBoard) ? 'playing' : 'lost'
    }, [])

    const makeMove = useCallback((direction: Direction) => {
        if (gameStatus !== 'playing')
            return

        const { board: newBoard, scoreIncrease} = moveTiles(board, direction)

        if (JSON.stringify(newBoard) !== JSON.stringify(board)) 
        {
            const updatedBoard = addNewTile(newBoard);
            const newScore = score + scoreIncrease;
            const newBestScore = Math.max(bestScore, newScore);
            const newStatus = checkGameStatus(updatedBoard);
            
            setBoard(updatedBoard);
            setScore(newScore);
            setBestScore(newBestScore);
            setGameStatus(newStatus);
        }
    }, [board, score, bestScore, gameStatus, checkGameStatus])

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY})
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart)
            return

        const touch = e.changedTouches[0]
        const deltaX = touch.clientX - touchStart.x
        const deltaY = touch.clientY - touchStart.y

        if (Math.abs(deltaX) > Math.abs(deltaY))
        {
            if (Math.abs(deltaX) > 30)
                makeMove(deltaX > 0 ? 'right' : 'left')
        }
        else
        {
            if (Math.abs(deltaY) > 30)
                makeMove(deltaY > 0 ? 'down' : 'up')
        }

        setTouchStart(null)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const directionMap: Record<string, Direction> = {
                ArrowUp: 'up',
                ArrowDown: 'down',
                ArrowLeft: 'left',
                ArrowRight: 'right'
            }

            if (directionMap[e.key]) 
            {
                e.preventDefault()
                makeMove(directionMap[e.key])
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [makeMove])

    useEffect(() => {
        initGame()
    }, [initGame])

    const getTileColor = (value: number): string => {
        const colors: Record<number, string> = {
            2: 'bg-amber-50 text-amber-800',
            4: 'bg-amber-100 text-amber-800',
            8: 'bg-orange-300 text-white',
            16: 'bg-orange-400 text-white',
            32: 'bg-orange-500 text-white',
            64: 'bg-red-500 text-white',
            128: 'bg-yellow-300 text-gray-800',
            256: 'bg-yellow-400 text-gray-800',
            512: 'bg-yellow-500 text-white',
            1024: 'bg-yellow-600 text-white',
            2048: 'bg-yellow-700 text-white'
        }
        return colors[value] || 'bg-gray-800 text-white'
    }

    const getTileFontSize = (value: number): string => {
        if (value < 100) 
            return 'text-4xl'
        if (value < 1000) 
            return 'text-3xl'
        return 'text-2xl'
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Заголовок и счет */}
                <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-5xl md:text-6xl font-bold text-amber-900">2048</h1>
                    <div className="flex gap-3">
                        <div className="bg-amber-700 text-white px-4 py-2 rounded-lg text-center min-w-[100px]">
                            <div className="text-xs uppercase opacity-90">Счет</div>
                            <div className="text-2xl font-bold">{score}</div>
                        </div>
                        <div className="bg-amber-800 text-white px-4 py-2 rounded-lg text-center min-w-[100px]">
                            <div className="text-xs uppercase opacity-90">Лучший</div>
                            <div className="text-2xl font-bold">{bestScore}</div>
                        </div>
                    </div>
                </header>
                {/* Инструкции */}
                <div className="text-center mb-6">
                    <p className="text-gray-700 mb-4">
                        Используйте <strong>стрелки</strong> для перемещения плиток
                    </p>
                    <button 
                        onClick={initGame}
                        className="px-6 py-2 bg-amber-800 text-white font-bold rounded-lg hover:bg-amber-900 transition-colors">
                        Новая игра
                    </button>
                </div>  
                {/* Игровое поле */}
                <div className="relative w-full max-w-md aspect-square mx-auto bg-amber-300 rounded-lg p-3 md:p-4 touch-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    {/* Сетка */}
                    <div className="grid grid-cols-4 grid-rows-4 gap-3 w-full h-full">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="bg-amber-100/40 rounded" />
                        ))}
                    </div>
                    {/* Плитки */}
                    <div className="absolute top-3 left-3 right-3 bottom-3">
                        {board.map((row, rowIndex) => 
                            row.map((value, colIndex) =>
                                value > 0 && (
                                    <div
                                        key={`${rowIndex}-${colIndex}`}
                                        className={`absolute flex items-center justify-center font-bold rounded transition-all duration-150 ${getTileColor(value)} ${getTileFontSize(value)}`}
                                        style={{
                                            width: 'calc(25% - 6px)',
                                            height: 'calc(25% - 6px)',
                                            left: `calc(${colIndex * 25}% + ${colIndex * 3}px)`,
                                            top: `calc(${rowIndex * 25}% + ${rowIndex * 3}px)`,
                                            zIndex: value
                                        }}>
                                        {value}
                                    </div>
                                )
                            )
                        )}
                    </div>
                </div>
                {/* Мобильные кнопки для адаптивности */}
                <div className="mt-8 xl:hidden">
                    <div className="flex flex-col items-center gap-2">
                        <button onClick={() => makeMove('up')} className="w-14 h-14 bg-amber-800 text-white text-xl rounded-full hover:bg-amber-900 transition-colors">↑</button>
                        <div className="flex gap-8">
                            <button onClick={() => makeMove('left')} className="w-14 h-14 bg-amber-800 text-white text-xl rounded-full hover:bg-amber-900 transition-colors">←</button>
                            <button onClick={() => makeMove('right')} className="w-14 h-14 bg-amber-800 text-white text-xl rounded-full hover:bg-amber-900 transition-colors">→</button>
                        </div>
                        <button onClick={() => makeMove('down')} className="w-14 h-14 bg-amber-800 text-white text-xl rounded-full hover:bg-amber-900 transition-colors">↓</button>
                    </div>
                </div>
                {/* Сообщения о победе/поражении */}
                {gameStatus === "won" && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white p-8 rounded-2xl text-center max-w-md">
                            <h2 className="text-3xl font-bold text-green-600 mb-4">Победа!</h2>
                            <p className="text-xl mb-6">Вы достигли 2048!</p>
                            <button onClick={initGame} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
                                Играть снова
                            </button>
                        </div>
                    </div>
                )}
                {gameStatus === "lost" && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white p-8 rounded-2xl text-center max-w-md">
                            <h2 className="text-3xl font-bold text-red-600 mb-4">Вы проиграли</h2>
                            <p className="text-xl mb-6">Нет доступных ходов</p>
                            <button onClick={initGame} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
                                Играть снова
                            </button>
                        </div>
                    </div>
                )}
                {/* Подсказки */}
                <footer className="mt-8 pt-6 border-t border-amber-300 text-center">
                    <p className="text-gray-600 text-sm">
                        <strong className="text-amber-800">Цель:</strong> Получите плитку 2048, объединяя одинаковые числа
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                        Клавиши: ← → ↑ ↓ • Мобильные: свайп
                    </p>
                </footer>
            </div>
        </div>
    )
}

export default App