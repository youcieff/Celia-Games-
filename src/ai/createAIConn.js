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

export default function createAIConn(gameIdPrefix) {
    const listeners = { data: [] };
    let aiInstance = null;

    const mockConn = {
        send(data) {
            // Realistic fast transport latency (50ms)
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
    }

    return mockConn;
}
