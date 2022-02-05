import { exec } from "child_process";
import { promisify } from "util";

// Helper module to execute shell commands, from a set of commands
// and to check if all commands are installed

// convert exec to async
const asyncExec = promisify(exec);

/**
 * All avalible commands
 */
const commands = {
	exportEntries: {
		getCommand: (args: string[]) => `mongoexport --uri "${args[0]}" --out "${args[1]}" --collection entries --jsonArray --quiet`,
		getTest: () => `mongoexport --version`
	}
}

/**
 * Export entries collection to a gzipped json file
 * @param dbUri uri to database to export entries from
 * @param outFile path to save file to
 * @returns sucess
 */
export async function exportEntries(dbUri: string, outFile: string): Promise<boolean> {
	let [sucess] = await runCommand("exportEntries", dbUri, outFile);
	return sucess;
}

/**
 * Exectues a command
 * @returns Tuple: [ did command succeed, command output ]
 */
async function runCommand(command: keyof typeof commands, ...stringArgs: string[]): Promise<[boolean, string]> {
	
	try {
		
		let { stdout, stderr } = await asyncExec(
			commands[command].getCommand( stringArgs )
		);
			
		if (stderr) {
			return [ false, stderr ];
		} else {
			return [ true, stdout ];
		}
		
	} catch(e: any) {
		
		return [ false, e ];
		
	}
	
}

/**
 * Tests if all commands are installed on this machine
 */
export async function testForCommands(): Promise<void> {
	let command = "";
	
	try {
		
		for (let [key, val] of Object.entries(commands) ) {
			
			command = val.getTest();
			let { stderr } = await asyncExec( command );
			
			if (stderr) {
				throw(stderr);
			}
			
		}
		
	} catch(e) {
		
		console.log(`Command "${command}" failed to run.`);
		console.log(`Check if the required command is installed on this machine!`);
		console.error(e);
		
	}
}
