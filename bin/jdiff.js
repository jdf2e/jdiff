#!/usr/bin/env node
"use strict";
var program = require('./commander');
var api = require('../api');
api(program);