import TicTacToeAI from './TicTacToeAI.js';
import Connect4AI from './Connect4AI.js';
import SeaBattleAI from './SeaBattleAI.js';
import UltimateAI from './UltimateAI.js';
import MemoryAI from './MemoryAI.js';
import CodeAI from './CodeAI.js';
import WordAI from './WordAI.js';
import DotsBoxesAI from './DotsBoxesAI.js';
import TimeAI from './TimeAI.js';
import BusAI from './BusAI.js';
import TriviaAI from './TriviaAI.js';
import DominoAI from './DominoAI.js';
import RPSArenaAI from './RPSArenaAI.js';
import AirHockeyAI from './AirHockeyAI.js';
import QuickDrawAI from './QuickDrawAI.js';

export default function createAIConn(gameIdPrefix) {
    const listeners = { data: [] };
    let aiInstance = null;

    const mockConn = {
        isAI: true,
        send(data) {
            if (gameIdPrefix?.includes('hockey') || data?.type === 'puck_sync' || data?.type === 'paddle_move') {
                if (aiInstance && aiInstance.onMessage) {
                    aiInstance.onMessage(data);
                }
                return;
            }
            // Realistic fast transport latency (50ms) for turn-based games
            setTimeout(() => {
                if (aiInstance && aiInstance.onMessage) {
                    aiInstance.onMessage(data);
                }
            }, 50);
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
        saveState(state) {
            // AI games don't save state to Firebase
        },
        async getState() {
            return null;
        },
        _sendToPlayer(data) {
            if (data && data.type === 'global_ready' && !data.profile) {
                data.profile = { nickname: 'الذكاء الاصطناعي', avatar: 'robot' };
            }
            if (listeners['data']) {
                listeners['data'].forEach(cb => cb(data));
            }
        }
    };

    const prefix = (gameIdPrefix || '').toLowerCase();

    if (prefix.includes('uxo') || prefix.includes('ultimate')) {
        aiInstance = new UltimateAI(mockConn);
    } else if (prefix.includes('xo')) {
        aiInstance = new TicTacToeAI(mockConn);
    } else if (prefix.includes('c4') || prefix.includes('connect')) {
        aiInstance = new Connect4AI(mockConn);
    } else if (prefix.includes('sea') || prefix.includes('battle')) {
        aiInstance = new SeaBattleAI(mockConn);
    } else if (prefix.includes('mem')) {
        aiInstance = new MemoryAI(mockConn);
    } else if (prefix.includes('code')) {
        aiInstance = new CodeAI(mockConn);
    } else if (prefix.includes('word')) {
        aiInstance = new WordAI(mockConn);
    } else if (prefix.includes('db') || prefix.includes('dots')) {
        aiInstance = new DotsBoxesAI(mockConn);
    } else if (prefix.includes('time')) {
        aiInstance = new TimeAI(mockConn);
    } else if (prefix.includes('bus')) {
        aiInstance = new BusAI(mockConn);
    } else if (prefix.includes('trivia')) {
        aiInstance = new TriviaAI(mockConn);
    } else if (prefix.includes('domino')) {
        aiInstance = new DominoAI(mockConn);
    } else if (prefix.includes('rps')) {
        aiInstance = new RPSArenaAI(mockConn);
    } else if (prefix.includes('hockey')) {
        aiInstance = new AirHockeyAI(mockConn);
    } else if (prefix.includes('draw')) {
        aiInstance = new QuickDrawAI(mockConn);
    }

    return mockConn;
}
