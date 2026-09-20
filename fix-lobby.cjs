const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
};

const files = walk('d:/games_programming/src/games');
let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // We want to find the top bar pattern in lobby:
    // <div className="flex justify-between items-center py-4 mb-4">
    //     <Logo size="small" />
    //     <button onClick={...} className="...">الرئيسية</button>
    // </div>
    
    // Using Regex to find this flex container (some have mb-2, some have relative, some have px-4)
    const regex = /<div className="flex justify-between items-center([^"]*)">\s*<Logo size="small"\s*\/>\s*<button([^>]*)>الرئيسية<\/button>\s*<\/div>/g;
    
    if (regex.test(content)) {
        content = content.replace(regex, (match, classes, btnAttrs) => {
            return `<div className="flex items-center w-full${classes}">\n                        <Logo size="small" />\n                        <div id="global-lobby-header-target" className="flex-1 flex justify-center items-center pointer-events-none z-50"></div>\n                        <button${btnAttrs}>الرئيسية</button>\n                    </div>`;
        });
        fs.writeFileSync(file, content, 'utf8');
        count++;
        console.log('Updated: ' + file);
    }
});
console.log('Total updated files: ' + count);
