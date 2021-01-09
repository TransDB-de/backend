/**
 * This script copies all required files to a new distribution folder, named after the version and name in package.json.
 * It also modifies the package.json for production
 */

import * as fs from "fs";


const distDir = "./dist/";
const tmpDir = "temp/"

const scripts = {
    start: "node main.js"
}

var pkgFile = fs.readFileSync("package.json");

var packageObj = JSON.parse(pkgFile);

const name = packageObj.name;
const version = packageObj.version;

const path = distDir + name + "-" + version;

try {
    fs.renameSync(distDir + tmpDir, path);
} catch(e) {
    console.error("Could not rename temp folder! If a release with this version already exists, delete it first");
    process.exit();
}

packageObj.scripts = scripts;

delete packageObj.devDependencies;

pkgFile = JSON.stringify(packageObj);
fs.writeFileSync(path + "/package.json", pkgFile);
