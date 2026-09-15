const fs = require('fs');
const file = 'src/components/ui/Chip.tsx';
let d = fs.readFileSync(file, 'utf8');
d = d.replace('interface ChipProps {', 'interface ChipProps {\n  color?: string;');
d = d.replace('const {tokens} = useTheme();', 'const {tokens} = useTheme();\n  const activeColor = color ?? tokens.navAccent;');
d = d.replace(/tokens\.navAccent/g, 'activeColor');
fs.writeFileSync(file, d);
