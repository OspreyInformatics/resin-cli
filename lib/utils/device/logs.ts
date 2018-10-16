import * as Bluebird from 'bluebird';
import chalk from 'chalk';
import { Readable } from 'stream';

import Logger = require('../logger');

interface Log {
	message: string;
	timestamp?: number;
	serviceName?: string;

	// There's also a serviceId and imageId, but they're
	// meaningless in local mode
}

interface BuildLog {
	serviceName: string;
	message: string;
}

interface ServiceColours {
	[serviceName: string]: (message: string) => string;
}
const serviceColours: ServiceColours = {};

/**
 * Display logs from a device logging stream. This function will return
 * when the log stream ends.
 *
 * @param logs A stream which produces newline seperated log objects
 */
export function displayDeviceLogs(
	logs: Readable,
	logger: Logger,
): Bluebird<void> {
	return new Bluebird((resolve, reject) => {
		logs.on('data', log => {
			displayLogLine(log, logger);
		});

		logs.on('error', reject);
		logs.on('end', resolve);
	});
}

export function displayBuildLog(log: BuildLog, logger: Logger): void {
	const toPrint = `${getServiceColourFn(log.serviceName)(
		`[${log.serviceName}]`,
	)} ${log.message}`;
	logger.logBuild(toPrint);
}

// mutates serviceColours
function displayLogLine(log: string | Buffer, logger: Logger): void {
	try {
		const obj: Log = JSON.parse(log.toString());

		let toPrint: string;
		if (obj.timestamp != null) {
			toPrint = `[${new Date(obj.timestamp).toLocaleString()}]`;
		} else {
			toPrint = `[${new Date().toLocaleString()}]`;
		}

		if (obj.serviceName != null) {
			const colourFn = getServiceColourFn(obj.serviceName);

			toPrint += ` ${colourFn(`[${obj.serviceName}]`)}`;
		}

		toPrint += ` ${obj.message}`;

		logger.logLogs(toPrint);
	} catch (e) {
		logger.logDebug(`Dropping device log due to failed parsing: ${e}`);
	}
}

function getServiceColourFn(serviceName: string): (msg: string) => string {
	if (serviceColours[serviceName] == null) {
		serviceColours[serviceName] = getNextServiceColour();
	}

	return serviceColours[serviceName];
}

let colourIdx = 0;
const colours = [
	chalk.green,
	chalk.magenta,
	chalk.red,
	chalk.blue,
	chalk.yellow,
	chalk.cyan,
	chalk.greenBright,
	chalk.blueBright,
	chalk.yellowBright,
];
function getNextServiceColour(): (msg: string) => string {
	if (colourIdx === colours.length) {
		colourIdx = 0;
	}

	const fn = colours[colourIdx];
	colourIdx += 1;
	return fn;
}
