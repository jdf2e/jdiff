#!/usr/bin/env node

const program = require('commander');

program
    .version('0.0.1')
    .option('-l, --local <local>', 'specified local folder ex: ./project/xxx')
    .option('-r, --remote <remote>', 'specified remote url ex: http://www.domain.com/xxx')
    .option('-t, --time [time]', 'specified file lastmodify time  1d=1day , 1h=1hour')
    .parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
module.exports = program;