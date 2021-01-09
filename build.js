/**
 * This script copies all required files to a new distribution folder, named after the version and name in package.json.
 * It also modifies the package.json for production
 */

import * as fs from "fs";


const distDir = "./dist/";
const tmpDir = "temp/"

const scripts = {
    start: "npm main.js"
}

let pkgFile = fs.readFileSync("package.json");
let package = JSON.parse(pkgFile);

const name = package.name;
const version = package.version;

const path = distDir + name + " " + version;

fs.renameSync(distDir + tmpDir, path);

package.scripts = scripts;

delete package.devDependencies;

let pkgFile = JSON.stringify(package);
fs.writeFileSync(path + "package.json");
