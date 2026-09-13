import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Hub from './components/Hub';
import CodeGame from './games/GuessTheCode/CodeGame';
import WordGame from './games/GuessTheWord/WordGame';
import TicTacToeGame from './games/TicTacToe/TicTacToeGame';
import UltimateGame from './games/UltimateTicTacToe/UltimateGame';
import Connect4Game from './games/Connect4/Connect4Game';
import MemoryGame from './games/MemoryMatch/MemoryGame';
import DotsBoxesGame from './games/DotsAndBoxes/DotsBoxesGame';
import SeaBattleGame from './games/SeaBattle/SeaBattleGame';
import GuessTimeGame from './games/GuessTheTime/GuessTimeGame';
import BusCompleteGame from './games/BusComplete/BusCompleteGame';
import GlobalMuteButton from './components/GlobalMuteButton';

function App() {
  const [view, setView] = React.useState('hub');

  return (
    <ThemeProvider>
      <div className="min-h-dvh w-full text-[var(--text-color)] font-arabic selection:bg-[var(--primary-color)]/40 relative">
        <GlobalMuteButton />
        {view === 'hub' && <Hub setView={setView} />}
        {view === 'code-game' && <CodeGame setView={setView} />}
        {view === 'word-game-local' && <WordGame setView={setView} mode="local" />}
        {view === 'word-game-online' && <WordGame setView={setView} mode="online" />}
        {view === 'xo-game' && <TicTacToeGame setView={setView} />}
        {view === 'big-xo-game' && <UltimateGame setView={setView} />}
        {view === 'connect-4' && <Connect4Game setView={setView} />}
        {view === 'memory-game' && <MemoryGame setView={setView} />}
        {view === 'dots-boxes' && <DotsBoxesGame setView={setView} />}
        {view === 'sea-battle' && <SeaBattleGame setView={setView} />}
        {view === 'guess-time' && <GuessTimeGame setView={setView} />}
        {view === 'bus-complete' && <BusCompleteGame setView={setView} />}
      </div>
    </ThemeProvider>
  );
}

export default App;
