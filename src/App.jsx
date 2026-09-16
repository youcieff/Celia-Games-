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
import TriviaGame from './games/TriviaDuel/TriviaGame';
import DominoGame from './games/Dominoes/DominoGame';
import RPSArenaGame from './games/RPSArena/RPSArenaGame';
import AirHockeyGame from './games/AirHockey/AirHockeyGame';
import QuickDrawGame from './games/QuickDraw/QuickDrawGame';
import GlobalMuteButton from './components/GlobalMuteButton';

function App() {
  const [view, setView] = React.useState('hub');

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const gameParam = params.get('game');
      const roomParam = params.get('room');

      if (gameParam) {
        if (roomParam) {
          sessionStorage.setItem('celia_autojoin_room', roomParam);
        }
        const prefixToView = {
          'celia-code': 'code-game',
          'celia-word': 'word-game-online',
          'celia-xo': 'xo-game',
          'celia-big-xo': 'big-xo-game',
          'celia-connect4': 'connect-4',
          'celia-mem': 'memory-game',
          'celia-db': 'dots-boxes',
          'celia-sea': 'sea-battle',
          'celia-time': 'guess-time',
          'celia-bus': 'bus-complete',
          'celia-trivia': 'trivia-duel',
          'celia-domino': 'domino-game',
          'celia-rps': 'rps-arena',
          'celia-hockey': 'air-hockey',
          'celia-draw': 'quick-draw',
        };
        const resolvedView = prefixToView[gameParam] || gameParam;
        setView(resolvedView);
      }
    } catch (e) { }
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-dvh w-full text-[var(--text-color)] font-arabic selection:bg-[var(--primary-color)]/40 relative">
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
        {view === 'trivia-duel' && <TriviaGame setView={setView} />}
        {view === 'domino-game' && <DominoGame setView={setView} />}
        {view === 'rps-arena' && <RPSArenaGame setView={setView} />}
        {view === 'air-hockey' && <AirHockeyGame setView={setView} />}
        {view === 'quick-draw' && <QuickDrawGame setView={setView} />}
      </div>
    </ThemeProvider>
  );
}

export default App;
