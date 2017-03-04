#!/usr/bin/env node

const program = require('commander');

program
    .version('0.0.1')
    .option('-l, --local <local>', 'Add peppers')
    .option('-r, --remote <remote>', 'Add pineapple')
    .option('-t, --time [time]', 'Add bbq sauce')
    .option('-c, --cheese [type]', 'Add the specified type of cheese [marble]', 'marble')
    .parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
module.exports = program;