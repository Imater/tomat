#!/usr/bin/env node
// jshint esversion:6, -W030

import fs from 'fs-extra';
import moment from 'moment';
import colors from 'colors';
import yargs from 'yargs';
import ProgressBar from 'progress'
import keypress from 'keypress'

import pkg from '../package.json';
import utilities from './utilities';
import os from 'os';
import { setStatus, setPresence, sayTextToChannel } from './slack.js'

function getHomeDir() {
	return os.homedir()
}

let options = {};

const defaultConfig = {
	togglToken: '',
	slackToken: '',
	barWidth: 40,
	kitchenMessage: 'dinner',
	kitchenIcon: ':fork_and_knife:',
	userNameFromSlack: 'anonymous',
	"projects": [{
		"name": "9_18ok",
		"RegExp": "CSSSR-"
	}, {
		"name": "Relef",
		"RegExp": "RO-"
	}, {
		"name": "s7_cabinet",
		"RegExp": "S7-"
	}, {
		"name": "chocolate",
		"RegExp": "CHOC-"
	}, {
		"name": "Zaetool",
		"RegExp": "zaetool-"
	}],
	defaultProject: "9_18ok",
	togglWorkspace: '671896'
}

const path = `${getHomeDir()}/.zaetomat.json`;

if (!fs.existsSync(path)) {
	console.info('try to write')
	fs.writeFileSync(path, JSON.stringify(defaultConfig, null, 2) , 'utf-8');
}

const fileConfig = JSON.parse(fs.readFileSync(path, 'utf8'))


const config = Object.assign({}, defaultConfig, fileConfig)

if (!config.togglToken || !config.slackToken) {
	console.info(`You need provide togglToken and slackToken to ${path}`)
	console.info('Get Toggl token: https://toggl.com/app/profile')
	console.info('Get Slack token: https://api.slack.com/custom-integrations/legacy-tokens')
	process.exit(0)
}

var TogglClient = require('toggl-api');
var toggl = new TogglClient({apiToken: config.togglToken});

function getBackTime(time) {
	return moment().add(time, 'minutes').utcOffset('+0300').format('HH:mm')
}

function startDinner() {
	utilities.title('DINNER STARTED ', options.kitchen);
	
	sayTextToChannel('zaetomat', `:meat_on_bone: Dinner till ${getBackTime(options.time)}msk from #zaetomat`, config, (ts) => {
        const time = options.time
        const duration = time * 60 * 1000

        setStatus(`I'll be back at ${getBackTime(options.time)}msk – ${config.kitchenMessage}`, config.kitchenIcon, config, () => {
                setPresence('away', config, () => {
            });
        });
        
        utilities.o('log', `Press`.yellow, `Ctrl + c`.white.bold, `to stop the Dinner. Or just wait timer finish`.yellow);
        
        const timer = startProgressBar({
            duration
        }, function () {
            finishDinner(timer, ts)
        })
        
        listenKeyPress((ch, key) => {
            if (key && key.ctrl && key.name == 'c') {
                finishDinner(timer, ts)
            }
            
        })
    })
}
function finishDinner(timer, ts) {
	clearInterval(timer);
	process.stdin.pause();
	clearStatusAndExit();
	utilities.title('DINNER FINISHED ', options.kitchen);
	sayTextToChannel('zaetomat', `Dinner finished! I am here now!`, config, () => {}, ts)
}

function startApp() {
	const time = options.time
	const duration = time * 60 * 1000
	
	if (time > 0) {
		setStatus(`I'll be back at ${getBackTime(options.time)}msk – ${options.taskName}`, ':tomato:', config, () => {
			setPresence('away', config, () => {
            });
        });
	}
	
	utilities.title('TASK STARTED');
	utilities.o('log', `Press`.yellow, `Ctrl + c`.white.bold, `to add task to Toggl and set Slack status back. Or just work while timer`.yellow);
	utilities.o('log', `Press`.yellow, `Ctrl + r`.white.bold, `to remove the task from Toggl`.yellow);
	utilities.o('log', '');
	
    utilities.o('log', `Task name:`.red.bold, `${options.taskName}`.green);

	

	startTogglTask({
		taskName: options.taskName,
		duration
	}, function (err, timeEntry) {
		const timer = startProgressBar({
			duration
        }, function () {
			finish({ timeEntry, time })
		})
		listenKeyPress((ch, key) => {
            if (key && key.ctrl && key.name == 'c') {
                clearInterval(timer);
                process.stdin.pause();
                finish({ timeEntry, beforeTimer: true, time })
            } else if (key && key.ctrl && key.name == 'r') {
                clearInterval(timer);
                removeTogglTask(timeEntry)
                process.stdin.pause();
            }
        })
	})
	
	
	utilities.exitGraceful();
	
}

