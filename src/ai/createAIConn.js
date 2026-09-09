import TicTacToeAI from './TicTacToeAI';
import Connect4AI from './Connect4AI';
import SeaBattleAI from './SeaBattleAI';
import UltimateAI from './UltimateAI';
import MemoryAI from './MemoryAI';
import CodeAI from './CodeAI';
import WordAI from './WordAI';
import DotsBoxesAI from './DotsBoxesAI';

export default function createAIConn(gameIdPrefix) {
    const listeners = { data: [] };
    let aiInstance = null;

    const mockConn = {
        send(data) {
            setTimeout(() => {
                if (aiInstance && aiInstance.onMessage) {
                    aiInstance.onMessage(data);
                }
            }, 600 + Math.random() * 500);
        },
        on(event, handler) {
            if (!listeners[event]) listeners[event] = [];
            if (!listeners[event].includes(handler)) listeners[event].push(handler);
        },
        off(event, handler) {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(h => h !== handler);
            }
        },
        close() {
            if (aiInstance && aiInstance.close) aiInstance.close();
            aiInstance = null;
        },
        _sendToPlayer(data) {
            if (listeners['data']) {
                listeners['data'].forEach(cb => cb(data));
            }
        }
    };

    if (gameIdPrefix.includes('xo') && !gameIdPrefix.includes('ultimate')) aiInstance = new TicTacToeAI(mockConn);
    else if (gameIdPrefix.includes('ultimate')) aiInstance = new UltimateAI(mockConn);
    else if (gameIdPrefix.includes('c4')) aiInstance = new Connect4AI(mockConn);
    else if (gameIdPrefix.includes('sea')) aiInstance = new SeaBattleAI(mockConn);
    else if (gameIdPrefix.includes('memory')) aiInstance = new MemoryAI(mockConn);
    else if (gameIdPrefix.includes('code')) aiInstance = new CodeAI(mockConn);
    else if (gameIdPrefix.includes('word')) aiInstance = new WordAI(mockConn);
    else if (gameIdPrefix.includes('dots')) aiInstance = new DotsBoxesAI(mockConn);

    return mockConn;
}
