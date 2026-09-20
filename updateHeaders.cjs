const fs = require('fs');
const path = require('path');
const gamesDir = path.join(__dirname, 'src', 'games');

const GAME_ICONS = {
    'AirHockeyGame.jsx': { icon: 'IconAirHockey', label: 'الهوكي الهوائي' },
    'BusCompleteGame.jsx': { icon: 'IconBusComplete', label: 'أكمل الجملة' },
    'Connect4Game.jsx': { icon: 'IconConnect', label: 'أربعة في صف' },
    'DominoGame.jsx': { icon: 'IconDominoGame', label: 'الدومينو' },
    'DotsBoxesGame.jsx': { icon: 'IconDotsBoxes', label: 'النقاط والصناديق' },
    'CodeGame.jsx': { icon: 'IconCodeGame', label: 'خمن الكود' },
    'GuessTimeGame.jsx': { icon: 'IconGuessTime', label: 'تحدي الأدوار' },
    'WordGame.jsx': { icon: 'IconWordGame', label: 'خمن الكلمة' },
    'MemoryGame.jsx': { icon: 'IconMemoryGame', label: 'الذاكرة البصرية' },
    'QuickDrawGame.jsx': { icon: 'IconQuickDraw', label: 'الرسم السريع' },
    'RPSArenaGame.jsx': { icon: 'IconRPSArena', label: 'حجرة ورقة مقص' },
    'SeaBattleGame.jsx': { icon: 'IconSeaBattle', label: 'حرب الغواصات' },
    'TicTacToeGame.jsx': { icon: 'IconXOGame', label: 'إكس أو' },
    'TriviaGame.jsx': { icon: 'IconTriviaDuel', label: 'حرب المعلومات' },
    'UltimateGame.jsx': { icon: 'IconBigXOGame', label: 'إكس أو المطورة' }
};

const files = fs.readdirSync(gamesDir);
for (const folder of files) {
    const fullPath = path.join(gamesDir, folder);
    if (fs.statSync(fullPath).isDirectory()) {
        const gameFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('Game.jsx'));
        for (const f of gameFiles) {
            const filePath = path.join(fullPath, f);
            let content = fs.readFileSync(filePath, 'utf-8');
            
            const mapping = GAME_ICONS[f];
            if (!mapping) continue;

            // Make sure the icon is imported in the file.
            // Check if it's imported from GameIcons
            if (!content.includes(mapping.icon)) {
                // We need to add it to the import { ... } from '../../components/icons/GameIcons'
                const importRegex = /import\s+\{([^}]*)\}\s+from\s+['"]\.\.\/\.\.\/components\/icons\/GameIcons['"]/;
                const match = content.match(importRegex);
                if (match) {
                    const currentImports = match[1];
                    if (!currentImports.includes(mapping.icon)) {
                        content = content.replace(importRegex, `import { $1, ${mapping.icon} } from '../../components/icons/GameIcons'`);
                    }
                } else {
                    // It doesn't have an import from GameIcons, add it below Logo
                    const logoImportRegex = /import Logo from .*/;
                    content = content.replace(logoImportRegex, `$&
import { ${mapping.icon} } from '../../components/icons/GameIcons';`);
                }
            }

            // Find the lobby header plain text span
            // e.g. <div className="flex justify-center"><span className="text-sm font-black opacity-70">الدومينو</span></div>
            const lobbyHeaderRegex = /<div className=.flex justify-center.><span className=.text-sm font-black opacity-70.>.*?<\/span><\/div>/;
            
            const replacement = `<div className="flex justify-center">
                            <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                                <${mapping.icon} size={18} className="text-[var(--accent)]" />
                                <span className="text-xs font-black gradient-text">${mapping.label}</span>
                            </div>
                        </div>`;

            if (content.match(lobbyHeaderRegex)) {
                content = content.replace(lobbyHeaderRegex, replacement);
                fs.writeFileSync(filePath, content, 'utf-8');
                console.log('Updated ' + f);
            } else if (f === 'DotsBoxesGame.jsx') {
                // I might have left DotsBoxes with just the icon in the last state
                const dotsRegex = /<div className=.flex justify-center.><IconDotsBoxes size=\{28\} className=.text-\[var\(--accent\)\].. \/><\/div>/;
                if (content.match(dotsRegex)) {
                    content = content.replace(dotsRegex, replacement);
                    fs.writeFileSync(filePath, content, 'utf-8');
                    console.log('Updated DotsBoxesGame.jsx');
                }
            }
        }
    }
}