function finish({ timeEntry, beforeTimer, time }) {
	finishTogglTask(timeEntry, beforeTimer, time, () => {
		if (time > 0) {
            clearStatusAndExit()
        } else {
            process.exit(0)
        }
	});
}

function clearStatusAndExit() {
	setStatus('', '', config, () => {
        setPresence('auto', config, () => {
            process.exit(0)
        });
    });
}

function startProgressBar({ duration }, cb) {
	const total = (duration / 100)
	var bar = new ProgressBar(':bar :percent :elapseds', {
		total,
		width: config.barWidth
	});
	var timer = setInterval(function () {
		bar.tick();
		if (bar.complete) {
			clearInterval(timer);
			cb()
		}
	}, 100);
	return timer
	
}

function startTogglTask(params, cb) {
	const { 
		taskName,
		duration 
	} = params
	
	toggl.getWorkspaceProjects(config.togglWorkspace, {}, (err, projects) => {
		const prj = config.projects.find(
			configProject => RegExp(configProject.RegExp).test(taskName)
        )
        const prjName = prj ? prj.name : config.defaultProject
	
        const foundProject = projects && projects.find(project => project.name === prjName)
        if (!prj || !foundProject) {
            console.log('Cant find project (using default project), add to config one of:', projects.map(item => item.name).join(', '))
        }

        const togglProject = foundProject || {}
        toggl.startTimeEntry({
            description: taskName,
            billable: false,
			pid: togglProject.id
        }, cb);
	})
	
	
}

function finishTogglTask(timeEntry, beforeTimer, time, cb) {
	toggl.stopTimeEntry(timeEntry.id, function(err) {
		// handle error
		const duration = time > 0 ? undefined : -(time * 60)
		toggl.updateTimeEntry(
			timeEntry.id,
			{ tags: ['finished'], duration },
			function(err) {
                utilities.o('log', '');
                utilities.title(`TASK FINISHED${beforeTimer && ' BEFORE TIMER' || ''}`);
                toggl.destroy()
                cb(err)
            });
	});
}

function removeTogglTask(timeEntry) {
	toggl.stopTimeEntry(timeEntry.id, function(err) {
		// handle error
		toggl.deleteTimeEntry(timeEntry.id, function(err) {
			utilities.o('log', '', err);
			utilities.title(`TASK REMOVED`);
			toggl.destroy()
            clearStatusAndExit()
		});
	});
}

function listenKeyPress(onKeyPress) {

	keypress(process.stdin);

	process.stdin.on('keypress', onKeyPress);

	process.stdin.setRawMode(true);
	process.stdin.resume();
	
}

function getOptions() {
	
	let argv = yargs
		.version(pkg.version)
		.usage(`Usage: zaetomat -n [task name] -t [time] [-a] [-s]`)
		.option('add', {
			alias: [
				'a',
			],
			description: 'Just add without change status',
			type: 'boolean',
		})
		.option('silent', {
			alias: [
				's',
			],
			description: 'Don`t set Slack status',
			type: 'boolean',
		})
		.option('time', {
			alias: [
				't',
			],
			description: 'Duration of task in minutes',
			type: 'number',
			default: 25,
			demand: true,
		})
		.option('kitchen', {
			alias: [
				'k',
			],
			description: 'kitchen channel in Slack',
			type: 'string',
			default: undefined,
		})
		.option('taskName', {
			alias: [
				'n',
			],
			description: 'task name!',
			type: 'string',
		})
		.alias('h', 'help')
		.help('h', 'Show help.')
		.argv;
	
	options = {
		// directory: fs.realpathSync(argv.directory),
		taskName: argv.taskName,
		add: argv.add,
		silent: argv.silent,
		time: argv.time,
		kitchen: argv.kitchen,
	};

	if (options.kitchen && options.kitchen.length) {
		startDinner();
		return
	} else {
		startApp();
	}
	
}

getOptions();
